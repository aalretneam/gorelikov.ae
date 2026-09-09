export function bindWhisper(el: HTMLElement) {
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

  let stanzas: { text: string; hold: number }[] = [];
  let i = -1;
  let full = "";
  let n = 0;
  let at = 0;
  let stayLast = true;
  let mode: "idle" | "type" | "hold" | "fade" = "idle";

  function typeWait(text: string, n: number) {
    const ch = text[n - 1];
    if (ch === "\n") return 140;
    if (ch === "," || ch === "." || ch === "?" || ch === "…") return 80;
    return 22 + ((n * 13) % 10);
  }

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
    at = now + typeWait(full, n);
  }

  function play(lines: string[], opts?: { hold?: number; stayLast?: boolean }) {
    const hold = opts?.hold ?? 4000;
    stayLast = opts?.stayLast ?? true;
    stanzas = lines.map((text) => ({ text, hold }));
    i = -1;
    mode = "idle";
    next(performance.now());
  }

  function show(text: string, duration = 9000) {
    play([text], { hold: duration, stayLast: true });
  }

  function tick(now: number) {
    if (mode === "type") {
      if (now < at) return;
      n += 1;
      el.textContent = full.slice(0, n);
      if (n >= full.length) {
        const last = i === stanzas.length - 1;
        if (last && stayLast) {
          mode = "idle";
          return;
        }
        mode = "hold";
        at = now + stanzas[i].hold;
        return;
      }
      const wait = typeWait(full, n);
      at = now + wait;
      return;
    }
    if (mode === "hold" && now >= at) {
      mode = "fade";
      el.classList.add("is-off");
      at = now + (reduced ? 200 : 1600);
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
