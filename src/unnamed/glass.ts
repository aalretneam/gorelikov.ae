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
    this.master.gain.setTargetAtTime(this.enabled && !this.muted ? 0.18 : 0, this.ctx.currentTime, 0.2);
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
    this.hum();
  }

  stop() {
    this.enabled = false;
    this.apply();
  }

  private hum() {
    const ctx = this.ctx;
    const master = this.master;
    if (!ctx || !master) return;
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.value = 52;
    const g = ctx.createGain();
    g.gain.value = 0.08;
    const f = ctx.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.value = 180;
    osc.connect(g);
    g.connect(f);
    f.connect(master);
    osc.start();

    const noise = ctx.createBufferSource();
    const buf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * 0.35;
    noise.buffer = buf;
    noise.loop = true;
    const ng = ctx.createGain();
    ng.gain.value = 0;
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 1800;
    bp.Q.value = 0.8;
    noise.connect(bp);
    bp.connect(ng);
    ng.connect(master);
    noise.start();
    this.rustleGain = ng;
  }

  rustle(amount: number) {
    if (!this.ctx || !this.rustleGain || !this.enabled) return;
    this.rustleGain.gain.setTargetAtTime(amount * 0.04, this.ctx.currentTime, 0.2);
  }

  clink() {
    const ctx = this.ctx;
    const master = this.master;
    if (!ctx || !master || !this.enabled) return;
    const t = ctx.currentTime;
    const buf = ctx.createBuffer(1, ctx.sampleRate * 0.12, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 2400;
    bp.Q.value = 4;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.18, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
    src.connect(bp);
    bp.connect(g);
    g.connect(master);
    src.start();
    const ping = ctx.createOscillator();
    ping.type = "sine";
    ping.frequency.setValueAtTime(1760, t);
    ping.frequency.exponentialRampToValueAtTime(620, t + 0.22);
    const pg = ctx.createGain();
    pg.gain.setValueAtTime(0.05, t);
    pg.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
    ping.connect(pg);
    pg.connect(master);
    ping.start(t);
    ping.stop(t + 0.24);
  }
}
