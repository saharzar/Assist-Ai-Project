/** Normalized PCM RMS (0..1), expressed in dBFS so thresholds are interpretable. */
export const MOUTH_CONFIG = {
  closeDb: -44, slightDb: -41, leaveSlightDb: -44,
  openDb: -31, leaveOpenDb: -38, wideDb: -18, leaveWideDb: -22,
  extraDb: -7, leaveExtraDb: -11,
  silenceDb: -43, silenceMs: 60, holdMs: 170, attackMs: 25, releaseMs: 90,
  intervalMs: 33, roundedInitialDelayMs: 800, roundedHoldMs: 100, roundedCooldownMs: 2800,
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
      next = "closed"; // Short gaps between words close the mouth promptly.
    } else if (hasSpeechEnergy && (this.audioState === "closed" || now - this.changed >= MOUTH_CONFIG.holdMs)) {
      if (db >= MOUTH_CONFIG.extraDb) next = "extra";
      else if (db >= MOUTH_CONFIG.wideDb || (this.audioState === "wide" && db >= MOUTH_CONFIG.leaveWideDb)) next = "wide";
      else if (db >= MOUTH_CONFIG.openDb || (this.audioState === "open" && db >= MOUTH_CONFIG.leaveOpenDb)) next = "open";
      else if (db >= MOUTH_CONFIG.slightDb || (this.audioState === "slight" && db >= MOUTH_CONFIG.leaveSlightDb)) next = "slight";
      else next = "closed";
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
let browserWordTimer: number | null = null;
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
  if (browserWordTimer !== null) window.clearTimeout(browserWordTimer);
  browserWordTimer = null;
  publish("closed");
}
/** Browser speech exposes word boundaries even though it does not expose PCM. */
export function startRestaurantBrowserSpeechAnimation() {
  stopRestaurantAudioAnalysis();
}
export function pulseRestaurantBrowserSpeechWord(charLength: number) {
  if (browserWordTimer !== null) window.clearTimeout(browserWordTimer);
  publish("open");
  browserWordTimer = window.setTimeout(() => {
    browserWordTimer = null;
    publish("closed");
  }, Math.min(260, Math.max(130, charLength * 32)));
}
export function startRestaurantAudioAnalysis(audio: HTMLAudioElement) {
  stopRestaurantAudioAnalysis();
  if (!graph || graph.audio !== audio) {
    // Never run an un-timed mouth loop when audio analysis is unavailable.
    return;
  }
  const analyser = graph.analyser;
  const samples = new Float32Array(analyser.fftSize);
  const envelope = new MouthEnvelope();
  let last = -Infinity;
  const tick = (now: number) => {
    if (now - last >= MOUTH_CONFIG.intervalMs) {
      last = now;
      if (audio.paused || audio.ended || audio.seeking || audio.muted || audio.volume === 0 ||
          (typeof audio.readyState === "number" && audio.readyState < 2) || restaurantAudioSuspended()) publish("closed");
      else {
        analyser.getFloatTimeDomainData(samples);
        publish(envelope.update(pcmRms(samples), now));
      }
    }
    frame = requestAnimationFrame(tick);
  };
  frame = requestAnimationFrame(tick);
}
