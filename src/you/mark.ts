/** Unique seal of this visit. Same Trace → same image. */

import type { GateId } from "../shared/memory";
import type { Portrait } from "../shared/portrait";

const ROOMS: { id: GateId; word: string; rgb: [number, number, number] }[] = [
  { id: "field", word: "остаться", rgb: [1, 0.72, 0.42] },
  { id: "mosaic", word: "собрать", rgb: [0.72, 0.86, 0.92] },
  { id: "machine", word: "смотреть", rgb: [0.55, 0.78, 1] },
  { id: "want", word: "хотеть", rgb: [0.92, 0.48, 0.38] },
  { id: "behind", word: "быть", rgb: [0.82, 0.78, 0.7] },
  { id: "play", word: "играть", rgb: [0.86, 0.82, 0.55] },
];

function mulberry(seed: number) {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seedOf(id: string) {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619);
  return h >>> 0;
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxW: number, maxLines: number) {
  const words = text.replace(/\s+/g, " ").trim().split(" ");
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (ctx.measureText(next).width <= maxW) cur = next;
    else {
      if (cur) lines.push(cur);
      cur = w;
      if (lines.length === maxLines - 1) break;
    }
  }
  if (cur && lines.length < maxLines) lines.push(cur);
  return lines;
}

function carve(n: number, seed: number) {
  const odd = n % 2 === 0 ? n - 1 : n;
  const g = new Uint8Array(odd * odd);
  const at = (x: number, y: number) => g[y * odd + x];
  const set = (x: number, y: number) => {
    if (x > 0 && y > 0 && x < odd - 1 && y < odd - 1) g[y * odd + x] = 1;
  };
  const rnd = mulberry(seed);
  const cx = (odd / 2) | 1;
  const cy = (odd / 2) | 1;
  set(cx, cy);
  const stack: [number, number][] = [[cx, cy]];
  const D: [number, number][] = [
    [0, -1],
    [1, 0],
    [0, 1],
    [-1, 0],
  ];
  while (stack.length) {
    const [x, y] = stack[stack.length - 1];
    const order = [0, 1, 2, 3];
    for (let i = 3; i > 0; i--) {
      const j = (rnd() * (i + 1)) | 0;
      const tmp = order[i];
      order[i] = order[j];
      order[j] = tmp;
    }
    let found = false;
    for (const d of order) {
      const nx = x + D[d][0] * 2;
      const ny = y + D[d][1] * 2;
      if (nx <= 0 || ny <= 0 || nx >= odd - 1 || ny >= odd - 1) continue;
      if (at(nx, ny)) continue;
      set(x + D[d][0], y + D[d][1]);
      set(nx, ny);
      stack.push([nx, ny]);
      found = true;
      break;
    }
    if (!found) stack.pop();
  }
  return { g, n: odd };
}

export type MarkInput = Portrait & { shortId: string };

