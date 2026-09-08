export class WantSound {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private filter: BiquadFilterNode | null = null;
  private osc: OscillatorNode | null = null;
  started = false;
  enabled = false;
  private muted = false;

  setMuted(muted: boolean) {
    this.muted = muted;
    this.apply(0.08);
  }

  private apply(v: number) {
    if (!this.ctx || !this.master) return;
    this.master.gain.setTargetAtTime(this.enabled && !this.muted ? v : 0, this.ctx.currentTime, 0.25);
  }

  async start() {
    if (this.started) {
      this.enabled = true;
      this.apply(0.08);
      return;
    }
    const ctx = new AudioContext();
    if (ctx.state === "suspended") await ctx.resume();
    const master = ctx.createGain();
    master.gain.value = 0;
    master.connect(ctx.destination);
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 140;
    filter.connect(master);
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.value = 38;
    const g = ctx.createGain();
    g.gain.value = 0.22;
    osc.connect(g);
    g.connect(filter);
    osc.start();
    this.ctx = ctx;
    this.master = master;
    this.filter = filter;
    this.osc = osc;
    this.started = true;
    this.enabled = true;
    this.apply(0.08);
  }

  stop() {
    this.enabled = false;
    this.apply(0);
  }

  setMass(mass: number) {
    if (!this.ctx || !this.filter || !this.osc || !this.enabled) return;
    const t = this.ctx.currentTime;
    this.osc.frequency.setTargetAtTime(32 + mass * 28, t, 0.4);
    this.filter.frequency.setTargetAtTime(90 + mass * 220, t, 0.3);
    this.apply(0.05 + mass * 0.08);
  }

  exhale() {
    if (!this.ctx || !this.master || !this.enabled) return;
    const t = this.ctx.currentTime;
    const osc = ctxOsc(this.ctx, 70);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.06, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.8);
    osc.connect(g);
    g.connect(this.master);
    osc.start(t);
    osc.stop(t + 1.9);
  }
}

function ctxOsc(ctx: AudioContext, f: number) {
  const osc = ctx.createOscillator();
  osc.type = "sine";
  osc.frequency.value = f;
  return osc;
}
