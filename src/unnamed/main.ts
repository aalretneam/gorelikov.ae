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
const shine = new Float32Array(MAX);
const chip = new Float32Array(MAX);
const sx = new Float32Array(MAX);
const sy = new Float32Array(MAX);
const fromX = new Float32Array(MAX);
const fromY = new Float32Array(MAX);
const fromRot = new Float32Array(MAX);
const homeAt = new Float64Array(MAX);
const looseAt = new Float64Array(MAX);
const goDur = new Float32Array(MAX);
const arcS = new Float32Array(MAX);

type Phase = "chaos" | "hold";
let cols = 48;
let rows = 22;
let live = cols * rows;
let aspect = 736 / 330;
let work = 0;
let phase: Phase = "chaos";
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
let pendingImg: HTMLImageElement | null = null;
let applyTexAt = 0;
let pendingIndex = -1;
let landAt = 0;

function hash(i: number) {
  let a = Math.imul(i ^ 0x9e3779b9, 0x85ebca6b);
  a = Math.imul(a ^ (a >>> 13), 0xc2b2ae35);
  return ((a ^ (a >>> 16)) >>> 0) / 4294967296;
}

function mix(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function easeInOut(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - (2 - 2 * t) ** 3 / 2;
}

function shuffle<T>(list: T[], seed: number) {
  for (let i = list.length - 1; i > 0; i--) {
    const j = (hash(seed + i * 17) * (i + 1)) | 0;
    const tmp = list[i];
    list[i] = list[j];
    list[j] = tmp;
  }
  return list;
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
    placeScatter(prevLive, live, true);
  }
}

function placeScatter(from: number, to: number, teleport: boolean) {
  const count = Math.max(0, to - from);
  if (!count) return;
  const w = innerWidth * dpr;
  const h = innerHeight * dpr;
  const gw = Math.max(2, Math.ceil(Math.sqrt(count * (w / Math.max(1, h)))));
  const gh = Math.max(2, Math.ceil(count / gw));
  const slots = Array.from({ length: count }, (_, n) => {
    const col = n % gw;
    const row = (n / gw) | 0;
    const px = ((col + 0.08 + hash(from + n + 71) * 0.84) / gw) * w;
    const py = ((row + 0.08 + hash(from + n + 91) * 0.84) / gh) * h;
    return [px, py] as [number, number];
  });
  shuffle(slots, from + 201);
  const now = performance.now();
  for (let n = 0; n < count; n++) {
    const i = from + n;
    sx[i] = slots[n][0];
    sy[i] = slots[n][1];
    homeAt[i] = 0;
    if (teleport) {
      x[i] = sx[i];
      y[i] = sy[i];
      vx[i] = (hash(i + 17) - 0.5) * 14 * dpr;
      vy[i] = (hash(i + 29) - 0.5) * 14 * dpr;
      rot[i] = (hash(i + 41) - 0.5) * 2.4;
      vr[i] = (hash(i + 7) - 0.5) * 0.28;
      looseAt[i] = 0;
      goDur[i] = 0;
    } else {
      fromX[i] = x[i];
      fromY[i] = y[i];
      fromRot[i] = rot[i];
      looseAt[i] = now + hash(i + 4) * (reduced ? 120 : 720);
      goDur[i] = reduced ? 420 : 1800 + hash(i + 8) * 900;
      vx[i] = 0;
      vy[i] = 0;
      vr[i] = 0;
    }
    arcS[i] = hash(i + 53) > 0.5 ? 1 : -1;
  }
}

function scatterLive(teleport: boolean) {
  placeScatter(0, live, teleport);
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
      if (scatter) scatterLive(true);
    })
    .catch(() => {
      if (work !== index) return;
      tiles.setTexture(null);
    });
}

