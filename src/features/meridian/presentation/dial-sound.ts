/**
 * The hiss of a radio dial, made on the spot from filtered noise: no audio file,
 * and silent unless the viewer turned it on. The context sleeps between gestures.
 */

const MAX_HISS = 0.05;
const IDLE_MS = 500;

type AudioContextClass = typeof AudioContext;

export class DialSound {
  private context: AudioContext | null = null;
  private hiss: GainNode | null = null;
  private idleTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(private readonly Context: AudioContextClass | undefined) {}

  private ensure(): AudioContext | null {
    if (this.context) return this.context;
    if (!this.Context) return null;
    const context = new this.Context();
    const buffer = context.createBuffer(1, context.sampleRate, context.sampleRate);
    const samples = buffer.getChannelData(0);
    for (let index = 0; index < samples.length; index++) samples[index] = Math.random() * 2 - 1;
    const noise = context.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;
    const band = context.createBiquadFilter();
    band.type = "bandpass";
    band.frequency.value = 1800;
    band.Q.value = 0.7;
    const hiss = context.createGain();
    hiss.gain.value = 0;
    noise.connect(band).connect(hiss).connect(context.destination);
    noise.start();
    this.context = context;
    this.hiss = hiss;
    return context;
  }

  /** @param speed needle speed from 0 to 1 */
  setSpeed(speed: number): void {
    const context = this.ensure();
    if (!context || !this.hiss) return;
    if (context.state === "suspended") void context.resume().catch(() => {});
    this.hiss.gain.setTargetAtTime(Math.min(1, speed) * MAX_HISS, context.currentTime, 0.04);
    if (this.idleTimer) clearTimeout(this.idleTimer);
    this.idleTimer = setTimeout(() => {
      if (this.context?.state === "running") void this.context.suspend().catch(() => {});
    }, IDLE_MS);
  }

  /** A short tick when the needle locks on a station. */
  lock(): void {
    const context = this.ensure();
    if (!context) return;
    this.hiss?.gain.setTargetAtTime(0, context.currentTime, 0.02);
    if (context.state !== "running") return;
    const tone = context.createOscillator();
    const level = context.createGain();
    tone.frequency.value = 880;
    level.gain.setValueAtTime(0.03, context.currentTime);
    level.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.05);
    tone.connect(level).connect(context.destination);
    tone.start();
    tone.stop(context.currentTime + 0.05);
  }

  dispose(): void {
    if (this.idleTimer) clearTimeout(this.idleTimer);
    this.idleTimer = null;
    void this.context?.close().catch(() => {});
    this.context = null;
    this.hiss = null;
  }
}
