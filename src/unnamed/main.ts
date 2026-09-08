import "./style.css";
import { PresenceClock, writeClock } from "../clock";
import { Tiles } from "./tiles";
import { Glass } from "./glass";
import { fitGrid, loadWorkImage, maxTiles, preloadMosaics, WORKS } from "./works";
import { bindSoundToggle } from "../shared/sound-toggle";
import { bind as bindTrace } from "../shared/trace";
import { GestureTrail } from "../shared/trail";
import { isChromeTarget } from "../shared/whisper";
import { reducedMotion } from "../shared/gpu";

const QUOTE = "Ничто, кроме души, недостойно восхищения\nа для великой души всё меньше неё";

const reduced = reducedMotion();
const MAX = maxTiles();

const canvas = document.querySelector<HTMLCanvasElement>("#mosaic")!;
const trailCanvas = document.querySelector<HTMLCanvasElement>("#trail")!;
const captionEl = document.querySelector<HTMLElement>("#caption")!;
const titleEl = document.querySelector<HTMLElement>("#work-title")!;
const metaEl = document.querySelector<HTMLElement>("#work-meta")!;
const hintEl = document.querySelector<HTMLElement>("#hint")!;
const cursorEl = document.querySelector<HTMLDivElement>("#cursor")!;
const quoteEl = document.querySelector<HTMLParagraphElement>("#quote")!;
const presenceEl = document.querySelector<HTMLElement>("#presence")!;
const soundEl = document.querySelector<HTMLButtonElement>("#sound")!;

const tiles = new Tiles(canvas, MAX);
const glass = new Glass();
const trail = new GestureTrail(trailCanvas);
const clock = new PresenceClock();
bindSoundToggle(soundEl, glass);
bindTrace("mosaic");

const pose = new Float32Array(MAX * 4);
const uv = new Float32Array(MAX * 4);
const extra = new Float32Array(MAX * 4);
const x = new Float32Array(MAX);
const y = new Float32Array(MAX);
const vx = new Float32Array(MAX);
const vy = new Float32Array(MAX);
const rot = new Float32Array(MAX);
const vr = new Float32Array(MAX);
const tx = new Float32Array(MAX);
const ty = new Float32Array(MAX);
const jx = new Float32Array(MAX);
const jy = new Float32Array(MAX);
const jrot = new Float32Array(MAX);
const jsz = new Float32Array(MAX);
const delay = new Float32Array(MAX);
const shine = new Float32Array(MAX);
const chip = new Float32Array(MAX);
const homeAt = new Float64Array(MAX);

type Phase = "chaos" | "hold" | "burst";
let cols = 48;
let rows = 22;
let live = cols * rows;
let aspect = 736 / 330;
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
let quoteN = 0;
let quoteAt = 0;
let quoteTyping = false;
let switchAt = 0;

function hash(i: number) {
  let a = Math.imul(i ^ 0x9e3779b9, 0x85ebca6b);
  a = Math.imul(a ^ (a >>> 13), 0xc2b2ae35);
  return ((a ^ (a >>> 16)) >>> 0) / 4294967296;
}

function layout(nextAspect = aspect) {
  const prevLive = live;
  aspect = nextAspect;
  dpr = tiles.resize(innerWidth, innerHeight);
  trail.resize(innerWidth, innerHeight, dpr);
  const w = innerWidth;
  const h = innerHeight;
  const padX = Math.min(w, h) * 0.055;
  const topReserve = Math.min(w, h) < 720 ? 196 : 132;
  const botReserve = Math.min(112, h * 0.16);
  const availW = Math.max(64, w - padX * 2);
  const availH = Math.max(64, h - topReserve - botReserve);
  let mw: number;
  let mh: number;
  if (availW / availH > aspect) {
    mh = availH;
    mw = mh * aspect;
  } else {
    mw = availW;
    mh = mw / aspect;
  }
  const grid = fitGrid(aspect);
  cols = grid.cols;
  rows = grid.rows;
  live = cols * rows;
  const ox = (w - mw) / 2;
  const oy = topReserve + Math.max(0, (availH - mh) / 2);
  const cw = mw / cols;
  const ch = mh / rows;
  cell = Math.min(cw, ch);
  const inset = 0.006;
  for (let i = 0; i < live; i++) {
    const col = i % cols;
    const row = (i / cols) | 0;
    const n0 = hash(i);
    const n1 = hash(i + 19);
    const n2 = hash(i + 41);
    tx[i] = (ox + (col + 0.5) * cw) * dpr;
    ty[i] = (oy + (row + 0.5) * ch) * dpr;
    jx[i] = (n0 - 0.5) * cell * 0.04 * dpr;
    jy[i] = (n1 - 0.5) * cell * 0.04 * dpr;
    jrot[i] = (n2 - 0.5) * 0.07;
    jsz[i] = 0.96 + n0 * 0.055;
    shine[i] = 0.45 + n1 * 0.5;
    chip[i] = 0.35 + n2 * 0.65;
    delay[i] = Math.hypot(col - cols * 0.5, row - rows * 0.5) * 0.016 + n0 * 0.22;
    const o = i * 4;
    const u0 = (col + inset) / cols;
    const u1 = (col + 1 - inset) / cols;
    const vTop = 1 - (row + inset) / rows;
    const vBot = 1 - (row + 1 - inset) / rows;
    uv[o] = u0;
    uv[o + 1] = vTop;
    uv[o + 2] = u1;
    uv[o + 3] = vBot;
    extra[o] = shine[i];
    extra[o + 1] = chip[i];
    extra[o + 2] = 0;
    extra[o + 3] = 0;
  }
  if (live > prevLive && phase !== "hold") {
    for (let i = prevLive; i < live; i++) {
      x[i] = (0.04 + hash(i + 11) * 0.92) * innerWidth * dpr;
      y[i] = (0.1 + hash(i + 23) * 0.78) * innerHeight * dpr;
      vx[i] = (hash(i + 5) - 0.5) * 36 * dpr;
      vy[i] = (hash(i + 9) - 0.5) * 36 * dpr;
      rot[i] = (hash(i + 13) - 0.5) * 2.4;
      vr[i] = (hash(i + 7) - 0.5) * 0.8;
      homeAt[i] = 0;
    }
  }
}

