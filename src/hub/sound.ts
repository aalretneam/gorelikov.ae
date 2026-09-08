export class HubSound {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private hoverOsc: OscillatorNode | null = null;
  private hoverGain: GainNode | null = null;
  private started = false;
  enabled = false;
  private muted = false;

  setMuted(muted: boolean) {
    this.muted = muted;
    this.applyGain();
  }

  private applyGain() {
    if (!this.ctx || !this.master) return;
    this.master.gain.setTargetAtTime(this.enabled && !this.muted ? 0.09 : 0, this.ctx.currentTime, 0.25);
  }

  async start() {
    if (this.started) {
      this.enabled = true;
      this.applyGain();
      return;
    }
    const ctx = new AudioContext();
    if (ctx.state === "suspended") await ctx.resume();
    this.ctx = ctx;
    const master = ctx.createGain();
    master.gain.value = 0;
    master.connect(ctx.destination);
    this.master = master;

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 420;
    filter.Q.value = 0.5;
    filter.connect(master);

    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.value = 46;
    const g = ctx.createGain();
    g.gain.value = 0.12;
    osc.connect(g);
    g.connect(filter);
    osc.start();

    const hover = ctx.createOscillator();
    hover.type = "sine";
    hover.frequency.value = 196;
    const hg = ctx.createGain();
    hg.gain.value = 0;
    hover.connect(hg);
    hg.connect(master);
    hover.start();
    this.hoverOsc = hover;
    this.hoverGain = hg;

    this.started = true;
    this.enabled = true;
    this.applyGain();
  }

  stop() {
    this.enabled = false;
    this.applyGain();
  }

  hover(on: boolean, freq = 196) {
    if (!this.ctx || !this.hoverGain || !this.hoverOsc || !this.enabled) return;
    const t = this.ctx.currentTime;
    this.hoverOsc.frequency.setTargetAtTime(freq, t, 0.15);
    this.hoverGain.gain.setTargetAtTime(on ? 0.018 : 0, t, 0.2);
  }

  slit() {
    if (!this.ctx || !this.master || !this.enabled) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = "triangle";
    osc.frequency.value = 90 + Math.random() * 40;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.04, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);
    osc.connect(g);
    g.connect(this.master);
    osc.start(t);
    osc.stop(t + 1);
  }
}
