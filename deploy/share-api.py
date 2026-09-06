#!/usr/bin/env python3
"""Short share links for Расписалка: gzipped JSON on disk, content-addressed ids."""
from __future__ import annotations

import base64
import binascii
import gzip
import hashlib
import json
import os
import re
import sys
import tempfile
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import urlparse
from urllib.request import Request, urlopen

ALPH = "23456789abcdefghijkmnpqrstuvwxyz"
ID_RE = re.compile(r"^[23456789abcdefghijkmnpqrstuvwxyz]{8,12}$")
STAT_RE = re.compile(r"^/api/stat/(get|hit)/(visits|created|thanks|download|share)$")
DATA_URL_RE = re.compile(r"^data:image/(jpeg|jpg|png|webp);base64,([A-Za-z0-9+/]+=*)$", re.I)
MAX_BODY = 512 * 1024
BG_MAX = 350 * 1024
DATA_DIR = Path(os.environ.get("RASPISALKA_DATA", "/var/lib/raspisalka"))
HOST = os.environ.get("RASPISALKA_HOST", "127.0.0.1")
PORT = int(os.environ.get("RASPISALKA_PORT", "18765"))

_post_hits: dict[str, list[float]] = {}
_hits_lock = threading.Lock()
_stats_lock = threading.Lock()
MAX_CONTACT = 4 * 1024
STAT_KEYS = ("visits", "created", "thanks", "download", "share")
STAT_FLOOR = {
    "visits": 136,
    "created": 14,
    "thanks": 4,
    "download": 20,
    "share": 17,
}
ABACUS_NS = os.environ.get("RASPISALKA_ABACUS_NS", "gorelikov.ae")


def id_from_digest(digest: bytes, length: int = 8) -> str:
    n = int.from_bytes(digest[:8], "big")
    chars = []
    for _ in range(length):
        chars.append(ALPH[n & 31])
        n >>= 5
    return "".join(chars)


def canonical_bytes(obj: object) -> bytes:
    return json.dumps(obj, ensure_ascii=False, separators=(",", ":"), sort_keys=True).encode("utf-8")


def blob_for(obj: object) -> bytes:
    return gzip.compress(canonical_bytes(obj), compresslevel=9, mtime=0)


def file_for(share_id: str) -> Path:
    return DATA_DIR / "s" / share_id[:2] / f"{share_id[2:]}.json.gz"


def bg_file(share_id: str) -> Path | None:
    parent = file_for(share_id).parent
    stem = share_id[2:]
    for ext in ("jpg", "jpeg", "png", "webp"):
        path = parent / f"{stem}.bg.{ext}"
        if path.is_file():
            return path
    return None


def sniff_bg_ext(blob: bytes) -> str:
    if blob.startswith(b"\xff\xd8\xff"):
        return "jpg"
    if blob.startswith(b"\x89PNG\r\n\x1a\n"):
        return "png"
    if blob[:4] == b"RIFF" and blob[8:12] == b"WEBP":
        return "webp"
    raise ValueError("bg")


def split_bg_image(obj: dict) -> tuple[dict, bytes | None]:
    custom = obj.get("custom")
    if not isinstance(custom, dict):
        return obj, None
    raw = custom.get("bgImage")
    out = dict(obj)
    out_custom = dict(custom)
    out["custom"] = out_custom
    out_custom["bgImage"] = ""
    if not isinstance(raw, str) or not raw.strip():
        return out, None
    match = DATA_URL_RE.fullmatch(raw.strip())
    if not match:
        raise ValueError("bg")
    try:
        blob = base64.b64decode(match.group(2), validate=True)
    except (ValueError, binascii.Error) as exc:
        raise ValueError("bg") from exc
    if not blob or len(blob) > BG_MAX:
        raise ValueError("too_large")
    sniff_bg_ext(blob)
    return out, blob


def attach_bg_image(obj: dict, share_id: str) -> dict:
    path = bg_file(share_id)
    if path is None:
        return obj
    ext = path.suffix.lower().lstrip(".")
    mime = {"jpg": "image/jpeg", "jpeg": "image/jpeg", "png": "image/png", "webp": "image/webp"}.get(ext, "image/jpeg")
    raw = path.read_bytes()
    if not raw or len(raw) > BG_MAX:
        return obj
    custom = obj.get("custom")
    if not isinstance(custom, dict):
        custom = {}
        obj["custom"] = custom
    custom["bgImage"] = f"data:{mime};base64,{base64.b64encode(raw).decode('ascii')}"
    return obj


