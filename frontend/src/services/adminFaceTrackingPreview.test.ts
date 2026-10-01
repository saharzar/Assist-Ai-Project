import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { authorizeAdminPreview, createAdminFaceTrackingPreview, type PreviewSummary } from "./adminFaceTrackingPreview";
import { apiRequest } from "./api";
import type { FaceTrackingPreviewFrame } from "./faceTrackingService";

vi.mock("./api", () => ({ apiRequest: vi.fn() }));

describe("local admin preview", () => {
  let context: { clearRect: ReturnType<typeof vi.fn>; drawImage: ReturnType<typeof vi.fn>;
    beginPath: ReturnType<typeof vi.fn>; moveTo: ReturnType<typeof vi.fn>; arc: ReturnType<typeof vi.fn>;
    fill: ReturnType<typeof vi.fn>; fillStyle: string };
  let canvas: HTMLCanvasElement;
  let frame: FaceTrackingPreviewFrame;
  let getFrame: ReturnType<typeof vi.fn<() => FaceTrackingPreviewFrame | null>>;
  let onUpdate: ReturnType<typeof vi.fn<(summary: PreviewSummary) => void>>;
  let onUnavailable: ReturnType<typeof vi.fn<() => void>>;

  beforeEach(() => {
    vi.useFakeTimers(); vi.clearAllMocks();
    context = { clearRect: vi.fn(), drawImage: vi.fn(), beginPath: vi.fn(), moveTo: vi.fn(), arc: vi.fn(), fill: vi.fn(), fillStyle: "" };
    canvas = { width: 640, height: 480, getContext: () => context } as unknown as HTMLCanvasElement;
    frame = { video: { videoWidth: 640, videoHeight: 480 } as HTMLVideoElement,
      landmarks: [{ x: 0.5, y: 0.25, z: 0, visibility: 1 }], headPose: { yaw: 10, pitch: -5, roll: 2 },
      estimatedEyeDirection: "left", isUserInteracting: true };
    getFrame = vi.fn(() => frame); onUpdate = vi.fn(); onUnavailable = vi.fn();
  });
  afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });
  const options = () => ({ token: "admin-token", canvas, getFrame, onUpdate, onUnavailable });

  it("checks the backend with explicit credentials instead of a cached role", async () => {
    vi.mocked(apiRequest).mockResolvedValue({ allowed: true });
    await expect(authorizeAdminPreview("verified-token")).resolves.toBe(true);
    expect(apiRequest).toHaveBeenCalledWith("/api/admin/computer-vision-preview", {
      auth: false, headers: { Authorization: "Bearer verified-token" },
    });
  });

  it.each([false, "rejected"])("cannot read or draw frames when authorization is %s", async (result) => {
    const authorize = result === false ? vi.fn().mockResolvedValue(false) : vi.fn().mockRejectedValue(new Error("403"));
    const preview = createAdminFaceTrackingPreview({ ...options(), authorize });
    await preview.start();
    await vi.advanceTimersByTimeAsync(1000);
    expect(getFrame).not.toHaveBeenCalled(); expect(context.drawImage).not.toHaveBeenCalled();
    expect(onUnavailable).toHaveBeenCalledOnce(); expect(vi.getTimerCount()).toBe(0);
  });

  it("draws the existing video and landmarks, with a small derived summary", async () => {
    const authorize = vi.fn().mockResolvedValue(true);
    const preview = createAdminFaceTrackingPreview({ ...options(), authorize });
    await preview.start(); await preview.start();
    expect(authorize).toHaveBeenCalledOnce();
    expect(context.drawImage).toHaveBeenCalledWith(frame.video, 0, 0, 640, 480);
    expect(context.arc).toHaveBeenCalledWith(320, 120, 1.5, 0, 2 * Math.PI);
    expect(onUpdate).toHaveBeenCalledWith({ cameraTrackingActive: true, faceDetected: true, landmarkCount: 1,
      headPose: frame.headPose, estimatedEyeDirection: "left", isUserInteracting: true });
    expect(onUpdate.mock.calls[0][0]).not.toHaveProperty("video");
    expect(onUpdate.mock.calls[0][0]).not.toHaveProperty("landmarks");
    preview.stop(); expect(vi.getTimerCount()).toBe(0);
  });

  it("OFF clears and cancels rendering without affecting the source video", async () => {
    const pause = vi.fn(); Object.assign(frame.video, { pause });
    const preview = createAdminFaceTrackingPreview({ ...options(), authorize: async () => true });
    await preview.start(); preview.stop(); preview.stop();
    const count = context.drawImage.mock.calls.length;
    await vi.advanceTimersByTimeAsync(1000);
    expect(context.drawImage).toHaveBeenCalledTimes(count);
    expect(context.clearRect).toHaveBeenLastCalledWith(0, 0, 640, 480);
    expect(pause).not.toHaveBeenCalled();
    expect(frame.video).not.toHaveProperty("srcObject");
  });

  it("does not render after unmount during the authorization request", async () => {
    let resolve!: (value: boolean) => void;
    const preview = createAdminFaceTrackingPreview({ ...options(), authorize: () => new Promise((done) => { resolve = done; }) });
    const start = preview.start(); preview.stop(); resolve(true); await start;
    expect(getFrame).not.toHaveBeenCalled(); expect(onUnavailable).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("clears unavailable frames and does not display stale measurements", async () => {
    getFrame.mockReturnValue(null);
    const preview = createAdminFaceTrackingPreview({ ...options(), authorize: async () => true });
    await preview.start();
    expect(context.drawImage).not.toHaveBeenCalled();
    expect(onUpdate).toHaveBeenCalledWith({ cameraTrackingActive: false, faceDetected: false, landmarkCount: 0,
      headPose: null, estimatedEyeDirection: null, isUserInteracting: false });
    preview.stop();
  });

  it("a canvas failure is isolated from scenario tracking", async () => {
    context.drawImage.mockImplementation(() => { throw new Error("canvas unavailable"); });
    const preview = createAdminFaceTrackingPreview({ ...options(), authorize: async () => true });
    await expect(preview.start()).resolves.toBeUndefined();
    expect(onUnavailable).toHaveBeenCalledOnce(); expect(vi.getTimerCount()).toBe(0);
  });
});
