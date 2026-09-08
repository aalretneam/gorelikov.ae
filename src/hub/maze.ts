import { isMobileGpu } from "../shared/gpu";
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
  { id: "field", href: "./field.html", word: "остаться", nx: 0.5, ny: 0.02, rgb: [1, 0.72, 0.42], freq: 196 },
  { id: "mosaic", href: "./unnamed.html", word: "собрать", nx: 0.02, ny: 0.28, rgb: [0.72, 0.86, 0.92], freq: 247 },
  { id: "machine", href: "./machine.html", word: "смотреть", nx: 0.98, ny: 0.28, rgb: [0.55, 0.78, 1], freq: 164 },
  { id: "want", href: "./want.html", word: "хотеть", nx: 0.36, ny: 0.98, rgb: [0.92, 0.48, 0.38], freq: 220 },
  { id: "behind", href: "./behind.html", word: "уже", nx: 0.64, ny: 0.98, rgb: [0.82, 0.78, 0.7], freq: 131 },
];

export const HIT = 72;

type Pt = { x: number; y: number };
type Ripple = { x: number; y: number; t: number };
type Cell = { x: number; y: number };

const DX = [0, 1, 0, -1];
const DY = [-1, 0, 1, 0];
const SCALE_NEAR = 3.05;
const SCALE_FAR = 0.28;

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

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

export class Maze {
  private ctx: CanvasRenderingContext2D;
  private canvas: HTMLCanvasElement;
  private dpr = 1;
  private w = 1;
  private h = 1;
  private cols = 0;
  private rows = 0;
  private cell = 24;
  private grid = new Uint8Array(0);
  private exits: Cell[] = GATES.map(() => ({ x: 0, y: 0 }));
  private roomR = 3;
  private ripples: Ripple[] = [];
  pulse = 0;
  click = 10;
  private t = 0;
  private camX = 0;
  private camY = 0;
  private scale = SCALE_NEAR;
  private vx = 0;
  private vy = 0;
  private rcx = 1;
  private rcy = 1;

  constructor(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) throw new Error("2d");
    this.canvas = canvas;
    this.ctx = ctx;
    this.carveWorld();
    this.camX = this.worldW() * 0.5;
    this.camY = this.worldH() * 0.5;
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

  private worldW() {
    return this.cols * this.cell;
  }

  private worldH() {
    return this.rows * this.cell;
  }

  private worldPt(x: number, y: number): Pt {
    return { x: (x + 0.5) * this.cell, y: (y + 0.5) * this.cell };
  }

  toWorld(sx: number, sy: number): Pt {
    return {
      x: this.camX + (sx - this.w * 0.5) / this.scale,
      y: this.camY + (sy - this.h * 0.5) / this.scale,
    };
  }

  toScreen(wx: number, wy: number): Pt {
    return {
      x: (wx - this.camX) * this.scale + this.w * 0.5,
      y: (wy - this.camY) * this.scale + this.h * 0.5,
    };
  }

  pan(dx: number, dy: number) {
    this.camX -= dx / this.scale;
    this.camY -= dy / this.scale;
    this.clampCam();
  }

  fling(vxScreen: number, vyScreen: number) {
    this.vx = -vxScreen / this.scale;
    this.vy = -vyScreen / this.scale;
  }

  snapWide() {
    this.scale = SCALE_FAR;
    this.clampCam();
  }

  zoomTo(elapsed: number, reduced: boolean, wide = false) {
    if (wide) {
      this.scale = SCALE_FAR;
      this.clampCam();
      return;
    }
    const dur = reduced ? 22 : 40;
    const u = Math.min(1, elapsed / 1000 / dur);
    const k = 1 - Math.exp(-u * 2.8);
    this.scale = lerp(SCALE_NEAR, SCALE_FAR, k);
    this.clampCam();
  }

  private clampCam() {
    const hw = this.w * 0.5 / this.scale;
    const hh = this.h * 0.5 / this.scale;
    const ww = this.worldW();
    const wh = this.worldH();
    if (ww <= this.w / this.scale) this.camX = ww * 0.5;
    else this.camX = Math.min(ww - hw, Math.max(hw, this.camX));
    if (wh <= this.h / this.scale) this.camY = wh * 0.5;
    else this.camY = Math.min(wh - hh, Math.max(hh, this.camY));
  }

