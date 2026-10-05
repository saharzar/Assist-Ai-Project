import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useFaceTracking } from "./useFaceTracking";
import type { TrackingSample } from "../services/trackingSessionRecorder";
import type { ScenarioAttemptId } from "../services/computerVisionSessionService";
import type { FaceTrackingPreviewFrame } from "../services/faceTrackingService";
vi.mock("../context/AuthContext", () => ({ useAuth: () => ({ token: "owner-token", guestSessionToken: null }) }));

// Unit-test the hook's lifecycle boundary without a camera or DOM renderer.
const lifecycle = vi.hoisted(() => ({
  effects: [] as Array<() => void | (() => void)>,
  refs: [] as Array<{ current: unknown }>,
  refCursor: 0,
  trackers: [] as Array<{ start: () => void; stop: () => void }>,
  previewFrame: null as FaceTrackingPreviewFrame | null,
}));
vi.mock("react", () => ({
  useRef: (initial: unknown) => {
    const index = lifecycle.refCursor++;
    return lifecycle.refs[index] ?? (lifecycle.refs[index] = { current: initial });
  },
  useCallback: (callback: unknown) => callback,
  useEffect: (setup: () => void | (() => void)) => { lifecycle.effects.push(setup); },
}));
vi.mock("../services/faceTrackingService", async () => {
  const { createTrackingSessionRecorder } = await import("../services/trackingSessionRecorder");
  return {
    createFaceTracking: (options: { allowed: boolean; onSessionComplete: (samples: TrackingSample[]) => void }) => {
      const recorder = createTrackingSessionRecorder(options.allowed);
      const tracker = {
        start: vi.fn(() => {
          recorder.start();
          recorder.update({ yaw: 0, pitch: 0, roll: 0, estimatedEyeDirection: "center" });
        }),
        stop: vi.fn(() => { options.onSessionComplete(recorder.stop()); }),
        getPreviewFrame: () => lifecycle.previewFrame,
      };
      lifecycle.trackers.push(tracker);
      return tracker;
    },
  };
});

describe("scenario tracking recorder cleanup", () => {
  let surface: EventTarget;
  let consent: string;
  function render(active = true, getAttemptId?: () => ScenarioAttemptId) {
    lifecycle.refCursor = 0;
    const flow = useFaceTracking("atm-withdrawal", active, getAttemptId);
    const cleanup = lifecycle.effects.shift()!();
    return { flow, cleanup: typeof cleanup === "function" ? cleanup : () => {} };
  }

  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubEnv("DEV", false);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));
    lifecycle.effects.length = 0;
    lifecycle.refs.length = 0;
    lifecycle.trackers.length = 0;
    lifecycle.previewFrame = null;
    consent = "allowed";
    surface = new EventTarget();
    vi.stubGlobal("window", Object.assign(surface, { setTimeout, clearTimeout }));
    vi.stubGlobal("sessionStorage", { getItem: () => consent });
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("stops collection on scenario unmount and keeps a completed snapshot retrievable", () => {
    const { flow, cleanup } = render();
    vi.advanceTimersByTime(1000);
    expect(flow.getCompletedSamples()).toEqual([]);
    cleanup();
    const completed = flow.getCompletedSamples();
    expect(completed).toHaveLength(2);
    vi.advanceTimersByTime(3000);
    expect(flow.getCompletedSamples()).toEqual(completed);
    expect(lifecycle.trackers[0].stop).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("stops on pagehide and removes the listener on cleanup", () => {
    const remove = vi.spyOn(surface, "removeEventListener");
    const { flow, cleanup } = render();
    vi.advanceTimersByTime(300);
    surface.dispatchEvent(new Event("keydown"));
    vi.advanceTimersByTime(200);
    surface.dispatchEvent(new Event("pagehide"));
    expect(flow.getCompletedSamples()).toHaveLength(1);
    expect(flow.getCompletedSamples()[0].isUserInteracting).toBe(true);
    expect(remove.mock.calls.map(([event]) => event)).toEqual(["keydown", "mousedown", "mousemove"]);
    vi.advanceTimersByTime(3000);
    expect(flow.getCompletedSamples()).toHaveLength(1);
    cleanup();
    expect(remove.mock.calls.map(([event]) => event)).toEqual(["keydown", "mousedown", "mousemove", "pagehide"]);
    surface.dispatchEvent(new Event("pagehide"));
    expect(lifecycle.trackers[0].stop).toHaveBeenCalledTimes(2);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("never creates a tracking recorder when consent is No", () => {
    consent = "denied";
    const { flow, cleanup } = render();
    vi.advanceTimersByTime(1000);
    cleanup();
    expect(lifecycle.trackers).toHaveLength(0);
    expect(flow.getCompletedSamples()).toEqual([]);
    expect(vi.getTimerCount()).toBe(0);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("cancels a deferred start when the user immediately leaves", () => {
    const { flow, cleanup } = render();
    cleanup();
    vi.advanceTimersByTime(1000);
    expect(lifecycle.trackers[0].start).not.toHaveBeenCalled();
    expect(flow.getCompletedSamples()).toEqual([]);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("exposes the current inference view through a stable getter and clears it on exit", () => {
    const { flow, cleanup } = render();
    lifecycle.previewFrame = { video: {} as HTMLVideoElement, landmarks: [], headPose: null,
      estimatedEyeDirection: null, isUserInteracting: false };
    expect(flow.getPreviewFrame()).toBe(lifecycle.previewFrame);
    cleanup();
    expect(flow.getPreviewFrame()).toBeNull();
  });

  it("retains completed data while inactive and clears it when a new scenario session begins", () => {
    const first = render();
    vi.advanceTimersByTime(500);
    first.cleanup();
    expect(render(false).flow.getCompletedSamples()).toHaveLength(1);
    const next = render();
    expect(next.flow.getCompletedSamples()).toEqual([]);
    vi.advanceTimersByTime(500);
    next.cleanup();
    expect(next.flow.getCompletedSamples()).toHaveLength(1);
    expect(next.flow.getCompletedSamples()[0].timestamp).toBe(500);
  });

  it("keeps scenario completion and completed samples working when backend saving fails", async () => {
    vi.mocked(fetch).mockRejectedValue(new Error("Backend unavailable"));
    const { flow, cleanup } = render();
    await vi.advanceTimersByTimeAsync(500);
    expect(() => cleanup()).not.toThrow();
    await vi.advanceTimersByTimeAsync(0);
    expect(flow.getCompletedSamples()).toHaveLength(1);
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("submits once despite pagehide followed by unmount", async () => {
    const { cleanup } = render();
    await vi.advanceTimersByTimeAsync(500);
    surface.dispatchEvent(new Event("pagehide"));
    cleanup();
    await vi.advanceTimersByTimeAsync(0);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("includes the existing scenario attempt identifier in the completed upload", async () => {
    const attemptId = "00000000-0000-4000-8000-000000000001";
    const { cleanup } = render(true, () => Promise.resolve(attemptId));
    await vi.advanceTimersByTimeAsync(500);
    cleanup();
    await vi.advanceTimersByTimeAsync(0);
    const options = vi.mocked(fetch).mock.calls[0][1];
    expect(JSON.parse(options!.body as string).scenario_session_id).toBe(attemptId);
  });
});
