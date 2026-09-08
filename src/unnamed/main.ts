import "./style.css";
import { PresenceClock, writeClock } from "../clock";
import { Tiles } from "./tiles";
import { Glass } from "./glass";
import { mosaicGrid, mosaicGridSync, preloadMosaics, rasterDisplay, WORKS } from "./works";
import { bindSoundToggle } from "../shared/sound-toggle";
import { GestureTrail } from "../shared/trail";
import { bindWhisper, isChromeTarget } from "../shared/whisper";
import { reducedMotion } from "../shared/gpu";

const MEANING = ["Ничто, кроме души, недостойно восхищения", "а для великой души всё меньше неё"];

const reduced = reducedMotion();
const { cols, rows } = rasterDisplay();
const count = cols * rows;

const canvas = document.querySelector<HTMLCanvasElement>("#mosaic")!;
const trailCanvas = document.querySelector<HTMLCanvasElement>("#trail")!;
const captionEl = document.querySelector<HTMLElement>("#caption")!;
const titleEl = document.querySelector<HTMLElement>("#work-title")!;
const metaEl = document.querySelector<HTMLElement>("#work-meta")!;
const hintEl = document.querySelector<HTMLElement>("#hint")!;
const cursorEl = document.querySelector<HTMLDivElement>("#cursor")!;
const whisperEl = document.querySelector<HTMLParagraphElement>("#whisper")!;
const presenceEl = document.querySelector<HTMLElement>("#presence")!;
const soundEl = document.querySelector<HTMLButtonElement>("#sound")!;

const tiles = new Tiles(canvas, count);
const glass = new Glass();
const trail = new GestureTrail(trailCanvas);
const clock = new PresenceClock();
const whisper = bindWhisper(whisperEl);
bindSoundToggle(soundEl, glass);

const pose = new Float32Array(count * 4);
const color = new Float32Array(count * 4);
const x = new Float32Array(count);
const y = new Float32Array(count);
const vx = new Float32Array(count);
const vy = new Float32Array(count);
const rot = new Float32Array(count);
const vr = new Float32Array(count);
const tx = new Float32Array(count);
const ty = new Float32Array(count);
const cr = new Float32Array(count);
const cg = new Float32Array(count);
const cb = new Float32Array(count);
const tr = new Float32Array(count);
const tg = new Float32Array(count);
const tb = new Float32Array(count);
const delay = new Float32Array(count);
const shine = new Float32Array(count);
const rooted = new Uint8Array(count);

type Phase = "chaos" | "hold" | "burst";
let work = 0;
let phase: Phase = "chaos";
let phaseAt = performance.now();
let raf = 0;
let lastTs = performance.now();
let pointer = { x: innerWidth / 2, y: innerHeight / 2 };
let dpr = 1;
let cell = 12;
let clicks = 0;
const need = reduced ? 3 : 6;
let assembledOnce = false;
let meaningStep = 0;
let switchAt = 0;

function layout() {
  dpr = tiles.resize(innerWidth, innerHeight);
  trail.resize(innerWidth, innerHeight, dpr);
  const w = innerWidth;
  const h = innerHeight;
  const padX = Math.min(w, h) * 0.07;
  const padY = Math.min(w, h) * 0.1;
  const availW = w - padX * 2;
  const availH = h - padY * 2;
  const aspect = cols / rows;
  let mw: number;
  let mh: number;
  if (availW / availH > aspect) {
    mh = availH;
    mw = mh * aspect;
  } else {
    mw = availW;
    mh = mw / aspect;
  }
  const ox = (w - mw) / 2;
  const oy = (h - mh) / 2 - 8;
  const cw = mw / cols;
  const ch = mh / rows;
  cell = Math.min(cw, ch);
  for (let i = 0; i < count; i++) {
    const col = i % cols;
    const row = (i / cols) | 0;
    tx[i] = (ox + (col + 0.5) * cw) * dpr;
    ty[i] = (oy + (row + 0.5) * ch) * dpr;
  }
}

