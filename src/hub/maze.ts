import { gpuScale, isMobileGpu } from "../shared/gpu";
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
type Ripple = { x: number; y: number; t: number };
type Mote = { x: number; y: number; vx: number; vy: number; life: number; s: number };
type Seg = { x0: number; y0: number; x1: number; y1: number };
type Cell = { x: number; y: number };

const DX = [0, 1, 0, -1];
const DY = [-1, 0, 1, 0];

function mulberry(seed: number) {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function odd(n: number) {
  const v = Math.max(11, n | 0);
  return v % 2 === 0 ? v - 1 : v;
}

export class Maze {
  private ctx: CanvasRenderingContext2D;
  private canvas: HTMLCanvasElement;
  private dpr = 1;
  private w = 1;
  private h = 1;
  private cols = 0;
  private rows = 0;
  private cell = 16;
  private ox = 0;
  private oy = 0;
  private grid = new Uint8Array(0);
  private exits: Cell[] = GATES.map(() => ({ x: 0, y: 0 }));
  private segs: Seg[] = [];
  private floor: Cell[] = [];
  private roomR = 3;
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

  private ix(x: number, y: number) {
    return y * this.cols + x;
  }

  private at(x: number, y: number) {
    if (x < 0 || y < 0 || x >= this.cols || y >= this.rows) return 0;
    return this.grid[this.ix(x, y)];
  }

  private set(x: number, y: number, v = 1) {
    if (x < 0 || y < 0 || x >= this.cols || y >= this.rows) return;
    this.grid[this.ix(x, y)] = v;
  }

  private cellPt(x: number, y: number): Pt {
    return {
      x: this.ox + (x + 0.5) * this.cell,
      y: this.oy + (y + 0.5) * this.cell,
    };
  }

  private build(w: number, h: number) {
    const simple = isMobileGpu();
    const target = simple ? 26 : 18;
    const cols = odd(Math.floor(w / target));
    const rows = odd(Math.floor(h / target));
    const cell = Math.min(w / cols, h / rows);
    this.cell = cell;
    this.ox = (w - cols * cell) / 2;
    this.oy = (h - rows * cell) / 2;
    if (cols === this.cols && rows === this.rows && this.grid.length) {
      this.spawnMotes();
      return;
    }
    this.cols = cols;
    this.rows = rows;
    this.carve(simple);
    this.collect();
    this.spawnMotes();
  }

  private carve(simple: boolean) {
    const cols = this.cols;
    const rows = this.rows;
    const rnd = mulberry(2026 + cols * 97 + rows);
    this.grid = new Uint8Array(cols * rows);

    const inb = (x: number, y: number) => x > 0 && y > 0 && x < cols - 1 && y < rows - 1;

    const cx = Math.floor(cols / 2) | 1;
    const cy = Math.floor(rows / 2) | 1;
    this.set(cx, cy, 1);

    const stack: [number, number, number][] = [[cx, cy, 0]];
    while (stack.length) {
      const [x, y, last] = stack[stack.length - 1];
      const order = [0, 1, 2, 3];
      for (let i = 3; i > 0; i--) {
        const j = (rnd() * (i + 1)) | 0;
        const tmp = order[i];
        order[i] = order[j];
        order[j] = tmp;
      }
      if (rnd() < 0.62) {
        const i = order.indexOf(last);
        if (i > 0) {
          order[i] = order[0];
          order[0] = last;
        }
      }
      let found = false;
      for (const d of order) {
        const nx = x + DX[d] * 2;
        const ny = y + DY[d] * 2;
        if (!inb(nx, ny) || this.at(nx, ny)) continue;
        this.set(x + DX[d], y + DY[d], 1);
        this.set(nx, ny, 1);
        stack.push([nx, ny, d]);
        found = true;
        break;
      }
      if (!found) stack.pop();
    }

    const room = simple ? 2 : 3;
    this.roomR = room;
    for (let y = cy - room; y <= cy + room; y++) {
      for (let x = cx - room; x <= cx + room; x++) this.set(x, y, 1);
    }

    const loops = Math.floor(cols * rows * (simple ? 0.012 : 0.018));
    for (let n = 0; n < loops; n++) {
      const x = 1 + (((rnd() * (cols - 2)) | 0) | 1);
      const y = 1 + (((rnd() * (rows - 2)) | 0) | 1);
      const d = (rnd() * 4) | 0;
      const wx = x + DX[d];
      const wy = y + DY[d];
      const ox = x + DX[d] * 2;
      const oy = y + DY[d] * 2;
      if (this.at(x, y) && this.at(ox, oy) && !this.at(wx, wy)) this.set(wx, wy, 1);
    }

    const sides: Array<"n" | "e" | "s" | "w"> = ["n", "w", "e", "s", "s"];
    this.exits = GATES.map((g, i) => this.openExit(g.nx, g.ny, sides[i] ?? "n", cx, cy));
  }

  private openExit(nx: number, ny: number, prefer: "n" | "e" | "s" | "w", cx: number, cy: number): Cell {
    const tx = Math.min(this.cols - 2, Math.max(1, Math.round(nx * (this.cols - 1))));
    const ty = Math.min(this.rows - 2, Math.max(1, Math.round(ny * (this.rows - 1))));
    let x = tx | 1;
    let y = ty | 1;
    if (prefer === "n") y = 1;
    else if (prefer === "s") {
      y = this.rows - 2;
      if ((y & 1) === 0) y -= 1;
    } else if (prefer === "w") x = 1;
    else {
      x = this.cols - 2;
      if ((x & 1) === 0) x -= 1;
    }
    x = Math.min(this.cols - 2, Math.max(1, x | 1));
    y = Math.min(this.rows - 2, Math.max(1, y | 1));

    this.set(x, y, 1);
    if (!this.connected(cx, cy, x, y)) this.tunnel(cx, cy, x, y);
    this.set(x, y, 1);

    if (prefer === "n") {
      for (let yy = y; yy >= 0; yy--) this.set(x, yy, 1);
      return { x, y: Math.min(y + 2, this.rows - 3) | 1 };
    }
    if (prefer === "s") {
      for (let yy = y; yy < this.rows; yy++) this.set(x, yy, 1);
      return { x, y: Math.max(y - 2, 3) | 1 };
    }
    if (prefer === "w") {
      for (let xx = x; xx >= 0; xx--) this.set(xx, y, 1);
      return { x: Math.min(x + 2, this.cols - 3) | 1, y };
    }
    for (let xx = x; xx < this.cols; xx++) this.set(xx, y, 1);
    return { x: Math.max(x - 2, 3) | 1, y };
  }

  private connected(x0: number, y0: number, x1: number, y1: number) {
    if (!this.at(x0, y0) || !this.at(x1, y1)) return false;
    const seen = new Uint8Array(this.grid.length);
    const q: number[] = [this.ix(x0, y0)];
    seen[q[0]] = 1;
    let n = 0;
    while (n < q.length) {
      const i = q[n++];
      const x = i % this.cols;
      const y = (i / this.cols) | 0;
      if (x === x1 && y === y1) return true;
      for (let d = 0; d < 4; d++) {
        const nx = x + DX[d];
        const ny = y + DY[d];
        if (!this.at(nx, ny)) continue;
        const j = this.ix(nx, ny);
        if (seen[j]) continue;
        seen[j] = 1;
        q.push(j);
      }
    }
    return false;
  }

  private tunnel(x0: number, y0: number, x1: number, y1: number) {
    let x = x0;
    let y = y0;
    this.set(x, y, 1);
    while (x !== x1) {
      x += x1 > x ? 1 : -1;
      this.set(x, y, 1);
    }
    while (y !== y1) {
      y += y1 > y ? 1 : -1;
      this.set(x, y, 1);
    }
  }

  private collect() {
    const segs: Seg[] = [];
    const floor: Cell[] = [];
    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        if (!this.at(x, y)) continue;
        floor.push({ x, y });
        if (x + 1 < this.cols && this.at(x + 1, y)) segs.push({ x0: x, y0: y, x1: x + 1, y1: y });
        if (y + 1 < this.rows && this.at(x, y + 1)) segs.push({ x0: x, y0: y, x1: x, y1: y + 1 });
      }
    }
    this.segs = segs;
    this.floor = floor;
  }

  private spawnMotes() {
    const n = Math.floor(180 * gpuScale());
    const rnd = mulberry(9);
    this.motes = [];
    if (!this.floor.length) return;
    for (let i = 0; i < n; i++) {
      const c = this.floor[(rnd() * this.floor.length) | 0];
      const p = this.cellPt(c.x, c.y);
      this.motes.push({
        x: p.x + (rnd() - 0.5) * this.cell * 0.4,
        y: p.y + (rnd() - 0.5) * this.cell * 0.4,
        vx: (rnd() - 0.5) * 8,
        vy: (rnd() - 0.5) * 8,
        life: 0.2 + rnd() * 0.7,
        s: 0.6 + rnd() * 1.2,
      });
    }
  }

  gatePos(i: number): Pt {
    const e = this.exits[i];
    if (!e) {
      const g = GATES[i];
      return { x: g.nx * this.w, y: g.ny * this.h };
    }
    return this.cellPt(e.x, e.y);
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

    const cell = this.cell;
    for (const m of this.motes) {
      const gx = Math.floor((m.x - this.ox) / cell);
      const gy = Math.floor((m.y - this.oy) / cell);
      if (!this.at(gx, gy)) {
        m.vx *= -1;
        m.vy *= -1;
        m.x += m.vx * dt * 4;
        m.y += m.vy * dt * 4;
      }
      const dx = mx - m.x;
      const dy = my - m.y;
      const d = Math.hypot(dx, dy) + 50;
      m.vx += (dx / d) * 10 * dt;
      m.vy += (dy / d) * 10 * dt;
      m.vx += Math.sin(this.t * 0.4 + m.x * 0.02) * 3 * dt;
      m.vy += Math.cos(this.t * 0.33 + m.y * 0.02) * 3 * dt;
      m.vx *= 0.96;
      m.vy *= 0.96;
      m.x += m.vx * dt;
      m.y += m.vy * dt;
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
    const cell = this.cell;
    const lamp = 130 + hold * 90 + awake * 40;

    const vis = (x: number, y: number) => {
      const d = Math.hypot(x - mx, y - my);
      return Math.exp(-d / lamp);
    };

    const warp = (p: Pt): Pt => {
      const dx = mx - p.x;
      const dy = my - p.y;
      const d = Math.hypot(dx, dy) + 1;
      const k = Math.exp(-d / 240) * (10 + hold * 8);
      return { x: p.x + (dx / d) * k * 0.12, y: p.y + (dy / d) * k * 0.12 };
    };

    ctx.save();
    ctx.beginPath();
    ctx.rect(this.ox, this.oy, this.cols * cell, this.rows * cell);
    ctx.clip();

    ctx.fillStyle = "#100c12";
    ctx.fillRect(this.ox, this.oy, this.cols * cell, this.rows * cell);
    const rcx = Math.floor(this.cols / 2) | 1;
    const rcy = Math.floor(this.rows / 2) | 1;
    const roomR = this.roomR;
    ctx.fillStyle = "#050308";
    for (const c of this.floor) {
      if (Math.abs(c.x - rcx) <= roomR && Math.abs(c.y - rcy) <= roomR) continue;
      ctx.fillRect(this.ox + c.x * cell - 0.3, this.oy + c.y * cell - 0.3, cell + 0.7, cell + 0.7);
    }
    ctx.fillRect(
      this.ox + (rcx - roomR) * cell + cell * 0.15,
      this.oy + (rcy - roomR) * cell + cell * 0.15,
      (roomR * 2 + 1) * cell - cell * 0.3,
      (roomR * 2 + 1) * cell - cell * 0.3,
    );

    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    const slit = Math.max(1.2, cell * 0.24);
    for (const seg of this.segs) {
      const aIn = Math.abs(seg.x0 - rcx) <= roomR && Math.abs(seg.y0 - rcy) <= roomR;
      const bIn = Math.abs(seg.x1 - rcx) <= roomR && Math.abs(seg.y1 - rcy) <= roomR;
      if (aIn && bIn) continue;
      const a0 = this.cellPt(seg.x0, seg.y0);
      const a1 = this.cellPt(seg.x1, seg.y1);
      const p0 = warp(a0);
      const p1 = warp(a1);
      const midX = (p0.x + p1.x) * 0.5;
      const midY = (p0.y + p1.y) * 0.5;
      const near = vis(midX, midY);
      const a = 0.16 + awake * 0.12 + near * 0.38 + this.pulse * 0.12 + breath * 0.03;
      ctx.strokeStyle = `rgba(244,232,210,${Math.min(0.82, a)})`;
      ctx.lineWidth = slit * (0.8 + near * 0.4);
      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.lineTo(p1.x, p1.y);
      ctx.stroke();
    }

    const room = this.cellPt(Math.floor(this.cols / 2) | 1, Math.floor(this.rows / 2) | 1);
    const well = ctx.createRadialGradient(room.x, room.y, 4, room.x, room.y, cell * 4.2);
    well.addColorStop(0, `rgba(214,186,150,${0.16 + awake * 0.1 + breath * 0.05})`);
    well.addColorStop(1, "rgba(214,186,150,0)");
    ctx.fillStyle = well;
    ctx.beginPath();
    ctx.arc(room.x, room.y, cell * 4.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    const seek = ctx.createRadialGradient(mx, my, 0, mx, my, lamp);
    seek.addColorStop(0, `rgba(244,220,180,${0.07 + hold * 0.05})`);
    seek.addColorStop(0.45, `rgba(244,220,180,${0.02 + hold * 0.02})`);
    seek.addColorStop(1, "rgba(5,3,8,0)");
    ctx.fillStyle = seek;
    ctx.fillRect(0, 0, this.w, this.h);

    const dusk = 0.38 - awake * 0.16;
    const shade = ctx.createRadialGradient(mx, my, lamp * 0.18, mx, my, lamp * 1.35);
    shade.addColorStop(0, "rgba(5,3,8,0)");
    shade.addColorStop(0.55, `rgba(5,3,8,${dusk * 0.35})`);
    shade.addColorStop(1, `rgba(5,3,8,${dusk})`);
    ctx.fillStyle = shade;
    ctx.fillRect(0, 0, this.w, this.h);

    if (!simple) {
      for (const m of this.motes) {
        const a = m.life * (0.08 + vis(m.x, m.y) * 0.35);
        if (a < 0.03) continue;
        ctx.fillStyle = `rgba(244,230,200,${a})`;
        ctx.fillRect(m.x, m.y, m.s, m.s);
      }
    }

    ctx.fillStyle = `rgba(244,236,214,${0.22 + breath * 0.14 + awake * 0.12})`;
    ctx.beginPath();
    ctx.arc(room.x, room.y, 3.2 + breath * 1.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = `rgba(244,236,214,${0.14 + breath * 0.08})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(room.x, room.y, cell * 1.1 + breath * 3, 0, Math.PI * 2);
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

      ctx.fillStyle = `rgba(${R},${G},${B},${0.16 + beat * 0.1 + (hot ? 0.2 : 0)})`;
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

    const vig = ctx.createRadialGradient(cx, cy, Math.min(this.w, this.h) * 0.22, cx, cy, Math.min(this.w, this.h) * 0.82);
    vig.addColorStop(0, "rgba(5,3,8,0)");
    vig.addColorStop(1, "rgba(5,3,8,0.5)");
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
