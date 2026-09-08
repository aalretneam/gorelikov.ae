import "./style.css";
import { formatElapsed, PresenceClock, writeClock } from "../clock";
import { copy, type StateName } from "./copy";
import { clamp01, defaultParams, Session, type ArtParams } from "./session";
import { MachineField } from "./field";
import { Dust } from "./dust";
import { MachineSound } from "./audio";
import { formatVisitors, loadVisitorCount } from "./visitors";

const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
const session = new Session();
const clock = new PresenceClock();
const params: ArtParams = defaultParams();
const field = new MachineField(document.querySelector("#field")!);
const dust = new Dust(document.querySelector("#dust")!);
const sound = new MachineSound();

const cursorEl = document.querySelector<HTMLDivElement>("#cursor")!;
const bootEl = document.querySelector<HTMLDivElement>("#boot")!;
const bootText = document.querySelector<HTMLParagraphElement>("#boot-text")!;
const stageEl = document.querySelector<HTMLElement>("#stage")!;
const headlineEl = document.querySelector<HTMLHeadingElement>("#headline")!;
const subEl = document.querySelector<HTMLParagraphElement>("#sub")!;
const hintEl = document.querySelector<HTMLParagraphElement>("#hint")!;
const arrowEl = document.querySelector<HTMLParagraphElement>("#arrow")!;
const continueEl = document.querySelector<HTMLButtonElement>("#continue")!;
const againEl = document.querySelector<HTMLButtonElement>("#again")!;
const thoughtEl = document.querySelector<HTMLParagraphElement>("#thought")!;
const telemetryEl = document.querySelector<HTMLElement>("#telemetry")!;
const cardEl = document.querySelector<HTMLElement>("#card")!;
const colophonEl = document.querySelector<HTMLElement>("#colophon")!;
const voidEl = document.querySelector<HTMLDivElement>("#void")!;
const soundEl = document.querySelector<HTMLButtonElement>("#sound")!;
const traceCanvas = document.querySelector<HTMLCanvasElement>("#trace-card")!;
const presenceEl = document.querySelector<HTMLElement>("#presence")!;
const visitorsEl = document.querySelector<HTMLParagraphElement>("#visitors")!;
const doorEl = document.querySelector<HTMLAnchorElement>("#door")!;

const pointer = { x: innerWidth / 2, y: innerHeight / 2, tx: innerWidth / 2, ty: innerHeight / 2 };
let lastMove = performance.now();
let lastTs = performance.now();
let raf = 0;
let lastStamp = 0;
let impulse = 0;
let hold = 0;
let holding = false;
let energy = 0;
let progress = 0;
let targetProgress = 0;
let continued = false;
let state: StateName = "boot";
let lastState: StateName = "boot";
let arrivalAt = 0;
let creationAt = 0;
let thoughtIndex = -1;
let shownObserving = false;
let shownKnows = false;
let observationAt = 0;
let shownMirrorB = false;
let shownRemembers = false;
let doorOpened = false;
const DOOR_AFTER_MS = 5 * 60 * 1000;
let glitchTimer = 0;
let lastScrollSpeed = 0;
let gyro = { x: 0, y: 0 };
let scrollLockedUntil = 0;

const STEP_LOCK = reduced ? 1500 : 30_000;

const STATE_PROGRESS: Record<StateName, number> = {
  boot: 0,
  arrival: 0,
  observation: 0.12,
  interference: 0.34,
  oversight: 0.48,
  creation: 0.58,
  mirror: 0.74,
  trace: 0.86,
  complete: 0.96,
};

const NEXT_STATE: Partial<Record<StateName, StateName>> = {
  arrival: "observation",
  observation: "interference",
  interference: "oversight",
  creation: "mirror",
  mirror: "trace",
  trace: "complete",
};

const att = { v: 73, t: 73 };
const cur = { v: 91, t: 91 };
const unc = { v: 64, t: 64 };
const hum = { v: 12, t: 12 };

function toShader(x: number, y: number): [number, number] {
  const min = Math.min(innerWidth, innerHeight);
  return [(x - innerWidth * 0.5) / min, -(y - innerHeight * 0.5) / min];
}

