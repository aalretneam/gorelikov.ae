import { isMobileGpu } from "../shared/gpu";

export const COLS = 78;
export const ROWS = 50;
export const COUNT = COLS * ROWS;

export type RGB = [number, number, number];

export type Work = {
  title: string;
  meta: string;
  paint: (g: Grid) => void;
};

function clamp(n: number, a = 0, b = 255) {
  return n < a ? a : n > b ? b : n;
}

function hash(n: number) {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}

export class Grid {
  readonly rgb = new Uint8Array(COUNT * 3);

  private i(x: number, y: number) {
    return (y * COLS + x) * 3;
  }

  fill(r: number, g: number, b: number) {
    for (let i = 0; i < this.rgb.length; i += 3) {
      this.rgb[i] = r;
      this.rgb[i + 1] = g;
      this.rgb[i + 2] = b;
    }
  }

  put(x: number, y: number, r: number, g: number, b: number, a = 1) {
    const xi = x | 0;
    const yi = y | 0;
    if (xi < 0 || yi < 0 || xi >= COLS || yi >= ROWS || a <= 0) return;
    const i = this.i(xi, yi);
    const k = a > 1 ? 1 : a;
    this.rgb[i] = this.rgb[i] * (1 - k) + r * k;
    this.rgb[i + 1] = this.rgb[i + 1] * (1 - k) + g * k;
    this.rgb[i + 2] = this.rgb[i + 2] * (1 - k) + b * k;
  }

  mix(x: number, y: number, c: RGB, a: number) {
    this.put(x, y, c[0], c[1], c[2], a);
  }

  disc(cx: number, cy: number, rad: number, c: RGB, a = 1) {
    const r0 = rad - 1.1;
    for (let y = Math.floor(cy - rad); y <= cy + rad; y++) {
      for (let x = Math.floor(cx - rad); x <= cx + rad; x++) {
        const d = Math.hypot(x - cx, y - cy);
        const k = d < r0 ? 1 : d < rad ? 1 - (d - r0) / (rad - r0) : 0;
        if (k > 0) this.mix(x, y, c, k * a);
      }
    }
  }

  ellipse(cx: number, cy: number, rx: number, ry: number, c: RGB, a = 1) {
    for (let y = Math.floor(cy - ry); y <= cy + ry; y++) {
      for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
        const d = Math.hypot((x - cx) / rx, (y - cy) / ry);
        const k = d < 0.86 ? 1 : d < 1 ? 1 - (d - 0.86) / 0.14 : 0;
        if (k > 0) this.mix(x, y, c, k * a);
      }
    }
  }

  rect(x0: number, y0: number, w: number, h: number, c: RGB, a = 1) {
    for (let y = y0; y < y0 + h; y++) {
      for (let x = x0; x < x0 + w; x++) this.mix(x, y, c, a);
    }
  }

  line(x0: number, y0: number, x1: number, y1: number, w: number, c: RGB, a = 1) {
    const n = Math.max(2, Math.hypot(x1 - x0, y1 - y0) * 1.4);
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      this.disc(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, w, c, a);
    }
  }

  vgrad(top: RGB, bot: RGB) {
    for (let y = 0; y < ROWS; y++) {
      const t = y / (ROWS - 1);
      const c: RGB = [
        top[0] + (bot[0] - top[0]) * t,
        top[1] + (bot[1] - top[1]) * t,
        top[2] + (bot[2] - top[2]) * t,
      ];
      for (let x = 0; x < COLS; x++) this.mix(x, y, c, 1);
    }
  }

  tessera(seed = 1) {
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const n = hash(x * 19.1 + y * 47.3 + seed);
        const j = (n - 0.5) * 28;
        const i = this.i(x, y);
        this.rgb[i] = clamp(this.rgb[i] + j);
        this.rgb[i + 1] = clamp(this.rgb[i + 1] + j * 0.9);
        this.rgb[i + 2] = clamp(this.rgb[i + 2] + j * 0.8);
      }
    }
  }
}

function mayakovskaya(g: Grid) {
  g.vgrad([18, 48, 118], [118, 176, 224]);
  g.disc(64, 8, 7.5, [240, 196, 64], 0.95);
  g.ellipse(18, 16, 14, 5.5, [236, 240, 246], 0.92);
  g.ellipse(40, 12, 11, 4.2, [230, 236, 244], 0.85);
  g.ellipse(58, 20, 13, 4.8, [242, 246, 250], 0.9);
  g.ellipse(28, 24, 9, 3.4, [220, 228, 240], 0.7);
  g.ellipse(36, 28, 16, 3.2, [210, 40, 42], 0.95);
  g.disc(24, 28, 2.2, [210, 40, 42]);
  g.line(20, 27, 52, 29, 1.15, [255, 248, 244], 0.85);
  g.disc(22, 26, 1.1, [255, 220, 80]);
  g.disc(48, 31, 1.4, [40, 36, 40], 0.55);
  g.line(48, 31, 46, 38, 0.7, [40, 36, 40], 0.4);
  g.ellipse(12, 40, 8, 3, [250, 252, 255], 0.55);
  g.tessera(2);
}

