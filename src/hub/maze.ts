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
  { id: "field", href: "./field.html", word: "остаться", nx: 0.5, ny: 0.07, rgb: [1, 0.72, 0.42], freq: 196 },
  { id: "mosaic", href: "./unnamed.html", word: "собрать", nx: 0.08, ny: 0.24, rgb: [0.72, 0.86, 0.92], freq: 247 },
  { id: "machine", href: "./machine.html", word: "смотреть", nx: 0.9, ny: 0.24, rgb: [0.55, 0.78, 1], freq: 164 },
  { id: "want", href: "./want.html", word: "хотеть", nx: 0.14, ny: 0.74, rgb: [0.92, 0.48, 0.38], freq: 220 },
  { id: "behind", href: "./behind.html", word: "быть", nx: 0.86, ny: 0.8, rgb: [0.82, 0.78, 0.7], freq: 131 },
  { id: "play", href: "./play.html", word: "играть", nx: 0.54, ny: 0.93, rgb: [0.86, 0.82, 0.55], freq: 294 },
];

export const HIT = 72;

type Pt = { x: number; y: number };
type Ripple = { x: number; y: number; t: number };
type Cell = { x: number; y: number };

const DX = [0, 1, 0, -1];
const DY = [-1, 0, 1, 0];
const SCALE_NEAR = 1.42;
/** Drag and wheel move less of the world than the finger/wheel, so the maze stays calm. */
const PAN_DRAG = 0.38;
const PAN_WHEEL = 0.26;
const FLING_GAIN = 0.32;
const FLING_MAX = 220;

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
  private torus = false;

  constructor(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) throw new Error("2d");
    this.canvas = canvas;
    this.ctx = ctx;
    this.carveWorld();
    this.torus = true;
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
    if (this.torus) {
      return this.grid[this.ix(this.wrapC(x), this.wrapR(y))];
    }
    if (x < 0 || y < 0 || x >= this.cols || y >= this.rows) return 0;
    return this.grid[this.ix(x, y)];
  }

  private wrapC(x: number) {
    const n = this.cols;
    return ((x % n) + n) % n;
  }

  private wrapR(y: number) {
    const n = this.rows;
    return ((y % n) + n) % n;
  }

  private wrapCam() {
    const ww = this.worldW();
    const wh = this.worldH();
    this.camX = ((this.camX % ww) + ww) % ww;
    this.camY = ((this.camY % wh) + wh) % wh;
  }

  private nearest(p: Pt): Pt {
    const ww = this.worldW();
    const wh = this.worldH();
    let dx = p.x - this.camX;
    let dy = p.y - this.camY;
    dx -= ww * Math.round(dx / ww);
    dy -= wh * Math.round(dy / wh);
    return { x: this.camX + dx, y: this.camY + dy };
  }

  private wrapDist(ax: number, ay: number, bx: number, by: number) {
    const ww = this.worldW();
    const wh = this.worldH();
    let dx = ax - bx;
    let dy = ay - by;
    dx -= ww * Math.round(dx / ww);
    dy -= wh * Math.round(dy / wh);
    return Math.hypot(dx, dy);
  }

  private wrapDelta(a: number, b: number, n: number) {
    let d = a - b;
    d -= n * Math.round(d / n);
    return d;
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
    const n = this.nearest({ x: wx, y: wy });
    return {
      x: (n.x - this.camX) * this.scale + this.w * 0.5,
      y: (n.y - this.camY) * this.scale + this.h * 0.5,
    };
  }

  pan(dx: number, dy: number, gain = PAN_DRAG) {
    this.camX -= (dx * gain) / this.scale;
    this.camY -= (dy * gain) / this.scale;
    this.wrapCam();
  }

  wheel(dx: number, dy: number) {
    this.pan(dx, dy, PAN_WHEEL);
  }

  fling(vxScreen: number, vyScreen: number) {
    this.vx = (-vxScreen * FLING_GAIN) / this.scale;
    this.vy = (-vyScreen * FLING_GAIN) / this.scale;
    const sp = Math.hypot(this.vx, this.vy);
    if (sp > FLING_MAX) {
      this.vx *= FLING_MAX / sp;
      this.vy *= FLING_MAX / sp;
    }
  }

  wideScale() {
    const frac = this.w < 720 ? 0.98 : 0.93;
    return Math.max(0.42, (this.w * frac) / Math.max(1, this.worldW()));
  }

  snapWide() {
    this.scale = this.wideScale();
    this.wrapCam();
  }

  zoomTo(elapsed: number, reduced: boolean, wide = false) {
    const far = this.wideScale();
    if (wide) {
      this.scale = far;
      this.wrapCam();
      return;
    }
    const dur = reduced ? 12 : 22;
    const u = Math.min(1, elapsed / 1000 / dur);
    const k = 1 - Math.exp(-u * 2.8);
    this.scale = lerp(SCALE_NEAR, far, k);
  }

  private clampCam() {
    this.wrapCam();
  }

  private carveWorld() {
    const simple = isMobileGpu();
    this.cell = simple ? 26 : 22;
    this.cols = odd(simple ? 121 : 201);
    this.rows = odd(simple ? 181 : 301);
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

    this.punchWrapTunnels();
    this.exits = GATES.map((g) => this.placeRoom(g.nx, g.ny, cx, cy));
  }

  private punchWrapTunnels() {
    for (let c = 1; c < this.cols - 1; c += 2) {
      this.set(c, 0, 1);
      this.set(c, this.rows - 1, 1);
      this.set(c, 1, 1);
      this.set(c, this.rows - 2, 1);
    }
    for (let r = 1; r < this.rows - 1; r += 2) {
      this.set(0, r, 1);
      this.set(this.cols - 1, r, 1);
      this.set(1, r, 1);
      this.set(this.cols - 2, r, 1);
    }
  }

  private placeRoom(nx: number, ny: number, cx: number, cy: number): Cell {
    let x = Math.min(this.cols - 3, Math.max(3, Math.round(nx * (this.cols - 1)))) | 1;
    let y = Math.min(this.rows - 3, Math.max(3, Math.round(ny * (this.rows - 1)))) | 1;
    const room = this.roomR;
    for (let yy = y - room; yy <= y + room; yy++) {
      for (let xx = x - room; xx <= x + room; xx++) this.set(xx, yy, 1);
    }
    if (!this.connected(cx, cy, x, y)) this.tunnel(cx, cy, x, y);
    this.set(x, y, 1);
    return { x, y };
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

  centerPos(): Pt {
    const p = this.worldPt(this.rcx, this.rcy);
    return this.toScreen(p.x, p.y);
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
    this.vx *= Math.pow(0.12, dt);
    this.vy *= Math.pow(0.12, dt);
    if (Math.hypot(this.vx, this.vy) < 12) {
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
    profile?: boolean;
  }) {
    const ctx = this.ctx;
    const s = this.dpr;
    ctx.setTransform(s, 0, 0, s, 0, 0);
    ctx.fillStyle = "#050308";
    ctx.fillRect(0, 0, this.w, this.h);

    const { mx, my, reveal, hover, visited, hold, simple, awake, profile } = opts;
    const breath = 0.5 + 0.5 * Math.sin(this.t * 0.55);
    const cell = this.cell;
    const scale = this.scale;
    const lampWorld = 7.5 * cell + hold * 4 * cell;
    const pointer = this.toWorld(mx, my);

    const vis = (wx: number, wy: number) => {
      const d = this.wrapDist(wx, wy, pointer.x, pointer.y);
      return Math.exp(-d / lampWorld);
    };

    const halfW = this.w * 0.5 / scale;
    const halfH = this.h * 0.5 / scale;
    const x0 = Math.floor((this.camX - halfW) / cell) - 1;
    const y0 = Math.floor((this.camY - halfH) / cell) - 1;
    const x1 = Math.ceil((this.camX + halfW) / cell) + 1;
    const y1 = Math.ceil((this.camY + halfH) / cell) + 1;

    ctx.save();
    ctx.translate(this.w * 0.5, this.h * 0.5);
    ctx.scale(scale, scale);
    ctx.translate(-this.camX, -this.camY);

    ctx.fillStyle = "#100c12";
    ctx.fillRect(x0 * cell, y0 * cell, (x1 - x0 + 1) * cell + 1, (y1 - y0 + 1) * cell + 1);

    const rcx = this.rcx;
    const rcy = this.rcy;
    const roomR = this.roomR;
    const cols = this.cols;
    const rows = this.rows;
    const inCenter = (x: number, y: number) =>
      Math.abs(this.wrapDelta(x, rcx, cols)) <= roomR && Math.abs(this.wrapDelta(y, rcy, rows)) <= roomR;
    ctx.fillStyle = "#050308";
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        if (!this.at(x, y)) continue;
        if (inCenter(x, y)) continue;
        ctx.fillRect(x * cell - 0.4, y * cell - 0.4, cell + 0.8, cell + 0.8);
      }
    }
    const gx0 = Math.floor((x0 - (rcx - roomR)) / cols);
    const gx1 = Math.ceil((x1 - (rcx + roomR)) / cols);
    const gy0 = Math.floor((y0 - (rcy - roomR)) / rows);
    const gy1 = Math.ceil((y1 - (rcy + roomR)) / rows);
    for (let gy = gy0; gy <= gy1; gy++) {
      for (let gx = gx0; gx <= gx1; gx++) {
        const rx = rcx + gx * cols;
        const ry = rcy + gy * rows;
        ctx.fillRect(
          (rx - roomR) * cell + cell * 0.12,
          (ry - roomR) * cell + cell * 0.12,
          (roomR * 2 + 1) * cell - cell * 0.24,
          (roomR * 2 + 1) * cell - cell * 0.24,
        );
      }
    }

    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    const slit = Math.max(1.05, cell * 0.22);
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        if (!this.at(x, y)) continue;
        const aIn = inCenter(x, y);
        const p0 = this.worldPt(x, y);
        const near = vis(p0.x, p0.y);
        const a = 0.14 + awake * 0.1 + near * 0.42 + this.pulse * 0.1 + breath * 0.03;
        ctx.strokeStyle = `rgba(244,232,210,${Math.min(0.8, a)})`;
        ctx.lineWidth = slit * (0.75 + near * 0.4);
        if (this.at(x + 1, y)) {
          const bIn = inCenter(x + 1, y);
          if (!(aIn && bIn)) {
            const p1 = this.worldPt(x + 1, y);
            ctx.beginPath();
            ctx.moveTo(p0.x, p0.y);
            ctx.lineTo(p1.x, p1.y);
            ctx.stroke();
          }
        }
        if (this.at(x, y + 1)) {
          const bIn = inCenter(x, y + 1);
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

    const room = this.nearest(this.worldPt(rcx, rcy));
    const well = ctx.createRadialGradient(room.x, room.y, 4, room.x, room.y, cell * 4.2);
    well.addColorStop(0, `rgba(214,186,150,${0.16 + awake * 0.1 + breath * 0.05})`);
    well.addColorStop(1, "rgba(214,186,150,0)");
    ctx.fillStyle = well;
    ctx.beginPath();
    ctx.arc(room.x, room.y, cell * 4.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = `rgba(244,236,214,${0.22 + breath * 0.14 + awake * 0.12 + (profile ? 0.18 : 0)})`;
    ctx.beginPath();
    ctx.arc(room.x, room.y, 3.2 + breath * 1.4 + (profile ? 1.2 : 0), 0, Math.PI * 2);
    ctx.fill();
    if (profile) {
      ctx.strokeStyle = `rgba(244,220,170,${0.42 + breath * 0.2})`;
      ctx.lineWidth = 1.5 / scale;
      ctx.beginPath();
      ctx.arc(room.x, room.y, cell * 1.85, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.strokeStyle = `rgba(244,236,214,${0.14 + breath * 0.08})`;
    ctx.lineWidth = 1.2 / scale;
    ctx.beginPath();
    ctx.arc(room.x, room.y, cell * 1.1 + breath * 3, 0, Math.PI * 2);
    ctx.stroke();

    for (const i of reveal) {
      const g = GATES[i];
      const p = this.nearest(this.gateWorld(i));
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
      else if (g.id === "play") this.drawPlay(p, R, G, B, hot, scale);
      else this.drawWake(p, R, G, B, hot, scale);
    }

    for (const rp of this.ripples) {
      const k = rp.t / 2.4;
      const p = this.nearest({ x: rp.x, y: rp.y });
      ctx.strokeStyle = `rgba(244,232,210,${(1 - k) * 0.28})`;
      ctx.lineWidth = 1.2 / scale;
      ctx.beginPath();
      ctx.arc(p.x, p.y, (16 + k * 110) / scale, 0, Math.PI * 2);
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

  private drawPlay(p: Pt, r: number, g: number, b: number, hot: boolean, scale: number) {
    const ctx = this.ctx;
    const k = 1 / scale;
    ctx.strokeStyle = `rgba(${r},${g},${b},${hot ? 0.8 : 0.45})`;
    ctx.lineWidth = 0.9 * k;
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.moveTo(p.x + i * 5 * k, p.y - 6 * k);
      ctx.lineTo(p.x + i * 5 * k, p.y + 6 * k);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(p.x - 6 * k, p.y + i * 5 * k);
      ctx.lineTo(p.x + 6 * k, p.y + i * 5 * k);
      ctx.stroke();
    }
    ctx.fillStyle = `rgba(${r},${g},${b},0.95)`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 2.2 * k, 0, Math.PI * 2);
    ctx.fill();
  }
}
