export function formatElapsed(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");
  if (h > 0) return `${String(h).padStart(2, "0")}:${mm}:${ss}`;
  return `${mm}:${ss}`;
}

export function writeClock(el: HTMLElement, ms: number) {
  const text = formatElapsed(ms);
  if (el.textContent !== text) el.textContent = text;
}

/** Time spent with the tab visible. Never goes backwards. */
export class PresenceClock {
  private frozen = 0;
  private lastVisible = performance.now();
  private hidden = document.hidden;
  private shown = 0;

  constructor() {
    document.addEventListener("visibilitychange", this.onVis);
  }

  private onVis = () => {
    const now = performance.now();
    if (document.hidden) {
      this.frozen = this.read(now);
      this.hidden = true;
    } else {
      this.lastVisible = now;
      this.hidden = false;
    }
  };

  private read(now: number) {
    if (this.hidden) return this.frozen;
    return this.frozen + Math.max(0, now - this.lastVisible);
  }

  elapsed(now = performance.now()) {
    const ms = Math.max(0, this.read(now));
    this.shown = Math.max(this.shown, ms);
    return this.shown;
  }

  dispose() {
    document.removeEventListener("visibilitychange", this.onVis);
  }
}