function applyGrid(rgb: Uint8Array, scatter: boolean) {
  for (let i = 0; i < count; i++) {
    tr[i] = rgb[i * 3] / 255;
    tg[i] = rgb[i * 3 + 1] / 255;
    tb[i] = rgb[i * 3 + 2] / 255;
    const col = i % cols;
    const rowI = (i / cols) | 0;
    delay[i] = Math.hypot(col - cols * 0.5, rowI - rows * 0.5) * 0.018 + ((i * 17) % 23) * 0.01;
    shine[i] = 0.55 + ((i * 13) % 10) * 0.04;
    rooted[i] = 0;
    if (scatter) {
      const a = i * 0.47 + Math.random() * 0.4;
      const rad = Math.min(innerWidth, innerHeight) * (0.22 + ((i * 31) % 20) * 0.04);
      x[i] = innerWidth * 0.5 * dpr + Math.cos(a) * rad * dpr;
      y[i] = innerHeight * 0.5 * dpr + Math.sin(a * 1.13) * rad * 0.78 * dpr;
      vx[i] = Math.sin(a * 2.1) * 140 * dpr;
      vy[i] = Math.cos(a * 1.7) * 140 * dpr;
      rot[i] = (a % 2) - 1;
      vr[i] = Math.sin(i) * 2.2;
      cr[i] = tr[i];
      cg[i] = tg[i];
      cb[i] = tb[i];
    }
  }
}

function paintWork(index: number, scatter: boolean) {
  const w = WORKS[index];
  titleEl.textContent = w.title;
  metaEl.textContent = w.meta;
  captionEl.classList.toggle("is-on", phase === "hold");
  const cached = mosaicGridSync(w);
  if (cached) {
    applyGrid(cached.data, scatter);
    return;
  }
  void mosaicGrid(w).then((g) => {
    if (work !== index) return;
    applyGrid(g.data, scatter);
  });
}

function setPhase(next: Phase) {
  phase = next;
  phaseAt = performance.now();
  captionEl.classList.toggle("is-on", next === "hold");
  if (next === "hold") {
    hintEl.textContent = "коснись · следующая картина";
    hintEl.classList.remove("is-gone");
    if (!assembledOnce) {
      assembledOnce = true;
      meaningStep = 1;
      whisper.show(MEANING[0], 5200);
      window.setTimeout(() => {
        if (meaningStep === 1) {
          meaningStep = 2;
          whisper.show(MEANING[1], 5200);
        }
      }, reduced ? 2800 : 5600);
    }
  } else {
    hintEl.textContent = "коснись · собери";
  }
}

function plantChunk() {
  if (phase !== "chaos") return;
  clicks += 1;
  const target = Math.min(count, Math.ceil((clicks / need) * count));
  const order = Array.from({ length: count }, (_, i) => i).sort((a, b) => delay[a] - delay[b]);
  let have = 0;
  for (let i = 0; i < count; i++) if (rooted[i]) have += 1;
  for (const i of order) {
    if (have >= target) break;
    if (!rooted[i]) {
      rooted[i] = 1;
      have += 1;
    }
  }
  if (clicks >= need) {
    for (let i = 0; i < count; i++) rooted[i] = 1;
  }
  glass.clink();
}

function nextWork() {
  const now = performance.now();
  if (now - switchAt < 700) return;
  switchAt = now;
  work = (work + 1) % WORKS.length;
  clicks = 0;
  paintWork(work, false);
  if (reduced) {
    for (let i = 0; i < count; i++) {
      cr[i] = tr[i];
      cg[i] = tg[i];
      cb[i] = tb[i];
      x[i] = tx[i];
      y[i] = ty[i];
      rot[i] = 0;
      rooted[i] = 1;
    }
    clicks = need;
    setPhase("hold");
    return;
  }
  setPhase("burst");
}