export function paintMark(ctx: CanvasRenderingContext2D, w: number, h: number, me: MarkInput, t = 0) {
  const gold = me.unique;
  const ink = gold ? [244, 214, 160] : [232, 226, 214];
  const rnd = mulberry(seedOf(me.id));
  const cx = w * 0.5;
  const cy = h * 0.48;
  const s = Math.min(w, h);

  ctx.fillStyle = "#050308";
  ctx.fillRect(0, 0, w, h);

  const well = ctx.createRadialGradient(cx, cy - s * 0.04, s * 0.02, cx, cy, s * 0.62);
  well.addColorStop(0, gold ? "rgba(90, 62, 28, 0.55)" : "rgba(40, 36, 48, 0.45)");
  well.addColorStop(0.45, "rgba(12, 8, 14, 0.2)");
  well.addColorStop(1, "rgba(5, 3, 8, 0)");
  ctx.fillStyle = well;
  ctx.fillRect(0, 0, w, h);

  const grain = Math.floor((w * h) / 280);
  for (let i = 0; i < grain; i++) {
    const a = 0.015 + rnd() * 0.04;
    ctx.fillStyle = `rgba(${ink[0]},${ink[1]},${ink[2]},${a})`;
    ctx.fillRect(rnd() * w, rnd() * h, 1.1, 1.1);
  }

  const density = Math.min(420, 80 + Math.floor(me.ms / 1800));
  for (let i = 0; i < density; i++) {
    const ang = rnd() * Math.PI * 2;
    const rad = Math.pow(rnd(), 0.55) * s * 0.48;
    const x = cx + Math.cos(ang + t * 0.03) * rad;
    const y = cy + Math.sin(ang + t * 0.03) * rad * 0.92;
    ctx.fillStyle = `rgba(${ink[0]},${ink[1]},${ink[2]},${0.06 + rnd() * 0.12})`;
    ctx.beginPath();
    ctx.arc(x, y, rnd() < 0.12 ? 1.6 : 0.7, 0, Math.PI * 2);
    ctx.fill();
  }

  const scars = Math.min(28, 4 + Math.floor(me.clicks / 3));
  ctx.strokeStyle = `rgba(${ink[0]},${ink[1]},${ink[2]},0.14)`;
  ctx.lineWidth = 0.7;
  for (let i = 0; i < scars; i++) {
    const a = rnd() * Math.PI * 2;
    const r0 = s * (0.04 + rnd() * 0.06);
    const r1 = s * (0.16 + rnd() * 0.22);
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0);
    ctx.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
    ctx.stroke();
  }

  const mazeR = s * 0.2;
  const { g, n } = carve(17, seedOf(me.id) ^ (me.done * 97));
  const cell = (mazeR * 2) / n;
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, mazeR * 0.96, 0, Math.PI * 2);
  ctx.clip();
  ctx.strokeStyle = `rgba(${ink[0]},${ink[1]},${ink[2]},${gold ? 0.55 : 0.38})`;
  ctx.lineWidth = Math.max(0.7, s * 0.0014);
  ctx.lineCap = "square";
  const ox = cx - mazeR;
  const oy = cy - mazeR;
  for (let y = 1; y < n - 1; y++) {
    for (let x = 1; x < n - 1; x++) {
      if (!g[y * n + x]) continue;
      const x0 = ox + (x + 0.5) * cell;
      const y0 = oy + (y + 0.5) * cell;
      if (g[y * n + x + 1]) {
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(x0 + cell, y0);
        ctx.stroke();
      }
      if (g[(y + 1) * n + x]) {
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(x0, y0 + cell);
        ctx.stroke();
      }
    }
  }
  ctx.restore();

  const breath = 0.5 + 0.5 * Math.sin(t * 0.9);
  ctx.strokeStyle = `rgba(${ink[0]},${ink[1]},${ink[2]},${gold ? 0.72 : 0.48})`;
  ctx.lineWidth = gold ? 1.8 : 1.2;
  ctx.beginPath();
  ctx.arc(cx, cy, mazeR + 6 + breath * 1.2, 0, Math.PI * 2);
  ctx.stroke();
  if (gold) {
    ctx.strokeStyle = `rgba(${ink[0]},${ink[1]},${ink[2]},0.28)`;
    ctx.lineWidth = 0.8;
    ctx.setLineDash([3, 7]);
    ctx.beginPath();
    ctx.arc(cx, cy, mazeR + 16, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  ctx.fillStyle = `rgba(${ink[0]},${ink[1]},${ink[2]},${0.55 + breath * 0.25})`;
  ctx.beginPath();
  ctx.arc(cx, cy, 3.2 + breath * 1.1, 0, Math.PI * 2);
  ctx.fill();

  const ring = mazeR + s * 0.145;
  const visited = new Set(me.rooms);
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  for (let i = 0; i < ROOMS.length; i++) {
    const room = ROOMS[i];
    const a = -Math.PI / 2 + (i / ROOMS.length) * Math.PI * 2;
    const x = cx + Math.cos(a) * ring;
    const y = cy + Math.sin(a) * ring;
    const on = visited.has(room.id);
    const [r, gv, b] = room.rgb;
    const R = Math.round(r * 255);
    const G = Math.round(gv * 255);
    const B = Math.round(b * 255);
    ctx.beginPath();
    ctx.arc(x, y, on ? 7 : 5, 0, Math.PI * 2);
    if (on) {
      ctx.fillStyle = `rgba(${R},${G},${B},0.95)`;
      ctx.fill();
      ctx.strokeStyle = `rgba(${R},${G},${B},0.35)`;
      ctx.lineWidth = 8;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(x, y, 7, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${R},${G},${B},0.95)`;
      ctx.fill();
    } else {
      ctx.strokeStyle = `rgba(${ink[0]},${ink[1]},${ink[2]},0.22)`;
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    ctx.font = `${Math.max(9, s * 0.018)}px Outfit, system-ui, sans-serif`;
    ctx.fillStyle = on ? `rgba(${R},${G},${B},0.82)` : `rgba(${ink[0]},${ink[1]},${ink[2]},0.28)`;
    const ly = y + (Math.sin(a) > 0.2 ? 12 : -22);
    ctx.fillText(room.word, x, ly);
  }

  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = `rgba(${ink[0]},${ink[1]},${ink[2]},0.92)`;
  ctx.font = `italic 300 ${Math.max(28, s * 0.062)}px "Cormorant Garamond", Georgia, serif`;
  ctx.fillText(me.title, cx, h * 0.12);

  ctx.font = `italic 300 ${Math.max(22, s * 0.048)}px "Cormorant Garamond", Georgia, serif`;
  ctx.fillStyle = `rgba(${ink[0]},${ink[1]},${ink[2]},0.88)`;
  ctx.fillText(`${me.done} из ${me.total}`, cx, h * 0.12 + Math.max(36, s * 0.07));

  ctx.font = `${Math.max(10, s * 0.02)}px Outfit, system-ui, sans-serif`;
  ctx.letterSpacing = "0.22em";
  ctx.fillStyle = `rgba(${ink[0]},${ink[1]},${ink[2]},0.45)`;
  ctx.fillText(`${me.time}  ·  ${me.shortId}`, cx, h * 0.12 + Math.max(58, s * 0.11));
  ctx.letterSpacing = "0";

  ctx.font = `italic 300 ${Math.max(14, s * 0.026)}px "Cormorant Garamond", Georgia, serif`;
  ctx.fillStyle = `rgba(${ink[0]},${ink[1]},${ink[2]},0.62)`;
  const lines = wrap(ctx, me.verdict.split("Заключение:")[0].trim(), Math.min(w * 0.72, s * 0.78), 3);
  let ty = h * 0.78;
  for (const line of lines) {
    ctx.fillText(line, cx, ty);
    ty += Math.max(20, s * 0.032);
  }

  ctx.font = `${Math.max(10, s * 0.018)}px Outfit, system-ui, sans-serif`;
  ctx.letterSpacing = "0.28em";
  ctx.fillStyle = `rgba(${ink[0]},${ink[1]},${ink[2]},0.38)`;
  ctx.fillText("машина  ·  человек  ·  2026", cx, h * 0.92);
  ctx.letterSpacing = "0.18em";
  ctx.fillStyle = `rgba(${ink[0]},${ink[1]},${ink[2]},0.55)`;
  ctx.fillText("art.gorelikov.ae", cx, h * 0.955);
  ctx.letterSpacing = "0";

  const vig = ctx.createRadialGradient(cx, cy, s * 0.2, cx, cy, s * 0.72);
  vig.addColorStop(0, "rgba(5,3,8,0)");
  vig.addColorStop(1, "rgba(5,3,8,0.42)");
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, w, h);
}

export const POSTER_W = 1080;
export const POSTER_H = 1350;
