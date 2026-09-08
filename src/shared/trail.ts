type Speck = { x: number; y: number; life: number; max: number; r: number };

/** Short gesture scar. Not confetti. */
export class GestureTrail {
  private ctx: CanvasRenderingContext2D;
  private canvas: HTMLCanvasElement;
  private specks: Speck[] = [];
  private dpr = 1;
  private w = 1;
  private h = 1;
  private last = { x: 0, y: 0, t: 0 };

  constructor(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) throw new Error("2d");
    this.canvas = canvas;
    this.ctx = ctx;
  }

  resize(width: number, height: number, dpr: number) {
    this.dpr = dpr;
    const w = Math.max(1, Math.floor(width * dpr));
    const h = Math.max(1, Math.floor(height * dpr));
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
    }
    this.w = width;
    this.h = height;
  }

  stamp(x: number, y: number, force = 1) {
    const now = performance.now();
    const dx = x - this.last.x;
    const dy = y - this.last.y;
    if (now - this.last.t < 18 && Math.hypot(dx, dy) < 3) return;
    this.last = { x, y, t: now };
    if (this.specks.length > 90) this.specks.shift();
    this.specks.push({
      x,
      y,
      life: 1,
      max: 0.4 + Math.random() * 0.8,
      r: (0.6 + Math.random() * 1.4) * force,
    });
  }

  step(dt: number) {
    for (const s of this.specks) s.life -= dt / s.max;
    this.specks = this.specks.filter((s) => s.life > 0);
  }

  draw(rgb = [244, 239, 230]) {
    const ctx = this.ctx;
    const s = this.dpr;
    ctx.setTransform(s, 0, 0, s, 0, 0);
    ctx.clearRect(0, 0, this.w, this.h);
    const [r, g, b] = rgb;
    for (const sp of this.specks) {
      const a = sp.life * 0.18;
      ctx.fillStyle = `rgba(${r},${g},${b},${a})`;
      ctx.beginPath();
      ctx.arc(sp.x, sp.y, sp.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
