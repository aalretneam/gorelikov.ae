import "./style.css";
import { PresenceClock, writeClock } from "../clock";
import { dprCap, isMobileGpu, reducedMotion } from "../shared/gpu";
import { markOpened, openedGates } from "../shared/memory";
import { bindSoundToggle } from "../shared/sound-toggle";
import { bind as bindTrace, markContinue } from "../shared/trace";
import { GestureTrail } from "../shared/trail";
import { bindWhisper, isChromeTarget } from "../shared/whisper";
import { roomsDone } from "../shared/portrait";
import { GATES, HIT, Maze } from "./maze";
import { HubSound } from "./sound";

const HUB_WIDE = "ag-hub-wide";
const GATE_FIRST = 80_000;
const GATE_STEP = 40_000;

function hubIsWide() {
  try {
    if (sessionStorage.getItem(HUB_WIDE) === "1") return true;
  } catch {
    /* private mode */
  }
  return /(?:field|unnamed|machine|want|behind|play|you)\.html(?:$|[?#])/.test(document.referrer);
}

function markHubWide() {
  try {
    sessionStorage.setItem(HUB_WIDE, "1");
  } catch {
    /* private mode */
  }
}

const reduced = reducedMotion();
const canvas = document.querySelector<HTMLCanvasElement>("#maze")!;
const trailCanvas = document.querySelector<HTMLCanvasElement>("#trail")!;
const cursorEl = document.querySelector<HTMLDivElement>("#cursor")!;
const whisperEl = document.querySelector<HTMLParagraphElement>("#whisper")!;
const presenceEl = document.querySelector<HTMLElement>("#presence")!;
const soundEl = document.querySelector<HTMLButtonElement>("#sound")!;
const hitsEl = document.querySelector<HTMLDivElement>("#hits")!;

const simple = isMobileGpu();
const maze = new Maze(canvas);
const trail = new GestureTrail(trailCanvas);
const sound = new HubSound();
const clock = new PresenceClock();
const whisper = bindWhisper(whisperEl);
const wide = hubIsWide();
if (wide) {
  markHubWide();
  maze.snapWide();
}
bindSoundToggle(soundEl, sound);

const visited = openedGates();
bindTrace("hub");
whisper.play(
  [
    "Ты здесь не для того, чтобы смотреть,\nты здесь, чтобы оставить след",
    "Это лабиринт, где нет конца..\nили есть?\nКто-то найдет в нем вдохновение..\nКто-то смысл...",
    "Все зависит от твоего выбора...",
  ],
  { hold: reduced ? 4000 : 10000, stayLast: true },
);

const pointer = { x: innerWidth * 0.5, y: innerHeight * 0.5, tx: innerWidth * 0.5, ty: innerHeight * 0.5 };
let lastTs = performance.now();
let raf = 0;
let revealed: number[] = [];
let hover = -1;
let hold = 0;
let holding = false;
let lastSlit = 0;
let lastHoverSound = -1;
let drag: { id: number; x: number; y: number; moved: boolean; vx: number; vy: number; t: number } | null = null;
let profileOn = roomsDone() >= 3;
let profileHit: HTMLAnchorElement | null = null;

function layoutHits() {
  hitsEl.replaceChildren();
  for (let i = 0; i < GATES.length; i++) {
    const a = document.createElement("a");
    a.className = "hit";
    a.href = GATES[i].href;
    a.setAttribute("aria-label", GATES[i].word);
    a.tabIndex = -1;
    a.style.width = `${HIT}px`;
    a.style.height = `${HIT}px`;
    const word = document.createElement("span");
    word.className = "word";
    word.textContent = GATES[i].word;
    a.append(word);
    a.addEventListener("click", () => {
      markOpened(GATES[i].id);
      markContinue();
      markHubWide();
    });
    hitsEl.append(a);
  }
  profileHit = document.createElement("a");
  profileHit.className = "hit";
  profileHit.href = "./you.html";
  profileHit.setAttribute("aria-label", "ты");
  profileHit.tabIndex = -1;
  profileHit.style.width = `${HIT}px`;
  profileHit.style.height = `${HIT}px`;
  const word = document.createElement("span");
  word.className = "word";
  word.textContent = "ты";
  profileHit.append(word);
  profileHit.addEventListener("click", () => markHubWide());
  hitsEl.append(profileHit);
}

function timedCount(elapsed: number) {
  const first = reduced ? 40_000 : GATE_FIRST;
  const step = reduced ? 20_000 : GATE_STEP;
  if (elapsed < first) return 0;
  return Math.min(GATES.length, 1 + Math.floor((elapsed - first) / step));
}

function mergeReveal(elapsed: number) {
  const want = timedCount(elapsed);
  const next: number[] = [];
  for (let i = 0; i < GATES.length; i++) {
    if (i < want || visited.has(GATES[i].id)) next.push(i);
  }
  return next;
}

function placeHits() {
  const nodes = hitsEl.querySelectorAll<HTMLAnchorElement>("a");
  nodes.forEach((a, i) => {
    if (a === profileHit) {
      const on = profileOn;
      a.classList.toggle("is-on", on);
      a.tabIndex = on ? 0 : -1;
      const p = maze.centerPos();
      a.style.transform = `translate3d(${p.x}px, ${p.y}px, 0)`;
      return;
    }
    const on = revealed.includes(i) && maze.gateOnScreen(i, 48);
    a.classList.toggle("is-on", on);
    a.tabIndex = on ? 0 : -1;
    const p = maze.gatePos(i);
    a.style.transform = `translate3d(${p.x}px, ${p.y}px, 0)`;
  });
}

function resize() {
  const dpr = dprCap(1.5, 1);
  maze.resize(innerWidth, innerHeight, dpr);
  trail.resize(innerWidth, innerHeight, dpr);
  placeHits();
}

function onPointer(x: number, y: number) {
  pointer.tx = x;
  pointer.ty = y;
  trail.stamp(x, y);
}

window.addEventListener("pointermove", (e) => {
  onPointer(e.clientX, e.clientY);
  if (!drag || drag.id !== e.pointerId) return;
  if (e.pointerType === "mouse" && e.buttons === 0) return;
  const dx = e.clientX - drag.x;
  const dy = e.clientY - drag.y;
  const now = performance.now();
  const dist = Math.hypot(dx, dy);
  if (dist > 7 || drag.moved) {
    drag.moved = true;
    maze.pan(dx, dy);
    const dt = Math.max(8, now - drag.t);
    drag.vx = dx / (dt / 1000);
    drag.vy = dy / (dt / 1000);
    drag.x = e.clientX;
    drag.y = e.clientY;
    drag.t = now;
    e.preventDefault();
  }
});

window.addEventListener("pointerdown", (e) => {
  if (isChromeTarget(e.target) && !(e.target as HTMLElement).closest("#hits")) return;
  onPointer(e.clientX, e.clientY);
  holding = true;
  cursorEl.classList.add("is-hold");
  if ((e.target as HTMLElement).closest("#hits")) return;
  drag = { id: e.pointerId, x: e.clientX, y: e.clientY, moved: false, vx: 0, vy: 0, t: performance.now() };
  e.preventDefault();
});

window.addEventListener("pointerup", (e) => {
  holding = false;
  cursorEl.classList.remove("is-hold");
  if (!drag || drag.id !== e.pointerId) return;
  const wasDrag = drag.moved;
  const vx = drag.vx;
  const vy = drag.vy;
  drag = null;
  if (wasDrag) {
    maze.fling(vx, vy);
    return;
  }
  if (profileOn) {
    const c = maze.centerPos();
    if (Math.hypot(pointer.tx - c.x, pointer.ty - c.y) < HIT * 0.5) {
      markHubWide();
      window.location.href = "./you.html";
      return;
    }
  }
  const i = maze.hitIndex(pointer.tx, pointer.ty, revealed);
  if (i >= 0) {
    markOpened(GATES[i].id);
    markContinue();
    markHubWide();
    window.location.href = GATES[i].href;
    return;
  }
  maze.ripple(pointer.tx, pointer.ty);
});

window.addEventListener("pointercancel", () => {
  holding = false;
  cursorEl.classList.remove("is-hold");
  drag = null;
});

window.addEventListener(
  "wheel",
  (e) => {
    e.preventDefault();
    maze.wheel(-e.deltaX, -e.deltaY);
  },
  { passive: false },
);

window.addEventListener(
  "touchmove",
  (e) => {
    e.preventDefault();
  },
  { passive: false },
);

window.addEventListener("resize", resize);

function tick(now: number) {
  const dt = Math.min(0.05, Math.max(0, now - lastTs) / 1000);
  lastTs = now;
  const elapsed = clock.elapsed();
  writeClock(presenceEl, elapsed);

  pointer.x += (pointer.tx - pointer.x) * (reduced ? 1 : 0.14);
  pointer.y += (pointer.ty - pointer.y) * (reduced ? 1 : 0.14);
  hold += ((holding ? 1 : 0) - hold) * 0.1;

  maze.zoomTo(elapsed, reduced, wide);

  const nextReveal = mergeReveal(elapsed);
  if (nextReveal.length > revealed.length) maze.pulse = Math.max(maze.pulse, 0.55);
  revealed = nextReveal;
  if (!profileOn && roomsDone() >= 3) profileOn = true;

  placeHits();

  let hit = maze.hitIndex(pointer.x, pointer.y, revealed);
  if (hit < 0 && profileOn) {
    const c = maze.centerPos();
    if (Math.hypot(pointer.x - c.x, pointer.y - c.y) < HIT * 0.5) hit = 100;
  }
  if (hit !== hover) hover = hit;
  cursorEl.classList.toggle("is-ring", hit >= 0);
  cursorEl.style.transform = `translate3d(${pointer.x}px, ${pointer.y}px, 0)`;

  if (sound.enabled && hit !== lastHoverSound) {
    lastHoverSound = hit;
    if (hit >= 0 && hit < GATES.length) sound.hover(true, GATES[hit].freq);
    else if (hit === 100) sound.hover(true, 110);
    else sound.hover(false);
  }
  if (sound.enabled && now - lastSlit > 5000 + Math.random() * 5000 && Math.random() < 0.01) {
    sound.slit();
    lastSlit = now;
  }

  maze.step(dt);
  maze.draw({
    mx: pointer.x,
    my: pointer.y,
    reveal: revealed,
    hover: hit < GATES.length ? hit : -1,
    visited,
    hold,
    simple,
    awake: wide ? 1 : Math.min(1, elapsed / (reduced ? 12000 : 22000)),
    profile: profileOn,
  });
  trail.step(dt);
  trail.draw();
  whisper.tick(now);

  raf = requestAnimationFrame(tick);
}

window.addEventListener("visibilitychange", () => {
  cancelAnimationFrame(raf);
  sound.setMuted(document.hidden);
  if (!document.hidden) {
    lastTs = performance.now();
    raf = requestAnimationFrame(tick);
  }
});

layoutHits();
revealed = mergeReveal(0);
resize();
raf = requestAnimationFrame(tick);

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    cancelAnimationFrame(raf);
    clock.dispose();
  });
}