function tick(now: number) {
  const dt = Math.min(0.05, Math.max(0, now - lastTs) / 1000);
  lastTs = now;
  const t = (now - phaseAt) / 1000;
  const mx = pointer.x * dpr;
  const my = pointer.y * dpr;
  const size = cell * dpr * (phase === "hold" ? 0.47 : 0.44);
  let drift = 0;
  let rootedN = 0;

  for (let i = 0; i < count; i++) {
    cr[i] += (tr[i] - cr[i]) * (reduced ? 1 : 0.08);
    cg[i] += (tg[i] - cg[i]) * (reduced ? 1 : 0.08);
    cb[i] += (tb[i] - cb[i]) * (reduced ? 1 : 0.08);

    const dxm = x[i] - mx;
    const dym = y[i] - my;
    const md = Math.hypot(dxm, dym) + 0.001;
    const falloff = Math.exp(-md / (90 * dpr));
    const push = 16 * dpr;

    if (rooted[i] && phase !== "burst") {
      rootedN += 1;
      const k = phase === "hold" ? 18 : 12;
      vx[i] += (tx[i] - x[i]) * k * dt;
      vy[i] += (ty[i] - y[i]) * k * dt;
      vr[i] += -rot[i] * 6 * dt;
      if (phase === "hold") {
        const breathe = Math.sin(now * 0.0018 + i * 0.05) * 0.4 * dpr;
        x[i] += breathe * dt * 20;
      }
    } else if (phase === "burst") {
      const a = Math.atan2(y[i] - innerHeight * 0.5 * dpr, x[i] - innerWidth * 0.5 * dpr);
      vx[i] += Math.cos(a) * 520 * dpr * dt;
      vy[i] += Math.sin(a) * 520 * dpr * dt;
      vr[i] += (i % 2 ? 1 : -1) * 8 * dt;
    } else {
      const swirl = now * 0.0011 + i * 0.02;
      vx[i] += Math.cos(swirl) * 48 * dpr * dt;
      vy[i] += Math.sin(swirl * 1.25) * 48 * dpr * dt;
      vx[i] += (innerWidth * 0.5 * dpr - x[i]) * 0.08 * dt;
      vy[i] += (innerHeight * 0.5 * dpr - y[i]) * 0.08 * dt;
      vx[i] += (dxm / md) * push * falloff * dt;
      vy[i] += (dym / md) * push * falloff * dt;
    }

    vx[i] *= 0.9;
    vy[i] *= 0.9;
    vr[i] *= 0.96;
    x[i] += vx[i] * dt;
    y[i] += vy[i] * dt;
    rot[i] += vr[i] * dt;

    if (rooted[i] && phase !== "burst") drift += Math.hypot(x[i] - tx[i], y[i] - ty[i]);

    const o = i * 4;
    pose[o] = x[i];
    pose[o + 1] = y[i];
    pose[o + 2] = rot[i];
    pose[o + 3] = size * (0.92 + shine[i] * 0.08);
    color[o] = cr[i];
    color[o + 1] = cg[i];
    color[o + 2] = cb[i];
    color[o + 3] = phase === "hold" ? 1 : 0.75 + shine[i] * 0.2;
  }

  if (
    phase === "chaos" &&
    rootedN === count &&
    ((t > 0.8 && drift / count < 3.2 * dpr) || t > 2.8)
  ) {
    setPhase("hold");
  } else if (phase === "burst" && t > 1.2) {
    paintWork(work, true);
    setPhase("chaos");
  }

  glass.rustle(phase === "chaos" ? 1 : 0.15);
  cursorEl.style.transform = `translate3d(${pointer.x}px, ${pointer.y}px, 0)`;
  writeClock(presenceEl, clock.elapsed());
  trail.step(dt);
  trail.draw();
  whisper.tick(now);
  tiles.draw(pose, color);
  raf = requestAnimationFrame(tick);
}

const ac = new AbortController();
const on = { signal: ac.signal };

window.addEventListener(
  "pointermove",
  (e) => {
    pointer.x = e.clientX;
    pointer.y = e.clientY;
    trail.stamp(e.clientX, e.clientY);
  },
  on,
);

window.addEventListener(
  "pointerdown",
  (e) => {
    if (isChromeTarget(e.target)) return;
    pointer.x = e.clientX;
    pointer.y = e.clientY;
    trail.stamp(e.clientX, e.clientY, 1.4);
    if (phase === "hold") nextWork();
    else if (phase === "chaos") plantChunk();
  },
  on,
);

window.addEventListener(
  "keydown",
  (e) => {
    if (e.key === "ArrowRight" || e.key === " ") {
      e.preventDefault();
      if (phase === "hold") nextWork();
      else plantChunk();
    }
  },
  on,
);

window.addEventListener(
  "resize",
  () => {
    layout();
    if (phase === "hold") {
      for (let i = 0; i < count; i++) {
        x[i] = tx[i];
        y[i] = ty[i];
      }
    }
  },
  on,
);

window.addEventListener(
  "visibilitychange",
  () => {
    cancelAnimationFrame(raf);
    glass.setMuted(document.hidden);
    if (!document.hidden) {
      lastTs = performance.now();
      raf = requestAnimationFrame(tick);
    }
  },
  on,
);

layout();
hintEl.textContent = "коснись · собери";
for (let i = 0; i < count; i++) {
  const a = i * 0.47;
  const rad = Math.min(innerWidth, innerHeight) * (0.22 + ((i * 31) % 20) * 0.04);
  x[i] = innerWidth * 0.5 * dpr + Math.cos(a) * rad * dpr;
  y[i] = innerHeight * 0.5 * dpr + Math.sin(a * 1.13) * rad * 0.78 * dpr;
  cr[i] = cg[i] = cb[i] = 0.12;
  tr[i] = tg[i] = tb[i] = 0.12;
}
raf = requestAnimationFrame(tick);
void preloadMosaics().then(() => paintWork(0, true));

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    cancelAnimationFrame(raf);
    ac.abort();
    clock.dispose();
  });
}