  private carveWorld() {
    const simple = isMobileGpu();
    this.cell = simple ? 28 : 24;
    this.cols = odd(simple ? 41 : 55);
    this.rows = odd(simple ? 221 : 321);
    this.grid = new Uint8Array(this.cols * this.rows);
    const cols = this.cols;
    const rows = this.rows;
    const rnd = mulberry(2026 + cols * 97 + rows);
    const inb = (x: number, y: number) => x > 0 && y > 0 && x < cols - 1 && y < rows - 1;

    const cx = Math.floor(cols / 2) | 1;
    const cy = Math.floor(rows / 2) | 1;
    this.rcx = cx;
    this.rcy = cy;
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
      if (rnd() < 0.7) {
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

    const loops = Math.floor(cols * rows * (simple ? 0.01 : 0.016));
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
    let x = Math.min(this.cols - 2, Math.max(1, Math.round(nx * (this.cols - 1)))) | 1;
    let y = Math.min(this.rows - 2, Math.max(1, Math.round(ny * (this.rows - 1)))) | 1;
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

  gateWorld(i: number): Pt {
    const e = this.exits[i];
    if (!e) return { x: this.camX, y: this.camY };
    return this.worldPt(e.x, e.y);
  }

  gatePos(i: number): Pt {
    const p = this.gateWorld(i);
    return this.toScreen(p.x, p.y);
  }

  gateOnScreen(i: number, pad = 72): boolean {
    const p = this.gatePos(i);
    return p.x > -pad && p.x < this.w + pad && p.y > -pad && p.y < this.h + pad;
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

  ripple(sx: number, sy: number) {
    const w = this.toWorld(sx, sy);
    this.ripples.push({ x: w.x, y: w.y, t: 0 });
    this.click = 0;
  }

  step(dt: number) {
    this.t += dt;
    this.click += dt;
    this.pulse *= 0.96;
    for (const r of this.ripples) r.t += dt;
    this.ripples = this.ripples.filter((r) => r.t < 2.4);
    this.camX += this.vx * dt;
    this.camY += this.vy * dt;
    this.vx *= Math.pow(0.08, dt);
    this.vy *= Math.pow(0.08, dt);
    if (Math.hypot(this.vx, this.vy) < 8) {
      this.vx = 0;
      this.vy = 0;
    }
    this.clampCam();
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
    const breath = 0.5 + 0.5 * Math.sin(this.t * 0.55);
    const cell = this.cell;
    const scale = this.scale;
    const lampWorld = 7.5 * cell + hold * 4 * cell;
    const pointer = this.toWorld(mx, my);

    const vis = (wx: number, wy: number) => {
      const d = Math.hypot(wx - pointer.x, wy - pointer.y);
      return Math.exp(-d / lampWorld);
    };

    const halfW = this.w * 0.5 / scale;
    const halfH = this.h * 0.5 / scale;
    const x0 = Math.max(0, Math.floor((this.camX - halfW) / cell) - 1);
    const y0 = Math.max(0, Math.floor((this.camY - halfH) / cell) - 1);
    const x1 = Math.min(this.cols - 1, Math.ceil((this.camX + halfW) / cell) + 1);
    const y1 = Math.min(this.rows - 1, Math.ceil((this.camY + halfH) / cell) + 1);

    ctx.save();
    ctx.translate(this.w * 0.5, this.h * 0.5);
    ctx.scale(scale, scale);
    ctx.translate(-this.camX, -this.camY);

    ctx.fillStyle = "#100c12";
    ctx.fillRect(x0 * cell, y0 * cell, (x1 - x0 + 1) * cell + 1, (y1 - y0 + 1) * cell + 1);

    const rcx = this.rcx;
    const rcy = this.rcy;
    const roomR = this.roomR;
    ctx.fillStyle = "#050308";
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        if (!this.at(x, y)) continue;
        if (Math.abs(x - rcx) <= roomR && Math.abs(y - rcy) <= roomR) continue;
        ctx.fillRect(x * cell - 0.4, y * cell - 0.4, cell + 0.8, cell + 0.8);
      }
    }
    ctx.fillRect(
      (rcx - roomR) * cell + cell * 0.12,
      (rcy - roomR) * cell + cell * 0.12,
      (roomR * 2 + 1) * cell - cell * 0.24,
      (roomR * 2 + 1) * cell - cell * 0.24,
    );

    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    const slit = Math.max(1.05, cell * 0.22);
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        if (!this.at(x, y)) continue;
        const aIn = Math.abs(x - rcx) <= roomR && Math.abs(y - rcy) <= roomR;
        const p0 = this.worldPt(x, y);
        const near = vis(p0.x, p0.y);
        const a = 0.14 + awake * 0.1 + near * 0.42 + this.pulse * 0.1 + breath * 0.03;
        ctx.strokeStyle = `rgba(244,232,210,${Math.min(0.8, a)})`;
        ctx.lineWidth = slit * (0.75 + near * 0.4);
        if (x + 1 <= x1 + 1 && this.at(x + 1, y)) {
          const bIn = Math.abs(x + 1 - rcx) <= roomR && Math.abs(y - rcy) <= roomR;
          if (!(aIn && bIn)) {
            const p1 = this.worldPt(x + 1, y);
            ctx.beginPath();
            ctx.moveTo(p0.x, p0.y);
            ctx.lineTo(p1.x, p1.y);
            ctx.stroke();
          }
        }
        if (y + 1 <= y1 + 1 && this.at(x, y + 1)) {
          const bIn = Math.abs(x - rcx) <= roomR && Math.abs(y + 1 - rcy) <= roomR;
          if (!(aIn && bIn)) {
            const p1 = this.worldPt(x, y + 1);
            ctx.beginPath();
            ctx.moveTo(p0.x, p0.y);
            ctx.lineTo(p1.x, p1.y);
            ctx.stroke();
          }
        }
      }
    }