function scatterLive() {
  for (let i = 0; i < live; i++) {
    homeAt[i] = 0;
    x[i] = (0.03 + hash(i + 3) * 0.94) * innerWidth * dpr;
    y[i] = (0.08 + hash(i + 11) * 0.8) * innerHeight * dpr;
    vx[i] = (hash(i + 17) - 0.5) * 42 * dpr;
    vy[i] = (hash(i + 29) - 0.5) * 42 * dpr;
    rot[i] = (hash(i + 41) - 0.5) * 2.6;
    vr[i] = (hash(i + 7) - 0.5) * 1.1;
  }
}

function paintWork(index: number, scatter: boolean) {
  const w = WORKS[index];
  titleEl.textContent = w.title;
  metaEl.textContent = w.meta;
  captionEl.classList.toggle("is-on", phase === "hold");
  void loadWorkImage(w)
    .then((img) => {
      if (work !== index) return;
      tiles.setTexture(img);
      layout(img.width / Math.max(1, img.height));
      if (scatter) scatterLive();
      else if (phase === "hold") {
        for (let i = 0; i < live; i++) {
          x[i] = tx[i] + jx[i];
          y[i] = ty[i] + jy[i];
          rot[i] = jrot[i];
          homeAt[i] = 1;
        }
      }
    })
    .catch(() => {
      if (work !== index) return;
      tiles.setTexture(null);
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
      startQuote();
    }
  } else {
    hintEl.textContent = "коснись · собери";
  }
}

function startQuote() {
  quoteEl.classList.add("is-on");
  if (reduced) {
    quoteEl.textContent = QUOTE;
    quoteN = QUOTE.length;
    quoteTyping = false;
    return;
  }
  quoteN = 0;
  quoteEl.textContent = "";
  quoteTyping = true;
  quoteAt = performance.now();
}

function typeQuote(now: number) {
  if (!quoteTyping || now < quoteAt) return;
  quoteN += 1;
  quoteEl.textContent = QUOTE.slice(0, quoteN);
  if (quoteN >= QUOTE.length) {
    quoteTyping = false;
    return;
  }
  const ch = QUOTE[quoteN - 1];
  const wait = ch === "\n" ? 520 : ch === "," ? 220 : 68 + ((quoteN * 17) % 24);
  quoteAt = now + wait;
}

function plantChunk() {
  if (phase !== "chaos") return;
  clicks += 1;
  const now = performance.now();
  const last = clicks >= need;
  const target = last ? live : Math.min(live, Math.ceil((clicks / need) * live));
  const order = Array.from({ length: live }, (_, i) => i).sort((a, b) => delay[a] - delay[b]);
  let have = 0;
  let dMin = Infinity;
  let dMax = -Infinity;
  for (let i = 0; i < live; i++) {
    if (homeAt[i]) have += 1;
    else {
      dMin = Math.min(dMin, delay[i]);
      dMax = Math.max(dMax, delay[i]);
    }
  }
  const span = Math.max(0.001, dMax - dMin);
  const stagger = last ? (reduced ? 240 : 1800) : reduced ? 90 : 520;
  for (const i of order) {
    if (have >= target) break;
    if (homeAt[i]) continue;
    homeAt[i] = now + ((delay[i] - dMin) / span) * stagger;
    have += 1;
  }
  glass.clink();
}