def write_bytes(path: Path, blob: bytes) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, tmp = tempfile.mkstemp(prefix=".tmp-", dir=path.parent)
    try:
        with os.fdopen(fd, "wb") as fh:
            fh.write(blob)
        os.replace(tmp, path)
    except Exception:
        try:
            os.unlink(tmp)
        except OSError:
            pass
        raise


def existing_matches(share_id: str, blob: bytes, bg_blob: bytes | None) -> bool:
    path = file_for(share_id)
    if not path.is_file() or path.read_bytes() != blob:
        return False
    current = bg_file(share_id)
    if not bg_blob:
        return current is None
    return current is not None and current.read_bytes() == bg_blob


def choose_id(digest: bytes, blob: bytes, bg_blob: bytes | None = None) -> str:
    for length in (8, 10, 12):
        share_id = id_from_digest(digest, length)
        path = file_for(share_id)
        if not path.is_file():
            return share_id
        if existing_matches(share_id, blob, bg_blob):
            return share_id
    raise RuntimeError("id collision")


def validate_payload(obj: object) -> dict:
    if not isinstance(obj, dict):
        raise ValueError("object")
    if obj.get("v") not in (2, 3, 4):
        raise ValueError("version")
    if "cells" in obj and not isinstance(obj["cells"], list):
        raise ValueError("cells")
    return obj


def save_payload(obj: dict, bg_blob: bytes | None = None) -> str:
    blob = blob_for(obj)
    digest = hashlib.sha256(blob + (b"\0bg" + bg_blob if bg_blob else b"")).digest()
    share_id = choose_id(digest, blob, bg_blob)
    path = file_for(share_id)
    if existing_matches(share_id, blob, bg_blob):
        return share_id
    write_bytes(path, blob)
    if bg_blob:
        ext = sniff_bg_ext(bg_blob)
        write_bytes(path.parent / f"{share_id[2:]}.bg.{ext}", bg_blob)
    return share_id


def load_payload(share_id: str) -> dict | None:
    if not ID_RE.fullmatch(share_id):
        return None
    path = file_for(share_id)
    if not path.is_file():
        return None
    raw = gzip.decompress(path.read_bytes())
    obj = json.loads(raw.decode("utf-8"))
    if not isinstance(obj, dict):
        return None
    return attach_bg_image(obj, share_id)


def allow_post(ip: str, bucket: str = "share", limit: int = 30, window: int = 600) -> bool:
    now = time.time()
    key = f"{bucket}:{ip}"
    with _hits_lock:
        hits = [t for t in _post_hits.get(key, []) if now - t < window]
        if len(hits) >= limit:
            _post_hits[key] = hits
            return False
        hits.append(now)
        _post_hits[key] = hits
        if len(_post_hits) > 4000:
            stale = [k for k, v in _post_hits.items() if not v or now - v[-1] > window]
            for k in stale:
                _post_hits.pop(k, None)
        return True


def telegram_configured() -> bool:
    return bool(os.environ.get("TELEGRAM_BOT_TOKEN", "").strip() and os.environ.get("TELEGRAM_CHAT_ID", "").strip())


def send_telegram(name: str, message: str) -> None:
    token = os.environ.get("TELEGRAM_BOT_TOKEN", "").strip()
    chat = os.environ.get("TELEGRAM_CHAT_ID", "").strip()
    if not token or not chat:
        raise RuntimeError("not_configured")
    text = f"Расписалка\nИмя: {name}\n\n{message}"
    payload = json.dumps({"chat_id": chat, "text": text[:3900], "disable_web_page_preview": True}, ensure_ascii=False).encode("utf-8")
    req = Request(
        f"https://api.telegram.org/bot{token}/sendMessage",
        data=payload,
        headers={"Content-Type": "application/json; charset=utf-8"},
        method="POST",
    )
    try:
        with urlopen(req, timeout=12) as resp:
            raw = json.loads(resp.read().decode("utf-8"))
    except (HTTPError, URLError, TimeoutError, json.JSONDecodeError) as exc:
        raise RuntimeError("telegram") from exc
    if not raw.get("ok"):
        raise RuntimeError("telegram")


def read_json_body(handler: BaseHTTPRequestHandler, max_len: int) -> dict:
    try:
        length = int(handler.headers.get("Content-Length", "0"))
    except ValueError:
        length = 0
    if length <= 0 or length > max_len:
        raise ValueError("too_large")
    raw = handler.rfile.read(length)
    obj = json.loads(raw.decode("utf-8"))
    if not isinstance(obj, dict):
        raise ValueError("bad_json")
    return obj


