/** Local visit memory. Never sent. */

export type RoomId = "hub" | "field" | "mosaic" | "machine" | "want" | "behind";

export type Trace = {
  v: 1;
  id: string;
  started: number;
  ms: number;
  rooms: RoomId[];
  clicks: number;
  moves: number;
  pauses: number;
  returns: number;
  continues: number;
  stops: number;
  last: RoomId;
  notes: string[];
};

export type TraceEvent =
  | { type: "click" }
  | { type: "move" }
  | { type: "pause" }
  | { type: "stop" }
  | { type: "continue" }
  | { type: "note"; label: string };

const KEY = "ag-trace";
const VISIT_KEY = "ag-visit";
const HIDDEN_AT = "ag-hidden-at";
const VISIT_GAP = 4 * 60 * 60 * 1000;
const MAX_JSON = 6_000;
const NOTES_MAX = 8;
const MOVE_MS = 250;
const PAUSE_MS = 2200;
const NOTE_COOL = 4000;
const ROOMS: RoomId[] = ["hub", "field", "mosaic", "machine", "want", "behind"];

let mem: Trace | null = null;
let dirty = false;
let visibleSince = 0;
let lastMove = 0;
let lastActivity = 0;
let pauseArmed = false;
let lastNote = "";
let noteAt = 0;
let globalOn = false;
let pointerOn = false;
let pauseTimer = 0;

function uid() {
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

function blank(last: RoomId = "hub"): Trace {
  return {
    v: 1,
    id: uid(),
    started: Date.now(),
    ms: 0,
    rooms: [],
    clicks: 0,
    moves: 0,
    pauses: 0,
    returns: 0,
    continues: 0,
    stops: 0,
    last,
    notes: [],
  };
}

function asRoom(v: unknown): RoomId | null {
  return typeof v === "string" && (ROOMS as string[]).includes(v) ? (v as RoomId) : null;
}

function parse(raw: string): Trace | null {
  try {
    const t = JSON.parse(raw) as Partial<Trace>;
    if (!t || t.v !== 1 || typeof t.id !== "string" || !t.id) return null;
    const last = asRoom(t.last) ?? "hub";
    const rooms = Array.isArray(t.rooms) ? t.rooms.map(asRoom).filter((r): r is RoomId => Boolean(r)) : [];
    const notes = Array.isArray(t.notes)
      ? t.notes.filter((n): n is string => typeof n === "string" && n.length < 48).slice(-NOTES_MAX)
      : [];
    return {
      v: 1,
      id: t.id.slice(0, 16),
      started: Number(t.started) || Date.now(),
      ms: Math.max(0, Number(t.ms) || 0),
      rooms: [...new Set(rooms)],
      clicks: Math.max(0, Number(t.clicks) || 0),
      moves: Math.max(0, Number(t.moves) || 0),
      pauses: Math.max(0, Number(t.pauses) || 0),
      returns: Math.max(0, Number(t.returns) || 0),
      continues: Math.max(0, Number(t.continues) || 0),
      stops: Math.max(0, Number(t.stops) || 0),
      last,
      notes,
    };
  } catch {
    return null;
  }
}

function persist() {
  if (!mem || !dirty) return;
  try {
    if (JSON.stringify(mem).length > MAX_JSON) mem.notes = mem.notes.slice(-4);
    localStorage.setItem(KEY, JSON.stringify(mem));
  } catch {
    /* memory fallback */
  }
  dirty = false;
}

function closeVisible() {
  if (!visibleSince || !mem) return;
  mem.ms += Math.max(0, Date.now() - visibleSince);
  visibleSince = 0;
  dirty = true;
}

function onHidden() {
  closeVisible();
  if (mem) {
    mem.stops += 1;
    dirty = true;
  }
  pauseArmed = false;
  try {
    localStorage.setItem(HIDDEN_AT, String(Date.now()));
  } catch {
    /* ignore */
  }
  persist();
}

function onVisible() {
  visibleSince = Date.now();
  lastActivity = performance.now();
}

function ensureGlobal() {
  if (globalOn || typeof window === "undefined") return;
  globalOn = true;
  visibleSince = document.hidden ? 0 : Date.now();
  lastActivity = performance.now();
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) onHidden();
    else onVisible();
  });
  window.addEventListener("pagehide", () => {
    if (!document.hidden) closeVisible();
    persist();
  });
  pauseTimer = window.setInterval(() => {
    if (document.hidden || !pauseArmed) return;
    if (performance.now() - lastActivity > PAUSE_MS) {
      pauseArmed = false;
      record({ type: "pause" });
    }
  }, 400);
}

export function load(): Trace {
  if (mem) return mem;
  try {
    const raw = localStorage.getItem(KEY);
    mem = raw ? parse(raw) ?? blank() : blank();
  } catch {
    mem = blank();
  }
  return mem;
}

export function save(trace: Trace) {
  mem = trace;
  dirty = true;
  persist();
}

export function snapshot(): Trace {
  const t = load();
  return { ...t, rooms: [...t.rooms], notes: [...t.notes] };
}

export function flush() {
  closeVisible();
  if (document.hidden) visibleSince = 0;
  else visibleSince = Date.now();
  dirty = true;
  persist();
}

export function record(event: TraceEvent): Trace {
  const t = load();
  const now = performance.now();
  if (event.type === "click") {
    t.clicks += 1;
    lastActivity = now;
    pauseArmed = true;
  } else if (event.type === "move") {
    if (now - lastMove < MOVE_MS) return t;
    lastMove = now;
    t.moves += 1;
    lastActivity = now;
    pauseArmed = true;
  } else if (event.type === "pause") {
    t.pauses += 1;
  } else if (event.type === "stop") {
    t.stops += 1;
  } else if (event.type === "continue") {
    t.continues += 1;
  } else if (event.type === "note") {
    if (event.label === lastNote) return t;
    if (now - noteAt < NOTE_COOL) return t;
    lastNote = event.label;
    noteAt = now;
    t.notes.push(event.label);
    if (t.notes.length > NOTES_MAX) t.notes.shift();
  }
  dirty = true;
  return t;
}

export function enter(room: RoomId): Trace {
  const t = load();
  ensureGlobal();
  if (t.rooms.includes(room)) t.returns += 1;
  else t.rooms.push(room);
  t.last = room;
  dirty = true;
  lastActivity = performance.now();
  pauseArmed = false;
  return t;
}

export function bind(room: RoomId): Trace {
  const t = enter(room);
  if (pointerOn) return t;
  pointerOn = true;
  window.addEventListener("pointerdown", (e) => {
    if ((e.target as HTMLElement | null)?.closest?.("a, button")) return;
    record({ type: "click" });
  });
  window.addEventListener("pointermove", () => record({ type: "move" }));
  return t;
}

export function markContinue() {
  record({ type: "continue" });
}

/** Manifesto once per visit: new tab, or hidden longer than 4h. */
export function claimVisit(): boolean {
  const now = Date.now();
  try {
    const sess = sessionStorage.getItem(VISIT_KEY);
    const hiddenAt = Number(localStorage.getItem(HIDDEN_AT) || 0);
    const longAway = hiddenAt > 0 && now - hiddenAt > VISIT_GAP;
    if (sess && !longAway) return false;
    sessionStorage.setItem(VISIT_KEY, "1");
    localStorage.removeItem(HIDDEN_AT);
    return true;
  } catch {
    return !load().rooms.length;
  }
}

export function shortId(trace = load()) {
  return trace.id.slice(-5);
}

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    if (pauseTimer) clearInterval(pauseTimer);
    globalOn = false;
  });
}