function nextWork() {
  const now = performance.now();
  if (now - switchAt < 700) return;
  switchAt = now;
  work = (work + 1) % WORKS.length;
  clicks = 0;
  if (reduced) {
    paintWork(work, false);
    setPhase("hold");
    return;
  }
  setPhase("burst");
  paintWork(work, false);
}

function tick(now: number) {
  const dt = Math.min(0.05, Math.max(0, now - lastTs) / 1000);
  lastTs = now;
  const t = (now - phaseAt) / 1000;
  const sizeHold = cell * dpr * 0.495;
  const sizeChaos = cell * dpr * 0.46;
  const W = innerWidth * dpr;
  const H = innerHeight * dpr;
  const margin = 32 * dpr;
  let waiting = 0;
  let flying = 0;
  let settled = 0;

  for (let i = 0; i < live; i++) {
    const hx = tx[i] + jx[i];
    const hy = ty[i] + jy[i];
    const going = homeAt[i] > 0 && now >= homeAt[i] && phase !== "burst";

    if (going) {
      const k = reduced ? 15 : phase === "hold" ? 8.2 : 4.15;
      vx[i] += (hx - x[i]) * k * dt;
      vy[i] += (hy - y[i]) * k * dt;
      vr[i] += (jrot[i] - rot[i]) * (reduced ? 8 : 3.2) * dt;
      const damp = reduced ? 0.86 : phase === "hold" ? 0.9 : 0.945;
      vx[i] *= damp;
      vy[i] *= damp;
      vr[i] *= 0.94;
    } else if (phase === "burst") {
      const a = Math.atan2(y[i] - H * 0.5, x[i] - W * 0.5);
      vx[i] += Math.cos(a) * 260 * dpr * dt;
      vy[i] += Math.sin(a) * 260 * dpr * dt;
      vr[i] += (i % 2 ? 1 : -1) * 5 * dt;
      vx[i] *= 0.96;
      vy[i] *= 0.96;
      vr[i] *= 0.96;
    } else {
      const wander = now * 0.00032 + i * 0.03;
      vx[i] += Math.cos(wander) * 12 * dpr * dt;
      vy[i] += Math.sin(wander * 1.18) * 12 * dpr * dt;
      if (x[i] < margin) vx[i] += (margin - x[i]) * 1.1 * dt;
      if (x[i] > W - margin) vx[i] += (W - margin - x[i]) * 1.1 * dt;
      if (y[i] < margin) vy[i] += (margin - y[i]) * 1.1 * dt;
      if (y[i] > H - margin) vy[i] += (H - margin - y[i]) * 1.1 * dt;
      vx[i] *= 0.987;
      vy[i] *= 0.987;
      vr[i] *= 0.992;
    }

    x[i] += vx[i] * dt;
    y[i] += vy[i] * dt;
    rot[i] += vr[i] * dt;

    if (!homeAt[i]) waiting += 1;
    else if (now < homeAt[i] || phase === "burst") flying += 1;
    else {
      const dist = Math.hypot(x[i] - hx, y[i] - hy);
      const spd = Math.hypot(vx[i], vy[i]);
      if (dist < 5.5 * dpr && spd < 22 * dpr) settled += 1;
      else flying += 1;
    }

    const o = i * 4;
    pose[o] = x[i];
    pose[o + 1] = y[i];
    pose[o + 2] = rot[i];
    pose[o + 3] = (phase === "hold" ? sizeHold : sizeChaos) * jsz[i];
    extra[o] = shine[i];
    extra[o + 1] = chip[i];
  }

  if (phase === "chaos" && waiting === 0 && flying === 0 && settled === live && live > 0) {
    setPhase("hold");
  } else if (phase === "burst" && t > 1.05) {
    scatterLive();
    setPhase("chaos");
  }

  glass.rustle(phase === "chaos" ? 1 : 0.15);
  cursorEl.style.transform = `translate3d(${pointer.x}px, ${pointer.y}px, 0)`;
  writeClock(presenceEl, clock.elapsed());
  trail.step(dt);
  trail.draw();
  typeQuote(now);
  tiles.draw(pose, uv, extra, live);
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
    layout(aspect);
    if (phase === "hold") {
      for (let i = 0; i < live; i++) {
        x[i] = tx[i] + jx[i];
        y[i] = ty[i] + jy[i];
        rot[i] = jrot[i];
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

layout(aspect);
scatterLive();
hintEl.textContent = "коснись · собери";
raf = requestAnimationFrame(tick);
paintWork(0, true);
void preloadMosaics();

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    cancelAnimationFrame(raf);
    ac.abort();
    clock.dispose();
  });
}
