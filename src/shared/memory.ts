const KEY = "ag-opened";

export type GateId = "field" | "mosaic" | "machine" | "want" | "behind";

export function openedGates(): Set<GateId> {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return new Set();
    const list = JSON.parse(raw) as GateId[];
    return new Set(list);
  } catch {
    return new Set();
  }
}

export function markOpened(id: GateId) {
  const next = openedGates();
  next.add(id);
  try {
    localStorage.setItem(KEY, JSON.stringify([...next]));
  } catch {
    /* private mode */
  }
}
