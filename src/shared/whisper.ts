/** Default for every page unless the caller sets `delay`. */
export const QUOTE_DELAY_MS = 16_000;
/** Three characters per second. */
const CHAR_MS = 1000 / 3;
const FADE_MS = 2800;

export function bindWhisper(el: HTMLElement) {
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

  let stanzas: { text: string; hold: number }[] = [];
  let i = -1;
  let full = "";
  let n = 0;
  let at = 0;
  let typeAt = 0;
  let stayLast = true;
  let mode: "idle" | "wait" | "type" | "hold" | "fade" = "idle";

  function next(now: number) {
    i += 1;
    if (i >= stanzas.length) {
      mode = "idle";
      return;
    }
    full = stanzas[i].text;
    n = 0;
    el.classList.remove("is-off");
    el.classList.add("is-on");
    if (reduced) {
      el.textContent = full;
      const last = i === stanzas.length - 1;
      if (last && stayLast) {
        mode = "idle";
        return;
      }
      mode = "hold";
      at = now + Math.min(1400, stanzas[i].hold);
      return;
    }
    n = 1;
    el.textContent = full.slice(0, 1);
    mode = "type";
    typeAt = now;
  }

  function play(lines: string[], opts?: { hold?: number; stayLast?: boolean; delay?: number }) {
    const hold = opts?.hold ?? 4000;
    stayLast = opts?.stayLast ?? true;
    stanzas = lines.map((text) => ({ text, hold }));
    i = -1;
    const delay = opts?.delay ?? QUOTE_DELAY_MS;
    if (delay > 0) {
      mode = "wait";
      at = performance.now() + delay;
      el.classList.remove("is-on", "is-off");
      el.textContent = "";
      return;
    }
    mode = "idle";
    next(performance.now());
  }

  function show(text: string, duration = 9000) {
    play([text], { hold: duration, stayLast: true, delay: 0 });
  }

  function tick(now: number) {
    if (mode === "wait") {
      if (now < at) return;
      next(now);
      return;
    }
    if (mode === "type") {
      const expect = Math.min(full.length, 1 + Math.floor((now - typeAt) / CHAR_MS));
      if (expect <= n) return;
      n = expect;
      el.textContent = full.slice(0, n);
      if (n >= full.length) {
        const last = i === stanzas.length - 1;
        if (last && stayLast) {
          mode = "idle";
          return;
        }
        mode = "hold";
        at = now + stanzas[i].hold;
      }
      return;
    }
    if (mode === "hold" && now >= at) {
      mode = "fade";
      el.classList.add("is-off");
      at = now + (reduced ? 200 : FADE_MS);
      return;
    }
    if (mode === "fade" && now >= at) {
      el.classList.remove("is-on", "is-off");
      el.textContent = "";
      next(now);
    }
  }

  function busy(now = performance.now()) {
    void now;
    return mode !== "idle" || i < stanzas.length - 1;
  }

  function hide() {
    mode = "idle";
    stanzas = [];
    i = -1;
    el.classList.remove("is-on", "is-off");
    el.textContent = "";
  }

  return { play, show, hide, tick, busy };
}

export function isChromeTarget(el: EventTarget | null) {
  return Boolean((el as HTMLElement | null)?.closest?.("a, button"));
}
