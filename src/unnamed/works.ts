/* Ten public-domain mosaic photographs, tessellated into squares. */

import { isMobileGpu } from "../shared/gpu";

export const COLS = 96;
export const ROWS = 60;

export type Work = {
  title: string;
  meta: string;
  src: string;
};

export const WORKS: Work[] = [
  { title: "феодора", meta: "сан-витале · равенна · vi век", src: "/mosaics/theodora.jpg" },
  { title: "битва при иссе", meta: "дом фавна · помпеи · i век до н.э.", src: "/mosaics/alexander.jpg" },
  { title: "деисус", meta: "святая софия · константинополь · xii век", src: "/mosaics/deesis.jpg" },
  { title: "юстиниан", meta: "сан-витале · равенна · vi век", src: "/mosaics/justinian.jpg" },
  { title: "небо", meta: "галла плацидия · равенна · v век", src: "/mosaics/galla-ceiling.jpg" },
  { title: "пантократор", meta: "чефалу · сицилия · xii век", src: "/mosaics/cefalu.jpg" },
  { title: "голуби", meta: "вилла адриана · ii век", src: "/mosaics/doves.jpg" },
  { title: "пастырь", meta: "галла плацидия · равенна · v век", src: "/mosaics/shepherd.jpg" },
  { title: "зоя", meta: "святая софия · константинополь · xi век", src: "/mosaics/zoe.jpg" },
  { title: "монреале", meta: "собор монреале · сицилия · xii век", src: "/mosaics/monreale.jpg" },
];

export class Grid {
  readonly data: Uint8Array;
  constructor(
    readonly cols: number,
    readonly rows: number,
  ) {
    this.data = new Uint8Array(cols * rows * 3);
  }
  get(x: number, y: number): [number, number, number] {
    const i = (y * this.cols + x) * 3;
    return [this.data[i], this.data[i + 1], this.data[i + 2]];
  }
}

const images = new Map<string, Promise<HTMLImageElement>>();
const tessCache = new Map<string, Grid>();

function loadImage(src: string): Promise<HTMLImageElement> {
  const hit = images.get(src);
  if (hit) return hit;
  const p = new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(src));
    img.src = src;
  });
  images.set(src, p);
  return p;
}

function tessellate(img: HTMLImageElement, cols: number, rows: number): Grid {
  const g = new Grid(cols, rows);
  const canvas = document.createElement("canvas");
  canvas.width = cols;
  canvas.height = rows;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return g;
  const ir = img.width / img.height;
  const gr = cols / rows;
  let sx = 0;
  let sy = 0;
  let sw = img.width;
  let sh = img.height;
  if (ir > gr) {
    sw = img.height * gr;
    sx = (img.width - sw) / 2;
  } else {
    sh = img.width / gr;
    sy = (img.height - sh) / 2;
  }
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, cols, rows);
  const px = ctx.getImageData(0, 0, cols, rows).data;
  for (let i = 0, j = 0, n = 0; i < px.length; i += 4, j += 3, n++) {
    const jitter = ((n * 13) % 7) - 3;
    g.data[j] = Math.max(0, Math.min(255, px[i] + jitter));
    g.data[j + 1] = Math.max(0, Math.min(255, px[i + 1] + jitter));
    g.data[j + 2] = Math.max(0, Math.min(255, px[i + 2] + jitter));
  }
  return g;
}

function grout(cols: number, rows: number): Grid {
  const g = new Grid(cols, rows);
  for (let i = 0; i < g.data.length; i += 3) {
    const n = 18 + ((i * 17) % 10);
    g.data[i] = n;
    g.data[i + 1] = n;
    g.data[i + 2] = n;
  }
  return g;
}

function cacheKey(src: string, mobile: boolean) {
  return `${src}:${mobile ? "m" : "d"}`;
}

export function rasterDisplay(): { cols: number; rows: number } {
  const step = isMobileGpu() ? 2 : 1;
  return { cols: Math.floor(COLS / step), rows: Math.floor(ROWS / step) };
}

export function mosaicGridSync(work: Work): Grid | null {
  return tessCache.get(cacheKey(work.src, isMobileGpu())) ?? null;
}

export async function mosaicGrid(work: Work): Promise<Grid> {
  const mobile = isMobileGpu();
  const key = cacheKey(work.src, mobile);
  const hit = tessCache.get(key);
  if (hit) return hit;
  const { cols, rows } = rasterDisplay();
  try {
    const img = await loadImage(work.src);
    const g = tessellate(img, cols, rows);
    tessCache.set(key, g);
    return g;
  } catch {
    const g = grout(cols, rows);
    tessCache.set(key, g);
    return g;
  }
}

export function preloadMosaics(): Promise<void> {
  return Promise.all(WORKS.map((w) => mosaicGrid(w))).then(() => undefined);
}