function stars(g: Grid) {
  g.vgrad([6, 8, 22], [18, 28, 64]);
  for (let i = 0; i < 90; i++) {
    const x = 2 + hash(i * 3.1) * (COLS - 4);
    const y = 2 + hash(i * 7.7) * (ROWS - 6);
    g.put(x, y, 230, 230, 240, 0.35 + hash(i) * 0.6);
  }
  g.disc(22, 34, 13, [28, 72, 160]);
  g.disc(20, 33, 10, [42, 140, 92], 0.55);
  g.ellipse(24, 30, 8, 3, [230, 240, 246], 0.45);
  g.ellipse(52, 22, 8, 9.5, [220, 226, 232]);
  g.ellipse(52, 23, 6.2, 7.5, [186, 150, 118]);
  g.disc(50, 21, 1.3, [30, 24, 22]);
  g.disc(54, 21, 1.3, [30, 24, 22]);
  g.rect(48, 30, 8, 10, [230, 232, 236], 0.9);
  g.line(58, 18, 72, 8, 1.4, [200, 206, 214]);
  g.line(58, 18, 70, 22, 1.1, [180, 186, 196]);
  g.disc(66, 8, 4.4, [196, 28, 36]);
  for (let k = 0; k < 5; k++) {
    const a = -Math.PI / 2 + (k * Math.PI * 2) / 5;
    g.line(66, 8, 66 + Math.cos(a) * 5.4, 8 + Math.sin(a) * 5.4, 1.05, [220, 40, 42]);
  }
  g.tessera(9);
}

function harvest(g: Grid) {
  g.vgrad([86, 156, 214], [186, 214, 236]);
  g.disc(62, 10, 11, [236, 176, 36]);
  g.disc(62, 10, 7, [255, 214, 70], 0.7);
  for (let y = 28; y < ROWS; y++) {
    const t = (y - 28) / (ROWS - 28);
    const c: RGB = [186 - t * 40, 148 - t * 30, 36 + t * 10];
    for (let x = 0; x < COLS; x++) {
      const wave = Math.sin(x * 0.45 + y * 0.2) * 10;
      g.mix(x, y, [c[0] + wave, c[1] + wave * 0.4, c[2]], 0.92);
    }
  }
  for (let i = 0; i < 40; i++) {
    const x = 4 + hash(i * 2.2) * 30;
    const y = 30 + hash(i * 5.1) * 16;
    g.line(x, y, x + 2 + hash(i) * 4, y - 8 - hash(i + 4) * 6, 0.7, [232, 196, 64], 0.75);
  }
  g.disc(40, 24, 5.2, [232, 186, 150]);
  g.ellipse(40, 22, 6, 3.2, [196, 28, 42]);
  g.rect(36, 28, 8, 14, [36, 64, 118], 0.92);
  g.line(44, 30, 58, 18, 2.1, [220, 168, 36]);
  g.line(44, 31, 60, 22, 1.6, [240, 196, 64]);
  g.line(44, 32, 56, 26, 1.4, [196, 148, 28]);
  g.ellipse(40, 42, 7, 2.2, [28, 36, 48], 0.8);
  g.tessera(4);
}

function steel(g: Grid) {
  g.vgrad([12, 10, 12], [36, 22, 16]);
  g.disc(40, 40, 22, [220, 92, 18], 0.55);
  g.disc(40, 42, 14, [255, 160, 36], 0.7);
  g.disc(40, 44, 7, [255, 230, 140], 0.8);
  g.rect(0, 8, COLS, 4, [168, 24, 28], 0.9);
  g.ellipse(39, 24, 7, 14, [16, 14, 16], 0.95);
  g.disc(39, 12, 4.2, [16, 14, 16]);
  g.line(32, 22, 20, 16, 1.3, [80, 78, 82]);
  g.line(46, 22, 58, 14, 1.3, [80, 78, 82]);
  for (let i = 0; i < 55; i++) {
    g.disc(28 + hash(i * 1.7) * 24, 18 + hash(i * 4.4) * 22, 0.7 + hash(i) * 0.9, [255, 210, 90], 0.8);
  }
  g.rect(8, 40, 10, 10, [48, 50, 56], 0.7);
  g.rect(60, 36, 12, 14, [40, 42, 48], 0.65);
  g.tessera(11);
}