function setText(el: HTMLElement, text: string, on = true) {
  el.textContent = text;
  el.classList.toggle("is-on", on && text.length > 0);
}

function glitch(source: string) {
  if (reduced || Math.random() > 0.45) return source;
  const glyphs = "·+/\\|абвгдежзиклмнопрстуфхцчшэюя";
  const i = (Math.random() * source.length) | 0;
  if (source[i] === " ") return source;
  return source.slice(0, i) + glyphs[(Math.random() * glyphs.length) | 0] + source.slice(i + 1);
}

function pct(n: number) {
  return `${Math.round(Math.max(0, Math.min(99, n)))}%`;
}

function stateFromProgress(p: number): StateName {
  if (p < 0.02) return "arrival";
  if (p < 0.22) return "observation";
  if (p < 0.46) return "interference";
  if (!continued) return "oversight";
  if (p < 0.68) return "creation";
  if (p < 0.8) return "mirror";
  if (p < 0.9) return "trace";
  return "complete";
}

function stateIndex(s: StateName) {
  const map: Record<StateName, number> = {
    boot: 0,
    arrival: 0.4,
    observation: 1.2,
    interference: 2.2,
    oversight: 3.1,
    creation: 4.3,
    mirror: 5.2,
    trace: 6.1,
    complete: 7,
  };
  return map[s];
}

function enter(next: StateName) {
  if (next === lastState) return;
  lastState = next;
  state = next;
  headlineEl.classList.toggle("is-ghost", next === "arrival");
  telemetryEl.classList.toggle("is-on", next === "observation" || next === "interference");
  continueEl.classList.toggle("is-on", next === "oversight");
  continueEl.tabIndex = next === "oversight" ? 0 : -1;
  againEl.tabIndex = next === "complete" ? 0 : -1;
  thoughtEl.classList.toggle("is-on", false);
  if (next !== "creation") {
    thoughtEl.textContent = "";
    thoughtEl.classList.remove("is-on");
  }
  cardEl.hidden = next !== "trace" && next !== "complete";
  cardEl.classList.toggle("is-on", next === "trace" || next === "complete");
  againEl.classList.toggle("is-on", next === "complete");
  colophonEl.classList.toggle("is-on", next === "complete");
  hintEl.classList.toggle("is-on", next === "arrival");
  arrowEl.classList.toggle("is-on", next === "arrival");
  stageEl.classList.toggle("is-complete", next === "complete");
  stageEl.classList.toggle("is-trace", next === "trace" || next === "complete");

  if (next === "arrival") {
    setText(headlineEl, copy.headlineArrival);
  }
  if (next === "observation") {
    setText(headlineEl, copy.observing);
    setText(subEl, "");
    shownObserving = true;
    observationAt = performance.now();
  }
  if (next === "interference") {
    setText(headlineEl, copy.presence);
    setText(subEl, copy.trace);
  }
  if (next === "oversight") {
    setText(headlineEl, copy.oversight);
    setText(subEl, copy.uncertain);
    params.freeze = 0.85;
  }
  if (next === "creation") {
    setText(headlineEl, "");
    setText(subEl, "");
    thoughtIndex = 0;
    creationAt = performance.now();
    params.freeze = 0;
    params.brightness = 0.72;
    params.complexity = 0.82;
    params.scale = 0.55;
  }
  if (next === "mirror") {
    setText(headlineEl, copy.mirrorA);
    setText(subEl, "");
    thoughtEl.classList.remove("is-on");
  }
  if (next === "trace") {
    setText(headlineEl, "");
    setText(subEl, "");
    cardEl.hidden = false;
    dust.paintCard(traceCanvas, session.seed);
    document.querySelector("#st-time")!.textContent = formatElapsed(clock.elapsed());
    document.querySelector("#st-int")!.textContent = String(session.interactions);
    document.querySelector("#st-irr")!.textContent = String(session.interruptions);
    document.querySelector("#st-pau")!.textContent = String(session.pauses);
  }
  if (next === "complete") {
    setText(headlineEl, copy.thanks);
    setText(subEl, copy.session);
    openDoor();
  }
}

