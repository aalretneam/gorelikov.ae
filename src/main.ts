import "./style.css";
import { PresenceClock, writeClock } from "./clock";
import { Field } from "./field";
import { Organism } from "./organism";
import { Soundscape } from "./sound";
import { mixPalette, palettes } from "./palettes";

const QUEST = [
  { at: 22, text: "жди ещё немного", before: "", glyph: "ж", after: "ди ещё немного" },
  { at: 78, text: "и это уже твоё", before: "", glyph: "и", after: " это уже твоё" },
  { at: 138, text: "здесь нет цели", before: "", glyph: "з", after: "десь нет цели" },
  { at: 198, text: "не уходи сразу", before: "", glyph: "н", after: "е уходи сразу" },
  { at: 258, text: "лишь останься", before: "лиш", glyph: "ь", after: " останься" },
];

const fieldCanvas = document.querySelector<HTMLCanvasElement>("#field")!;
const dustCanvas = document.querySelector<HTMLCanvasElement>("#dust")!;
const cursorEl = document.querySelector<HTMLDivElement>("#cursor")!;
const hintEl = document.querySelector<HTMLParagraphElement>("#hint")!;
const whisperEl = document.querySelector<HTMLParagraphElement>("#whisper")!;
const presenceEl = document.querySelector<HTMLElement>("#presence")!;
const doorEl = document.querySelector<HTMLAnchorElement>("#door")!;
const lifeEl = document.querySelector<HTMLOListElement>("#life")!;

const field = new Field(fieldCanvas);
const organism = new Organism(dustCanvas);
const sound = new Soundscape();

const pointer = { x: innerWidth * 0.5, y: innerHeight * 0.5, tx: innerWidth * 0.5, ty: innerHeight * 0.5 };
const core = { x: innerWidth * 0.5, y: innerHeight * 0.5 };
let hold = 0;
let holding = false;
let idle = 0;
let energy = 0;
let lastMove = performance.now();
let lastClick = 10;
let paletteMix = 0;
let targetPalette = 0;
let paletteSpeed = 0.01;
let zoom = 1;
let targetZoom = 1;
const clock = new PresenceClock();
let lastTs = performance.now();
let raf = 0;
let whisperUntil = 0;
let nextDrift = 18000;
let hinted = false;
let entered = false;
let doorOpened = false;
let lifeOpened = false;
let questIndex = 0;
let reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
const DOOR_AFTER_MS = 5 * 60 * 1000;

function toShaderPoint(x: number, y: number): [number, number] {
  const min = Math.min(innerWidth, innerHeight);
  return [(x - innerWidth * 0.5) / min, -(y - innerHeight * 0.5) / min];
}

function resize() {
  field.resize(innerWidth, innerHeight);
  organism.resize(innerWidth, innerHeight);
}

function showWhisper(text: string, duration = 3200) {
  whisperEl.textContent = text;
  whisperEl.classList.remove("is-off");
  whisperEl.classList.add("is-on");
  whisperUntil = performance.now() + duration;
}

function hideWhisper() {
  whisperEl.classList.remove("is-on");
  whisperEl.classList.add("is-off");
}

for (const line of QUEST) {
  const li = document.createElement("li");
  const before = document.createElement("span");
  const glyph = document.createElement("span");
  const after = document.createElement("span");
  before.className = "life-before";
  glyph.className = "life-glyph";
  after.className = "life-after";
  before.textContent = line.before;
  glyph.textContent = line.glyph;
  after.textContent = line.after;
  li.append(before, glyph, after);
  lifeEl.append(li);
}

function revealLife() {
  if (lifeOpened) return;
  lifeOpened = true;
  hideWhisper();
  lifeEl.classList.add("is-open");
  lifeEl.removeAttribute("aria-hidden");
}

function onPointer(x: number, y: number) {
  const dx = x - pointer.tx;
  const dy = y - pointer.ty;
  const speed = Math.hypot(dx, dy);
  energy = Math.min(1, energy * 0.85 + speed * 0.02);
  pointer.tx = x;
  pointer.ty = y;
  lastMove = performance.now();
  idle = 0;
  if (!hinted) {
    hinted = true;
    hintEl.classList.add("is-gone");
  }
}

async function onDown() {
  holding = true;
  cursorEl.classList.add("is-hold");
  lastClick = 0;
  organism.burst(pointer.tx, pointer.ty, 6 + energy * 6);
  sound.pluck();
  if (!entered) {
    entered = true;
    await sound.start();
    hintEl.textContent = "1–4 палитры · колёсико · пробел";
    hintEl.classList.remove("is-gone");
    window.setTimeout(() => hintEl.classList.add("is-gone"), 4200);
  }
}

