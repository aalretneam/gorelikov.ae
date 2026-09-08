import "./style.css";
import { PresenceClock, writeClock } from "../clock";
import { dprCap, reducedMotion } from "../shared/gpu";
import { bind as bindTrace, shortId } from "../shared/trace";
import { bindBack } from "../shared/back";
import { portrait } from "../shared/portrait";
import { paintMark, POSTER_H, POSTER_W, type MarkInput } from "./mark";

const canvas = document.querySelector<HTMLCanvasElement>("#mark")!;
const presenceEl = document.querySelector<HTMLElement>("#presence")!;
const cursorEl = document.querySelector<HTMLDivElement>("#cursor")!;
const keepEl = document.querySelector<HTMLButtonElement>("#keep")!;

bindTrace("you");
bindBack(document.querySelector("#back"), 8_000);

const clock = new PresenceClock();
const reduced = reducedMotion();
const me = portrait();
const input: MarkInput = { ...me, shortId: shortId() };
const ctx = canvas.getContext("2d")!;
let dpr = 1;
let w = innerWidth;
let h = innerHeight;
let raf = 0;
const pointer = { x: w * 0.5, y: h * 0.5 };

function resize() {
  dpr = dprCap();
  w = innerWidth;
  h = innerHeight;
  canvas.width = Math.floor(w * dpr);
  canvas.height = Math.floor(h * dpr);
}

function draw(now: number) {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  paintMark(ctx, w, h, input, reduced ? 0 : now / 1000);
}

async function posterBlob() {
  await document.fonts.ready;
  const c = document.createElement("canvas");
  c.width = POSTER_W;
  c.height = POSTER_H;
  const p = c.getContext("2d");
  if (!p) return null;
  paintMark(p, POSTER_W, POSTER_H, input, 0);
  return new Promise<Blob | null>((resolve) => c.toBlob((b) => resolve(b), "image/png"));
}

async function keep() {
  const blob = await posterBlob();
  if (!blob) return;
  const name = `ag-${input.shortId}.png`;
  const file = new File([blob], name, { type: "image/png" });
  const nav = navigator as Navigator & {
    canShare?: (d: ShareData) => boolean;
    share?: (d: ShareData) => Promise<void>;
  };
  try {
    if (nav.canShare?.({ files: [file] })) {
      await nav.share({
        files: [file],
        title: "ag",
        text: "я оставил след",
      });
      return;
    }
  } catch {
    /* user cancelled or share failed — fall through to download */
  }
  const a = document.createElement("a");
  const url = URL.createObjectURL(blob);
  a.href = url;
  a.download = name;
  a.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 2500);
}

window.addEventListener("pointermove", (e) => {
  pointer.x = e.clientX;
  pointer.y = e.clientY;
});

keepEl.addEventListener("click", () => void keep());
window.addEventListener("resize", () => {
  resize();
  draw(performance.now());
});

function tick(now: number) {
  writeClock(presenceEl, clock.elapsed());
  draw(now);
  cursorEl.style.transform = `translate3d(${pointer.x}px, ${pointer.y}px, 0)`;
  raf = requestAnimationFrame(tick);
}

resize();
canvas.classList.add("is-on");
window.setTimeout(() => keepEl.classList.add("is-on"), reduced ? 400 : 2800);
void document.fonts.ready.then(() => draw(performance.now()));
raf = requestAnimationFrame(tick);

if (import.meta.hot) {
  import.meta.hot.dispose(() => cancelAnimationFrame(raf));
}