async function boot() {
  const delay = reduced ? 200 : 700;
  bootText.textContent = copy.boot[0];
  await wait(delay);
  bootText.textContent = copy.boot[1];
  await wait(delay);
  bootText.textContent = copy.boot[2];
  await wait(reduced ? 200 : 500);
  bootEl.classList.add("is-gone");
  stageEl.classList.add("is-live");
  arrivalAt = performance.now();
  state = "arrival";
  lastState = "arrival";
}

function wait(ms: number) {
  return new Promise((r) => window.setTimeout(r, ms));
}

function openDoor() {
  if (doorOpened) return;
  doorOpened = true;
  doorEl.classList.add("is-open");
  doorEl.removeAttribute("aria-hidden");
  doorEl.tabIndex = 0;
}

function arrivalTimeline(now: number) {
  if (state !== "arrival") return;
  const t = now - arrivalAt;
  if (t > (reduced ? 400 : 2200) && !headlineEl.classList.contains("is-on")) {
    setText(headlineEl, copy.headlineArrival);
    headlineEl.classList.add("is-ghost");
  }

  const subStart = reduced ? 800 : 4500;
  const revealMs = reduced ? 400 : 20000;
  const orMs = reduced ? 200 : 1800;
  if (t >= subStart) {
    const u = t - subStart;
    let next = "";
    if (u < revealMs) {
      const count = Math.max(1, Math.ceil((u / revealMs) * copy.doNot.length));
      next = copy.doNot.slice(0, count);
    } else {
      const orT = u - revealMs;
      const orCount = Math.min(copy.orMaybe.length, Math.max(0, Math.ceil((orT / orMs) * copy.orMaybe.length)));
      next = copy.doNot + (orCount > 0 ? ` ${copy.orMaybe.slice(0, orCount)}` : "");
    }
    if (subEl.textContent !== next) setText(subEl, next);
  }

  if (t > (reduced ? 1600 : 9000)) {
    setText(hintEl, copy.scroll);
    hintEl.classList.add("is-on");
    arrowEl.classList.add("is-on");
  }
}

function applyScroll(delta: number) {
  const speed = Math.abs(delta);
  lastScrollSpeed = speed;
  session.mark("scroll");
  if (speed > 48) {
    session.mark("fast-scroll");
    params.entropy = clamp01(params.entropy + 0.02);
  } else {
    params.coherence = clamp01(params.coherence + 0.01);
  }

  if (delta <= 0) return;
  if (state === "boot" || state === "oversight" || state === "complete") return;
  if (performance.now() < scrollLockedUntil) return;

  const next = NEXT_STATE[state];
  if (!next) return;
  if (next === "creation" && !continued) return;

  targetProgress = STATE_PROGRESS[next];
  scrollLockedUntil = performance.now() + STEP_LOCK;
}

function onPointer(x: number, y: number, moving: boolean) {
  const dx = x - pointer.tx;
  const dy = y - pointer.ty;
  energy = Math.min(1, energy * 0.86 + Math.hypot(dx, dy) * 0.018);
  pointer.tx = x;
  pointer.ty = y;
  lastMove = performance.now();
  if (moving) {
    session.mark("move");
    params.density = clamp01(params.density + 0.004);
    if (performance.now() - lastStamp > 90 && (state === "interference" || state === "creation")) {
      dust.stamp(x, y);
      lastStamp = performance.now();
    }
  }
}

function interactiveTarget(el: EventTarget | null) {
  return (el as HTMLElement | null)?.closest?.("button, a");
}

window.addEventListener("pointermove", (e) => {
  onPointer(e.clientX, e.clientY, true);
  cursorEl.classList.toggle("is-ring", Boolean(interactiveTarget(e.target)));
});

window.addEventListener("pointerdown", (e) => {
  if (interactiveTarget(e.target)) {
    cursorEl.classList.add("is-pulse");
    return;
  }
  onPointer(e.clientX, e.clientY, false);
  holding = true;
  impulse = 1;
  session.mark("click");
  dust.burst(pointer.tx, pointer.ty);
  params.distortion = clamp01(params.distortion + 0.05);
  hum.t = Math.min(96, hum.t + 4);
  e.preventDefault();
});

