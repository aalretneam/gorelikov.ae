import "./style.css";
import { PresenceClock, writeClock } from "../clock";
import { dprCap, reducedMotion } from "../shared/gpu";
import { bindSoundToggle } from "../shared/sound-toggle";
import { GestureTrail } from "../shared/trail";
import { bindWhisper, isChromeTarget } from "../shared/whisper";
import { BehindSound } from "./sound";
import { Wake } from "./wake";

const LINES = [
  "смерть мы видим впереди",
  "большая часть её у нас за плечами",
  "сколько минуло — принадлежит смерти",
];

const canvas = document.querySelector<HTMLCanvasElement>("#world")!;
const trailCanvas = document.querySelector<HTMLCanvasElement>("#trail")!;
const cursorEl = document.querySelector<HTMLDivElement>("#cursor")!;
const whisperEl = document.querySelector<HTMLParagraphElement>("#whisper")!;
const hintEl = document.querySelector<HTMLParagraphElement>("#hint")!;
const presenceEl = document.querySelector<HTMLElement>("#presence")!;
const soundEl = document.querySelector<HTMLButtonElement>("#sound")!;

const reduced = reducedMotion();
const wake = new Wake(canvas);
const trail = new GestureTrail(trailCanvas);
const sound = new BehindSound();
const clock = new PresenceClock();
const whisper = bindWhisper(whisperEl);
bindSoundToggle(soundEl, sound);

const pointer = { x: innerWidth * 0.5, y: innerHeight * 0.5 };
let lastTs = performance.now();
let raf = 0;
let lineI = 0;
let nextLine = reduced ? 7 : 16;
let hinted = false;

function resize() {
  const dpr = dprCap();
  wake.resize(innerWidth, innerHeight, dpr);
  trail.resize(innerWidth, innerHeight, dpr);
}

window.addEventListener("pointermove", (e) => {
  pointer.x = e.clientX;
  pointer.y = e.clientY;
  trail.stamp(e.clientX, e.clientY);
  if (!hinted) {
    hinted = true;
    hintEl.classList.add("is-gone");
  }
});

window.addEventListener("pointerdown", (e) => {
  if (isChromeTarget(e.target)) return;
  cursorEl.classList.add("is-hold");
  trail.stamp(e.clientX, e.clientY, 1.5);
});

window.addEventListener("pointerup", () => {
  cursorEl.classList.remove("is-hold");
});

window.addEventListener("resize", resize);

function tick(now: number) {
  const dt = Math.min(0.05, Math.max(0, now - lastTs) / 1000);
  lastTs = now;
  const elapsed = clock.elapsed();
  writeClock(presenceEl, elapsed);
  const look = wake.step(dt, pointer.x, pointer.y, elapsed / 1000);
  wake.draw(look.back);
  trail.step(dt);
  trail.draw();
  sound.setLook(look.forward, look.back);
  if (elapsed / 1000 >= nextLine && lineI < LINES.length && !whisper.busy(now)) {
    whisper.show(LINES[lineI], reduced ? 7800 : 10600);
    lineI += 1;
    nextLine += reduced ? 14 : 25;
  }
  whisper.tick(now);
  cursorEl.style.transform = `translate3d(${pointer.x}px, ${pointer.y}px, 0)`;
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

resize();
raf = requestAnimationFrame(tick);

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    cancelAnimationFrame(raf);
    clock.dispose();
  });
}
