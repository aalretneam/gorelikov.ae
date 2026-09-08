import "../style.css";
import { PresenceClock, writeClock } from "../clock";
import { Field } from "../field";
import { Organism } from "../organism";
import { Soundscape } from "../sound";
import { mixPalette, palettes } from "../palettes";
import { gpuScale } from "../shared/gpu";
import { bindSoundToggle, SOUND_OFF, SOUND_ON } from "../shared/sound-toggle";
import { bindWhisper, isChromeTarget } from "../shared/whisper";
import { bind as bindTrace } from "../shared/trace";
import { bindBack } from "../shared/back";

const fieldCanvas = document.querySelector<HTMLCanvasElement>("#field")!;
const dustCanvas = document.querySelector<HTMLCanvasElement>("#dust")!;
const cursorEl = document.querySelector<HTMLDivElement>("#cursor")!;
const whisperEl = document.querySelector<HTMLParagraphElement>("#whisper")!;
const presenceEl = document.querySelector<HTMLElement>("#presence")!;
const soundEl = document.querySelector<HTMLButtonElement>("#sound")!;

const scale = gpuScale();
const field = new Field(fieldCanvas);
const organism = new Organism(
  dustCanvas,
  Math.max(400, Math.floor(Math.min(4800, Math.floor((innerWidth * innerHeight) / 280)) * scale)),
);
const sound = new Soundscape();
bindSoundToggle(soundEl, sound);
bindTrace("field");
bindBack(document.querySelector("#back"), 30_000);

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
let nextDrift = 18000;
let reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
const whisper = bindWhisper(whisperEl);
whisper.play(
  [
    "Жди еще немного..",
    "и это станет твоим..",
    "Не ищи цель",
    "ищи смысл...",
    "Живи с людьми так, будто на тебя смотрит Бог,\nговори с Богом так, будто тебя слушают люди..",
  ],
    { hold: reduced ? 2500 : 5200, stayLast: true },
);

function toShaderPoint(x: number, y: number): [number, number] {
  const min = Math.min(innerWidth, innerHeight);
  return [(x - innerWidth * 0.5) / min, -(y - innerHeight * 0.5) / min];
}

function resize() {
  field.resize(innerWidth, innerHeight);
  organism.resize(innerWidth, innerHeight);
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
}

function onDown() {
  holding = true;
  cursorEl.classList.add("is-hold");
  lastClick = 0;
  organism.burst(pointer.tx, pointer.ty, 6 + energy * 6);
  sound.pluck();
}

function onUp() {
  holding = false;
  cursorEl.classList.remove("is-hold");
}

window.addEventListener("pointermove", (e) => {
  onPointer(e.clientX, e.clientY);
});

window.addEventListener("pointerdown", (e) => {
  if (isChromeTarget(e.target)) return;
  onPointer(e.clientX, e.clientY);
  onDown();
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
  }
  if (e.key === "m" || e.key === "M") {
    void sound.toggle();
    soundEl.textContent = sound.enabled ? SOUND_ON : SOUND_OFF;
    soundEl.setAttribute("aria-pressed", sound.enabled ? "true" : "false");
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

  whisper.tick(now);

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
  sound.setMuted(document.hidden);
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
