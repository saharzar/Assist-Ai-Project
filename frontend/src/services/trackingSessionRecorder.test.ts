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
    expect(Object.keys(completed[0]).sort()).toEqual(["estimatedEyeDirection", "isUserInteracting", "pitch", "roll", "timestamp", "yaw"]);
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
    expect(recorder.getCompletedSamples()).toEqual([{ timestamp: 500, ...values, isUserInteracting: false }]);
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
    expect(recorder.stop()).toEqual([{ timestamp: 500, ...unavailable, isUserInteracting: false }]);
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
      { timestamp: 500, ...unavailable, isUserInteracting: false },
      { timestamp: 1000, ...unavailable, isUserInteracting: false },
      { timestamp: 1500, ...values, estimatedEyeDirection: null, isUserInteracting: false },
      { timestamp: 2000, ...unavailable, isUserInteracting: false },
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
    completed.push({ timestamp: 999, ...values, isUserInteracting: false });
    expect(recorder.getCompletedSamples()).toEqual([{ timestamp: 500, ...values, isUserInteracting: false }]);
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
      sampleCount: 2, interactingSampleCount: 0, durationMs: 1000,
      firstSample: { timestamp: 500, ...values, isUserInteracting: false },
      lastSample: { timestamp: 1000, ...values, isUserInteracting: false },
    });
  });

  it("marks active samples without discarding them or changing tracking values and reports the count", () => {
    vi.stubEnv("DEV", true);
    const surface = new EventTarget();
    const recorder = createTrackingSessionRecorder(true, { target: surface });
    recorder.start();
    surface.dispatchEvent(new Event("keydown"));
    for (let i = 0; i < 4; i++) {
      recorder.update(values);
      vi.advanceTimersByTime(500);
    }
    const completed = recorder.stop();
    expect(completed.map((sample) => sample.isUserInteracting)).toEqual([true, true, false, false]);
    expect(completed.map((sample) => sample.yaw)).toEqual([10, 10, 10, 10]);
    expect(completed).toHaveLength(4);
    expect(console.info).toHaveBeenCalledWith("[Face tracking] session recording completed", expect.objectContaining({
      sampleCount: 4, interactingSampleCount: 2,
    }));
  });

  it("removes interaction listeners on stop/reset and resets activity for the next session", () => {
    const surface = new EventTarget();
    const add = vi.spyOn(surface, "addEventListener");
    const remove = vi.spyOn(surface, "removeEventListener");
    const recorder = createTrackingSessionRecorder(true, { target: surface });
    recorder.start();
    surface.dispatchEvent(new Event("mousedown"));
    vi.advanceTimersByTime(500);
    expect(recorder.stop()[0].isUserInteracting).toBe(true);
    expect(remove).toHaveBeenCalledTimes(3);
    surface.dispatchEvent(new Event("keydown"));
    recorder.start();
    vi.advanceTimersByTime(500);
    expect(recorder.stop()[0].isUserInteracting).toBe(false);
    recorder.start();
    recorder.reset();
    expect(add).toHaveBeenCalledTimes(9);
    expect(remove).toHaveBeenCalledTimes(9);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("does not register interaction listeners with No consent", () => {
    const surface = new EventTarget();
    const add = vi.spyOn(surface, "addEventListener");
    const recorder = createTrackingSessionRecorder(false, { target: surface });
    recorder.start();
    surface.dispatchEvent(new Event("keydown"));
    vi.advanceTimersByTime(1000);
    expect(recorder.stop()).toEqual([]);
    expect(add).not.toHaveBeenCalled();
  });
});
