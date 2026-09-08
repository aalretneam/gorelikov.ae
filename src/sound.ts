export class Soundscape {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private filter: BiquadFilterNode | null = null;
  private voices: OscillatorNode[] = [];
  private started = false;
  enabled = false;

  async start() {
    if (this.started) return;
    const ctx = new AudioContext();
    if (ctx.state === "suspended") await ctx.resume();
    this.ctx = ctx;

    const master = ctx.createGain();
    master.gain.value = 0.0;
    master.connect(ctx.destination);
    this.master = master;

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 720;
    filter.Q.value = 0.7;
    filter.connect(master);
    this.filter = filter;

    const delay = ctx.createDelay(1.8);
    delay.delayTime.value = 0.38;
    const feedback = ctx.createGain();
    feedback.gain.value = 0.32;
    const wet = ctx.createGain();
    wet.gain.value = 0.22;
    filter.connect(delay);
    delay.connect(feedback);
    feedback.connect(delay);
    delay.connect(wet);
    wet.connect(master);

    const base = 110;
    const ratios = [1, 1.5, 2, 2.52, 3.0];
    for (let i = 0; i < ratios.length; i++) {
      const osc = ctx.createOscillator();
      osc.type = i % 2 === 0 ? "sine" : "triangle";
      osc.frequency.value = base * ratios[i];
      const g = ctx.createGain();
      g.gain.value = i === 0 ? 0.18 : 0.045;
      const detune = ctx.createOscillator();
      detune.frequency.value = 0.03 + i * 0.011;
      const dg = ctx.createGain();
      dg.gain.value = 4 + i;
      detune.connect(dg);
      dg.connect(osc.frequency);
      osc.connect(g);
      g.connect(filter);
      osc.start();
      detune.start();
      this.voices.push(osc);
    }

    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.07;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 180;
    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);
    lfo.start();

    const now = ctx.currentTime;
    master.gain.cancelScheduledValues(now);
    master.gain.setValueAtTime(0, now);
    master.gain.linearRampToValueAtTime(0.16, now + 2.8);

    this.started = true;
    this.enabled = true;
  }

  setMotion(nx: number, ny: number, energy: number, hold: number) {
    if (!this.ctx || !this.filter || !this.master || !this.enabled) return;
    const t = this.ctx.currentTime;
    const freq = 420 + ny * 900 + hold * 280;
    this.filter.frequency.setTargetAtTime(freq, t, 0.12);
    const vol = 0.12 + energy * 0.08 + hold * 0.04;
    this.master.gain.setTargetAtTime(vol, t, 0.2);
    if (this.voices[0]) {
      this.voices[0].frequency.setTargetAtTime(96 + nx * 28, t, 0.4);
    }
  }

  pluck() {
    if (!this.ctx || !this.filter || !this.enabled) return;
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    const scale = [0, 3, 5, 7, 10, 12];
    const note = scale[(Math.random() * scale.length) | 0];
    osc.frequency.value = 220 * Math.pow(2, note / 12);
    osc.type = "sine";
    g.gain.value = 0;
    osc.connect(g);
    g.connect(this.filter);
    const now = ctx.currentTime;
    g.gain.linearRampToValueAtTime(0.09, now + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 1.6);
    osc.start(now);
    osc.stop(now + 1.7);
  }

  async toggle() {
    if (!this.started) {
      await this.start();
      return;
    }
    if (!this.ctx || !this.master) return;
    this.enabled = !this.enabled;
    const t = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(t);
    this.master.gain.setTargetAtTime(this.enabled ? 0.16 : 0, t, 0.3);
  }
}
