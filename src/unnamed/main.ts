import "./style.css";
import { Tiles } from "./tiles";
import { Glass } from "./glass";
import { COLS, COUNT, ROWS, WORKS, raster } from "./works";

const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
const canvas = document.querySelector<HTMLCanvasElement>("#mosaic")!;
const captionEl = document.querySelector<HTMLElement>("#caption")!;
const titleEl = document.querySelector<HTMLElement>("#work-title")!;
const metaEl = document.querySelector<HTMLElement>("#work-meta")!;
const hintEl = document.querySelector<HTMLElement>("#hint")!;
const cursorEl = document.querySelector<HTMLDivElement>("#cursor")!;
const tiles = new Tiles(canvas, COUNT);
const glass = new Glass();

const pose = new Float32Array(COUNT * 4);
const color = new Float32Array(COUNT * 4);
const x = new Float32Array(COUNT);
const y = new Float32Array(COUNT);
const vx = new Float32Array(COUNT);
const vy = new Float32Array(COUNT);
const rot = new Float32Array(COUNT);
const vr = new Float32Array(COUNT);
const tx = new Float32Array(COUNT);
const ty = new Float32Array(COUNT);
const cr = new Float32Array(COUNT);
const cg = new Float32Array(COUNT);
const cb = new Float32Array(COUNT);
const tr = new Float32Array(COUNT);
const tg = new Float32Array(COUNT);
const tb = new Float32Array(COUNT);
const delay = new Float32Array(COUNT);
const shine = new Float32Array(COUNT);

type Phase = "scatter" | "gather" | "hold" | "burst";
let work = 0;
let phase: Phase = reduced ? "hold" : "scatter";
let phaseAt = performance.now();
let raf = 0;
let lastTs = performance.now();
let pointer = { x: innerWidth / 2, y: innerHeight / 2, down: false, armed: false };
let dpr = 1;
let cell = 12;
let hinted = false;

function layout() {
  dpr = tiles.resize(innerWidth, innerHeight);
  const w = innerWidth;
  const h = innerHeight;
  const padX = Math.min(w, h) * 0.07;
  const padY = Math.min(w, h) * 0.1;
  const availW = w - padX * 2;
  const availH = h - padY * 2;
  const aspect = COLS / ROWS;
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
  const cw = mw / COLS;
  const ch = mh / ROWS;
  cell = Math.min(cw, ch);
  for (let i = 0; i < COUNT; i++) {
    const col = i % COLS;
    const row = (i / COLS) | 0;
    tx[i] = (ox + (col + 0.5) * cw) * dpr;
    ty[i] = (oy + (row + 0.5) * ch) * dpr;
  }
}

function paintWork(index: number, scatter: boolean) {
  const rgb = raster(index);
  const w = WORKS[index];
  titleEl.textContent = w.title;
  metaEl.textContent = w.meta;
  captionEl.classList.toggle("is-on", phase === "hold" || reduced);
  for (let i = 0; i < COUNT; i++) {
    tr[i] = rgb[i * 3] / 255;
    tg[i] = rgb[i * 3 + 1] / 255;
    tb[i] = rgb[i * 3 + 2] / 255;
    const col = i % COLS;
    const row = (i / COLS) | 0;
    delay[i] = Math.hypot(col - COLS * 0.5, row - ROWS * 0.5) * 0.018 + ((i * 17) % 23) * 0.01;
    shine[i] = 0.55 + ((i * 13) % 10) * 0.04;
    if (scatter) {
      const a = i * 0.47;
      const rad = Math.min(innerWidth, innerHeight) * (0.18 + ((i * 31) % 20) * 0.03);
      x[i] = innerWidth * 0.5 * dpr + Math.cos(a) * rad * dpr;
      y[i] = innerHeight * 0.5 * dpr + Math.sin(a * 1.13) * rad * 0.72 * dpr;
      vx[i] = (Math.sin(a * 2.1) * 80) * dpr;
      vy[i] = (Math.cos(a * 1.7) * 80) * dpr;
      rot[i] = (a % 2) - 1;
      vr[i] = Math.sin(i) * 1.4;
      cr[i] = tr[i];
      cg[i] = tg[i];
      cb[i] = tb[i];
    }
  }
}

function setPhase(next: Phase) {
  phase = next;
  phaseAt = performance.now();
  captionEl.classList.toggle("is-on", next === "hold");
  if (next === "hold") glass.clink();
}

let switchAt = 0;