function setPhase(next: Phase) {
  phase = next;
  captionEl.classList.toggle("is-on", next === "hold");
  document.documentElement.dataset.mosaic = `${next}:${clicks}`;
  if (next === "hold") {
    hintEl.textContent = "коснись · следующая картина";
    hintEl.classList.remove("is-gone");
    if (!assembledOnce) {
      assembledOnce = true;
      startQuote();
    }
  } else {
    captionEl.classList.remove("is-on");
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
  const pending: number[] = [];
  for (let i = 0; i < live; i++) {
    if (homeAt[i] <= 0) pending.push(i);
  }
  shuffle(pending, now | 0);
  const remainClicks = Math.max(1, need - clicks + 1);
  const take = last ? pending.length : Math.ceil(pending.length / remainClicks);
  const stagger = last ? (reduced ? 280 : 2200) : reduced ? 120 : 820;
  const flight = last ? (reduced ? 520 : 2800) : reduced ? 360 : 2100;
  for (let k = 0; k < take; k++) {
    const i = pending[k];
    fromX[i] = x[i];
    fromY[i] = y[i];
    fromRot[i] = rot[i];
    looseAt[i] = 0;
    homeAt[i] = now + (take <= 1 ? 0 : (k / (take - 1)) * stagger) + hash(i + 3) * 90;
    goDur[i] = flight + hash(i + 11) * (last ? 900 : 700);
    vx[i] *= 0.35;
    vy[i] *= 0.35;
    vr[i] *= 0.35;
    arcS[i] = hash(i + 53) > 0.5 ? 1 : -1;
  }
  if (last) {
    landAt = 0;
    for (let i = 0; i < live; i++) {
      if (homeAt[i] > 0) landAt = Math.max(landAt, homeAt[i] + goDur[i]);
    }
    landAt += 80;
  }
  glass.clink();
  document.documentElement.dataset.mosaic = `${phase}:${clicks}`;
}

function nextWork() {
  const now = performance.now();
  if (now - switchAt < 700) return;
  switchAt = now;
  work = (work + 1) % WORKS.length;
  clicks = 0;
  landAt = 0;
  setPhase("chaos");
  if (reduced) {
    paintWork(work, false);
    setPhase("hold");
    for (let i = 0; i < live; i++) {
      x[i] = tx[i] + jx[i];
      y[i] = ty[i] + jy[i];
      rot[i] = jrot[i];
      homeAt[i] = 1;
      looseAt[i] = 0;
    }
    return;
  }
  scatterLive(false);
  pendingIndex = work;
  applyTexAt = now + 900;
  pendingImg = null;
  titleEl.textContent = WORKS[work].title;
  metaEl.textContent = WORKS[work].meta;
  void loadWorkImage(WORKS[work])
    .then((img) => {
      if (pendingIndex !== work) return;
      pendingImg = img;
    })
    .catch(() => {
      if (pendingIndex !== work) return;
      pendingImg = null;
    });
}

function applyPendingTexture(now: number) {
  if (pendingIndex !== work) return;
  if (!pendingImg || now < applyTexAt) return;
  const img = pendingImg;
  pendingImg = null;
  pendingIndex = -1;
  tiles.setTexture(img);
  layout(img.width / Math.max(1, img.height));
}

function flyTo(i: number, now: number, ax: number, ay: number, ar: number, start: number, dur: number) {
  const span = Math.max(1, dur);
  const u = Math.min(1, Math.max(0, (now - start) / span));
  const e = easeInOut(u);
  const dx = ax - fromX[i];
  const dy = ay - fromY[i];
  const len = Math.hypot(dx, dy) || 1;
  const lift = Math.sin(u * Math.PI) * Math.min(70 * dpr, len * 0.16) * arcS[i];
  x[i] = mix(fromX[i], ax, e) + (-dy / len) * lift;
  y[i] = mix(fromY[i], ay, e) + (dx / len) * lift;
  rot[i] = mix(fromRot[i], ar, e);
  vx[i] = 0;
  vy[i] = 0;
  vr[i] = 0;
  return u >= 1;
}

function wander(i: number, now: number, dt: number, W: number, H: number, margin: number) {
  const wanderT = now * 0.00028 + i * 0.031;
  vx[i] += Math.cos(wanderT) * 8 * dpr * dt;
  vy[i] += Math.sin(wanderT * 1.17) * 8 * dpr * dt;
  if (x[i] < margin) vx[i] += (margin - x[i]) * 1.15 * dt;
  if (x[i] > W - margin) vx[i] += (W - margin - x[i]) * 1.15 * dt;
  if (y[i] < margin) vy[i] += (margin - y[i]) * 1.15 * dt;
  if (y[i] > H - margin) vy[i] += (H - margin - y[i]) * 1.15 * dt;
  vx[i] *= 0.988;
  vy[i] *= 0.988;
  vr[i] *= 0.993;
  x[i] += vx[i] * dt;
  y[i] += vy[i] * dt;
  rot[i] += vr[i] * dt;
}

function tick(now: number) {
  const dt = Math.min(0.05, Math.max(0, now - lastTs) / 1000);
  lastTs = now;
  applyPendingTexture(now);
  const sizeHold = cell * dpr * 0.495;
  const sizeChaos = cell * dpr * 0.46;
  const W = innerWidth * dpr;
  const H = innerHeight * dpr;
  const margin = 28 * dpr;
  let waiting = 0;
  let flying = 0;
  let settled = 0;

  for (let i = 0; i < live; i++) {
    const hx = tx[i] + jx[i];
    const hy = ty[i] + jy[i];

    if (homeAt[i] > 0) {
      if (now < homeAt[i]) {
        vx[i] *= 0.9;
        vy[i] *= 0.9;
        x[i] += vx[i] * dt;
        y[i] += vy[i] * dt;
        fromX[i] = x[i];
        fromY[i] = y[i];
        fromRot[i] = rot[i];
        flying += 1;
      } else if (flyTo(i, now, hx, hy, jrot[i], homeAt[i], goDur[i])) {
        x[i] = hx;
        y[i] = hy;
        rot[i] = jrot[i];
        settled += 1;
      } else {
        flying += 1;
      }
    } else if (looseAt[i] > 0) {
      if (now < looseAt[i]) {
        flying += 1;
      } else if (flyTo(i, now, sx[i], sy[i], rot[i] + arcS[i] * 0.4, looseAt[i], goDur[i])) {
        looseAt[i] = 0;
        x[i] = sx[i];
        y[i] = sy[i];
        waiting += 1;
        wander(i, now, dt, W, H, margin);
      } else {
        flying += 1;
      }
    } else {
      waiting += 1;
      wander(i, now, dt, W, H, margin);
    }

    const o = i * 4;
    pose[o] = x[i];
    pose[o + 1] = y[i];
    pose[o + 2] = rot[i];
    pose[o + 3] = (phase === "hold" ? sizeHold : sizeChaos) * jsz[i];
    extra[o] = shine[i];
    extra[o + 1] = chip[i];
  }

  if (phase === "chaos" && clicks >= need && live > 0) {
    const done = waiting === 0 && flying === 0 && settled === live;
    if (done || (landAt > 0 && now >= landAt)) setPhase("hold");
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
    } else if (clicks === 0) {
      scatterLive(true);
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
scatterLive(true);
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
