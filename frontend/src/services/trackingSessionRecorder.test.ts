import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createTrackingSessionRecorder, type TrackingValues } from "./trackingSessionRecorder";

const values: TrackingValues = { yaw: 10, pitch: -5, roll: 2, estimatedEyeDirection: "left" };
const unavailable: TrackingValues = { yaw: null, pitch: null, roll: null, estimatedEyeDirection: null };

describe("in-memory tracking session recorder", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubEnv("DEV", false);
    vi.spyOn(console, "info").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("waits 500 ms for the first sample and samples independently of inference updates", () => {
    const recorder = createTrackingSessionRecorder(true);
    recorder.start();
    recorder.update(values);
    vi.advanceTimersByTime(499);
    expect(recorder.stop()).toEqual([]);
    recorder.start();
    for (let i = 0; i < 15; i++) {
      recorder.update({ ...values, yaw: i });
      vi.advanceTimersByTime(100);
    }
    // The completed getter does not expose an unfinished session.
    expect(recorder.getCompletedSamples()).toEqual([]);
    const completed = recorder.stop();
    expect(completed.map((sample) => sample.timestamp)).toEqual([500, 1000, 1500]);
    expect(completed.map((sample) => sample.yaw)).toEqual([4, 9, 14]);
    expect(Object.keys(completed[0]).sort()).toEqual(["estimatedEyeDirection", "pitch", "roll", "timestamp", "yaw"]);
  });

  it("creates no timer or samples when consent is No", () => {
    const recorder = createTrackingSessionRecorder(false);
    recorder.start();
    recorder.update(values);
    vi.advanceTimersByTime(5000);
    expect(recorder.stop()).toEqual([]);
    expect(vi.getTimerCount()).toBe(0);
    expect(console.info).not.toHaveBeenCalled();
  });

  it("stops idempotently, retains completed data, and rejects updates after stop", () => {
    const recorder = createTrackingSessionRecorder(true);
    recorder.start();
    recorder.start();
    recorder.update(values);
    vi.advanceTimersByTime(500);
    const completed = recorder.stop();
    recorder.update({ ...values, yaw: 90 });
    vi.advanceTimersByTime(5000);
    expect(recorder.stop()).toEqual(completed);
    expect(recorder.getCompletedSamples()).toEqual([{ timestamp: 500, ...values }]);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("clears prior data, timestamp origin, and latest values when a new session starts", () => {
    const recorder = createTrackingSessionRecorder(true);
    recorder.start();
    recorder.update(values);
    vi.advanceTimersByTime(500);
    expect(recorder.stop()).toHaveLength(1);
    vi.advanceTimersByTime(3000);
    recorder.start();
    vi.advanceTimersByTime(500);
    expect(recorder.stop()).toEqual([{ timestamp: 500, ...unavailable }]);
    recorder.reset();
    expect(recorder.getCompletedSamples()).toEqual([]);
    recorder.start();
    recorder.reset();
    vi.advanceTimersByTime(1000);
    expect(recorder.stop()).toEqual([]);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("stores nulls for missing/unreliable/stale head data while keeping valid head data with unknown eyes", () => {
    const recorder = createTrackingSessionRecorder(true);
    recorder.start();
    vi.advanceTimersByTime(500);
    recorder.update({ ...values, yaw: NaN });
    vi.advanceTimersByTime(500);
    recorder.update({ ...values, estimatedEyeDirection: null });
    vi.advanceTimersByTime(500);
    // No further inference updates: the next sample must not reuse these angles.
    vi.advanceTimersByTime(500);
    expect(recorder.stop()).toEqual([
      { timestamp: 500, ...unavailable },
      { timestamp: 1000, ...unavailable },
      { timestamp: 1500, ...values, estimatedEyeDirection: null },
      { timestamp: 2000, ...unavailable },
    ]);
  });

  it("copies scalar values and completed snapshots so callers cannot mutate recorded history", () => {
    const recorder = createTrackingSessionRecorder(true);
    recorder.start();
    const input = { ...values, landmarks: ["not recorded"] };
    recorder.update(input);
    input.yaw = 90;
    vi.advanceTimersByTime(500);
    const completed = recorder.stop();
    completed[0].yaw = 180;
    completed.push({ timestamp: 999, ...values });
    expect(recorder.getCompletedSamples()).toEqual([{ timestamp: 500, ...values }]);
  });

  it("logs only a single completed summary in development, never the whole array", () => {
    vi.stubEnv("DEV", true);
    const recorder = createTrackingSessionRecorder(true);
    recorder.start();
    recorder.update(values);
    vi.advanceTimersByTime(500);
    recorder.update(values);
    vi.advanceTimersByTime(500);
    expect(console.info).not.toHaveBeenCalled();
    recorder.stop();
    recorder.stop();
    expect(console.info).toHaveBeenCalledExactlyOnceWith("[Face tracking] session recording completed", {
      sampleCount: 2, durationMs: 1000,
      firstSample: { timestamp: 500, ...values }, lastSample: { timestamp: 1000, ...values },
    });
  });
});
