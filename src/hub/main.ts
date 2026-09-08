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
const ROOMS_AT = reduced ? 60_000 : 120_000;
const FIRST_LINE = reduced ? 7000 : 14000;
const LINE_STEP = reduced ? 8000 : 16000;
const LINE_DUR = reduced ? 4500 : 8000;

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
let roomsOpened = false;
let lastHoverSound = -1;

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
    const on = revealed.includes(i);
    a.classList.toggle("is-on", on);
    a.tabIndex = on ? 0 : -1;
    const p = maze.gatePos(i);
    a.style.transform = `translate3d(${p.x}px, ${p.y}px, 0)`;
  });
}

function openRooms() {
  if (roomsOpened) return;
  roomsOpened = true;
  revealed = GATES.map((_, i) => i);
  placeHits();
  maze.pulse = 1;
  if (!choiceHinted) {
    choiceHinted = true;
    hintEl.textContent = "коснись · выбери";
    hintEl.classList.remove("is-gone");
    window.setTimeout(() => hintEl.classList.add("is-gone"), 6400);
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
});

window.addEventListener("pointerdown", (e) => {
  if (isChromeTarget(e.target) && !(e.target as HTMLElement).closest("#hits")) return;
  onPointer(e.clientX, e.clientY);
  holding = true;
  cursorEl.classList.add("is-hold");
  if ((e.target as HTMLElement).closest("#hits")) return;
  const i = maze.hitIndex(pointer.tx, pointer.ty, revealed);
  if (i >= 0) {
    markOpened(GATES[i].id);
    window.location.href = GATES[i].href;
    return;
  }
  maze.ripple(pointer.tx, pointer.ty);
  e.preventDefault();
});

window.addEventListener("pointerup", () => {
  holding = false;
  cursorEl.classList.remove("is-hold");
});

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

  const nextLine = lineI + 1;
  const at = FIRST_LINE + nextLine * LINE_STEP;
  if (nextLine < LINES.length && elapsed >= at) {
    lineI = nextLine;
    showLine(lineI);
  }

  if (elapsed >= ROOMS_AT) openRooms();

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

  maze.step(dt, pointer.x, pointer.y);
  maze.draw({
    mx: pointer.x,
    my: pointer.y,
    reveal: revealed,
    hover: hit,
    visited,
    hold,
    simple,
    awake: Math.min(1, elapsed / ROOMS_AT),
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
