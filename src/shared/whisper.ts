/** Default for every page unless the caller sets `delay`. */
export const QUOTE_DELAY_MS = 16_000;
/** Matches `transition: opacity 2.8s` on `.whisper` / `.quote`. */
const FADE_MS = 2800;

export function bindWhisper(el: HTMLElement) {
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

  let stanzas: { text: string; hold: number }[] = [];
  let i = -1;
  let at = 0;
  let stayLast = true;
  let mode: "idle" | "wait" | "fadein" | "hold" | "fadeout" = "idle";

  function reveal(now: number) {
    i += 1;
    if (i >= stanzas.length) {
      mode = "idle";
      return;
    }
    el.textContent = stanzas[i].text;
    el.classList.remove("is-off");
    if (reduced) {
      el.classList.add("is-on");
      const last = i === stanzas.length - 1;
      if (last && stayLast) {
        mode = "idle";
        return;
      }
      mode = "hold";
      at = now + Math.min(1400, stanzas[i].hold);
      return;
    }
    el.classList.remove("is-on");
    void el.offsetWidth;
    el.classList.add("is-on");
    mode = "fadein";
    at = now + FADE_MS;
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
    reveal(performance.now());
  }

  function show(text: string, duration = 9000) {
    play([text], { hold: duration, stayLast: true, delay: 0 });
  }

  function tick(now: number) {
    if (mode === "wait") {
      if (now < at) return;
      reveal(now);
      return;
    }
    if (mode === "fadein" && now >= at) {
      const last = i === stanzas.length - 1;
      if (last && stayLast) {
        mode = "idle";
        return;
      }
      mode = "hold";
      at = now + stanzas[i].hold;
      return;
    }
    if (mode === "hold" && now >= at) {
      mode = "fadeout";
      el.classList.add("is-off");
      at = now + (reduced ? 200 : FADE_MS);
      return;
    }
    if (mode === "fadeout" && now >= at) {
      el.classList.remove("is-on", "is-off");
      el.textContent = "";
      reveal(now);
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
