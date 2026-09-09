export class Glass {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private rustleGain: GainNode | null = null;
  started = false;
  enabled = false;
  private muted = false;

  setMuted(muted: boolean) {
    this.muted = muted;
    this.apply();
  }

  private apply() {
    if (!this.ctx || !this.master) return;
    this.master.gain.setTargetAtTime(this.enabled && !this.muted ? 0.22 : 0, this.ctx.currentTime, 0.25);
  }

  async start() {
    if (this.started) {
      this.enabled = true;
      this.apply();
      return;
    }
    const ctx = new AudioContext();
    if (ctx.state === "suspended") await ctx.resume();
    const master = ctx.createGain();
    master.gain.value = 0;
    master.connect(ctx.destination);
    this.ctx = ctx;
    this.master = master;
    this.started = true;
    this.enabled = true;
    this.apply();
    this.wings();
  }

  stop() {
    this.enabled = false;
    this.apply();
  }

  private wings() {
    const ctx = this.ctx;
    const master = this.master;
    if (!ctx || !master) return;

    const noise = ctx.createBufferSource();
    const buf = ctx.createBuffer(1, ctx.sampleRate * 3, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    noise.buffer = buf;
    noise.loop = true;

    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 720;
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 2100;
    bp.Q.value = 0.85;
    const air = ctx.createBiquadFilter();
    air.type = "highshelf";
    air.frequency.value = 4800;
    air.gain.value = 4;

    const amount = ctx.createGain();
    amount.gain.value = 0;
    this.rustleGain = amount;

    const flutter = ctx.createGain();
    flutter.gain.value = 0.7;
    const lfo = ctx.createOscillator();
    lfo.type = "sine";
    lfo.frequency.value = 8.6;
    const lfoG = ctx.createGain();
    lfoG.gain.value = 0.28;
    lfo.connect(lfoG);
    lfoG.connect(flutter.gain);
    const lfo2 = ctx.createOscillator();
    lfo2.type = "triangle";
    lfo2.frequency.value = 12.4;
    const lfo2G = ctx.createGain();
    lfo2G.gain.value = 0.12;
    lfo2.connect(lfo2G);
    lfo2G.connect(flutter.gain);

    noise.connect(hp);
    hp.connect(bp);
    bp.connect(air);
    air.connect(amount);
    amount.connect(flutter);
    flutter.connect(master);
    noise.start();
    lfo.start();
    lfo2.start();
  }

  rustle(amount: number) {
    if (!this.ctx || !this.rustleGain || !this.enabled) return;
    this.rustleGain.gain.setTargetAtTime(amount * 0.055, this.ctx.currentTime, 0.35);
  }
}
