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
  { id: "field", href: "./field.html", word: "остаться", nx: 0.5, ny: 0.2, rgb: [1, 0.72, 0.42], freq: 196 },
  { id: "mosaic", href: "./unnamed.html", word: "собрать", nx: 0.16, ny: 0.46, rgb: [0.72, 0.86, 0.92], freq: 247 },
  { id: "machine", href: "./machine.html", word: "смотреть", nx: 0.84, ny: 0.46, rgb: [0.55, 0.78, 1], freq: 164 },
  { id: "want", href: "./want.html", word: "хотеть", nx: 0.28, ny: 0.8, rgb: [0.92, 0.48, 0.38], freq: 220 },
  { id: "behind", href: "./behind.html", word: "уже", nx: 0.72, ny: 0.8, rgb: [0.82, 0.78, 0.7], freq: 131 },
];

export const HIT = 56;

type Pt = { x: number; y: number };
type Path = { pts: Pt[]; gate: number | null };

type Ripple = { x: number; y: number; t: number };

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
  pulse = 0;
  click = 10;

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
      const mx = cx + (tx - cx) * 0.45 + (rnd() - 0.5) * 40;
      const my = cy + (ty - cy) * 0.42 + (rnd() - 0.5) * 40;
      paths.push({
        pts: [
          { x: cx, y: cy },
          { x: mx, y: my },
          { x: tx, y: ty },
        ],
        gate: i,
      });
    }

    for (let i = 0; i < 10; i++) {
      const a = rnd() * Math.PI * 2;
      const len = Math.min(w, h) * (0.18 + rnd() * 0.28);
      const tx = cx + Math.cos(a) * len;
      const ty = cy + Math.sin(a) * len * 0.85;
      const mx = cx + Math.cos(a + (rnd() - 0.5) * 0.8) * len * 0.5;
      const my = cy + Math.sin(a + (rnd() - 0.5) * 0.6) * len * 0.42;
      paths.push({ pts: [{ x: cx, y: cy }, { x: mx, y: my }, { x: tx, y: ty }], gate: null });
    }
    this.paths = paths;
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

  step(dt: number) {
    this.click += dt;
    this.pulse *= 0.96;
    for (const r of this.ripples) r.t += dt;
    this.ripples = this.ripples.filter((r) => r.t < 2.2);
  }

  draw(opts: {
    mx: number;
    my: number;
    reveal: number[];
    hover: number;
    visited: Set<string>;
    hold: number;
    simple: boolean;
  }) {
    const ctx = this.ctx;
    const s = this.dpr;
    ctx.setTransform(s, 0, 0, s, 0, 0);
    ctx.fillStyle = "#050308";
    ctx.fillRect(0, 0, this.w, this.h);

    const { mx, my, reveal, hover, visited, hold, simple } = opts;
    const cx = this.w * 0.5;
    const cy = this.h * 0.5;

    const warp = (p: Pt): Pt => {
      const dx = mx - p.x;
      const dy = my - p.y;
      const d = Math.hypot(dx, dy) + 1;
      const k = Math.exp(-d / 220) * (10 + hold * 8);
      return { x: p.x + dx * 0.02 * k, y: p.y + dy * 0.02 * k };
    };

    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    for (let i = 0; i < this.paths.length; i++) {
      const path = this.paths[i];
      const pts = path.pts.map(warp);
      const gateOn = path.gate !== null && reveal.includes(path.gate);
      const a = path.gate === null ? 0.045 : gateOn ? 0.16 + (hover === path.gate ? 0.28 : 0) : 0.05;
      ctx.strokeStyle = `rgba(244,239,230,${a + this.pulse * 0.08})`;
      ctx.lineWidth = path.gate !== null && gateOn ? 1.15 : 0.7;
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      if (pts.length === 3) ctx.quadraticCurveTo(pts[1].x, pts[1].y, pts[2].x, pts[2].y);
      else {
        for (let k = 1; k < pts.length; k++) ctx.lineTo(pts[k].x, pts[k].y);
      }
      ctx.stroke();
    }

    ctx.fillStyle = `rgba(244,239,230,${0.04 + this.pulse * 0.04})`;
    ctx.beginPath();
    ctx.arc(cx, cy, 2.2, 0, Math.PI * 2);
    ctx.fill();

    for (const i of reveal) {
      const g = GATES[i];
      const p = warp(this.gatePos(i));
      const hot = hover === i;
      const scar = visited.has(g.id);
      const [r, gv, b] = g.rgb;
      const R = Math.round(r * 255);
      const G = Math.round(gv * 255);
      const B = Math.round(b * 255);
      const glow = 0.18 + (hot ? 0.35 : 0) + this.pulse * 0.2 + (scar ? 0.08 : 0);
      ctx.fillStyle = `rgba(${R},${G},${B},${glow * 0.22})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, hot ? 18 : 12, 0, Math.PI * 2);
      ctx.fill();

      if (g.id === "field") this.drawBreath(p, R, G, B, hot);
      else if (g.id === "mosaic") this.drawGlass(p, R, G, B, hot);
      else if (g.id === "machine") this.drawRing(p, R, G, B, hot);
      else if (g.id === "want") this.drawMass(p, R, G, B, hot);
      else this.drawWake(p, R, G, B, hot);
    }

    for (const rp of this.ripples) {
      const k = rp.t / 2.2;
      ctx.strokeStyle = `rgba(244,239,230,${(1 - k) * 0.22})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(rp.x, rp.y, 12 + k * 90, 0, Math.PI * 2);
      ctx.stroke();
    }

    if (!simple) {
      ctx.fillStyle = "rgba(244,239,230,0.015)";
      for (let i = 0; i < 40; i++) {
        const x = (i * 97 + performance.now() * 0.01) % this.w;
        const y = (i * 53) % this.h;
        ctx.fillRect(x, y, 1, 1);
      }
    }
  }

  private drawBreath(p: Pt, r: number, g: number, b: number, hot: boolean) {
    const ctx = this.ctx;
    const t = performance.now() * 0.0015;
    const rad = 4.5 + Math.sin(t) * 1.4 + (hot ? 1.5 : 0);
    ctx.fillStyle = `rgba(${r},${g},${b},0.7)`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, rad, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawGlass(p: Pt, r: number, g: number, b: number, hot: boolean) {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(performance.now() * 0.0002);
    ctx.strokeStyle = `rgba(${r},${g},${b},${hot ? 0.8 : 0.45})`;
    ctx.lineWidth = 0.8;
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      const x = Math.cos(a) * 5;
      const y = Math.sin(a) * 5;
      ctx.strokeRect(x - 1.6, y - 1.6, 3.2, 3.2);
    }
    ctx.restore();
  }

  private drawRing(p: Pt, r: number, g: number, b: number, hot: boolean) {
    const ctx = this.ctx;
    ctx.strokeStyle = `rgba(${r},${g},${b},${hot ? 0.85 : 0.5})`;
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.arc(p.x, p.y, hot ? 7 : 5.5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(p.x, p.y, 1.2, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${r},${g},${b},0.8)`;
    ctx.fill();
  }

  private drawMass(p: Pt, r: number, g: number, b: number, hot: boolean) {
    const ctx = this.ctx;
    const t = performance.now() * 0.001;
    ctx.fillStyle = `rgba(${r},${g},${b},0.55)`;
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + t * 0.2;
      const rad = 3.2 + Math.sin(t * 1.4 + i) * 1.4 + (hot ? 1.6 : 0);
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
    ctx.strokeStyle = `rgba(${r},${g},${b},${hot ? 0.7 : 0.35})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.x - 10, p.y + 14);
    ctx.stroke();
    ctx.fillStyle = `rgba(${r},${g},${b},0.9)`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 2.2, 0, Math.PI * 2);
    ctx.fill();
  }
}
