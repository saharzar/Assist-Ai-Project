/** Normalized PCM RMS (0..1), expressed in dBFS so thresholds are interpretable. */
export const MOUTH_CONFIG = {
  closeDb: -47, slightDb: -43, leaveSlightDb: -47,
  openDb: -35, leaveOpenDb: -39, wideDb: -20, leaveWideDb: -24,
  extraDb: -9, leaveExtraDb: -13,
  silenceDb: -48, silenceMs: 80, holdMs: 90, attackMs: 35, releaseMs: 55,
  intervalMs: 33, roundedInitialDelayMs: 600, roundedHoldMs: 120, roundedCooldownMs: 2400,
};
export type MouthState = "closed" | "slight" | "open" | "wide" | "extra" | "rounded";
type AudioMouthState = Exclude<MouthState, "rounded">;
export class MouthEnvelope {
  state: MouthState = "closed";
  private audioState: AudioMouthState = "closed";
  private level = 0;
  private changed = -Infinity;
  private last = 0;
  private silentSince: number | null = null;
  private speechActive = false;
  private roundedUntil = -Infinity;
  private nextRoundedAt = Infinity;
  update(rms: number, now: number): MouthState {
    const dt = this.last ? Math.min(now - this.last, 100) : MOUTH_CONFIG.intervalMs;
    this.last = now;
    const rawDb = 20 * Math.log10(Math.max(rms, 1e-8));
    const hasSpeechEnergy = rawDb >= MOUTH_CONFIG.silenceDb;
    if (hasSpeechEnergy && !this.speechActive) this.nextRoundedAt = now + MOUTH_CONFIG.roundedInitialDelayMs;
    else if (!hasSpeechEnergy) this.roundedUntil = -Infinity;
    this.speechActive = hasSpeechEnergy;
    this.silentSince = rawDb < MOUTH_CONFIG.silenceDb ? this.silentSince ?? now : null;
    const tau = rms > this.level ? MOUTH_CONFIG.attackMs : MOUTH_CONFIG.releaseMs;
    this.level += (1 - Math.exp(-dt / tau)) * (rms - this.level);
    const db = 20 * Math.log10(Math.max(this.level, 1e-8));
    let next = this.audioState;
    if (this.silentSince !== null && now - this.silentSince >= MOUTH_CONFIG.silenceMs) {
      this.level = 0;
      next = "closed"; // Real pauses override the hold time.
    } else if (now - this.changed >= MOUTH_CONFIG.holdMs) {
      if (this.audioState === "closed" && db >= MOUTH_CONFIG.slightDb) next = "slight";
      else if (this.audioState === "slight") {
        if (db < MOUTH_CONFIG.leaveSlightDb) next = "closed";
        else if (db >= MOUTH_CONFIG.openDb) next = "open";
      } else if (this.audioState === "open") {
        if (db < MOUTH_CONFIG.leaveOpenDb) next = "slight";
        else if (db >= MOUTH_CONFIG.wideDb) next = "wide";
      } else if (this.audioState === "wide") {
        if (db < MOUTH_CONFIG.leaveWideDb) next = "open";
        else if (db >= MOUTH_CONFIG.extraDb) next = "extra";
      } else if (this.audioState === "extra" && db < MOUTH_CONFIG.leaveExtraDb) next = "wide";
      if (this.audioState !== "closed" && db < MOUTH_CONFIG.closeDb) next = "closed";
    }
    if (next !== this.audioState) { this.audioState = next; this.changed = now; }
    if (!hasSpeechEnergy || this.audioState === "closed" || this.audioState === "slight") this.state = this.audioState;
    else if (now < this.roundedUntil) this.state = "rounded";
    else if (now >= this.nextRoundedAt) {
      this.roundedUntil = now + MOUTH_CONFIG.roundedHoldMs;
      this.nextRoundedAt = this.roundedUntil + MOUTH_CONFIG.roundedCooldownMs;
      this.state = "rounded";
    } else this.state = this.audioState;
    return this.state;
  }
}
export function pcmRms(samples: Float32Array) {
  let sum = 0;
  for (const value of samples) sum += value * value;
  return Math.sqrt(sum / samples.length);
}

let mouth: MouthState = "closed";
const listeners = new Set<() => void>();
export const getRestaurantMouth = () => mouth;
export const getClosedMouth = (): MouthState => "closed";
function publish(value: MouthState) {
  if (value === mouth) return;
  mouth = value;
  listeners.forEach((listener) => listener());
}
export function subscribeRestaurantMouth(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (!listeners.size) stopRestaurantAudioAnalysis();
  };
}
let graph: { context: AudioContext; source: MediaElementAudioSourceNode; analyser: AnalyserNode; audio: HTMLAudioElement } | null = null;
let frame: number | null = null;
/** One graph for the existing reusable player. Never make a second audible source.
 * Source -> destination is the only audible path; analyser is a silent side branch.
 * Keep the graph for the player's lifetime: a media element can be bound only once.
 */
export function prepareRestaurantAudio(audio: HTMLAudioElement, enabled: boolean) {
  if (!graph && enabled) {
    const Constructor = window.AudioContext || window.webkitAudioContext;
    if (!Constructor) return;
    let context: AudioContext | null = null;
    try {
      context = new Constructor();
      const analyser = context.createAnalyser();
      analyser.fftSize = 1024;
      const source = context.createMediaElementSource(audio);
      source.connect(context.destination);
      source.connect(analyser);
      graph = { context, source, analyser, audio };
    } catch {
      void context?.close().catch(() => {});
      // Optional visualization must not prevent ordinary audio playback.
    }
  }
  // Do not await a suspended context here: autoplay may need the next gesture.
  void resumeRestaurantAudio().catch(() => {});
}
export const restaurantAudioSuspended = () => Boolean(graph && graph.context.state !== "running");
export const resumeRestaurantAudio = () => graph?.context.resume() ?? Promise.resolve();
export function stopRestaurantAudioAnalysis() {
  if (frame !== null) cancelAnimationFrame(frame);
  frame = null;
  publish("closed");
}
export function startRestaurantAudioAnalysis(audio: HTMLAudioElement) {
  stopRestaurantAudioAnalysis();
  if (!graph || graph.audio !== audio) return;
  const analyser = graph.analyser;
  const samples = new Float32Array(analyser.fftSize);
  const envelope = new MouthEnvelope();
  let last = -Infinity;
  const tick = (now: number) => {
    if (now - last >= MOUTH_CONFIG.intervalMs) {
      last = now;
      if (audio.paused || audio.ended || restaurantAudioSuspended()) publish("closed");
      else {
        analyser.getFloatTimeDomainData(samples);
        publish(envelope.update(pcmRms(samples), now));
      }
    }
    frame = requestAnimationFrame(tick);
  };
  frame = requestAnimationFrame(tick);
}