window.addEventListener("pointerup", () => {
  holding = false;
  cursorEl.classList.remove("is-pulse");
});

window.addEventListener(
  "wheel",
  (e) => {
    e.preventDefault();
    applyScroll(e.deltaY);
  },
  { passive: false },
);

let touchY = 0;
window.addEventListener(
  "touchstart",
  (e) => {
    touchY = e.touches[0]?.clientY ?? 0;
  },
  { passive: true },
);
window.addEventListener(
  "touchmove",
  (e) => {
    const y = e.touches[0]?.clientY ?? touchY;
    applyScroll(touchY - y);
    touchY = y;
    e.preventDefault();
  },
  { passive: false },
);

window.addEventListener("keydown", (e) => {
  if (e.code === "ArrowDown" || e.code === "PageDown") {
    e.preventDefault();
    applyScroll(160);
  }
  if (e.code === "ArrowUp" || e.code === "PageUp") {
    e.preventDefault();
    applyScroll(-160);
  }
  if (e.code === "Enter" && state === "oversight") {
    void onContinue();
  }
});

soundEl.addEventListener("click", async () => {
  if (sound.enabled) {
    sound.stop();
    soundEl.textContent = copy.soundOff;
    soundEl.setAttribute("aria-pressed", "false");
  } else {
    await sound.start();
    soundEl.textContent = copy.soundOn;
    soundEl.setAttribute("aria-pressed", "true");
  }
});

continueEl.addEventListener("click", () => void onContinue());
againEl.addEventListener("click", () => window.location.reload());

async function onContinue() {
  if (continued) return;
  continued = true;
  voidEl.classList.add("is-on");
  continueEl.classList.remove("is-on");
  await wait(reduced ? 200 : 1000);
  voidEl.classList.remove("is-on");
  params.impulse = 1;
  params.brightness = 0.8;
  targetProgress = 0.55;
  progress = 0.55;
  scrollLockedUntil = performance.now() + STEP_LOCK;
  enter("creation");
}

if (typeof DeviceOrientationEvent !== "undefined") {
  window.addEventListener("deviceorientation", (e) => {
    gyro.x = ((e.gamma ?? 0) / 45) * 0.04;
    gyro.y = ((e.beta ?? 0) / 45) * 0.04;
  });
}

window.addEventListener("resize", () => {
  field.resize(innerWidth, innerHeight);
  dust.resize(innerWidth, innerHeight);
});
field.resize(innerWidth, innerHeight);
dust.resize(innerWidth, innerHeight);

