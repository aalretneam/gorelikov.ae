export class MachineSound {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private filter: BiquadFilterNode | null = null;
  private started = false;
  enabled = false;

  async start() {
    if (this.started) {
      this.enabled = true;
      this.setGain(0.12);
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
    filter.frequency.value = 480;
    filter.Q.value = 0.6;
    filter.connect(master);
    this.filter = filter;

    const delay = ctx.createDelay(2);
    delay.delayTime.value = 0.42;
    const fb = ctx.createGain();
    fb.gain.value = 0.28;
    filter.connect(delay);
    delay.connect(fb);
    fb.connect(delay);
    delay.connect(master);

    const freqs = [55, 82.5, 110, 164];
    for (let i = 0; i < freqs.length; i++) {
      const osc = ctx.createOscillator();
      osc.type = i === 0 ? "sine" : "triangle";
      osc.frequency.value = freqs[i];
      const g = ctx.createGain();
      g.gain.value = i === 0 ? 0.16 : 0.03;
      osc.connect(g);
      g.connect(filter);
      osc.start();
    }

    const noise = ctx.createBufferSource();
    const buf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * 0.08;
    noise.buffer = buf;
    noise.loop = true;
    const ng = ctx.createGain();
    ng.gain.value = 0.04;
    noise.connect(ng);
    ng.connect(filter);
    noise.start();

    this.started = true;
    this.enabled = true;
    this.setGain(0.12);
  }

  stop() {
    this.enabled = false;
    this.setGain(0);
  }

  setMuted(muted: boolean) {
    if (!this.ctx || !this.master) return;
    this.master.gain.setTargetAtTime(muted || !this.enabled ? 0 : 0.12, this.ctx.currentTime, 0.08);
  }

  private setGain(v: number) {
    if (!this.ctx || !this.master) return;
    this.master.gain.setTargetAtTime(v, this.ctx.currentTime, 0.35);
  }

  setState(entropy: number, freeze: number, impulse: number) {
    if (!this.ctx || !this.filter || !this.enabled) return;
    const t = this.ctx.currentTime;
    this.filter.frequency.setTargetAtTime(380 + entropy * 700 + impulse * 200, t, 0.2);
    this.setGain(freeze > 0.6 ? 0.03 : 0.1 + entropy * 0.06);
  }
}