    const room = this.worldPt(rcx, rcy);
    const well = ctx.createRadialGradient(room.x, room.y, 4, room.x, room.y, cell * 4.2);
    well.addColorStop(0, `rgba(214,186,150,${0.16 + awake * 0.1 + breath * 0.05})`);
    well.addColorStop(1, "rgba(214,186,150,0)");
    ctx.fillStyle = well;
    ctx.beginPath();
    ctx.arc(room.x, room.y, cell * 4.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = `rgba(244,236,214,${0.22 + breath * 0.14 + awake * 0.12})`;
    ctx.beginPath();
    ctx.arc(room.x, room.y, 3.2 + breath * 1.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = `rgba(244,236,214,${0.14 + breath * 0.08})`;
    ctx.lineWidth = 1.2 / scale;
    ctx.beginPath();
    ctx.arc(room.x, room.y, cell * 1.1 + breath * 3, 0, Math.PI * 2);
    ctx.stroke();

    for (const i of reveal) {
      const g = GATES[i];
      const p = this.gateWorld(i);
      const hot = hover === i;
      const scar = visited.has(g.id);
      const [r, gv, b] = g.rgb;
      const R = Math.round(r * 255);
      const G = Math.round(gv * 255);
      const B = Math.round(b * 255);
      const beat = 0.55 + 0.45 * Math.sin(this.t * 2.1 + i);
      const glowR = ((hot ? 34 : 24) + beat * 6 + this.pulse * 10) / scale;

      ctx.fillStyle = `rgba(${R},${G},${B},${0.16 + beat * 0.1 + (hot ? 0.2 : 0)})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, glowR, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = `rgba(${R},${G},${B},${0.55 + beat * 0.25 + (hot ? 0.3 : 0) + (scar ? 0.12 : 0)})`;
      ctx.lineWidth = (hot ? 2 : 1.35) / scale;
      ctx.beginPath();
      ctx.arc(p.x, p.y, (11 + beat * 2 + (hot ? 3 : 0)) / scale, 0, Math.PI * 2);
      ctx.stroke();

      if (g.id === "field") this.drawBreath(p, R, G, B, hot, scale);
      else if (g.id === "mosaic") this.drawGlass(p, R, G, B, hot, scale);
      else if (g.id === "machine") this.drawRing(p, R, G, B, hot, scale);
      else if (g.id === "want") this.drawMass(p, R, G, B, hot, scale);
      else this.drawWake(p, R, G, B, hot, scale);
    }

    for (const rp of this.ripples) {
      const k = rp.t / 2.4;
      ctx.strokeStyle = `rgba(244,232,210,${(1 - k) * 0.28})`;
      ctx.lineWidth = 1.2 / scale;
      ctx.beginPath();
      ctx.arc(rp.x, rp.y, (16 + k * 110) / scale, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();

    const seek = ctx.createRadialGradient(mx, my, 0, mx, my, 160 + hold * 80);
    seek.addColorStop(0, `rgba(244,220,180,${0.06 + hold * 0.04})`);
    seek.addColorStop(1, "rgba(5,3,8,0)");
    ctx.fillStyle = seek;
    ctx.fillRect(0, 0, this.w, this.h);

    if (!simple) {
      const dusk = 0.28 - awake * 0.1;
      const shade = ctx.createRadialGradient(this.w * 0.5, this.h * 0.5, Math.min(this.w, this.h) * 0.18, this.w * 0.5, this.h * 0.5, Math.min(this.w, this.h) * 0.78);
      shade.addColorStop(0, "rgba(5,3,8,0)");
      shade.addColorStop(1, `rgba(5,3,8,${dusk})`);
      ctx.fillStyle = shade;
      ctx.fillRect(0, 0, this.w, this.h);
    }

    const vig = ctx.createRadialGradient(this.w * 0.5, this.h * 0.5, Math.min(this.w, this.h) * 0.22, this.w * 0.5, this.h * 0.5, Math.min(this.w, this.h) * 0.86);
    vig.addColorStop(0, "rgba(5,3,8,0)");
    vig.addColorStop(1, "rgba(5,3,8,0.55)");
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, this.w, this.h);
  }

  private drawBreath(p: Pt, r: number, g: number, b: number, hot: boolean, scale: number) {
    const ctx = this.ctx;
    const rad = (5.5 + Math.sin(this.t * 1.5) * 1.8 + (hot ? 2 : 0)) / scale;
    ctx.fillStyle = `rgba(${r},${g},${b},0.85)`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, rad, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawGlass(p: Pt, r: number, g: number, b: number, hot: boolean, scale: number) {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(this.t * 0.2);
    ctx.strokeStyle = `rgba(${r},${g},${b},${hot ? 0.9 : 0.65})`;
    ctx.lineWidth = 1 / scale;
    const k = 1 / scale;
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      ctx.strokeRect(Math.cos(a) * 6 * k - 2 * k, Math.sin(a) * 6 * k - 2 * k, 4 * k, 4 * k);
    }
    ctx.restore();
  }

  private drawRing(p: Pt, r: number, g: number, b: number, hot: boolean, scale: number) {
    const ctx = this.ctx;
    ctx.strokeStyle = `rgba(${r},${g},${b},${hot ? 0.95 : 0.7})`;
    ctx.lineWidth = 1.4 / scale;
    ctx.beginPath();
    ctx.arc(p.x, p.y, (hot ? 8 : 6.5) / scale, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = `rgba(${r},${g},${b},0.9)`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 1.6 / scale, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawMass(p: Pt, r: number, g: number, b: number, hot: boolean, scale: number) {
    const ctx = this.ctx;
    ctx.fillStyle = `rgba(${r},${g},${b},0.7)`;
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + this.t * 0.4;
      const rad = (4 + Math.sin(this.t * 1.6 + i) * 1.8 + (hot ? 2 : 0)) / scale;
      const x = p.x + Math.cos(a) * rad;
      const y = p.y + Math.sin(a) * rad;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
  }

  private drawWake(p: Pt, r: number, g: number, b: number, hot: boolean, scale: number) {
    const ctx = this.ctx;
    ctx.strokeStyle = `rgba(${r},${g},${b},${hot ? 0.85 : 0.55})`;
    ctx.lineWidth = 1.2 / scale;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.x - 12 / scale, p.y + 16 / scale);
    ctx.stroke();
    ctx.fillStyle = `rgba(${r},${g},${b},0.95)`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 2.8 / scale, 0, Math.PI * 2);
    ctx.fill();
  }
}
