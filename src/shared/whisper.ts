export function bindWhisper(el: HTMLElement, citesEl?: HTMLElement | null) {
  const cites = citesEl ?? document.querySelector<HTMLElement>("#cites");
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

  let full = "";
  let n = 0;
  let typeAt = 0;
  let holdUntil = 0;
  let riseUntil = 0;
  let holdMs = 5200;
  let mode: "idle" | "type" | "hold" | "rise" = "idle";
  const queue: { text: string; duration: number }[] = [];

  function clearLive() {
    el.classList.remove("is-on", "is-off", "is-rise", "is-small");
    el.style.removeProperty("--cite-shift");
    el.textContent = "";
  }

  function citeShift() {
    if (!cites || !cites.classList.contains("is-on")) return 0;
    return cites.getBoundingClientRect().height + 10;
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
    const next = queue.shift();
    if (next) start(next.text, next.duration);
  }

  function start(text: string, duration: number) {
    full = text;
    n = 0;
    holdMs = Math.max(3800, Math.min(7200, duration * 0.52));
    el.classList.remove("is-off", "is-rise", "is-small");
    el.style.removeProperty("--cite-shift");
    el.classList.add("is-on");
    if (reduced) {
      el.textContent = full;
      mode = "hold";
      holdUntil = performance.now() + Math.min(2200, holdMs);
      return;
    }
    el.textContent = "";
    mode = "type";
    typeAt = performance.now();
  }

  function show(text: string, duration = 9000) {
    if (mode !== "idle") {
      queue.push({ text, duration });
      return;
    }
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
      const wait = ch === "\n" ? 420 : ch === "," || ch === "." ? 200 : 72 + ((n * 13) % 32);
      typeAt = now + wait;
      return;
    }
    if (mode === "hold" && now >= holdUntil) {
      if (reduced) {
        park();
        return;
      }
      mode = "rise";
      el.style.setProperty("--cite-shift", `${citeShift()}px`);
      el.classList.add("is-rise");
      riseUntil = now + 1800;
      return;
    }
    if (mode === "rise" && now >= riseUntil) park();
  }

  function busy(now = performance.now()) {
    void now;
    return mode !== "idle" || queue.length > 0;
  }

  function hide() {
    queue.length = 0;
    if (mode === "idle") return;
    park();
    queue.length = 0;
    mode = "idle";
    full = "";
    clearLive();
  }

  return { show, hide, tick, busy };
}

export function isChromeTarget(el: EventTarget | null) {
  return Boolean((el as HTMLElement | null)?.closest?.("a, button"));
}