function onUp() {
  holding = false;
  cursorEl.classList.remove("is-hold");
}

window.addEventListener("pointermove", (e) => {
  onPointer(e.clientX, e.clientY);
});

window.addEventListener("pointerdown", (e) => {
  if ((e.target as HTMLElement).closest(".door")) return;
  onPointer(e.clientX, e.clientY);
  void onDown();
  e.preventDefault();
});

window.addEventListener("pointerup", onUp);
window.addEventListener("pointercancel", onUp);

window.addEventListener(
  "wheel",
  (e) => {
    e.preventDefault();
    targetZoom = Math.min(1.85, Math.max(0.55, targetZoom + e.deltaY * 0.0007));
    idle = 0;
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

window.addEventListener("keydown", (e) => {
  if (e.code === "Space") {
    e.preventDefault();
    reduced = !reduced;
  }
  if (e.key >= "1" && e.key <= "4") {
    targetPalette = Number(e.key) - 1;
    paletteMix = targetPalette;
    paletteSpeed = 0.12;
    if (!lifeOpened) {
      showWhisper(["фиолетовое море", "янтарный жар", "глубокая вода", "ночной цветок"][targetPalette], 1800);
    }
  }
  if (e.key === "m" || e.key === "M") {
    void sound.toggle();
  }
});

window.addEventListener("resize", resize);
resize();

function tick(now: number) {
  const elapsed = clock.elapsed();
  const dt = Math.min(0.05, Math.max(0, now - lastTs) / 1000);
  lastTs = now;
  const presence = elapsed / 1000;

  pointer.x += (pointer.tx - pointer.x) * (reduced ? 1 : 0.12);
  pointer.y += (pointer.ty - pointer.y) * (reduced ? 1 : 0.12);
  core.x += (pointer.x - core.x) * (reduced ? 0.2 : 0.035);
  core.y += (pointer.y - core.y) * (reduced ? 0.2 : 0.035);
  zoom += (targetZoom - zoom) * 0.04;
  hold += ((holding ? 1 : 0) - hold) * 0.08;
  energy *= 0.96;
  lastClick += dt;
  idle = (now - lastMove) / 1000;

  if (now > nextDrift) {
    targetPalette = (targetPalette + 1) % palettes.length;
    paletteSpeed = 0.01;
    nextDrift = now + 22000 + Math.random() * 18000;
  }
  paletteMix += (targetPalette - paletteMix) * paletteSpeed;
  paletteSpeed += (0.01 - paletteSpeed) * 0.02;
  const from = palettes[Math.floor(paletteMix) % palettes.length];
  const to = palettes[Math.ceil(paletteMix) % palettes.length];
  const palette = mixPalette(from, to, paletteMix % 1);

  if (!lifeOpened && questIndex < QUEST.length && presence >= QUEST[questIndex].at) {
    showWhisper(QUEST[questIndex].text, reduced ? 2200 : 5200);
    questIndex += 1;
  }
  if (whisperUntil && now > whisperUntil) {
    hideWhisper();
    whisperUntil = 0;
  }

  if (!lifeOpened && elapsed >= DOOR_AFTER_MS) revealLife();

  if (!doorOpened && elapsed >= DOOR_AFTER_MS) {
    doorOpened = true;
    doorEl.classList.add("is-open");
    doorEl.removeAttribute("aria-hidden");
    doorEl.tabIndex = 0;
  }

  cursorEl.style.transform = `translate3d(${pointer.x}px, ${pointer.y}px, 0)`;
  writeClock(presenceEl, elapsed);

  const mouse = toShaderPoint(pointer.x, pointer.y);
  const coreP = toShaderPoint(core.x, core.y);

  field.draw({
    time: now / 1000,
    mouse,
    core: coreP,
    click: lastClick,
    hold,
    idle,
    energy,
    presence,
    zoom,
    void: palette.void,
    a: palette.a,
    b: palette.b,
    c: palette.c,
  });

  organism.step(dt, pointer.x, pointer.y, hold, energy, idle);
  organism.draw(palette.dust, energy);
  sound.setMotion(pointer.x / innerWidth, 1 - pointer.y / innerHeight, energy, hold);

  raf = requestAnimationFrame(tick);
}

window.addEventListener("visibilitychange", () => {
  cancelAnimationFrame(raf);
  if (!document.hidden) {
    lastTs = performance.now();
    raf = requestAnimationFrame(tick);
  }
});

raf = requestAnimationFrame(tick);

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    cancelAnimationFrame(raf);
    clock.dispose();
  });
}

if (import.meta.env.DEV) {
  Object.assign(window, { revealLife });
}
