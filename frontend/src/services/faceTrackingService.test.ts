import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createFaceTracking } from "./faceTrackingService";
import type { NormalizedLandmark } from "@mediapipe/tasks-vision";

const vision = vi.hoisted(() => ({
  resolve: vi.fn(),
  create: vi.fn(),
  detect: vi.fn(),
  close: vi.fn(),
}));
vi.mock("@mediapipe/tasks-vision", () => ({
  FilesetResolver: { forVisionTasks: vision.resolve },
  FaceLandmarker: { createFromOptions: vision.create },
}));

describe("browser face tracking lifecycle", () => {
  let getUserMedia: ReturnType<typeof vi.fn>;
  let stopTrack: ReturnType<typeof vi.fn>;
  let camera: MediaStream;
  let video: HTMLVideoElement;
  let onLandmarks: ReturnType<typeof vi.fn<(landmarks: NormalizedLandmark[][]) => void>>;
  let onError: ReturnType<typeof vi.fn<(error: unknown) => void>>;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.resetAllMocks();
    vi.stubEnv("DEV", false);
    vi.spyOn(console, "info").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
    stopTrack = vi.fn();
    camera = { getTracks: () => [{ stop: stopTrack, kind: "video", readyState: "live" }] } as unknown as MediaStream;
    getUserMedia = vi.fn().mockResolvedValue(camera);
    video = {
      readyState: 2, videoWidth: 640, play: vi.fn().mockResolvedValue(undefined),
      pause: vi.fn(), srcObject: null,
    } as unknown as HTMLVideoElement;
    vi.stubGlobal("navigator", { mediaDevices: { getUserMedia } });
    vi.stubGlobal("document", { createElement: vi.fn().mockReturnValue(video) });
    vision.resolve.mockResolvedValue({});
    vision.create.mockResolvedValue({ detect: vision.detect, close: vision.close });
    vision.detect.mockReturnValue({ faceLandmarks: [[{ x: 0.5, y: 0.5, z: 0 }]] });
    onLandmarks = vi.fn();
    onError = vi.fn();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("does not request the camera or initialize MediaPipe without consent", async () => {
    const tracker = createFaceTracking({ allowed: false, onLandmarks, onError });
    await tracker.start();
    expect(getUserMedia).not.toHaveBeenCalled();
    expect(vision.resolve).not.toHaveBeenCalled();
    expect(vision.create).not.toHaveBeenCalled();
    tracker.stop();
  });

  it("detects landmarks without timestamps and releases all resources on stop", async () => {
    const tracker = createFaceTracking({ allowed: true, onLandmarks, onError });
    await tracker.start();
    expect(getUserMedia).toHaveBeenCalledWith(expect.objectContaining({ audio: false }));
    expect(vision.create).toHaveBeenCalledWith({}, expect.objectContaining({
      runningMode: "IMAGE", outputFaceBlendshapes: false, outputFacialTransformationMatrixes: false,
    }));
    expect(vision.detect).toHaveBeenCalledWith(video);
    expect(onLandmarks).toHaveBeenLastCalledWith([[{ x: 0.5, y: 0.5, z: 0 }]]);
    tracker.stop();
    tracker.stop();
    await vi.advanceTimersByTimeAsync(500);
    expect(stopTrack).toHaveBeenCalledTimes(1);
    expect(vision.close).toHaveBeenCalledTimes(1);
    expect(video.pause).toHaveBeenCalledOnce();
    expect(video.srcObject).toBeNull();
    expect(onLandmarks).toHaveBeenLastCalledWith([]);
    expect(vision.detect).toHaveBeenCalledTimes(1);
  });

  it("handles permission denial without initializing MediaPipe or rejecting start", async () => {
    const error = new Error("Permission denied");
    getUserMedia.mockRejectedValue(error);
    const tracker = createFaceTracking({ allowed: true, onLandmarks, onError });
    await expect(tracker.start()).resolves.toBeUndefined();
    expect(onError).toHaveBeenCalledWith(error);
    expect(vision.create).not.toHaveBeenCalled();
  });

  it("stops a camera whose permission resolves after scenario exit", async () => {
    let grant!: (stream: MediaStream) => void;
    getUserMedia.mockReturnValue(new Promise<MediaStream>((resolve) => { grant = resolve; }));
    const tracker = createFaceTracking({ allowed: true, onLandmarks, onError });
    const starting = tracker.start();
    tracker.stop();
    grant(camera);
    await starting;
    expect(stopTrack).toHaveBeenCalledOnce();
    expect(vision.create).not.toHaveBeenCalled();
    expect(onError).not.toHaveBeenCalled();
  });

  it("closes a model that finishes loading after scenario exit", async () => {
    let finishLoading!: (instance: unknown) => void;
    vision.create.mockImplementation(() => new Promise((resolve) => { finishLoading = resolve; }));
    const tracker = createFaceTracking({ allowed: true, onLandmarks, onError });
    const starting = tracker.start();
    await vi.waitFor(() => expect(vision.create).toHaveBeenCalled());
    tracker.stop();
    finishLoading({ detect: vision.detect, close: vision.close });
    await starting;
    expect(stopTrack).toHaveBeenCalledOnce();
    expect(vision.close).toHaveBeenCalledOnce();
    expect(video.play).not.toHaveBeenCalled();
  });

  it("releases the camera if inference fails", async () => {
    vision.detect.mockImplementation(() => { throw new Error("Inference failed"); });
    const tracker = createFaceTracking({ allowed: true, onLandmarks, onError });
    await tracker.start();
    expect(onError).toHaveBeenCalledOnce();
    expect(stopTrack).toHaveBeenCalledOnce();
    expect(vision.close).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("releases the camera if model loading fails", async () => {
    vision.create.mockRejectedValue(new Error("Model unavailable"));
    const tracker = createFaceTracking({ allowed: true, onLandmarks, onError });
    await tracker.start();
    expect(onError).toHaveBeenCalledOnce();
    expect(stopTrack).toHaveBeenCalledOnce();
    expect(video.play).not.toHaveBeenCalled();
  });

  it("logs only small development summaries every two seconds and stops logging on cleanup", async () => {
    vi.stubEnv("DEV", true);
    const tracker = createFaceTracking({ allowed: true, onLandmarks, onError });
    await tracker.start();
    await vi.advanceTimersByTimeAsync(1999);
    expect(console.info).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(console.info).toHaveBeenCalledExactlyOnceWith("[Face tracking]", {
      cameraTrackingActive: true, faceDetected: true, landmarkCount: 1,
    });
    vision.detect.mockReturnValue({ faceLandmarks: [] });
    await vi.advanceTimersByTimeAsync(2000);
    expect(console.info).toHaveBeenLastCalledWith("[Face tracking]", {
      cameraTrackingActive: true, faceDetected: false, landmarkCount: 0,
    });
    expect(console.info).toHaveBeenCalledTimes(2);
    tracker.stop();
    expect(console.info).toHaveBeenLastCalledWith("[Face tracking]", {
      cameraTrackingActive: false, faceDetected: false, landmarkCount: 0,
    });
    await vi.advanceTimersByTimeAsync(4000);
    expect(console.info).toHaveBeenCalledTimes(3);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("does not log verification summaries or error details in production", async () => {
    const tracker = createFaceTracking({ allowed: true, onLandmarks, onError });
    await tracker.start();
    await vi.advanceTimersByTimeAsync(4000);
    tracker.stop();
    vision.create.mockRejectedValue(new Error("Model unavailable"));
    await createFaceTracking({ allowed: true, onLandmarks, onError }).start();
    expect(console.info).not.toHaveBeenCalled();
    expect(console.warn).not.toHaveBeenCalled();
  });

  it.each([
    ["NotAllowedError", "Camera permission denied"],
    ["NotFoundError", "No camera available"],
  ])("identifies %s without logging camera data", async (name, reason) => {
    vi.stubEnv("DEV", true);
    const error = new Error("Camera error");
    error.name = name;
    getUserMedia.mockRejectedValue(error);
    await createFaceTracking({ allowed: true, onLandmarks, onError }).start();
    expect(console.warn).toHaveBeenCalledExactlyOnceWith(
      `[Face tracking] ${reason}. The scenario can continue.`, { stage: "camera", errorName: name },
    );
  });

  it("identifies MediaPipe initialization failures in development", async () => {
    vi.stubEnv("DEV", true);
    vision.create.mockRejectedValue(new Error("Model unavailable"));
    await createFaceTracking({ allowed: true, onLandmarks, onError }).start();
    expect(console.warn).toHaveBeenCalledExactlyOnceWith(
      "[Face tracking] MediaPipe initialization failed. The scenario can continue.",
      { stage: "initialization", errorName: "Error" },
    );
  });
});