function theodora(g: Grid) {
  g.fill(198, 158, 48);
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const n = hash(x * 0.7 + y * 1.3);
      g.mix(x, y, [220, 180, 64], n * 0.28);
    }
  }
  g.disc(39, 16, 11, [236, 200, 72]);
  g.disc(39, 18, 7.2, [232, 186, 150]);
  g.ellipse(39, 16, 7.4, 3.2, [212, 176, 72], 0.9);
  g.rect(30, 13, 18, 2, [48, 36, 22], 0.85);
  g.disc(33, 12, 1.3, [40, 140, 160]);
  g.disc(39, 11, 1.4, [196, 32, 36]);
  g.disc(45, 12, 1.3, [36, 120, 72]);
  g.disc(36, 18, 1.15, [28, 22, 20]);
  g.disc(42, 18, 1.15, [28, 22, 20]);
  g.ellipse(39, 21.5, 2.2, 0.8, [160, 80, 80], 0.7);
  g.ellipse(39, 36, 16, 18, [92, 36, 96]);
  g.rect(28, 24, 22, 4, [212, 170, 64], 0.9);
  for (let i = 0; i < 9; i++) g.disc(30 + i * 2.4, 25, 1.05, i % 2 ? [40, 150, 170] : [200, 40, 48]);
  g.ellipse(39, 30, 5, 4, [236, 196, 160], 0.85);
  g.disc(32, 38, 3.2, [236, 196, 160], 0.8);
  g.disc(46, 38, 3.2, [236, 196, 160], 0.8);
  g.tessera(6);
}

function issus(g: Grid) {
  g.vgrad([148, 168, 186], [186, 148, 96]);
  for (let y = 22; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      g.mix(x, y, [168, 124, 72], 0.35 + (y - 22) / 40);
    }
  }
  g.ellipse(22, 26, 8, 10, [92, 48, 28], 0.92);
  g.ellipse(20, 20, 6, 5, [120, 64, 36], 0.9);
  g.disc(22, 14, 3.4, [210, 170, 130]);
  g.line(26, 18, 38, 8, 0.8, [48, 40, 32]);
  g.line(26, 18, 40, 12, 0.7, [48, 40, 32]);
  g.ellipse(54, 24, 9, 11, [64, 40, 28], 0.92);
  g.ellipse(58, 18, 7, 6, [96, 56, 36]);
  g.disc(56, 12, 3.6, [200, 160, 120]);
  g.line(52, 16, 44, 4, 0.75, [40, 32, 24]);
  g.ellipse(36, 32, 5, 8, [80, 44, 28], 0.7);
  g.ellipse(44, 34, 6, 7, [72, 40, 24], 0.65);
  for (let i = 0; i < 18; i++) {
    g.line(10 + i * 3.4, 36, 12 + i * 3.2, 8 + hash(i) * 16, 0.55, [40, 34, 28], 0.55);
  }
  g.rect(0, 46, COLS, 4, [120, 88, 48], 0.7);
  g.tessera(13);
}

function gaudi(g: Grid) {
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const n = hash(x * 2.4 + y * 5.1);
      const pal: RGB[] = [
        [46, 140, 132],
        [210, 198, 170],
        [176, 72, 48],
        [64, 108, 92],
        [232, 208, 96],
      ];
      g.mix(x, y, pal[(n * pal.length) | 0], 1);
    }
  }
  const spine: [number, number][] = [
    [40, 46],
    [38, 40],
    [36, 34],
    [38, 28],
    [42, 22],
    [40, 16],
    [36, 11],
    [40, 7],
  ];
  for (let i = 0; i < spine.length; i++) {
    const [x, y] = spine[i];
    g.disc(x, y, 6.2 - i * 0.25, [48, 150, 86]);
    g.disc(x + 0.6, y - 0.4, 3.2, [220, 196, 64], 0.55);
  }
  g.ellipse(42, 44, 8, 5, [36, 128, 72]);
  g.ellipse(48, 45, 5, 3, [200, 72, 48]);
  g.disc(46, 42, 1.6, [250, 248, 240]);
  g.disc(46.4, 42, 0.8, [20, 18, 16]);
  g.line(28, 38, 22, 34, 1.6, [42, 140, 80]);
  g.line(50, 36, 58, 32, 1.6, [42, 140, 80]);
  g.line(30, 24, 22, 22, 1.4, [42, 140, 80]);
  g.line(48, 20, 56, 16, 1.4, [42, 140, 80]);
  g.tessera(8);
}

