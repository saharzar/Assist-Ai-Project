import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createFaceTracking } from "./faceTrackingService";
import type { NormalizedLandmark } from "@mediapipe/tasks-vision";
import { createAdminFaceTrackingPreview } from "./adminFaceTrackingPreview";
import { calculateHeadPose } from "./headPose";
import { estimateEyeDirection } from "./eyeDirection";

const vision = vi.hoisted(() => ({
  resolve: vi.fn(),
  create: vi.fn(),
  detect: vi.fn(),
  close: vi.fn(),
}));
function frontFacingLandmarks(): NormalizedLandmark[] {
  const landmarks = Array.from({ length: 478 }, () => ({ x: 0.5, y: 0.5, z: 0, visibility: 1 }));
  landmarks[33] = { x: 0.4, y: 0.4, z: 0, visibility: 1 };
  landmarks[263] = { x: 0.6, y: 0.4, z: 0, visibility: 1 };
  landmarks[10] = { x: 0.5, y: 0.2, z: 0, visibility: 1 };
  landmarks[152] = { x: 0.5, y: 0.7, z: 0, visibility: 1 };
  landmarks[133] = { x: 0.46, y: 0.4, z: 0, visibility: 1 };
  landmarks[362] = { x: 0.54, y: 0.4, z: 0, visibility: 1 };
  landmarks[159] = { x: 0.43, y: 0.39, z: 0, visibility: 1 };
  landmarks[145] = { x: 0.43, y: 0.41, z: 0, visibility: 1 };
  landmarks[386] = { x: 0.57, y: 0.39, z: 0, visibility: 1 };
  landmarks[374] = { x: 0.57, y: 0.41, z: 0, visibility: 1 };
  landmarks[468] = { x: 0.43, y: 0.4, z: 0, visibility: 1 };
  landmarks[473] = { x: 0.57, y: 0.4, z: 0, visibility: 1 };
  return landmarks;
}