function tick(now: number) {
  const dt = Math.min(0.05, Math.max(0, now - lastTs) / 1000);
  lastTs = now;
  session.tick();
  const elapsed = clock.elapsed();

  pointer.x += (pointer.tx + gyro.x * innerWidth - pointer.x) * (reduced ? 1 : 0.14);
  pointer.y += (pointer.ty + gyro.y * innerHeight - pointer.y) * (reduced ? 1 : 0.14);
  cursorEl.style.transform = `translate3d(${pointer.x}px, ${pointer.y}px, 0)`;
  writeClock(presenceEl, elapsed);
  if (!doorOpened && elapsed >= DOOR_AFTER_MS) openDoor();

  progress += (targetProgress - progress) * (reduced ? 0.25 : 0.06);
  impulse *= 0.92;
  params.impulse += (impulse - params.impulse) * 0.12;
  hold += ((holding ? 1 : 0) - hold) * 0.1;
  energy *= 0.965;
  params.velocity += (energy - params.velocity) * 0.04;

  const idle = (now - lastMove) / 1000;
  if (idle > 2.4) {
    params.entropy = clamp01(params.entropy - 0.004);
    params.coherence = clamp01(params.coherence + 0.004);
  }

  if (state !== "boot") {
    const next = stateFromProgress(progress);
    enter(next);
    arrivalTimeline(now);
  }

  if (state === "observation" && shownObserving && !shownKnows && now - observationAt > (reduced ? 400 : 2200)) {
    shownKnows = true;
    setText(subEl, copy.knows);
  }

  if (state === "mirror" && !shownMirrorB && progress > 0.74) {
    shownMirrorB = true;
    setText(subEl, copy.mirrorB);
  }

  if (state === "complete" && !shownRemembers) {
    shownRemembers = true;
    window.setTimeout(() => setText(subEl, copy.remembers), reduced ? 200 : 2200);
  }

  if (state === "creation" && creationAt > 0) {
    const ct = now - creationAt;
    const idx = ct > 28000 ? 3 : ct > 16000 ? 2 : ct > 8000 ? 1 : ct > 2000 ? 0 : -1;
    if (idx !== thoughtIndex && idx >= 0) {
      thoughtIndex = idx;
      setText(thoughtEl, copy.thoughts[idx]);
    }
  }

  if (state === "arrival" && headlineEl.classList.contains("is-on") && now > glitchTimer) {
    glitchTimer = now + 1800 + Math.random() * 2200;
    headlineEl.textContent = glitch(copy.headlineArrival);
    window.setTimeout(() => {
      if (state === "arrival") headlineEl.textContent = copy.headlineArrival;
    }, 140);
  }

  att.t = 58 + energy * 28 + Math.sin(now * 0.0007) * 6;
  cur.t = 70 + progress * 22 + session.moves * 0.01;
  unc.t = 40 + params.entropy * 40 + lastScrollSpeed * 0.2;
  hum.t = Math.min(98, 8 + session.clicks * 1.4 + session.scrolls * 0.15);
  att.v += (att.t - att.v) * 0.04;
  cur.v += (cur.t - cur.v) * 0.04;
  unc.v += (unc.t - unc.v) * 0.04;
  hum.v += (hum.t - hum.v) * 0.04;
  const attEl = document.querySelector("#m-att");
  if (attEl) attEl.textContent = pct(att.v);
  document.querySelector("#m-cur")!.textContent = pct(cur.v);
  document.querySelector("#m-unc")!.textContent = pct(unc.v);
  document.querySelector("#m-hum")!.textContent = pct(hum.v);

  const cam =
    state === "boot"
      ? 1.35
      : state === "arrival"
        ? 1.05
        : state === "observation"
          ? 0.82
          : state === "interference"
            ? 0.7
            : state === "oversight"
              ? 0.66
              : state === "creation"
                ? 0.48
                : 0.58;

  const force =
    state === "arrival" ? 0.08 + energy * 0.12 : state === "observation" ? 0.18 : 0.42 + hold * 0.35;

  field.draw({
    time: now / 1000,
    mouse: toShader(pointer.x, pointer.y),
    cam,
    state: stateIndex(state),
    density: params.density,
    entropy: params.entropy,
    coherence: params.coherence,
    brightness: params.brightness + (state === "creation" ? 0.15 : 0),
    distortion: params.distortion + hold * 0.2,
    impulse: params.impulse,
    freeze: state === "oversight" ? 0.88 : params.freeze,
    complexity: params.complexity,
    seed: session.seed,
    force,
  });

  dust.step(dt, pointer.x, pointer.y, force, state === "oversight" ? 0.88 : 0, params.entropy);
  dust.draw(state === "oversight" ? 0.2 : 0.7);
  sound.setState(params.entropy, state === "oversight" ? 0.88 : 0, params.impulse);

  raf = requestAnimationFrame(tick);
}

window.addEventListener("visibilitychange", () => {
  cancelAnimationFrame(raf);
  if (!document.hidden) {
    lastTs = performance.now();
    raf = requestAnimationFrame(tick);
  }
});

void boot();
void loadVisitorCount().then((n) => {
  const start = reduced ? n : Math.max(0, n - Math.min(24, n));
  const begun = performance.now();
  const dur = reduced ? 1 : 1400;
  const tickCount = () => {
    const t = Math.min(1, (performance.now() - begun) / dur);
    const ease = 1 - (1 - t) * (1 - t);
    const shown = Math.round(start + (n - start) * ease);
    visitorsEl.textContent = `посетители · ${formatVisitors(shown)}`;
    if (t < 1) requestAnimationFrame(tickCount);
  };
  tickCount();
});
raf = requestAnimationFrame(tick);

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    cancelAnimationFrame(raf);
    clock.dispose();
  });
}
