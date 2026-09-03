#!/usr/bin/env python3
"""Short share links for Расписалка: gzipped JSON on disk, content-addressed ids."""
from __future__ import annotations

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
from urllib.parse import urlparse

ALPH = "23456789abcdefghijkmnpqrstuvwxyz"
ID_RE = re.compile(r"^[23456789abcdefghijkmnpqrstuvwxyz]{8,12}$")
MAX_BODY = 64 * 1024
DATA_DIR = Path(os.environ.get("RASPISALKA_DATA", "/var/lib/raspisalka"))
HOST = os.environ.get("RASPISALKA_HOST", "127.0.0.1")
PORT = int(os.environ.get("RASPISALKA_PORT", "18765"))

_post_hits: dict[str, list[float]] = {}
_hits_lock = threading.Lock()


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


def choose_id(digest: bytes, blob: bytes) -> str:
    for length in (8, 10, 12):
        share_id = id_from_digest(digest, length)
        path = file_for(share_id)
        if not path.is_file():
            return share_id
        existing = path.read_bytes()
        if existing == blob:
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


def save_payload(obj: dict) -> str:
    blob = blob_for(obj)
    digest = hashlib.sha256(blob).digest()
    share_id = choose_id(digest, blob)
    path = file_for(share_id)
    path.parent.mkdir(parents=True, exist_ok=True)
    if path.is_file() and path.read_bytes() == blob:
        return share_id
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
    return obj


def allow_post(ip: str) -> bool:
    now = time.time()
    with _hits_lock:
        hits = [t for t in _post_hits.get(ip, []) if now - t < 600]
        if len(hits) >= 30:
            _post_hits[ip] = hits
            return False
        hits.append(now)
        _post_hits[ip] = hits
        if len(_post_hits) > 4000:
            stale = [k for k, v in _post_hits.items() if not v or now - v[-1] > 600]
            for k in stale:
                _post_hits.pop(k, None)
        return True


def client_ip(handler: BaseHTTPRequestHandler) -> str:
    forwarded = handler.headers.get("X-Real-IP") or handler.headers.get("X-Forwarded-For", "")
    if forwarded:
        return forwarded.split(",")[0].strip()[:64]
    return handler.client_address[0]


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
        if path != "/api/share":
            self._send_json(404, {"error": "not_found"})
            return
        ip = client_ip(self)
        if not allow_post(ip):
            self._send_json(429, {"error": "rate_limit"})
            return
        try:
            length = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            length = 0
        if length <= 0 or length > MAX_BODY:
            self._send_json(413, {"error": "too_large"})
            return
        raw = self.rfile.read(length)
        try:
            obj = validate_payload(json.loads(raw.decode("utf-8")))
            share_id = save_payload(obj)
        except (UnicodeDecodeError, json.JSONDecodeError, ValueError):
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
    print("selftest ok", a, c, "bytes", len(blob))


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
