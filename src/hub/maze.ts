import { gpuScale } from "../shared/gpu";
import type { GateId } from "../shared/memory";

export type Gate = {
  id: GateId;
  href: string;
  word: string;
  nx: number;
  ny: number;
  rgb: [number, number, number];
  freq: number;
};

export const GATES: Gate[] = [
  { id: "field", href: "./field.html", word: "остаться", nx: 0.5, ny: 0.18, rgb: [1, 0.72, 0.42], freq: 196 },
  { id: "mosaic", href: "./unnamed.html", word: "собрать", nx: 0.14, ny: 0.46, rgb: [0.72, 0.86, 0.92], freq: 247 },
  { id: "machine", href: "./machine.html", word: "смотреть", nx: 0.86, ny: 0.46, rgb: [0.55, 0.78, 1], freq: 164 },
  { id: "want", href: "./want.html", word: "хотеть", nx: 0.26, ny: 0.82, rgb: [0.92, 0.48, 0.38], freq: 220 },
  { id: "behind", href: "./behind.html", word: "уже", nx: 0.74, ny: 0.82, rgb: [0.82, 0.78, 0.7], freq: 131 },
];

export const HIT = 72;

type Pt = { x: number; y: number };
type Path = { pts: Pt[]; gate: number | null; hue: number };
type Ripple = { x: number; y: number; t: number };
type Mote = { x: number; y: number; vx: number; vy: number; life: number; s: number };

