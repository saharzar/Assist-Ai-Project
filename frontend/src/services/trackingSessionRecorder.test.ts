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

  it("records the first valid point at zero and then samples independently every 500 ms", () => {
    const recorder = createTrackingSessionRecorder(true);
    recorder.start();
    recorder.update(values);
    vi.advanceTimersByTime(499);
    expect(recorder.stop()).toEqual([{ timestamp: 0, ...values, isUserInteracting: false }]);
    recorder.start();
    for (let i = 0; i < 15; i++) {
      recorder.update({ ...values, yaw: i });
      vi.advanceTimersByTime(100);
    }
    // The completed getter does not expose an unfinished session.
    expect(recorder.getCompletedSamples()).toEqual([]);
    const completed = recorder.stop();
    expect(completed.map((sample) => sample.timestamp)).toEqual([0, 500, 1000, 1500]);
    expect(completed.map((sample) => sample.yaw)).toEqual([0, 4, 9, 14]);
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

  it("skips several unavailable detections and begins at the first fully valid head measurement", () => {
    const onStart = vi.fn();
    const recorder = createTrackingSessionRecorder(true, {}, onStart);
    recorder.start();
    for (const invalid of [unavailable, { ...values, pitch: null }, { ...values, roll: Infinity }, { ...values, yaw: NaN }]) {
      recorder.update(invalid);
      vi.advanceTimersByTime(750);
    }
    expect(onStart).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
    recorder.update(values);
    expect(onStart).toHaveBeenCalledOnce();
    vi.advanceTimersByTime(499);
    recorder.update(values);
    vi.advanceTimersByTime(1);
    recorder.update(values);
    vi.advanceTimersByTime(500);
    expect(recorder.stop().map((sample) => sample.timestamp)).toEqual([0, 500, 1000]);
    expect(onStart).toHaveBeenCalledOnce();
  });

  it("preserves missing samples after recording starts and does not reset the origin on recovery", () => {
    const onStart = vi.fn();
    const recorder = createTrackingSessionRecorder(true, {}, onStart);
    recorder.start(); recorder.update(values);
    vi.advanceTimersByTime(100);
    recorder.update(unavailable);
    vi.advanceTimersByTime(500);
    recorder.update(values);
    vi.advanceTimersByTime(400);
    expect(recorder.stop()).toEqual([
      { timestamp: 0, ...values, isUserInteracting: false },
      { timestamp: 500, ...unavailable, isUserInteracting: false },
      { timestamp: 1000, ...values, isUserInteracting: false },
    ]);
    expect(onStart).toHaveBeenCalledOnce();
  });

  it("returns an empty completed list and zero recorded duration when no valid face ever appears", () => {
    vi.stubEnv("DEV", true);
    const onStart = vi.fn();
    const recorder = createTrackingSessionRecorder(true, {}, onStart);
    recorder.start(); recorder.update(unavailable);
    vi.advanceTimersByTime(5000);
    expect(recorder.stop()).toEqual([]);
    expect(recorder.getCompletedSamples()).toEqual([]);
    expect(onStart).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
    expect(console.info).toHaveBeenCalledWith("[Face tracking] session recording completed", expect.objectContaining({ durationMs: 0, sampleCount: 0 }));
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
    expect(recorder.getCompletedSamples()).toEqual([
      { timestamp: 0, ...values, isUserInteracting: false }, { timestamp: 500, ...values, isUserInteracting: false },
    ]);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("clears prior data, timestamp origin, and latest values when a new session starts", () => {
    const recorder = createTrackingSessionRecorder(true);
    recorder.start();
    recorder.update(values);
    vi.advanceTimersByTime(500);
    expect(recorder.stop()).toHaveLength(2);
    vi.advanceTimersByTime(3000);
    recorder.start();
    vi.advanceTimersByTime(500);
    expect(recorder.stop()).toEqual([]);
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
      { timestamp: 0, ...values, estimatedEyeDirection: null, isUserInteracting: false },
      { timestamp: 500, ...values, estimatedEyeDirection: null, isUserInteracting: false },
      { timestamp: 1000, ...unavailable, isUserInteracting: false },
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
    expect(recorder.getCompletedSamples()).toEqual([
      { timestamp: 0, ...values, isUserInteracting: false }, { timestamp: 500, ...values, isUserInteracting: false },
    ]);
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
      sampleCount: 3, interactingSampleCount: 0, durationMs: 1000,
      firstSample: { timestamp: 0, ...values, isUserInteracting: false },
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
    expect(completed.map((sample) => sample.isUserInteracting)).toEqual([true, true, true, false, false]);
    expect(completed.map((sample) => sample.yaw)).toEqual([10, 10, 10, 10, 10]);
    expect(completed).toHaveLength(5);
    expect(console.info).toHaveBeenCalledWith("[Face tracking] session recording completed", expect.objectContaining({
      sampleCount: 5, interactingSampleCount: 3,
    }));
  });

  it("removes interaction listeners on stop/reset and resets activity for the next session", () => {
    const surface = new EventTarget();
    const add = vi.spyOn(surface, "addEventListener");
    const remove = vi.spyOn(surface, "removeEventListener");
    const recorder = createTrackingSessionRecorder(true, { target: surface });
    recorder.start();
    surface.dispatchEvent(new Event("keydown"));
    recorder.update(values);
    vi.advanceTimersByTime(500);
    expect(recorder.stop()[0].isUserInteracting).toBe(true);
    expect(remove).toHaveBeenCalledTimes(1);
    surface.dispatchEvent(new Event("keydown"));
    recorder.start();
    recorder.update(values);
    vi.advanceTimersByTime(500);
    expect(recorder.stop()[0].isUserInteracting).toBe(false);
    recorder.start();
    recorder.reset();
    expect(add).toHaveBeenCalledTimes(3);
    expect(remove).toHaveBeenCalledTimes(3);
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

  it("keeps recording normally while mouse activity leaves the interaction flag false", () => {
    const surface = new EventTarget();
    const recorder = createTrackingSessionRecorder(true, { target: surface });
    recorder.start();
    for (let index = 0; index < 4; index += 1) {
      surface.dispatchEvent(new Event("mousedown"));
      surface.dispatchEvent(Object.assign(new Event("mousemove"), { clientX: index * 100, clientY: 100 }));
      recorder.update(values);
      vi.advanceTimersByTime(500);
    }
    const samples = recorder.stop();
    expect(samples).toHaveLength(5);
    expect(samples.map((sample) => sample.isUserInteracting)).toEqual([false, false, false, false, false]);
    expect(samples.map((sample) => sample.yaw)).toEqual([10, 10, 10, 10, 10]);
  });
});
