const KEY = "art.gorelikov.ae-machine";
const SEEN = "art-gorelikov-visitor";
const CACHE = "art-gorelikov-visitor-count";
const BASE = "https://countapi.mileshilliard.com/api/v1";

type CountResponse = { value?: number | string };

async function request(path: string) {
  const res = await fetch(`${BASE}/${path}/${KEY}`);
  const data = (await res.json()) as CountResponse;
  const n = Number(data.value);
  if (!Number.isFinite(n)) throw new Error("count");
  return n;
}

function localCount(increment: boolean) {
  let n = Number(localStorage.getItem(CACHE) || "0");
  if (increment) {
    n += 1;
    localStorage.setItem(CACHE, String(n));
  }
  return Math.max(1, n);
}

export async function loadVisitorCount() {
  const first = !localStorage.getItem(SEEN);
  try {
    const n = first ? await request("hit") : await request("get").catch(() => request("hit"));
    localStorage.setItem(SEEN, "1");
    localStorage.setItem(CACHE, String(n));
    return n;
  } catch {
    const n = localCount(first);
    if (first) localStorage.setItem(SEEN, "1");
    return n;
  }
}

export function formatVisitors(n: number) {
  return String(Math.max(0, Math.floor(n))).padStart(6, "0");
}
