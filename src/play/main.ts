import "./style.css";
import { PresenceClock, writeClock } from "../clock";
import { dprCap, reducedMotion } from "../shared/gpu";
import { bindSoundToggle } from "../shared/sound-toggle";
import { bind as bindTrace } from "../shared/trace";
import { bindBack } from "../shared/back";
import { savePlay } from "../shared/portrait";
import { AI, Gomoku, HUMAN } from "./gomoku";

type Ghost = { x: number; y: number; who: 1 | 2 };

const canvas = document.querySelector<HTMLCanvasElement>("#board")!;
const cursorEl = document.querySelector<HTMLDivElement>("#cursor")!;
const presenceEl = document.querySelector<HTMLElement>("#presence")!;
const soundEl = document.querySelector<HTMLButtonElement>("#sound")!;
const endEl = document.querySelector<HTMLParagraphElement>("#end")!;
const subEl = document.querySelector<HTMLParagraphElement>("#end-sub")!;
const back = bindBack(document.querySelector("#back"));

const reduced = reducedMotion();
bindTrace("play");
bindSoundToggle(soundEl, {
  enabled: false,
  start: async () => {},
  stop() {},
});

const game = new Gomoku();
const clock = new PresenceClock();
const ctx = canvas.getContext("2d")!;
let dpr = 1;
let w = innerWidth;
let h = innerHeight;
let camX = 0;
let camY = 0;
let zoom = 1;
let targetZoom = 1;
let cell = 32;
let hover: { x: number; y: number } | null = null;
let raf = 0;
let endedAt = 0;
let ghosts: Ghost[] = [];
let pointer = { x: w / 2, y: h / 2 };
let drag: { x: number; y: number; moved: boolean } | null = null;
const started = Date.now();

function resize() {
  dpr = dprCap();
  w = innerWidth;
  h = innerHeight;
  canvas.width = Math.floor(w * dpr);
  canvas.height = Math.floor(h * dpr);
  cell = Math.max(26, Math.min(36, Math.floor(Math.min(w, h) / 18)));
}

function toCell(sx: number, sy: number) {
  const x = Math.round((sx - w * 0.5) / (cell * zoom) + camX);
  const y = Math.round((sy - h * 0.5) / (cell * zoom) + camY);
  return { x, y };
}

function toScreen(x: number, y: number) {
  return {
    x: (x - camX) * cell * zoom + w * 0.5,
    y: (y - camY) * cell * zoom + h * 0.5,
  };
}

function plantUniverse() {
  const taken = new Set(game.cells.keys());
  const out: Ghost[] = [];
  const add = (x: number, y: number, who: 1 | 2 = AI) => {
    const k = `${x},${y}`;
    if (taken.has(k)) return;
    taken.add(k);
    out.push({ x, y, who });
  };
  const hole = 13;
  for (let gy = -52; gy <= 52; gy += 7) {
    for (let gx = -56; gx <= 56; gx += 9) {
      if (Math.hypot(gx + 2, gy + 2) < hole) continue;
      const vert = (gx * 3 + gy) % 2 === 0;
      for (let k = 0; k < 5; k++) {
        if (vert) add(gx, gy + k);
        else add(gx + k, gy);
      }
    }
  }
  for (let s = -44; s <= 44; s += 12) {
    if (Math.abs(s) < hole) continue;
    for (let k = 0; k < 5; k++) add(s + k, Math.round(s * 0.35) + k);
  }
  for (let i = 0; i < 86; i++) add(16 + i, -3);
  for (let i = 0; i < 5; i++) add(38 + i, -2, HUMAN);
  for (let i = 0; i < 5; i++) add(52, -1 + i);
  for (let a = 0; a < 26; a++) {
    const t = (a / 26) * Math.PI * 2;
    const r = 22 + (a % 5);
    add(Math.round(Math.cos(t) * r), Math.round(Math.sin(t) * r * 0.62));
  }
  ghosts = out;
}

function finish(who: 1 | 2) {
  if (endedAt) return;
  endedAt = performance.now();
  plantUniverse();
  savePlay({
    moves: game.moves,
    won: who === HUMAN,
    lost: who === AI,
    ms: Date.now() - started,
  });
  targetZoom = reduced ? 0.2 : 0.11;
  endEl.textContent =
    who === HUMAN
      ? "ты собрал пять там, где она оставила пустоту.\nвокруг — партия, оконченная до твоего взгляда.\nсуперкомпьютер не играл с тобой.\nон ждал, пока ты закроешь щель."
      : "ты не проиграл партию.\nты нашёл край карты.\nдальше поле давно принадлежит машине.";
  endEl.classList.add("is-on");
  window.setTimeout(() => {
    subEl.textContent = "в этой комнате победа — согласие посмотреть шире";
    subEl.classList.add("is-on");
  }, reduced ? 400 : 4200);
  window.setTimeout(() => back.show(), reduced ? 800 : 5200);
}