function mulberry(seed: number) {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class Maze {
  private ctx: CanvasRenderingContext2D;
  private canvas: HTMLCanvasElement;
  private dpr = 1;
  private w = 1;
  private h = 1;
  private paths: Path[] = [];
  private ripples: Ripple[] = [];
  private motes: Mote[] = [];
  pulse = 0;
  click = 10;
  private t = 0;

  constructor(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) throw new Error("2d");
    this.canvas = canvas;
    this.ctx = ctx;
    this.build(innerWidth, innerHeight);
  }

  resize(width: number, height: number, dpr: number) {
    this.dpr = dpr;
    const cw = Math.max(1, Math.floor(width * dpr));
    const ch = Math.max(1, Math.floor(height * dpr));
    if (this.canvas.width !== cw || this.canvas.height !== ch) {
      this.canvas.width = cw;
      this.canvas.height = ch;
    }
    this.w = width;
    this.h = height;
    this.build(width, height);
  }

  private build(w: number, h: number) {
    const cx = w * 0.5;
    const cy = h * 0.5;
    const rnd = mulberry(2026);
    const paths: Path[] = [];

    for (let i = 0; i < GATES.length; i++) {
      const g = GATES[i];
      const tx = g.nx * w;
      const ty = g.ny * h;
      const mx = cx + (tx - cx) * 0.42 + (rnd() - 0.5) * 50;
      const my = cy + (ty - cy) * 0.4 + (rnd() - 0.5) * 46;
      paths.push({
        pts: [
          { x: cx, y: cy },
          { x: mx, y: my },
          { x: tx, y: ty },
        ],
        gate: i,
        hue: i,
      });
    }

    for (let i = 0; i < 18; i++) {
      const a = rnd() * Math.PI * 2;
      const len = Math.min(w, h) * (0.16 + rnd() * 0.38);
      const tx = cx + Math.cos(a) * len;
      const ty = cy + Math.sin(a) * len * 0.82;
      const mx = cx + Math.cos(a + (rnd() - 0.5) * 1.1) * len * 0.52;
      const my = cy + Math.sin(a + (rnd() - 0.5) * 0.9) * len * 0.44;
      paths.push({
        pts: [{ x: cx, y: cy }, { x: mx, y: my }, { x: tx, y: ty }],
        gate: null,
        hue: rnd(),
      });
    }
    this.paths = paths;

    const n = Math.floor(900 * gpuScale());
    this.motes = [];
    for (let i = 0; i < n; i++) {
      this.motes.push({
        x: rnd() * w,
        y: rnd() * h,
        vx: (rnd() - 0.5) * 12,
        vy: (rnd() - 0.5) * 12,
        life: 0.25 + rnd() * 0.75,
        s: 0.6 + rnd() * 1.6,
      });
    }
  }

  gatePos(i: number): Pt {
    const g = GATES[i];
    return { x: g.nx * this.w, y: g.ny * this.h };
  }

  hitIndex(x: number, y: number, revealed: number[]): number {
    let best = -1;
    let bestD = HIT * 0.5;
    for (const i of revealed) {
      const p = this.gatePos(i);
      const d = Math.hypot(x - p.x, y - p.y);
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    }
    return best;
  }

  ripple(x: number, y: number) {
    this.ripples.push({ x, y, t: 0 });
    this.click = 0;
  }

  step(dt: number, mx: number, my: number) {
    this.t += dt;
    this.click += dt;
    this.pulse *= 0.96;
    for (const r of this.ripples) r.t += dt;
    this.ripples = this.ripples.filter((r) => r.t < 2.4);

    const cx = this.w * 0.5;
    const cy = this.h * 0.5;
    for (const m of this.motes) {
      const dx = mx - m.x;
      const dy = my - m.y;
      const d = Math.hypot(dx, dy) + 40;
      m.vx += (dx / d) * 18 * dt;
      m.vy += (dy / d) * 18 * dt;
      const ox = cx - m.x;
      const oy = cy - m.y;
      const od = Math.hypot(ox, oy) + 80;
      m.vx += (ox / od) * 6 * dt;
      m.vy += (oy / od) * 6 * dt;
      m.vx += Math.sin(this.t * 0.35 + m.x * 0.01) * 4 * dt;
      m.vy += Math.cos(this.t * 0.28 + m.y * 0.01) * 4 * dt;
      m.vx *= 0.985;
      m.vy *= 0.985;
      m.x += m.vx * dt;
      m.y += m.vy * dt;
      if (m.x < -20) m.x = this.w + 20;
      if (m.x > this.w + 20) m.x = -20;
      if (m.y < -20) m.y = this.h + 20;
      if (m.y > this.h + 20) m.y = -20;
    }
  }

  draw(opts: {
    mx: number;
    my: number;
    reveal: number[];
    hover: number;
    visited: Set<string>;
    hold: number;
    simple: boolean;
    awake: number;
  }) {
    const ctx = this.ctx;
    const s = this.dpr;
    ctx.setTransform(s, 0, 0, s, 0, 0);
    ctx.fillStyle = "#050308";
    ctx.fillRect(0, 0, this.w, this.h);

    const { mx, my, reveal, hover, visited, hold, simple, awake } = opts;
    const cx = this.w * 0.5;
    const cy = this.h * 0.5;
    const breath = 0.5 + 0.5 * Math.sin(this.t * 0.55);

    const well = ctx.createRadialGradient(cx, cy, 8, cx, cy, Math.min(this.w, this.h) * 0.62);
    well.addColorStop(0, `rgba(214, 186, 150, ${0.07 + awake * 0.08 + breath * 0.03})`);
    well.addColorStop(0.35, `rgba(80, 54, 90, ${0.04 + awake * 0.05})`);
    well.addColorStop(1, "rgba(5, 3, 8, 0)");
    ctx.fillStyle = well;
    ctx.fillRect(0, 0, this.w, this.h);

    const seek = ctx.createRadialGradient(mx, my, 0, mx, my, 180 + hold * 80);
    seek.addColorStop(0, `rgba(244, 220, 180, ${0.06 + hold * 0.05})`);
    seek.addColorStop(1, "rgba(5, 3, 8, 0)");
    ctx.fillStyle = seek;
    ctx.fillRect(0, 0, this.w, this.h);

    const warp = (p: Pt): Pt => {
      const dx = mx - p.x;
      const dy = my - p.y;
      const d = Math.hypot(dx, dy) + 1;
      const k = Math.exp(-d / 240) * (14 + hold * 10);
      return { x: p.x + dx * 0.018 * k, y: p.y + dy * 0.018 * k };
    };

    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    const dash = (this.t * 28) % 80;

    for (const path of this.paths) {
      const pts = path.pts.map(warp);
      const gateOn = path.gate !== null && reveal.includes(path.gate);
      const hot = path.gate !== null && hover === path.gate;
      let a = path.gate === null ? 0.05 + awake * 0.07 : 0.07 + awake * 0.1;
      if (gateOn) a = 0.28 + (hot ? 0.32 : 0);
      ctx.strokeStyle = `rgba(244,232,210,${a + this.pulse * 0.1})`;
      ctx.lineWidth = gateOn ? (hot ? 2.2 : 1.6) : 0.85 + awake * 0.35;
      if (!simple && !gateOn) ctx.setLineDash([10, 18]);
      else ctx.setLineDash([]);
      if (!gateOn) ctx.lineDashOffset = -dash * (0.4 + path.hue);
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      ctx.quadraticCurveTo(pts[1].x, pts[1].y, pts[2].x, pts[2].y);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    if (!simple) {
      for (const m of this.motes) {
        const a = m.life * (0.12 + awake * 0.16);
        ctx.fillStyle = `rgba(244,230,200,${a})`;
        ctx.fillRect(m.x, m.y, m.s, m.s);
      }
    }

    ctx.fillStyle = `rgba(244,236,214,${0.18 + breath * 0.12 + awake * 0.12})`;
    ctx.beginPath();
    ctx.arc(cx, cy, 3.2 + breath * 1.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = `rgba(244,236,214,${0.12 + breath * 0.08})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, 14 + breath * 4, 0, Math.PI * 2);
    ctx.stroke();

    for (const i of reveal) {
      const g = GATES[i];
      const p = warp(this.gatePos(i));
      const hot = hover === i;
      const scar = visited.has(g.id);
      const [r, gv, b] = g.rgb;
      const R = Math.round(r * 255);
      const G = Math.round(gv * 255);
      const B = Math.round(b * 255);
      const beat = 0.55 + 0.45 * Math.sin(this.t * 2.1 + i);
      const glowR = (hot ? 34 : 24) + beat * 6 + this.pulse * 10;

      ctx.fillStyle = `rgba(${R},${G},${B},${0.14 + beat * 0.1 + (hot ? 0.18 : 0)})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, glowR, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = `rgba(${R},${G},${B},${0.55 + beat * 0.25 + (hot ? 0.3 : 0) + (scar ? 0.12 : 0)})`;
      ctx.lineWidth = hot ? 2 : 1.35;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 11 + beat * 2 + (hot ? 3 : 0), 0, Math.PI * 2);
      ctx.stroke();

      if (g.id === "field") this.drawBreath(p, R, G, B, hot);
      else if (g.id === "mosaic") this.drawGlass(p, R, G, B, hot);
      else if (g.id === "machine") this.drawRing(p, R, G, B, hot);
      else if (g.id === "want") this.drawMass(p, R, G, B, hot);
      else this.drawWake(p, R, G, B, hot);
    }

    for (const rp of this.ripples) {
      const k = rp.t / 2.4;
      ctx.strokeStyle = `rgba(244,232,210,${(1 - k) * 0.28})`;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(rp.x, rp.y, 16 + k * 110, 0, Math.PI * 2);
      ctx.stroke();
    }

    const vig = ctx.createRadialGradient(cx, cy, Math.min(this.w, this.h) * 0.2, cx, cy, Math.min(this.w, this.h) * 0.78);
    vig.addColorStop(0, "rgba(5,3,8,0)");
    vig.addColorStop(1, "rgba(5,3,8,0.55)");
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, this.w, this.h);
  }

  private drawBreath(p: Pt, r: number, g: number, b: number, hot: boolean) {
    const ctx = this.ctx;
    const rad = 5.5 + Math.sin(this.t * 1.5) * 1.8 + (hot ? 2 : 0);
    ctx.fillStyle = `rgba(${r},${g},${b},0.85)`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, rad, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawGlass(p: Pt, r: number, g: number, b: number, hot: boolean) {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(this.t * 0.2);
    ctx.strokeStyle = `rgba(${r},${g},${b},${hot ? 0.9 : 0.65})`;
    ctx.lineWidth = 1;
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      ctx.strokeRect(Math.cos(a) * 6 - 2, Math.sin(a) * 6 - 2, 4, 4);
    }
    ctx.restore();
  }

  private drawRing(p: Pt, r: number, g: number, b: number, hot: boolean) {
    const ctx = this.ctx;
    ctx.strokeStyle = `rgba(${r},${g},${b},${hot ? 0.95 : 0.7})`;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(p.x, p.y, hot ? 8 : 6.5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = `rgba(${r},${g},${b},0.9)`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 1.6, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawMass(p: Pt, r: number, g: number, b: number, hot: boolean) {
    const ctx = this.ctx;
    ctx.fillStyle = `rgba(${r},${g},${b},0.7)`;
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + this.t * 0.4;
      const rad = 4 + Math.sin(this.t * 1.6 + i) * 1.8 + (hot ? 2 : 0);
      const x = p.x + Math.cos(a) * rad;
      const y = p.y + Math.sin(a) * rad;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
  }

  private drawWake(p: Pt, r: number, g: number, b: number, hot: boolean) {
    const ctx = this.ctx;
    ctx.strokeStyle = `rgba(${r},${g},${b},${hot ? 0.85 : 0.55})`;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.x - 12, p.y + 16);
    ctx.stroke();
    ctx.fillStyle = `rgba(${r},${g},${b},0.95)`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 2.8, 0, Math.PI * 2);
    ctx.fill();
  }
}
