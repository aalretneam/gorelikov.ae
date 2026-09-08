import { gpuScale } from "../shared/gpu";

type P = { x: number; y: number; vx: number; vy: number; stuck: number };

export class Mass {
  private ctx: CanvasRenderingContext2D;
  private canvas: HTMLCanvasElement;
  private ps: P[] = [];
  private dpr = 1;
  w = 1;
  h = 1;
  radius = 28;
  mass = 0.08;

  constructor(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) throw new Error("2d");
    this.canvas = canvas;
    this.ctx = ctx;
    const n = Math.floor(2200 * gpuScale());
    for (let i = 0; i < n; i++) {
      this.ps.push({
        x: Math.random(),
        y: Math.random(),
        vx: (Math.random() - 0.5) * 40,
        vy: (Math.random() - 0.5) * 40,
        stuck: 0,
      });
    }
  }

  resize(width: number, height: number, dpr: number) {
    this.dpr = dpr;
    this.w = width;
    this.h = height;
    const cw = Math.max(1, Math.floor(width * dpr));
    const ch = Math.max(1, Math.floor(height * dpr));
    if (this.canvas.width !== cw || this.canvas.height !== ch) {
      this.canvas.width = cw;
      this.canvas.height = ch;
    }
    for (const p of this.ps) {
      if (!p.stuck) {
        p.x = Math.random() * width;
        p.y = Math.random() * height;
      }
    }
  }

  feed(x: number, y: number, force: number) {
    this.mass = Math.min(1, this.mass + force * 0.012);
    const cx = this.w * 0.5;
    const cy = this.h * 0.5;
    for (const p of this.ps) {
      const dx = x - p.x;
      const dy = y - p.y;
      const d = Math.hypot(dx, dy) + 8;
      if (d < 90) {
        p.vx += (cx - p.x) * 0.04 * force;
        p.vy += (cy - p.y) * 0.04 * force;
        p.stuck = Math.min(1, p.stuck + 0.08 * force);
      }
    }
  }

  exhale() {
    this.mass = Math.max(0.05, this.mass * 0.72);
    for (const p of this.ps) {
      if (Math.random() < 0.45) {
        p.stuck = 0;
        p.vx += (Math.random() - 0.5) * 180;
        p.vy += (Math.random() - 0.5) * 180;
      }
    }
  }

  step(dt: number) {
    const cx = this.w * 0.5;
    const cy = this.h * 0.48;
    this.mass = Math.max(0.05, this.mass - dt * 0.004);
    this.radius = 22 + this.mass * 90;
    for (const p of this.ps) {
      const dx = cx - p.x;
      const dy = cy - p.y;
      const d = Math.hypot(dx, dy) + 0.001;
      if (p.stuck > 0.4) {
        const orbit = this.radius * (0.55 + p.stuck * 0.5);
        p.vx += (dx / d) * (d - orbit) * 8 * dt;
        p.vy += (dy / d) * (d - orbit) * 8 * dt;
        p.vx += -dy * 0.4 * dt;
        p.vy += dx * 0.4 * dt;
      } else {
        p.vx += (dx / d) * 12 * dt * this.mass;
        p.vy += (dy / d) * 12 * dt * this.mass;
      }
      p.vx *= 0.96;
      p.vy *= 0.96;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.x < -20) p.x = this.w + 20;
      if (p.x > this.w + 20) p.x = -20;
      if (p.y < -20) p.y = this.h + 20;
      if (p.y > this.h + 20) p.y = -20;
    }
  }

  draw() {
    const ctx = this.ctx;
    const s = this.dpr;
    ctx.setTransform(s, 0, 0, s, 0, 0);
    ctx.fillStyle = "#07040a";
    ctx.fillRect(0, 0, this.w, this.h);
    const cx = this.w * 0.5;
    const cy = this.h * 0.48;
    const g = ctx.createRadialGradient(cx, cy, 4, cx, cy, this.radius * 1.6);
    g.addColorStop(0, `rgba(210,90,70,${0.12 + this.mass * 0.2})`);
    g.addColorStop(1, "rgba(7,4,10,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, this.w, this.h);
    for (const p of this.ps) {
      const a = 0.12 + p.stuck * 0.45;
      const r = 0.7 + p.stuck * 1.6;
      ctx.fillStyle = `rgba(232,140,110,${a})`;
      ctx.fillRect(p.x, p.y, r, r);
    }
  }
}
