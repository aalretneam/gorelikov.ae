export class BehindSound {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private filter: BiquadFilterNode | null = null;
  started = false;
  enabled = false;
  private muted = false;

  setMuted(muted: boolean) {
    this.muted = muted;
    this.apply(0.07);
  }

  private apply(v: number) {
    if (!this.ctx || !this.master) return;
    this.master.gain.setTargetAtTime(this.enabled && !this.muted ? v : 0, this.ctx.currentTime, 0.3);
  }

  async start() {
    if (this.started) {
      this.enabled = true;
      this.apply(0.07);
      return;
    }
    const ctx = new AudioContext();
    if (ctx.state === "suspended") await ctx.resume();
    const master = ctx.createGain();
    master.gain.value = 0;
    master.connect(ctx.destination);
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 90;
    filter.connect(master);
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.value = 28;
    const g = ctx.createGain();
    g.gain.value = 0.28;
    osc.connect(g);
    g.connect(filter);
    osc.start();
    const osc2 = ctx.createOscillator();
    osc2.type = "triangle";
    osc2.frequency.value = 42;
    const g2 = ctx.createGain();
    g2.gain.value = 0.04;
    osc2.connect(g2);
    g2.connect(filter);
    osc2.start();
    this.ctx = ctx;
    this.master = master;
    this.filter = filter;
    this.started = true;
    this.enabled = true;
    this.apply(0.07);
  }

  stop() {
    this.enabled = false;
    this.apply(0);
  }

  setLook(forward: number, back: number) {
    if (!this.ctx || !this.filter || !this.enabled) return;
    const t = this.ctx.currentTime;
    this.filter.frequency.setTargetAtTime(70 + forward * 80 - back * 30, t, 0.25);
    this.apply(0.04 + forward * 0.06 + back * 0.015);
  }
}