def client_ip(handler: BaseHTTPRequestHandler) -> str:
    forwarded = handler.headers.get("X-Real-IP") or handler.headers.get("X-Forwarded-For", "")
    if forwarded:
        return forwarded.split(",")[0].strip()[:64]
    return handler.client_address[0]


def stats_file() -> Path:
    return DATA_DIR / "stats.json"


def abacus_get(key: str) -> int | None:
    url = f"https://abacus.jasoncameron.dev/get/{ABACUS_NS}/{key}"
    req = Request(url, headers={"User-Agent": "raspisalka-share/1"}, method="GET")
    try:
        with urlopen(req, timeout=4) as resp:
            raw = json.loads(resp.read().decode("utf-8"))
    except (HTTPError, URLError, TimeoutError, json.JSONDecodeError, OSError, ValueError):
        return None
    try:
        n = int(raw.get("value"))
    except (TypeError, ValueError, AttributeError):
        return None
    return n if n >= 0 else None


def seed_stats() -> dict[str, int]:
    stats = {k: 0 for k in STAT_KEYS}
    if os.environ.get("RASPISALKA_STAT_IMPORT", "1") != "0":
        for key in STAT_KEYS:
            remote = abacus_get(key)
            stats[key] = max(int(STAT_FLOOR.get(key, 0)), 0 if remote is None else remote)
    return stats


def read_stats_unlocked() -> dict[str, int]:
    path = stats_file()
    if not path.is_file():
        stats = seed_stats()
        write_stats_unlocked(stats)
        return stats
    try:
        raw = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, UnicodeDecodeError, json.JSONDecodeError):
        stats = seed_stats()
        write_stats_unlocked(stats)
        return stats
    if not isinstance(raw, dict):
        stats = seed_stats()
        write_stats_unlocked(stats)
        return stats
    stats = {}
    for key in STAT_KEYS:
        try:
            stats[key] = max(0, int(raw.get(key, 0)))
        except (TypeError, ValueError):
            stats[key] = 0
    return stats


def write_stats_unlocked(stats: dict[str, int]) -> None:
    payload = {k: int(stats.get(k, 0)) for k in STAT_KEYS}
    write_bytes(stats_file(), json.dumps(payload, ensure_ascii=False, separators=(",", ":")).encode("utf-8"))


def stat_value(key: str, bump: bool) -> int:
    with _stats_lock:
        stats = read_stats_unlocked()
        if bump:
            stats[key] = int(stats.get(key, 0)) + 1
            write_stats_unlocked(stats)
        return int(stats.get(key, 0))


