type Trace = { x: number; y: number; life: number; r: number };

export class Dust {
  private ctx: CanvasRenderingContext2D;
  private canvas: HTMLCanvasElement;
  private n: number;
  private x: Float32Array;
  private y: Float32Array;
  private vx: Float32Array;
  private vy: Float32Array;
  private traces: Trace[] = [];
  private dpr = 1;
  private w = 1;
  private h = 1;

  constructor(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) throw new Error("2d");
    this.canvas = canvas;
    this.ctx = ctx;
    const mobile = matchMedia("(max-width: 720px)").matches;
    this.n = Math.min(mobile ? 1400 : 2600, Math.floor((innerWidth * innerHeight) / (mobile ? 520 : 340)));
    this.x = new Float32Array(this.n);
    this.y = new Float32Array(this.n);
    this.vx = new Float32Array(this.n);
    this.vy = new Float32Array(this.n);
    this.reset(innerWidth, innerHeight);
  }

  private reset(width: number, height: number) {
    this.w = width;
    this.h = height;
    for (let i = 0; i < this.n; i++) {
      this.x[i] = Math.random() * width;
      this.y[i] = Math.random() * height;
      this.vx[i] = (Math.random() - 0.5) * 0.25;
      this.vy[i] = (Math.random() - 0.5) * 0.25;
    }
  }

  resize(width: number, height: number) {
    this.dpr = Math.min(window.devicePixelRatio || 1, 1.5);
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

  stamp(x: number, y: number) {
    if (this.traces.length > 80) this.traces.shift();
    this.traces.push({ x, y, life: 1, r: 18 + Math.random() * 28 });
  }

  burst(x: number, y: number) {
    for (let i = 0; i < this.n; i += 7) {
      const dx = this.x[i] - x;
      const dy = this.y[i] - y;
      const d = Math.sqrt(dx * dx + dy * dy) + 8;
      this.vx[i] += (dx / d) * 4.2;
      this.vy[i] += (dy / d) * 4.2;
    }
    this.stamp(x, y);
  }

  step(dt: number, mx: number, my: number, force: number, freeze: number, entropy: number) {
    const damp = 0.988 + freeze * 0.01;
    const attract = 0.008 * force;
    for (let i = 0; i < this.n; i++) {
      if (freeze > 0.7) {
        this.x[i] += this.vx[i] * 0.05;
        this.y[i] += this.vy[i] * 0.05;
        continue;
      }
      const dx = mx - this.x[i];
      const dy = my - this.y[i];
      const d2 = dx * dx + dy * dy + 80;
      const sign = i % 3 === 0 ? -1 : 1;
      this.vx[i] += (dx / d2) * attract * 420 * sign;
      this.vy[i] += (dy / d2) * attract * 420 * sign;
      this.vx[i] += (Math.random() - 0.5) * entropy * 0.08;
      this.vy[i] += (Math.random() - 0.5) * entropy * 0.08;
      this.vx[i] *= damp;
      this.vy[i] *= damp;
      this.x[i] += this.vx[i] * dt * 60;
      this.y[i] += this.vy[i] * dt * 60;
      if (this.x[i] < -20) this.x[i] = this.w + 20;
      if (this.x[i] > this.w + 20) this.x[i] = -20;
      if (this.y[i] < -20) this.y[i] = this.h + 20;
      if (this.y[i] > this.h + 20) this.y[i] = -20;
    }
    for (const t of this.traces) t.life *= 0.997;
    this.traces = this.traces.filter((t) => t.life > 0.04);
  }

  draw(alpha = 0.55) {
    const ctx = this.ctx;
    const s = this.dpr;
    ctx.setTransform(s, 0, 0, s, 0, 0);
    ctx.globalCompositeOperation = "destination-out";
    ctx.fillStyle = "rgba(0,0,0,0.12)";
    ctx.fillRect(0, 0, this.w, this.h);
    ctx.globalCompositeOperation = "lighter";

    for (const t of this.traces) {
      const g = ctx.createRadialGradient(t.x, t.y, 0, t.x, t.y, t.r);
      g.addColorStop(0, `rgba(139,92,255,${0.16 * t.life})`);
      g.addColorStop(1, "rgba(139,92,255,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(t.x, t.y, t.r, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = `rgba(198,167,255,${0.22 * alpha})`;
    for (let i = 0; i < this.n; i++) {
      const sz = i % 17 === 0 ? 1.6 : 0.7;
      ctx.beginPath();
      ctx.arc(this.x[i], this.y[i], sz, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  paintCard(canvas: HTMLCanvasElement, seed: number) {
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    ctx.save();
    ctx.beginPath();
    if (typeof ctx.roundRect === "function") ctx.roundRect(0, 0, w, h, 16);
    else ctx.rect(0, 0, w, h);
    ctx.clip();

    const bg = ctx.createRadialGradient(w * 0.5, h * 0.52, 6, w * 0.5, h * 0.5, w * 0.72);
    bg.addColorStop(0, "#1c1633");
    bg.addColorStop(1, "#09090d");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    const cx = w * 0.5;
    const cy = h * 0.52;
    ctx.beginPath();
    for (let i = 0; i <= 72; i++) {
      const t = (i / 72) * Math.PI * 2;
      const wobble = 0.74 + 0.2 * Math.sin(t * 3 + seed * 8) + 0.08 * Math.sin(t * 5 - seed * 4);
      const x = cx + Math.cos(t) * (50 + seed * 16) * wobble;
      const y = cy + Math.sin(t) * (30 + seed * 10) * wobble;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fillStyle = "rgba(139,92,255,0.22)";
    ctx.fill();
    ctx.strokeStyle = "rgba(198,167,255,0.38)";
    ctx.lineWidth = 1.4;
    ctx.lineJoin = "round";
    ctx.stroke();

    for (let i = 0; i < 90; i++) {
      const a = i * 0.41 + seed * 12;
      const rad = 10 + (i % 17) * 2.4 + seed * 14;
      const x = cx + Math.cos(a) * rad;
      const y = cy + Math.sin(a * 0.9) * rad * 0.58;
      ctx.beginPath();
      ctx.arc(x, y, i % 5 === 0 ? 1.8 : 0.85, 0, Math.PI * 2);
      ctx.fillStyle = i % 4 === 0 ? "rgba(85,214,255,0.42)" : "rgba(139,92,255,0.36)";
      ctx.fill();
    }
    ctx.restore();
  }
}
