import "./style.css";
import { PresenceClock, writeClock } from "../clock";
import { Tiles } from "./tiles";
import { Glass } from "./glass";
import { fitGrid, loadWorkImage, maxTiles, preloadMosaics, WORKS } from "./works";
import { bindSoundToggle } from "../shared/sound-toggle";
import { GestureTrail } from "../shared/trail";
import { bindWhisper, isChromeTarget } from "../shared/whisper";
import { reducedMotion } from "../shared/gpu";

const MEANING = ["Ничто, кроме души, недостойно восхищения", "а для великой души всё меньше неё"];

const reduced = reducedMotion();
const MAX = maxTiles();

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

const tiles = new Tiles(canvas, MAX);
const glass = new Glass();
const trail = new GestureTrail(trailCanvas);
const clock = new PresenceClock();
const whisper = bindWhisper(whisperEl);
bindSoundToggle(soundEl, glass);

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
const rooted = new Uint8Array(MAX);

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
let meaningStep = 0;
let switchAt = 0;
let sealedAt = 0;

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
  const padY = Math.min(w, h) * 0.12;
  const availW = Math.max(64, w - padX * 2);
  const availH = Math.max(64, h - padY * 2);
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
  const oy = (h - mh) / 2 - 10;
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
      const a = i * 0.47 + hash(i + 7) * 0.4;
      const rad = Math.min(innerWidth, innerHeight) * (0.2 + hash(i + 3) * 0.55);
      x[i] = innerWidth * 0.5 * dpr + Math.cos(a) * rad * dpr;
      y[i] = innerHeight * 0.5 * dpr + Math.sin(a * 1.13) * rad * 0.78 * dpr;
      vx[i] = Math.sin(a * 2.1) * 80 * dpr;
      vy[i] = Math.cos(a * 1.7) * 80 * dpr;
      rot[i] = (a % 2) - 1;
      rooted[i] = 0;
    }
  }
}

function scatterLive() {
  for (let i = 0; i < live; i++) {
    rooted[i] = 0;
    const a = i * 0.47 + hash(i + 7) * 0.4;
    const rad = Math.min(innerWidth, innerHeight) * (0.2 + hash(i + 3) * 0.55);
    x[i] = innerWidth * 0.5 * dpr + Math.cos(a) * rad * dpr;
    y[i] = innerHeight * 0.5 * dpr + Math.sin(a * 1.13) * rad * 0.78 * dpr;
    vx[i] = Math.sin(a * 2.1) * 140 * dpr;
    vy[i] = Math.cos(a * 1.7) * 140 * dpr;
    rot[i] = (a % 2) - 1;
    vr[i] = Math.sin(i) * 2.2;
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
          rooted[i] = 1;
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
    for (let i = 0; i < live; i++) {
      x[i] = tx[i] + jx[i];
      y[i] = ty[i] + jy[i];
      rot[i] = jrot[i];
      vx[i] = 0;
      vy[i] = 0;
      vr[i] = 0;
      rooted[i] = 1;
    }
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
  const target = Math.min(live, Math.ceil((clicks / need) * live));
  const order = Array.from({ length: live }, (_, i) => i).sort((a, b) => delay[a] - delay[b]);
  let have = 0;
  for (let i = 0; i < live; i++) if (rooted[i]) have += 1;
  for (const i of order) {
    if (have >= target) break;
    if (!rooted[i]) {
      rooted[i] = 1;
      have += 1;
    }
  }
  if (clicks >= need) {
    for (let i = 0; i < live; i++) rooted[i] = 1;
  }
  glass.clink();
}

function nextWork() {
  const now = performance.now();
  if (now - switchAt < 700) return;
  switchAt = now;
  work = (work + 1) % WORKS.length;
  clicks = 0;
  sealedAt = 0;
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
  const mx = pointer.x * dpr;
  const my = pointer.y * dpr;
  const sizeHold = cell * dpr * 0.495;
  const sizeChaos = cell * dpr * 0.46;
  let drift = 0;
  let rootedN = 0;

  for (let i = 0; i < live; i++) {
    const dxm = x[i] - mx;
    const dym = y[i] - my;
    const md = Math.hypot(dxm, dym) + 0.001;
    const falloff = Math.exp(-md / (90 * dpr));
    const push = 16 * dpr;
    const hx = tx[i] + jx[i];
    const hy = ty[i] + jy[i];

    if (rooted[i] && phase !== "burst") {
      rootedN += 1;
      const k = phase === "hold" ? 22 : 12;
      vx[i] += (hx - x[i]) * k * dt;
      vy[i] += (hy - y[i]) * k * dt;
      vr[i] += (jrot[i] - rot[i]) * 8 * dt;
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

    if (rooted[i] && phase !== "burst") drift += Math.hypot(x[i] - hx, y[i] - hy);

    const o = i * 4;
    pose[o] = x[i];
    pose[o + 1] = y[i];
    pose[o + 2] = rot[i];
    pose[o + 3] = (phase === "hold" ? sizeHold : sizeChaos) * jsz[i];
    extra[o] = shine[i];
    extra[o + 1] = chip[i];
  }

  if (phase === "chaos" && rootedN === live && live > 0) {
    if (!sealedAt) sealedAt = now;
    if (now - sealedAt > (reduced ? 180 : 900) || drift / live < 3.2 * dpr) {
      setPhase("hold");
    }
  } else if (phase === "chaos") {
    sealedAt = 0;
  } else if (phase === "burst" && t > 1.2) {
    scatterLive();
    setPhase("chaos");
  }

  glass.rustle(phase === "chaos" ? 1 : 0.15);
  cursorEl.style.transform = `translate3d(${pointer.x}px, ${pointer.y}px, 0)`;
  writeClock(presenceEl, clock.elapsed());
  trail.step(dt);
  trail.draw();
  whisper.tick(now);
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
