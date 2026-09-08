import "./style.css";
import { PresenceClock, writeClock } from "../clock";
import { dprCap, isMobileGpu, reducedMotion } from "../shared/gpu";
import { markOpened, openedGates } from "../shared/memory";
import { bindSoundToggle } from "../shared/sound-toggle";
import { GestureTrail } from "../shared/trail";
import { bindWhisper, isChromeTarget } from "../shared/whisper";
import { GATES, HIT, Maze } from "./maze";
import { HubSound } from "./sound";

const LINES = [
  "Это лабиринт",
  "где нет конца",
  "или есть",
  "кто-то найдёт тут вдохновение",
  "кто-то смысл",
  "Всё зависит от тебя..",
  "И твоего выбора ..",
];

const reduced = reducedMotion();
const FIRST_LINE = reduced ? 7000 : 14000;
const LINE_STEP = reduced ? 13000 : 21000;
const LINE_DUR = reduced ? 9500 : 13000;

const canvas = document.querySelector<HTMLCanvasElement>("#maze")!;
const trailCanvas = document.querySelector<HTMLCanvasElement>("#trail")!;
const cursorEl = document.querySelector<HTMLDivElement>("#cursor")!;
const whisperEl = document.querySelector<HTMLParagraphElement>("#whisper")!;
const hintEl = document.querySelector<HTMLParagraphElement>("#hint")!;
const presenceEl = document.querySelector<HTMLElement>("#presence")!;
const soundEl = document.querySelector<HTMLButtonElement>("#sound")!;
const hitsEl = document.querySelector<HTMLDivElement>("#hits")!;

const simple = isMobileGpu();
const maze = new Maze(canvas);
const trail = new GestureTrail(trailCanvas);
const sound = new HubSound();
const clock = new PresenceClock();
const whisper = bindWhisper(whisperEl);
bindSoundToggle(soundEl, sound);

const visited = openedGates();
const pointer = { x: innerWidth * 0.5, y: innerHeight * 0.5, tx: innerWidth * 0.5, ty: innerHeight * 0.5 };
let lastTs = performance.now();
let raf = 0;
let lineI = -1;
let revealed: number[] = [];
let hover = -1;
let hold = 0;
let holding = false;
let lastSlit = 0;
let choiceHinted = false;
let lastHoverSound = -1;
let drag: { id: number; x: number; y: number; moved: boolean; vx: number; vy: number; t: number } | null = null;
let panHinted = false;

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
    });
    hitsEl.append(a);
  }
}

function placeHits() {
  const nodes = hitsEl.querySelectorAll<HTMLAnchorElement>("a");
  nodes.forEach((a, i) => {
    const on = revealed.includes(i) && maze.gateOnScreen(i, 48);
    a.classList.toggle("is-on", on);
    a.tabIndex = on ? 0 : -1;
    const p = maze.gatePos(i);
    a.style.transform = `translate3d(${p.x}px, ${p.y}px, 0)`;
  });
}

function revealVisible() {
  let added = false;
  for (let i = 0; i < GATES.length; i++) {
    if (revealed.includes(i)) continue;
    if (!maze.gateOnScreen(i, 36)) continue;
    revealed.push(i);
    added = true;
  }
  if (added) {
    maze.pulse = Math.max(maze.pulse, 0.55);
    if (!choiceHinted) {
      choiceHinted = true;
      hintEl.textContent = "коснись · выбери";
      hintEl.classList.remove("is-gone");
      window.setTimeout(() => hintEl.classList.add("is-gone"), 11400);
    }
  }
}

function resize() {
  const dpr = dprCap(1.5, 1);
  maze.resize(innerWidth, innerHeight, dpr);
  trail.resize(innerWidth, innerHeight, dpr);
  placeHits();
}

function showLine(i: number) {
  whisper.show(LINES[i], LINE_DUR);
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
  const i = maze.hitIndex(pointer.tx, pointer.ty, revealed);
  if (i >= 0) {
    markOpened(GATES[i].id);
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
    maze.pan(-e.deltaX, -e.deltaY);
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

  maze.zoomTo(elapsed, reduced);

  const nextLine = lineI + 1;
  const at = FIRST_LINE + nextLine * LINE_STEP;
  if (nextLine < LINES.length && elapsed >= at) {
    lineI = nextLine;
    showLine(lineI);
  }

  if (!panHinted && elapsed > (reduced ? 2200 : 4000) && revealed.length === 0) {
    panHinted = true;
    hintEl.textContent = "веди · скролль";
    hintEl.classList.remove("is-gone");
    window.setTimeout(() => {
      if (!choiceHinted) hintEl.classList.add("is-gone");
    }, 10200);
  }

  revealVisible();
  placeHits();

  const hit = maze.hitIndex(pointer.x, pointer.y, revealed);
  if (hit !== hover) hover = hit;
  cursorEl.classList.toggle("is-ring", hit >= 0);
  cursorEl.style.transform = `translate3d(${pointer.x}px, ${pointer.y}px, 0)`;

  if (sound.enabled && hit !== lastHoverSound) {
    lastHoverSound = hit;
    if (hit >= 0) sound.hover(true, GATES[hit].freq);
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
    hover: hit,
    visited,
    hold,
    simple,
        awake: Math.min(1, elapsed / (reduced ? 22000 : 40000)),
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
resize();
hintEl.classList.add("is-gone");
raf = requestAnimationFrame(tick);

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    cancelAnimationFrame(raf);
    clock.dispose();
  });
}