function positionedFace(centerX: number, scale: number, roll = 0, lookLeft = false): NormalizedLandmark[] {
  const landmarks = frontFacingLandmarks();
  if (lookLeft) { landmarks[468].x += 0.02; landmarks[473].x += 0.02; }
  const angle = roll * Math.PI / 180;
  return landmarks.map((point) => ({ ...point,
    x: centerX + scale * ((point.x - 0.5) * Math.cos(angle) - (point.y - 0.5) * Math.sin(angle)),
    y: 0.5 + scale * ((point.x - 0.5) * Math.sin(angle) + (point.y - 0.5) * Math.cos(angle)),
    z: point.z * scale,
  }));
}
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
      readyState: 2, videoWidth: 640, videoHeight: 480, play: vi.fn().mockResolvedValue(undefined),
      pause: vi.fn(), srcObject: null,
    } as unknown as HTMLVideoElement;
    vi.stubGlobal("navigator", { mediaDevices: { getUserMedia } });
    vi.stubGlobal("document", { createElement: vi.fn().mockReturnValue(video) });
    vision.resolve.mockResolvedValue({});
    vision.create.mockResolvedValue({ detect: vision.detect, close: vision.close });
    vision.detect.mockReturnValue({ faceLandmarks: [frontFacingLandmarks()] });
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
    expect(tracker.getCompletedSamples()).toEqual([]);
    expect(tracker.getPreviewFrame()).toBeNull();
  });

  it("preview toggles reuse the inference video and do not restart or stop tracking", async () => {
    vision.detect.mockReturnValue({ faceLandmarks: [frontFacingLandmarks()] });
    const tracker = createFaceTracking({ allowed: true, onLandmarks, onError });
    await tracker.start();
    const drawImage = vi.fn();
    const context = { clearRect: vi.fn(), drawImage, beginPath: vi.fn(), moveTo: vi.fn(), arc: vi.fn(), fill: vi.fn() };
    const canvas = { width: 640, height: 480, getContext: () => context } as unknown as HTMLCanvasElement;
    const makePreview = () => createAdminFaceTrackingPreview({ token: "admin", canvas,
      getFrame: tracker.getPreviewFrame, authorize: async () => true, onUpdate: vi.fn(), onUnavailable: vi.fn() });
    const first = makePreview(); await first.start();
    expect(drawImage).toHaveBeenCalledWith(video, 0, 0, 640, 480);
    first.stop();
    await vi.advanceTimersByTimeAsync(500);
    expect(vision.detect.mock.calls.length).toBeGreaterThan(1);
    expect(stopTrack).not.toHaveBeenCalled(); expect(vision.close).not.toHaveBeenCalled();
    const second = makePreview(); await second.start();
    expect(getUserMedia).toHaveBeenCalledOnce(); expect(vision.create).toHaveBeenCalledOnce();
    expect(document.createElement).toHaveBeenCalledOnce();
    second.stop(); tracker.stop();
    expect(stopTrack).toHaveBeenCalledOnce(); expect(vision.close).toHaveBeenCalledOnce();
    expect(tracker.getPreviewFrame()).toBeNull(); expect(vi.getTimerCount()).toBe(0);
  });

  it("uses only the largest face for landmarks, measurements, samples and admin overlay", async () => {
    const companion = positionedFace(0.8, 0.3);
    const primary = positionedFace(0.25, 0.8, 15, true);
    vision.detect.mockReturnValue({ faceLandmarks: [companion, primary] });
    const tracker = createFaceTracking({ allowed: true, onLandmarks, onError });
    await tracker.start();
    expect(onLandmarks).toHaveBeenLastCalledWith([primary]);
    expect(tracker.getPreviewFrame()).toEqual(expect.objectContaining({
      landmarks: primary, detectedFaceCount: 2, primaryFaceIndex: 1,
    }));
    const pose = calculateHeadPose(primary, 640, 480)!;
    const eyeDirection = estimateEyeDirection(primary, 640, 480);
    expect(tracker.getHeadPose()).toEqual(pose);
    expect(tracker.getEyeDirection()).toBe(eyeDirection);
    vision.detect.mockReturnValue({ faceLandmarks: [primary, companion] });
    await vi.advanceTimersByTimeAsync(500);
    expect(onLandmarks).toHaveBeenLastCalledWith([primary]);
    expect(tracker.getPreviewFrame()?.primaryFaceIndex).toBe(0);
    tracker.stop();
    const samples = tracker.getCompletedSamples();
    expect(samples).toHaveLength(1);
    expect(samples[0].roll).toBeCloseTo(pose.roll);
    expect(samples[0].estimatedEyeDirection).toBe(eyeDirection);
    expect(samples[0]).not.toHaveProperty("landmarks");
    expect(samples[0]).not.toHaveProperty("primaryFaceIndex");
    expect(getUserMedia).toHaveBeenCalledOnce();
  });

  it("resets pose and eye smoothing when switching to a persistently larger primary", async () => {
    const initial = positionedFace(0.25, 0.75);
    const companion = positionedFace(0.8, 0.25, 20, true);
    vision.detect.mockReturnValue({ faceLandmarks: [initial, companion] });
    const tracker = createFaceTracking({ allowed: true, onLandmarks, onError });
    await tracker.start();
    expect(tracker.getEyeDirection()).toBe("center");
    const larger = positionedFace(0.8, 0.95, 20, true);
    vision.detect.mockReturnValue({ faceLandmarks: [larger, initial] });
    await vi.advanceTimersByTimeAsync(200);
    expect(onLandmarks).toHaveBeenLastCalledWith([initial]);
    await vi.advanceTimersByTimeAsync(100);
    expect(onLandmarks).toHaveBeenLastCalledWith([larger]);
    expect(tracker.getHeadPose()).toEqual(calculateHeadPose(larger, 640, 480));
    expect(tracker.getEyeDirection()).toBe(estimateEyeDirection(larger, 640, 480));
    tracker.stop();
  });

  it("immediately replaces a disappeared primary and clears data when all faces disappear", async () => {
    const primary = positionedFace(0.25, 0.8), companion = positionedFace(0.8, 0.4, 20);
    vision.detect.mockReturnValue({ faceLandmarks: [primary, companion] });
    const tracker = createFaceTracking({ allowed: true, onLandmarks, onError });
    await tracker.start();
    vision.detect.mockReturnValue({ faceLandmarks: [companion] });
    await vi.advanceTimersByTimeAsync(100);
    expect(onLandmarks).toHaveBeenLastCalledWith([companion]);
    expect(tracker.getHeadPose()).toEqual(calculateHeadPose(companion, 640, 480));
    expect(tracker.getPreviewFrame()?.primaryFaceIndex).toBe(0);
    vision.detect.mockReturnValue({ faceLandmarks: [] });
    await vi.advanceTimersByTimeAsync(100);
    expect(onLandmarks).toHaveBeenLastCalledWith([]);
    expect(tracker.getHeadPose()).toBeNull();
    expect(tracker.getEyeDirection()).toBeNull();
    expect(tracker.getPreviewFrame()).toEqual(expect.objectContaining({ detectedFaceCount: 0, primaryFaceIndex: null, landmarks: [] }));
    tracker.stop();
  });

  it("detects landmarks without timestamps and releases all resources on stop", async () => {
    const tracker = createFaceTracking({ allowed: true, onLandmarks, onError });
    await tracker.start();
    expect(getUserMedia).toHaveBeenCalledWith(expect.objectContaining({ audio: false }));
    expect(vision.create).toHaveBeenCalledWith({}, expect.objectContaining({
      runningMode: "IMAGE", numFaces: 3, outputFaceBlendshapes: false, outputFacialTransformationMatrixes: false,
    }));
    expect(vision.detect).toHaveBeenCalledWith(video);
    expect(onLandmarks).toHaveBeenLastCalledWith([frontFacingLandmarks()]);
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
    vision.detect.mockReturnValue({ faceLandmarks: [frontFacingLandmarks()] });
    const tracker = createFaceTracking({ allowed: true, onLandmarks, onError });
    await tracker.start();
    await vi.advanceTimersByTimeAsync(1999);
    expect(console.info).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(console.info).toHaveBeenCalledExactlyOnceWith("[Face tracking]", {
      cameraTrackingActive: true, faceDetected: true, landmarkCount: 478,
      yaw: 0, pitch: 0, roll: 0,
      estimatedEyeDirection: "center",
    });
    vision.detect.mockReturnValue({ faceLandmarks: [] });
    await vi.advanceTimersByTimeAsync(2000);
    expect(console.info).toHaveBeenLastCalledWith("[Face tracking]", {
      cameraTrackingActive: true, faceDetected: false, landmarkCount: 0,
      yaw: null, pitch: null, roll: null,
      estimatedEyeDirection: null,
    });
    expect(console.info).toHaveBeenCalledTimes(2);
    tracker.stop();
    expect(console.info).toHaveBeenLastCalledWith("[Face tracking]", {
      cameraTrackingActive: false, faceDetected: false, landmarkCount: 0,
      yaw: null, pitch: null, roll: null,
      estimatedEyeDirection: null,
    });
    await vi.advanceTimersByTimeAsync(4000);
    expect(console.info).toHaveBeenCalledTimes(4);
    expect(console.info).toHaveBeenCalledWith("[Face tracking] session recording completed", expect.objectContaining({
      sampleCount: 8, durationMs: 4000,
    }));
    expect(vi.getTimerCount()).toBe(0);
  });

  it("exposes current pose and clears it immediately on face loss and cleanup", async () => {
    const onHeadPose = vi.fn();
    vision.detect.mockReturnValue({ faceLandmarks: [frontFacingLandmarks()] });
    const tracker = createFaceTracking({ allowed: true, onLandmarks, onHeadPose, onError });
    await tracker.start();
    expect(tracker.getHeadPose()?.yaw).toBeCloseTo(0);
    expect(onHeadPose).toHaveBeenCalledWith(tracker.getHeadPose());
    vision.detect.mockReturnValue({ faceLandmarks: [] });
    await vi.advanceTimersByTimeAsync(100);
    expect(tracker.getHeadPose()).toBeNull();
    expect(onHeadPose).toHaveBeenLastCalledWith(null);
    vision.detect.mockReturnValue({ faceLandmarks: [frontFacingLandmarks()] });
    await vi.advanceTimersByTimeAsync(100);
    expect(tracker.getHeadPose()).not.toBeNull();
    tracker.stop();
    expect(tracker.getHeadPose()).toBeNull();
    expect(onHeadPose).toHaveBeenLastCalledWith(null);
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

  it("exposes approximate eye direction and clears it on unreliable eyes, face loss, and cleanup", async () => {
    const onEyeDirection = vi.fn();
    vision.detect.mockReturnValue({ faceLandmarks: [frontFacingLandmarks()] });
    const tracker = createFaceTracking({ allowed: true, onLandmarks, onEyeDirection, onError });
    await tracker.start();
    expect(tracker.getEyeDirection()).toBe("center");
    expect(onEyeDirection).toHaveBeenLastCalledWith("center");
    const closed = frontFacingLandmarks();
    closed[145] = closed[159];
    vision.detect.mockReturnValue({ faceLandmarks: [closed] });
    await vi.advanceTimersByTimeAsync(100);
    expect(tracker.getEyeDirection()).toBeNull();
    expect(onEyeDirection).toHaveBeenLastCalledWith(null);
    vision.detect.mockReturnValue({ faceLandmarks: [] });
    await vi.advanceTimersByTimeAsync(100);
    expect(tracker.getEyeDirection()).toBeNull();
    vision.detect.mockReturnValue({ faceLandmarks: [frontFacingLandmarks()] });
    await vi.advanceTimersByTimeAsync(100);
    expect(tracker.getEyeDirection()).toBe("center");
    tracker.stop();
    expect(tracker.getEyeDirection()).toBeNull();
    expect(onEyeDirection).toHaveBeenLastCalledWith(null);
  });

  it("finishes in-memory recording on scenario exit and never collects after cleanup", async () => {
    const onSessionComplete = vi.fn();
    vision.detect.mockReturnValue({ faceLandmarks: [frontFacingLandmarks()] });
    const tracker = createFaceTracking({ allowed: true, onLandmarks, onSessionComplete, onError });
    await tracker.start();
    await vi.advanceTimersByTimeAsync(1000);
    // This is the same stop method used by the hook's unmount/pagehide cleanup.
    tracker.stop();
    const completed = tracker.getCompletedSamples();
    expect(completed).toHaveLength(2);
    expect(completed.map((sample) => sample.timestamp)).toEqual([500, 1000]);
    expect(completed[0].yaw).toBeCloseTo(0);
    expect(completed[0].estimatedEyeDirection).toBe("center");
    expect(onSessionComplete).toHaveBeenCalledExactlyOnceWith(completed);
    await vi.advanceTimersByTimeAsync(2000);
    tracker.stop();
    expect(tracker.getCompletedSamples()).toEqual(completed);
    expect(onSessionComplete).toHaveBeenCalledTimes(1);
    expect(stopTrack).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
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
