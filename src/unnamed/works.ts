/* Real mosaic photographs, shown as tesserae (UV shards), not a pixel grid. */

import { isMobileGpu } from "../shared/gpu";

export type Work = {
  title: string;
  meta: string;
  src: string;
};

export const WORKS: Work[] = [
  { title: "труд", meta: "стена · ссср", src: "/mosaics/trud.jpg" },
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

export function maxTiles() {
  return isMobileGpu() ? 3600 : 10800;
}

export function fitGrid(aspect: number, maxN = maxTiles()) {
  const a = Math.max(0.45, Math.min(3.4, aspect || 1.6));
  let cols = Math.max(12, Math.round(Math.sqrt(maxN * a)));
  let rows = Math.max(10, Math.round(cols / a));
  while (cols * rows > maxN) {
    if (cols / rows > a) cols -= 1;
    else rows -= 1;
  }
  return { cols, rows };
}

const images = new Map<string, Promise<HTMLImageElement>>();

export function loadWorkImage(work: Work): Promise<HTMLImageElement> {
  const hit = images.get(work.src);
  if (hit) return hit;
  const p = new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(work.src));
    img.src = work.src;
  });
  images.set(work.src, p);
  return p;
}

export function preloadMosaics(): Promise<void> {
  return Promise.all(WORKS.map((w) => loadWorkImage(w).catch(() => null))).then(() => undefined);
}