class Handler(BaseHTTPRequestHandler):
    server_version = "raspisalka-share/1"

    def log_message(self, fmt: str, *args) -> None:
        sys.stderr.write("%s - %s\n" % (self.address_string(), fmt % args))

    def _cors(self) -> None:
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "content-type")
        self.send_header("Cache-Control", "no-store")

    def _send(self, code: int, body: bytes, content_type: str) -> None:
        self.send_response(code)
        self._cors()
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _send_json(self, code: int, obj: object) -> None:
        raw = json.dumps(obj, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
        self._send(code, raw, "application/json; charset=utf-8")

    def do_OPTIONS(self) -> None:
        self.send_response(204)
        self._cors()
        self.end_headers()

    def do_GET(self) -> None:
        path = urlparse(self.path).path.rstrip("/")
        if path in ("/api/share", "/health"):
            self._send_json(200, {"ok": True})
            return
        if path == "/api/contact":
            self._send_json(200, {"ok": True, "configured": telegram_configured()})
            return
        stat = STAT_RE.fullmatch(path)
        if stat:
            kind, key = stat.group(1), stat.group(2)
            bump = kind == "hit"
            if bump and not allow_post(client_ip(self), "stat", limit=40, window=120):
                bump = False
            self._send_json(200, {"value": stat_value(key, bump)})
            return
        prefix = "/api/share/"
        if path.startswith(prefix):
            share_id = path[len(prefix) :]
            obj = load_payload(share_id)
            if obj is None:
                self._send_json(404, {"error": "not_found"})
                return
            self._send_json(200, obj)
            return
        self._send_json(404, {"error": "not_found"})

    def do_POST(self) -> None:
        path = urlparse(self.path).path.rstrip("/")
        ip = client_ip(self)
        if path == "/api/contact":
            if not allow_post(ip, "contact", limit=8, window=600):
                self._send_json(429, {"error": "rate_limit"})
                return
            try:
                obj = read_json_body(self, MAX_CONTACT)
            except ValueError as exc:
                code = 413 if str(exc) == "too_large" else 400
                self._send_json(code, {"error": str(exc)})
                return
            except (UnicodeDecodeError, json.JSONDecodeError):
                self._send_json(400, {"error": "bad_json"})
                return
            if (obj.get("company") or obj.get("website")):
                self._send_json(200, {"ok": True})
                return
            name = str(obj.get("name") or "").strip()[:80]
            message = str(obj.get("message") or "").strip()[:2000]
            if len(name) < 1 or len(message) < 2:
                self._send_json(400, {"error": "empty"})
                return
            if not telegram_configured():
                self._send_json(503, {"error": "not_configured"})
                return
            try:
                send_telegram(name, message)
            except RuntimeError:
                self._send_json(502, {"error": "telegram"})
                return
            self._send_json(200, {"ok": True})
            return
        if path != "/api/share":
            self._send_json(404, {"error": "not_found"})
            return
        if not allow_post(ip, "share", limit=30, window=600):
            self._send_json(429, {"error": "rate_limit"})
            return
        try:
            obj = validate_payload(read_json_body(self, MAX_BODY))
            obj, bg_blob = split_bg_image(obj)
            share_id = save_payload(obj, bg_blob)
        except ValueError as exc:
            code = 413 if str(exc) == "too_large" else 400
            self._send_json(code, {"error": str(exc)})
            return
        except (UnicodeDecodeError, json.JSONDecodeError):
            self._send_json(400, {"error": "bad_json"})
            return
        except Exception:
            self._send_json(500, {"error": "save_failed"})
            return
        self._send_json(200, {"id": share_id, "url": f"/s/{share_id}"})


def selftest() -> None:
    global DATA_DIR
    DATA_DIR = Path(tempfile.mkdtemp(prefix="raspisalka-test-"))
    sample = {
        "v": 4,
        "mode": "school",
        "theme": "y2k",
        "title": "7 Б",
        "cells": [[["алгебра", ""], ["", ""]], [["", ""], ["", ""]]],
    }
    blob = blob_for(sample)
    assert len(blob) < 400, len(blob)
    a = save_payload(sample)
    b = save_payload({"theme": "y2k", "v": 4, "mode": "school", "title": "7 Б", "cells": sample["cells"]})
    assert a == b, (a, b)
    assert load_payload(a)["title"] == "7 Б"
    assert load_payload("nopexxxx") is None
    other = dict(sample)
    other["title"] = "8 А"
    c = save_payload(other)
    assert c != a
    png = base64.b64decode(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
    )
    with_bg = dict(sample)
    with_bg["custom"] = {"bg": "#101322", "bgImage": "data:image/png;base64," + base64.b64encode(png).decode("ascii")}
    d = save_payload(*split_bg_image(with_bg))
    loaded = load_payload(d)
    assert loaded["custom"]["bgImage"].startswith("data:image/png;base64,")
    assert base64.b64decode(loaded["custom"]["bgImage"].split(",", 1)[1]) == png
    png2 = png[:-4] + b"\x00\x00\x00\x00"  # still png header, different tail — use second 1x1
    png2 = base64.b64decode(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="
    )
    with_bg2 = dict(sample)
    with_bg2["custom"] = {"bg": "#101322", "bgImage": "data:image/png;base64," + base64.b64encode(png2).decode("ascii")}
    e = save_payload(*split_bg_image(with_bg2))
    assert e != d
    again = save_payload(*split_bg_image(with_bg))
    assert again == d
    os.environ["RASPISALKA_STAT_IMPORT"] = "0"
    assert stat_value("visits", False) == 0
    assert stat_value("visits", True) == 1
    assert stat_value("visits", False) == 1
    assert stat_value("created", True) == 1
    assert stat_value("created", False) == 1
    print("selftest ok", a, c, d, e, "bytes", len(blob))


def main() -> None:
    if "--selftest" in sys.argv:
        selftest()
        return
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    (DATA_DIR / "s").mkdir(parents=True, exist_ok=True)
    httpd = ThreadingHTTPServer((HOST, PORT), Handler)
    print(f"raspisalka-share {HOST}:{PORT} data={DATA_DIR}", flush=True)
    httpd.serve_forever()


if __name__ == "__main__":
    main()
