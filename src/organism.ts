export class Organism {
  private ctx: CanvasRenderingContext2D;
  private canvas: HTMLCanvasElement;
  private n: number;
  private x: Float32Array;
  private y: Float32Array;
  private vx: Float32Array;
  private vy: Float32Array;
  private home: Float32Array;
  private life: Float32Array;
  private size: Float32Array;
  private hue: Float32Array;
  private dpr = 1;
  private w = 1;
  private h = 1;

  constructor(canvas: HTMLCanvasElement, count = Math.min(4800, Math.floor((innerWidth * innerHeight) / 280))) {
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) throw new Error("2d");
    this.canvas = canvas;
    this.ctx = ctx;
    this.n = count;
    this.x = new Float32Array(count);
    this.y = new Float32Array(count);
    this.vx = new Float32Array(count);
    this.vy = new Float32Array(count);
    this.home = new Float32Array(count);
    this.life = new Float32Array(count);
    this.size = new Float32Array(count);
    this.hue = new Float32Array(count);
    this.reset(innerWidth, innerHeight);
  }

  reset(width: number, height: number) {
    this.w = width;
    this.h = height;
    for (let i = 0; i < this.n; i++) {
      this.x[i] = Math.random() * width;
      this.y[i] = Math.random() * height;
      this.vx[i] = (Math.random() - 0.5) * 0.4;
      this.vy[i] = (Math.random() - 0.5) * 0.4;
      this.home[i] = Math.random() * Math.PI * 2;
      this.life[i] = Math.random();
      this.size[i] = Math.random() < 0.06 ? 2.2 + Math.random() * 3.2 : 0.55 + Math.random() * 1.25;
      this.hue[i] = Math.random();
    }
  }

  resize(width: number, height: number) {
    this.dpr = Math.min(window.devicePixelRatio || 1, 1.6);
    const w = Math.max(1, Math.floor(width * this.dpr));
    const h = Math.max(1, Math.floor(height * this.dpr));
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
      this.reset(width, height);
    }
    this.w = width;
    this.h = height;
  }

  burst(px: number, py: number, force = 8) {
    for (let i = 0; i < this.n; i++) {
      const dx = this.x[i] - px;
      const dy = this.y[i] - py;
      const d2 = dx * dx + dy * dy + 40;
      const f = force * 1200 / d2;
      this.vx[i] += (dx / Math.sqrt(d2)) * f;
      this.vy[i] += (dy / Math.sqrt(d2)) * f;
      this.life[i] = Math.min(1, this.life[i] + 0.35);
    }
  }

  step(dt: number, mx: number, my: number, hold: number, energy: number, idle: number) {
    const cx = mx;
    const cy = my;
    const attract = 0.035 + hold * 0.12 + Math.min(idle, 20) * 0.0015;
    const swirl = 0.018 + hold * 0.04;
    const damp = 0.986 - hold * 0.008;

    for (let i = 0; i < this.n; i++) {
      const dx = cx - this.x[i];
      const dy = cy - this.y[i];
      const d2 = dx * dx + dy * dy;
      const d = Math.sqrt(d2) + 0.0001;
      const ndx = dx / d;
      const ndy = dy / d;

      const orbit = 36 + (i % 89) * 2.4 + Math.sin(this.home[i] * 2.1) * 28;
      const pull = (d - orbit) * attract * (0.28 + (i % 11) * 0.05);
      this.vx[i] += ndx * pull * dt * 60;
      this.vy[i] += ndy * pull * dt * 60;
      this.vx[i] += -ndy * swirl * dt * 60 * (0.6 + energy);
      this.vy[i] += ndx * swirl * dt * 60 * (0.6 + energy);

      const ang = this.home[i] + performance.now() * 0.00015 * (0.6 + (i % 7) * 0.1);
      this.vx[i] += Math.cos(ang) * 0.02;
      this.vy[i] += Math.sin(ang) * 0.02;

      this.vx[i] *= damp;
      this.vy[i] *= damp;
      this.x[i] += this.vx[i];
      this.y[i] += this.vy[i];

      if (this.x[i] < -40) this.x[i] = this.w + 40;
      if (this.x[i] > this.w + 40) this.x[i] = -40;
      if (this.y[i] < -40) this.y[i] = this.h + 40;
      if (this.y[i] > this.h + 40) this.y[i] = -40;

      this.life[i] += (0.35 + energy * 0.4 - this.life[i]) * 0.02;
    }
  }

  draw(color: [number, number, number], energy: number) {
    const ctx = this.ctx;
    const s = this.dpr;
    ctx.setTransform(s, 0, 0, s, 0, 0);
    ctx.globalCompositeOperation = "destination-out";
    ctx.fillStyle = `rgba(0,0,0,${0.11 - energy * 0.03})`;
    ctx.fillRect(0, 0, this.w, this.h);
    ctx.globalCompositeOperation = "lighter";

    const [r, g, b] = color;
    const R = Math.round(r * 255);
    const G = Math.round(g * 255);
    const B = Math.round(b * 255);

    for (let i = 0; i < this.n; i++) {
      const a = 0.12 + this.life[i] * 0.55;
      const sz = this.size[i] * (1 + energy * 0.5);
      if (sz > 2.4) {
        ctx.fillStyle = `rgba(${R},${G},${B},${a * 0.12})`;
        ctx.beginPath();
        ctx.arc(this.x[i], this.y[i], sz * 4.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = `rgba(${R},${G},${B},${a})`;
      ctx.beginPath();
      ctx.arc(this.x[i], this.y[i], sz, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
