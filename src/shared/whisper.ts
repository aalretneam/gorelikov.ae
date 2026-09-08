export function bindWhisper(el: HTMLElement, citesEl?: HTMLElement | null) {
  const cites = citesEl ?? document.querySelector<HTMLElement>("#cites");
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

  let full = "";
  let n = 0;
  let typeAt = 0;
  let holdUntil = 0;
  let riseUntil = 0;
  let holdMs = 4200;
  let mode: "idle" | "type" | "hold" | "rise" = "idle";

  function clearLive() {
    el.classList.remove("is-on", "is-off", "is-rise", "is-small");
    el.textContent = "";
  }

  function park() {
    if (cites && full) {
      const p = document.createElement("p");
      p.textContent = full;
      cites.append(p);
      cites.classList.add("is-on");
    }
    clearLive();
    mode = "idle";
    full = "";
  }

  function start(text: string, duration: number) {
    full = text;
    n = 0;
    holdMs = Math.max(2600, Math.min(6400, duration * 0.42));
    el.classList.remove("is-off", "is-rise", "is-small");
    el.classList.add("is-on");
    if (reduced) {
      el.textContent = full;
      mode = "hold";
      holdUntil = performance.now() + Math.min(1800, holdMs);
      return;
    }
    el.textContent = "";
    mode = "type";
    typeAt = performance.now();
  }

  function show(text: string, duration = 9000) {
    if (mode !== "idle") return;
    start(text, duration);
  }

  function tick(now: number) {
    if (mode === "type") {
      if (now < typeAt) return;
      n += 1;
      el.textContent = full.slice(0, n);
      if (n >= full.length) {
        mode = "hold";
        holdUntil = now + holdMs;
        return;
      }
      const ch = full[n - 1];
      const wait = ch === "\n" ? 380 : ch === "," || ch === "." ? 160 : 56 + ((n * 13) % 28);
      typeAt = now + wait;
      return;
    }
    if (mode === "hold" && now >= holdUntil) {
      if (reduced) {
        park();
        return;
      }
      mode = "rise";
      el.classList.add("is-rise");
      riseUntil = now + 1700;
      return;
    }
    if (mode === "rise" && now >= riseUntil) park();
  }

  function busy(now = performance.now()) {
    void now;
    return mode !== "idle";
  }

  function hide() {
    if (mode === "idle") return;
    park();
  }

  return { show, hide, tick, busy };
}

export function isChromeTarget(el: EventTarget | null) {
  return Boolean((el as HTMLElement | null)?.closest?.("a, button"));
}
