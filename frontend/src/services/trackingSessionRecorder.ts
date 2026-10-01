import type { EyeDirection } from "./eyeDirection";
import { createUserInteractionTracker, type UserInteractionOptions } from "./userInteraction";

export const TRACKING_SAMPLE_INTERVAL_MS = 500;
export type TrackingValues = {
  yaw: number | null;
  pitch: number | null;
  roll: number | null;
  estimatedEyeDirection: EyeDirection | null;
};
export type TrackingSample = TrackingValues & {
  /** Milliseconds elapsed since this tracking session started (monotonic clock). */
  timestamp: number;
  isUserInteracting: boolean;
};
const EMPTY_VALUES: TrackingValues = { yaw: null, pitch: null, roll: null, estimatedEyeDirection: null };

/** Memory only: fixed-rate derived values, with no images, video, or landmarks. */
export function createTrackingSessionRecorder(allowed: boolean, interactionOptions: UserInteractionOptions = {}) {
  const interaction = createUserInteractionTracker(interactionOptions);
  let running = false;
  let startedAt = 0;
  let timer: ReturnType<typeof setInterval> | null = null;
  let samples: TrackingSample[] = [];
  let latest: { values: TrackingValues; updatedAt: number } | null = null;

  function getCompletedSamples(): TrackingSample[] {
    return running ? [] : samples.map((sample) => ({ ...sample }));
  }

  function reset() {
    interaction.stop();
    if (timer !== null) clearInterval(timer);
    timer = null;
    running = false;
    startedAt = 0;
    samples = [];
    latest = null;
  }

  function start() {
    if (running) return;
    reset();
    if (!allowed) return;
    running = true;
    interaction.start();
    startedAt = performance.now();
    timer = setInterval(() => {
      if (!running) return;
      const now = performance.now();
      const timestamp = Math.round(now - startedAt);
      if (samples.length && timestamp <= samples[samples.length - 1].timestamp) return;
      // Inference normally runs every 100 ms. An update older than one sample
      // interval is unavailable; do not reuse values without a fresh inference update.
      const values = latest && now - latest.updatedAt <= TRACKING_SAMPLE_INTERVAL_MS
        ? latest.values : EMPTY_VALUES;
      samples.push({ timestamp, ...values, isUserInteracting: interaction.isUserInteracting() });
    }, TRACKING_SAMPLE_INTERVAL_MS);
  }

  function update(values: TrackingValues) {
    if (!running) return;
    const reliableHead = [values.yaw, values.pitch, values.roll]
      .every((value) => value !== null && Number.isFinite(value));
    // Copy only the permitted scalar fields. Missing head data makes the whole
    // sample unavailable; missing eyes alone leaves the valid head angles intact.
    latest = {
      updatedAt: performance.now(),
      values: reliableHead ? {
        yaw: values.yaw, pitch: values.pitch, roll: values.roll,
        estimatedEyeDirection: values.estimatedEyeDirection,
      } : { ...EMPTY_VALUES },
    };
  }

  function stop(): TrackingSample[] {
    if (!running) return getCompletedSamples();
    running = false;
    interaction.stop();
    if (timer !== null) clearInterval(timer);
    timer = null;
    latest = null;
    const completed = getCompletedSamples();
    if (import.meta.env.DEV) {
      console.info("[Face tracking] session recording completed", {
        sampleCount: completed.length,
        interactingSampleCount: completed.filter((sample) => sample.isUserInteracting).length,
        durationMs: Math.round(performance.now() - startedAt),
        firstSample: completed[0] ?? null,
        lastSample: completed[completed.length - 1] ?? null,
      });
    }
    return completed;
  }

  return { start, update, stop, reset, getCompletedSamples, isUserInteracting: interaction.isUserInteracting };
}
