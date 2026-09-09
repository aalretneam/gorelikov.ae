const KEY = "ag-opened";

export type GateId = "field" | "mosaic" | "machine" | "want" | "behind" | "play";

const GATES: GateId[] = ["field", "mosaic", "machine", "want", "behind", "play"];

function isGate(v: unknown): v is GateId {
  return typeof v === "string" && (GATES as string[]).includes(v);
}

export function openedList(): GateId[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const list = JSON.parse(raw) as unknown;
    if (!Array.isArray(list)) return [];
    const out: GateId[] = [];
    const seen = new Set<string>();
    for (const id of list) {
      if (!isGate(id) || seen.has(id)) continue;
      seen.add(id);
      out.push(id);
    }
    return out;
  } catch {
    return [];
  }
}

export function openedGates(): Set<GateId> {
  return new Set(openedList());
}

export function markOpened(id: GateId) {
  const next = openedList();
  if (!next.includes(id)) next.push(id);
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* private mode */
  }
}