function unam(g: Grid) {
  const cells = [
    [140, 28, 32],
    [212, 168, 48],
    [24, 24, 22],
    [28, 96, 92],
    [196, 92, 36],
    [48, 64, 120],
  ] as RGB[];
  g.fill(24, 22, 20);
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const cx = Math.floor(x / 13);
      const cy = Math.floor(y / 10);
      g.mix(x, y, cells[(cx + cy * 3) % cells.length], 0.92);
    }
  }
  g.disc(39, 24, 11, [212, 156, 40]);
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2;
    g.line(39, 24, 39 + Math.cos(a) * 10, 24 + Math.sin(a) * 10, 1.1, [40, 28, 16]);
  }
  g.disc(39, 24, 4, [28, 24, 20]);
  g.rect(8, 6, 14, 8, [196, 32, 36], 0.85);
  g.rect(56, 34, 14, 10, [24, 110, 104], 0.85);
  for (let i = 0; i < 6; i++) g.rect(10 + i * 10, 44, 8, 4, i % 2 ? [212, 168, 48] : [140, 28, 32]);
  g.tessera(15);
}

function deesis(g: Grid) {
  g.fill(186, 148, 42);
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      g.mix(x, y, [220, 180, 64], hash(x + y * 0.3) * 0.25);
    }
  }
  g.disc(39, 16, 12, [232, 196, 72]);
  g.ellipse(39, 22, 10, 12, [186, 150, 118]);
  g.ellipse(39, 36, 14, 16, [36, 56, 118]);
  g.ellipse(39, 38, 10, 12, [92, 64, 40], 0.55);
  g.disc(39, 18, 7, [210, 172, 136]);
  g.disc(36, 17, 1.2, [24, 18, 14]);
  g.disc(42, 17, 1.2, [24, 18, 14]);
  g.ellipse(39, 22, 2.4, 1.1, [120, 64, 56], 0.7);
  g.rect(34, 30, 10, 8, [168, 36, 36], 0.85);
  g.disc(48, 32, 3.4, [210, 172, 136]);
  g.line(48, 32, 54, 26, 1.2, [210, 172, 136]);
  g.tessera(3);
}

function registan(g: Grid) {
  g.fill(12, 56, 96);
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const gx = Math.abs(((x + 3) % 8) - 4);
      const gy = Math.abs(((y + 1) % 8) - 4);
      if (gx + gy < 3) g.mix(x, y, [48, 186, 176], 0.9);
      if (gx === 0 || gy === 0) g.mix(x, y, [232, 214, 150], 0.45);
      if ((x + y) % 16 === 0) g.mix(x, y, [236, 236, 240], 0.4);
    }
  }
  for (let y = 6; y < 46; y++) {
    const t = (y - 6) / 40;
    const half = 8 + t * 22;
    for (let x = 0; x < COLS; x++) {
      const d = Math.abs(x - 39);
      if (d > half && d < half + 3) g.mix(x, y, [8, 120, 118], 1);
      if (d > half + 3) g.mix(x, y, [10, 36, 64], 0.65);
    }
  }
  g.ellipse(39, 8, 14, 5, [8, 120, 118]);
  g.rect(36, 18, 6, 22, [232, 214, 150], 0.35);
  g.tessera(17);
}

export const WORKS: Work[] = [
  { title: "небо маяковской", meta: "дейнека · москва · 1938", paint: mayakovskaya },
  { title: "к звёздам", meta: "советский космизм · ссср", paint: stars },
  { title: "урожай", meta: "колхозная мозаика · ссср", paint: harvest },
  { title: "сталь", meta: "индустриальное панно · ссср", paint: steel },
  { title: "императрица феодора", meta: "сан-витале · равенна · vi век", paint: theodora },
  { title: "битва при иссе", meta: "дом фавна · помпеи · ii век до н.э.", paint: issus },
  { title: "ящерица парка гуэль", meta: "гауди · барселона · 1903", paint: gaudi },
  { title: "центральная библиотека unam", meta: "о’горман · мехико · 1952", paint: unam },
  { title: "деисус", meta: "святая софия · константинополь", paint: deesis },
  { title: "регистан", meta: "самарканд · узбекистан", paint: registan },
];

const cache: Uint8Array[] = [];

export function raster(index: number) {
  const i = ((index % WORKS.length) + WORKS.length) % WORKS.length;
  if (!cache[i]) {
    const g = new Grid();
    WORKS[i].paint(g);
    cache[i] = g.rgb;
  }
  return cache[i];
}

export function mosaicGrid() {
  const step = isMobileGpu() ? 2 : 1;
  const cols = Math.floor(COLS / step);
  const rows = Math.floor(ROWS / step);
  return { cols, rows, step, count: cols * rows };
}

export function rasterDisplay(index: number, cols: number, rows: number, step: number) {
  const full = raster(index);
  if (step === 1 && cols === COLS && rows === ROWS) return full;
  const rgb = new Uint8Array(cols * rows * 3);
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const si = (y * step * COLS + x * step) * 3;
      const di = (y * cols + x) * 3;
      rgb[di] = full[si];
      rgb[di + 1] = full[si + 1];
      rgb[di + 2] = full[si + 2];
    }
  }
  return rgb;
}
