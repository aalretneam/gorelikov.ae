import "./style.css";
import { PresenceClock, writeClock } from "../clock";
import { dprCap, reducedMotion } from "../shared/gpu";
import { bindSoundToggle } from "../shared/sound-toggle";
import { GestureTrail } from "../shared/trail";
import { bindWhisper, isChromeTarget } from "../shared/whisper";
import { Mass } from "./mass";
import { WantSound } from "./sound";

const LINES = ["беден не тот, у кого мало", "а тот, кто хочет иметь больше"];

const canvas = document.querySelector<HTMLCanvasElement>("#world")!;
const trailCanvas = document.querySelector<HTMLCanvasElement>("#trail")!;
const cursorEl = document.querySelector<HTMLDivElement>("#cursor")!;
const whisperEl = document.querySelector<HTMLParagraphElement>("#whisper")!;
const hintEl = document.querySelector<HTMLParagraphElement>("#hint")!;
const presenceEl = document.querySelector<HTMLElement>("#presence")!;
const soundEl = document.querySelector<HTMLButtonElement>("#sound")!;

const reduced = reducedMotion();
const mass = new Mass(canvas);
const trail = new GestureTrail(trailCanvas);
const sound = new WantSound();
const clock = new PresenceClock();
const whisper = bindWhisper(whisperEl);
bindSoundToggle(soundEl, sound);

const pointer = { x: innerWidth * 0.5, y: innerHeight * 0.5 };
let holding = false;
let holdT = 0;
let lastTs = performance.now();
let raf = 0;
let lineI = 0;
let nextLine = reduced ? 8 : 18;
let hinted = false;

function resize() {
  const dpr = dprCap();
  mass.resize(innerWidth, innerHeight, dpr);
  trail.resize(innerWidth, innerHeight, dpr);
}

window.addEventListener("pointermove", (e) => {
  pointer.x = e.clientX;
  pointer.y = e.clientY;
  trail.stamp(e.clientX, e.clientY);
  mass.feed(e.clientX, e.clientY, 0.35);
  if (!hinted) {
    hinted = true;
    hintEl.classList.add("is-gone");
  }
});

window.addEventListener("pointerdown", (e) => {
  if (isChromeTarget(e.target)) return;
  holding = true;
  holdT = 0;
  cursorEl.classList.add("is-hold");
  mass.feed(e.clientX, e.clientY, 1.2);
  trail.stamp(e.clientX, e.clientY, 1.6);
});

window.addEventListener("pointerup", () => {
  if (holding && holdT >= 2) {
    mass.exhale();
    sound.exhale();
  }
  holding = false;
  holdT = 0;
  cursorEl.classList.remove("is-hold");
});

window.addEventListener("resize", resize);

function tick(now: number) {
  const dt = Math.min(0.05, Math.max(0, now - lastTs) / 1000);
  lastTs = now;
  const elapsed = clock.elapsed();
  writeClock(presenceEl, elapsed);
  if (holding) holdT += dt;

  if (elapsed / 1000 >= nextLine && lineI < LINES.length && !whisper.busy(now)) {
    whisper.show(LINES[lineI], reduced ? 7800 : 10200);
    lineI += 1;
    nextLine += reduced ? 15 : 27;
  }

  mass.step(dt);
  mass.draw();
  trail.step(dt);
  trail.draw([232, 140, 110]);
  sound.setMass(mass.mass);
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