function nextWork() {
  const now = performance.now();
  if (now - switchAt < 700) return;
  switchAt = now;
  work = (work + 1) % WORKS.length;
  paintWork(work, false);
  if (reduced) {
    for (let i = 0; i < COUNT; i++) {
      cr[i] = tr[i];
      cg[i] = tg[i];
      cb[i] = tb[i];
      x[i] = tx[i];
      y[i] = ty[i];
      rot[i] = 0;
    }
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

  for (let i = 0; i < COUNT; i++) {
    cr[i] += (tr[i] - cr[i]) * (reduced ? 1 : 0.08);
    cg[i] += (tg[i] - cg[i]) * (reduced ? 1 : 0.08);
    cb[i] += (tb[i] - cb[i]) * (reduced ? 1 : 0.08);

    const dxm = x[i] - mx;
    const dym = y[i] - my;
    const md = Math.hypot(dxm, dym) + 0.001;
    const falloff = Math.exp(-md / (90 * dpr));
    const push = !pointer.armed ? 0 : pointer.down ? -48 * dpr : 14 * dpr;

    if (phase === "scatter") {
      const swirl = now * 0.0007 + i * 0.015;
      vx[i] += Math.cos(swirl) * 28 * dpr * dt;
      vy[i] += Math.sin(swirl * 1.2) * 28 * dpr * dt;
      vx[i] += (innerWidth * 0.5 * dpr - x[i]) * 0.12 * dt;
      vy[i] += (innerHeight * 0.5 * dpr - y[i]) * 0.12 * dt;
      if (t > 0.35 + delay[i] * 0.4) {
        vx[i] += (tx[i] - x[i]) * 1.8 * dt;
        vy[i] += (ty[i] - y[i]) * 1.8 * dt;
      }
    } else if (phase === "gather") {
      const ready = t > delay[i];
      const k = ready ? 14 : 1.6;
      vx[i] += (tx[i] - x[i]) * k * dt;
      vy[i] += (ty[i] - y[i]) * k * dt;
      vr[i] += -rot[i] * 6 * dt;
    } else if (phase === "hold") {
      vx[i] += (tx[i] - x[i]) * 18 * dt;
      vy[i] += (ty[i] - y[i]) * 18 * dt;
      rot[i] *= 0.86;
      const breathe = Math.sin(now * 0.0018 + i * 0.05) * 0.4 * dpr;
      x[i] += breathe * dt * 20;
    } else {
      const a = Math.atan2(y[i] - innerHeight * 0.5 * dpr, x[i] - innerWidth * 0.5 * dpr);
      vx[i] += Math.cos(a) * 520 * dpr * dt;
      vy[i] += Math.sin(a) * 520 * dpr * dt;
      vr[i] += (i % 2 ? 1 : -1) * 8 * dt;
    }

    vx[i] += (dxm / md) * push * falloff * dt;
    vy[i] += (dym / md) * push * falloff * dt;
    vx[i] *= 0.9;
    vy[i] *= 0.9;
    vr[i] *= 0.96;
    x[i] += vx[i] * dt;
    y[i] += vy[i] * dt;
    rot[i] += vr[i] * dt;

    if (phase === "gather" || phase === "hold") {
      drift += Math.hypot(x[i] - tx[i], y[i] - ty[i]);
    }

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

  if (phase === "scatter" && t > (reduced ? 0.1 : 2.2)) setPhase("gather");
  else if (phase === "gather" && t > 1.2 && drift / COUNT < 3.2 * dpr) setPhase("hold");
  else if (phase === "gather" && t > 5.5) setPhase("hold");
  else if (phase === "hold" && t > (reduced ? 4 : 7.5)) nextWork();
  else if (phase === "burst" && t > 1.35) setPhase("scatter");

  cursorEl.style.transform = `translate3d(${pointer.x}px, ${pointer.y}px, 0)`;
  tiles.draw(pose, color);
  raf = requestAnimationFrame(tick);
}

function wake() {
  void glass.start();
  if (!hinted) {
    hinted = true;
    hintEl.classList.add("is-gone");
  }
}

const ac = new AbortController();
const on = { signal: ac.signal };

window.addEventListener(
  "pointermove",
  (e) => {
    pointer.x = e.clientX;
    pointer.y = e.clientY;
    pointer.armed = true;
  },
  on,
);

window.addEventListener(
  "pointerdown",
  (e) => {
    if ((e.target as HTMLElement).closest("a")) return;
    pointer.down = true;
    pointer.x = e.clientX;
    pointer.y = e.clientY;
    wake();
    if (phase === "hold") nextWork();
  },
  on,
);

window.addEventListener("pointerup", () => {
  pointer.down = false;
}, on);

window.addEventListener(
  "keydown",
  (e) => {
    if (e.key === "ArrowRight" || e.key === " ") {
      e.preventDefault();
      wake();
      nextWork();
    }
  },
  on,
);

window.addEventListener(
  "resize",
  () => {
    layout();
    if (phase === "hold") {
      for (let i = 0; i < COUNT; i++) {
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
    if (!document.hidden) {
      lastTs = performance.now();
      raf = requestAnimationFrame(tick);
    }
  },
  on,
);

layout();
paintWork(0, !reduced);
if (reduced) {
  for (let i = 0; i < COUNT; i++) {
    x[i] = tx[i];
    y[i] = ty[i];
    cr[i] = tr[i];
    cg[i] = tg[i];
    cb[i] = tb[i];
    rot[i] = 0;
  }
  setPhase("hold");
}

raf = requestAnimationFrame(tick);

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    cancelAnimationFrame(raf);
    ac.abort();
  });
}
