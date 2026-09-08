function uid() {
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export class Session {
  readonly id = uid();
  readonly seed = Math.random();
  readonly started = performance.now();
  clicks = 0;
  scrolls = 0;
  moves = 0;
  pauses = 0;
  interruptions = 0;
  lastActivity = performance.now();
  private pauseArmed = false;

  get interactions() {
    return this.clicks + this.scrolls + this.moves;
  }

  mark(kind: "click" | "scroll" | "move" | "fast-scroll") {
    this.lastActivity = performance.now();
    this.pauseArmed = true;
    if (kind === "click") this.clicks += 1;
    if (kind === "scroll") this.scrolls += 1;
    if (kind === "move") this.moves += 1;
    if (kind === "fast-scroll") this.interruptions += 1;
  }

  tick(now = performance.now()) {
    if (this.pauseArmed && now - this.lastActivity > 2200) {
      this.pauses += 1;
      this.pauseArmed = false;
    }
  }

  elapsed(now = performance.now()) {
    return Math.max(0, now - this.started);
  }
}

export type ArtParams = {
  density: number;
  velocity: number;
  rotation: number;
  noise: number;
  entropy: number;
  coherence: number;
  brightness: number;
  scale: number;
  distortion: number;
  complexity: number;
  impulse: number;
  freeze: number;
};

export function defaultParams(): ArtParams {
  return {
    density: 0.35,
    velocity: 0.4,
    rotation: 0.2,
    noise: 0.45,
    entropy: 0.22,
    coherence: 0.55,
    brightness: 0.35,
    scale: 1,
    distortion: 0.2,
    complexity: 0.4,
    impulse: 0,
    freeze: 0,
  };
}

export function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}