function playAt(x: number, y: number) {
  if (endedAt) return;
  if (!game.place(x, y, HUMAN)) return;
  if (game.over === HUMAN) {
    finish(HUMAN);
    return;
  }
  game.aiMove();
  if (game.over === AI) finish(AI);
}

window.addEventListener("pointermove", (e) => {
  pointer.x = e.clientX;
  pointer.y = e.clientY;
  hover = toCell(e.clientX, e.clientY);
  if (!drag) return;
  const dx = e.clientX - drag.x;
  const dy = e.clientY - drag.y;
  if (Math.hypot(dx, dy) > 8) drag.moved = true;
  if (drag.moved) {
    camX -= dx / (cell * zoom);
    camY -= dy / (cell * zoom);
    drag.x = e.clientX;
    drag.y = e.clientY;
  }
});

window.addEventListener("pointerdown", (e) => {
  if ((e.target as HTMLElement).closest("a, button")) return;
  drag = { x: e.clientX, y: e.clientY, moved: false };
  pointer.x = e.clientX;
  pointer.y = e.clientY;
});

window.addEventListener("pointerup", (e) => {
  const was = drag;
  drag = null;
  if (!was || was.moved || endedAt) return;
  const c = toCell(e.clientX, e.clientY);
  playAt(c.x, c.y);
});

window.addEventListener(
  "wheel",
  (e) => {
    e.preventDefault();
    camX -= e.deltaX / (cell * zoom);
    camY -= e.deltaY / (cell * zoom);
  },
  { passive: false },
);

window.addEventListener("resize", resize);

function drawGrid() {
  const step = cell * zoom;
  if (step < 5) return;
  const alpha = Math.min(0.18, (step - 4) / 80);
  ctx.strokeStyle = `rgba(244,236,214,${alpha})`;
  ctx.lineWidth = 1;
  const ox = (w * 0.5 - camX * step) % step;
  const oy = (h * 0.5 - camY * step) % step;
  ctx.beginPath();
  for (let x = ox; x < w; x += step) {
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
  }
  for (let y = oy; y < h; y += step) {
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
  }
  ctx.stroke();
}

function drawStone(x: number, y: number, who: number, ghost = false) {
  const p = toScreen(x, y);
  const r = cell * zoom * (ghost ? 0.32 : 0.38);
  if (p.x < -40 || p.y < -40 || p.x > w + 40 || p.y > h + 40) return;
  ctx.beginPath();
  ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
  if (ghost) {
    ctx.fillStyle = who === HUMAN ? "rgba(232,226,212,0.35)" : "rgba(214,186,120,0.62)";
  } else if (who === HUMAN) {
    ctx.fillStyle = "#e8e2d4";
  } else {
    ctx.fillStyle = endedAt ? "#c4a56a" : "#2a2730";
    ctx.strokeStyle = "rgba(232, 226, 212, 0.55)";
    ctx.lineWidth = 1.4;
  }
  ctx.fill();
  if (!ghost && who === AI && !endedAt) ctx.stroke();
}

function tick(now: number) {
  zoom += (targetZoom - zoom) * (reduced ? 0.2 : 0.028);
  if (endedAt) {
    const u = Math.min(1, (now - endedAt) / 9000);
    camX += (42 - camX) * 0.01 * (0.35 + u);
    camY += (-3 - camY) * 0.01;
  }
  writeClock(presenceEl, clock.elapsed());
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = "#07060a";
  ctx.fillRect(0, 0, w, h);
  drawGrid();
  if (endedAt) {
    const show = Math.min(1, (now - endedAt) / 2800);
    ctx.globalAlpha = show;
    for (const g of ghosts) drawStone(g.x, g.y, g.who, true);
    ctx.globalAlpha = 1;
  }
  for (const [key, who] of game.cells) {
    const [x, y] = key.split(",").map(Number);
    drawStone(x, y, who);
  }
  if (!endedAt && hover && !game.at(hover.x, hover.y)) {
    const p = toScreen(hover.x, hover.y);
    ctx.beginPath();
    ctx.arc(p.x, p.y, cell * zoom * 0.2, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(232, 226, 212, 0.2)";
    ctx.fill();
  }
  if (game.line.length && endedAt) {
    ctx.strokeStyle = "rgba(244, 210, 140, 0.85)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    game.line.forEach((pt, i) => {
      const s = toScreen(pt.x, pt.y);
      if (i === 0) ctx.moveTo(s.x, s.y);
      else ctx.lineTo(s.x, s.y);
    });
    ctx.stroke();
  }
  cursorEl.style.transform = `translate3d(${pointer.x}px, ${pointer.y}px, 0)`;
  raf = requestAnimationFrame(tick);
}

resize();
raf = requestAnimationFrame(tick);

if (import.meta.hot) {
  import.meta.hot.dispose(() => cancelAnimationFrame(raf));
}
