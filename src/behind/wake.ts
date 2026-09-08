import { gpuScale } from "../shared/gpu";

type Seg = { x: number; y: number; a: number };

export class Wake {
  private ctx: CanvasRenderingContext2D;
  private canvas: HTMLCanvasElement;
  private segs: Seg[] = [];
  private dpr = 1;
  w = 1;
  h = 1;
  head = { x: 0.5, y: 0.42 };
  max = 180;

  constructor(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) throw new Error("2d");
    this.canvas = canvas;
    this.ctx = ctx;
    this.max = Math.floor(280 * gpuScale());
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
  }

  step(dt: number, mx: number, my: number, presence: number) {
    const hx = this.head.x * this.w;
    const hy = this.head.y * this.h;
    const dx = mx - hx;
    const dy = my - hy;
    const toward = dy < 0 ? 1 : 0;
    const back = dy > 40 ? 1 : 0;
    this.head.x += (0.5 - this.head.x) * 0.02;
    this.head.y += ((0.38 - toward * 0.04) - this.head.y) * 0.03;
    if (this.segs.length < this.max) {
      const n = reducedCount(dt, presence);
      for (let i = 0; i < n; i++) {
        this.segs.push({
          x: hx + (Math.random() - 0.5) * 10,
          y: hy + 8 + Math.random() * 16,
          a: 0.55,
        });
      }
    }
    for (const s of this.segs) {
      s.y += (18 + presence * 0.02) * dt;
      s.x += (Math.random() - 0.5) * 8 * dt;
      s.a *= 0.992;
    }
    this.segs = this.segs.filter((s) => s.a > 0.03 && s.y < this.h + 20);
    if (this.segs.length > this.max) this.segs.splice(0, this.segs.length - this.max);
    return { forward: toward, back, hx, hy, dx, dy };
  }

  draw(lookBack: number) {
    const ctx = this.ctx;
    const s = this.dpr;
    ctx.setTransform(s, 0, 0, s, 0, 0);
    ctx.fillStyle = "#05060c";
    ctx.fillRect(0, 0, this.w, this.h);
    const hx = this.head.x * this.w;
    const hy = this.head.y * this.h;
    ctx.strokeStyle = `rgba(220,214,200,${0.12 + lookBack * 0.12})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(hx, hy);
    for (let i = 0; i < this.segs.length; i += 3) {
      const p = this.segs[i];
      ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();
    for (const p of this.segs) {
      ctx.fillStyle = `rgba(220,214,200,${p.a * (0.25 + lookBack * 0.2)})`;
      ctx.fillRect(p.x, p.y, 1.2, 1.6);
    }
    ctx.fillStyle = "rgba(244,239,230,0.9)";
    ctx.beginPath();
    ctx.arc(hx, hy, 2.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(244,239,230,0.12)";
    ctx.beginPath();
    ctx.arc(hx, hy, 10, 0, Math.PI * 2);
    ctx.fill();
  }
}

function reducedCount(dt: number, presence: number) {
  const base = 2 + Math.min(8, presence * 0.02);
  return Math.max(1, Math.round(base * dt * 18));
}
