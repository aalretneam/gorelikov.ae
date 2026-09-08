import "./style.css";
import { PresenceClock, writeClock } from "../clock";
import { bind as bindTrace } from "../shared/trace";
import { bindBack } from "../shared/back";
import { bindWhisper } from "../shared/whisper";
import { portrait } from "../shared/portrait";

const whisperEl = document.querySelector<HTMLParagraphElement>("#whisper")!;
const presenceEl = document.querySelector<HTMLElement>("#presence")!;
const sheetEl = document.querySelector<HTMLElement>("#sheet")!;
const countEl = document.querySelector<HTMLParagraphElement>("#count")!;
const statsEl = document.querySelector<HTMLUListElement>("#stats")!;
const traitsEl = document.querySelector<HTMLUListElement>("#traits")!;
const verdictEl = document.querySelector<HTMLParagraphElement>("#verdict")!;
const cursorEl = document.querySelector<HTMLDivElement>("#cursor")!;

bindTrace("you");
bindBack(document.querySelector("#back"), 8_000);

const clock = new PresenceClock();
const whisper = bindWhisper(whisperEl);
const me = portrait();
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

whisper.play([me.title], { hold: 8000, stayLast: true });

countEl.textContent = `${me.done} из ${me.total}`;
statsEl.replaceChildren(
  ...[
    ["время", me.time],
    ["касаний", String(me.clicks)],
    ["движений", String(me.moves)],
    ["пауз", String(me.pauses)],
    ["возвращений", String(me.returns)],
    ["первая комната", me.first],
  ].map(([k, v]) => {
    const li = document.createElement("li");
    li.innerHTML = `${k} · <b></b>`;
    li.querySelector("b")!.textContent = v;
    return li;
  }),
);
traitsEl.replaceChildren(
  ...me.traits.slice(0, 4).map((t) => {
    const li = document.createElement("li");
    li.textContent = t;
    return li;
  }),
);
verdictEl.textContent = me.verdict;
sheetEl.classList.toggle("is-rare", me.unique);
window.setTimeout(() => sheetEl.classList.add("is-on"), reduced ? 200 : 1200);

const pointer = { x: innerWidth * 0.5, y: innerHeight * 0.5 };
let raf = 0;

window.addEventListener("pointermove", (e) => {
  pointer.x = e.clientX;
  pointer.y = e.clientY;
});

function tick(now: number) {
  writeClock(presenceEl, clock.elapsed());
  whisper.tick(now);
  cursorEl.style.transform = `translate3d(${pointer.x}px, ${pointer.y}px, 0)`;
  raf = requestAnimationFrame(tick);
}

raf = requestAnimationFrame(tick);

if (import.meta.hot) {
  import.meta.hot.dispose(() => cancelAnimationFrame(raf));
}
