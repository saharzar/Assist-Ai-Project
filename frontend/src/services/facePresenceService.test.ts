import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { checkFacePresence, FACE_START_CHECK_WINDOW_MS } from "./facePresenceService";

const vision = vi.hoisted(() => ({ resolve: vi.fn(), create: vi.fn(), detect: vi.fn(), close: vi.fn() }));
vi.mock("@mediapipe/tasks-vision", () => ({ FilesetResolver: { forVisionTasks: vision.resolve },
  FaceLandmarker: { createFromOptions: vision.create } }));
const face = [[{ x: 0.3, y: 0.3, z: 0 }, { x: 0.7, y: 0.3, z: 0 }, { x: 0.5, y: 0.7, z: 0 }]];
let video: HTMLVideoElement;
let stream: MediaStream;
let controller: AbortController;
beforeEach(() => {
  vi.useFakeTimers(); vi.resetAllMocks();
  controller = new AbortController();
  stream = {} as MediaStream;
  video = { readyState: 2, videoWidth: 640, videoHeight: 480, muted: false, playsInline: false,
    srcObject: null, play: vi.fn().mockResolvedValue(undefined), pause: vi.fn() } as unknown as HTMLVideoElement;
  vi.stubGlobal("document", { createElement: vi.fn(() => video) });
  vision.resolve.mockResolvedValue({});
  vision.create.mockResolvedValue({ detect: vision.detect, close: vision.close });
  vision.detect.mockReturnValue({ faceLandmarks: face });
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

describe("start-only face presence", () => {
  it("detects a geometric face locally and releases the model and detached video", async () => {
    expect(await checkFacePresence(stream, controller.signal)).toBe(true);
    expect(document.createElement).toHaveBeenCalledExactlyOnceWith("video");
    expect(video.muted).toBe(true); expect(video.playsInline).toBe(true);
    expect(vision.create).toHaveBeenCalledWith({}, expect.objectContaining({ runningMode: "IMAGE", numFaces: 3 }));
    expect(vision.detect).toHaveBeenCalledExactlyOnceWith(video);
    expect(vision.close).toHaveBeenCalledOnce();
    expect(video.pause).toHaveBeenCalledOnce(); expect(video.srcObject).toBeNull();
    expect(vi.getTimerCount()).toBe(0);
    await vi.advanceTimersByTimeAsync(5000);
    expect(vision.detect).toHaveBeenCalledOnce();
  });

  it.each([{ landmarks: [] }, { landmarks: [[{ x: 0.5, y: 0.5, z: 0 }]] }])("returns false if no usable face appears during the check window: %j", async ({ landmarks }) => {
    vision.detect.mockReturnValue({ faceLandmarks: landmarks });
    const checking = checkFacePresence(stream, controller.signal);
    await vi.waitFor(() => expect(vision.detect).toHaveBeenCalled());
    await vi.advanceTimersByTimeAsync(FACE_START_CHECK_WINDOW_MS);
    expect(await checking).toBe(false);
    expect(vision.close).toHaveBeenCalledOnce();
    expect(video.srcObject).toBeNull(); expect(vi.getTimerCount()).toBe(0);
  });

  it("allows a face to appear after several unavailable detections", async () => {
    vision.detect.mockReturnValue({ faceLandmarks: [] });
    const checking = checkFacePresence(stream, controller.signal);
    await vi.waitFor(() => expect(vision.detect).toHaveBeenCalled());
    await vi.advanceTimersByTimeAsync(500);
    vision.detect.mockReturnValue({ faceLandmarks: face });
    await vi.advanceTimersByTimeAsync(100);
    expect(await checking).toBe(true);
    expect(vision.close).toHaveBeenCalledOnce(); expect(vi.getTimerCount()).toBe(0);
  });

  it("waits for camera image readiness before inference", async () => {
    Object.assign(video, { readyState: 1, videoWidth: 0 });
    const checking = checkFacePresence(stream, controller.signal);
    await vi.waitFor(() => expect(video.play).toHaveBeenCalled());
    await vi.advanceTimersByTimeAsync(200);
    expect(vision.detect).not.toHaveBeenCalled();
    Object.assign(video, { readyState: 2, videoWidth: 640 });
    await vi.advanceTimersByTimeAsync(100);
    expect(await checking).toBe(true);
  });

  it("cancels pending detection on exit and removes all timers", async () => {
    vision.detect.mockReturnValue({ faceLandmarks: [] });
    const checking = checkFacePresence(stream, controller.signal);
    await vi.waitFor(() => expect(vision.detect).toHaveBeenCalled());
    const rejected = expect(checking).rejects.toMatchObject({ name: "AbortError" });
    controller.abort(); await rejected;
    expect(vision.close).toHaveBeenCalledOnce(); expect(video.srcObject).toBeNull();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("closes a model that finishes loading after exit", async () => {
    let loaded!: (value: unknown) => void;
    vision.create.mockImplementationOnce(() => new Promise((resolve) => { loaded = resolve; }));
    const checking = checkFacePresence(stream, controller.signal);
    await vi.waitFor(() => expect(vision.create).toHaveBeenCalled());
    const rejected = expect(checking).rejects.toMatchObject({ name: "AbortError" });
    controller.abort(); await rejected;
    loaded({ detect: vision.detect, close: vision.close }); await Promise.resolve();
    expect(vision.close).toHaveBeenCalledOnce(); expect(document.createElement).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("times out stalled model initialization and still closes a late model", async () => {
    let loaded!: (value: unknown) => void;
    vision.create.mockImplementationOnce(() => new Promise((resolve) => { loaded = resolve; }));
    const checking = checkFacePresence(stream, controller.signal);
    await vi.waitFor(() => expect(vision.create).toHaveBeenCalled());
    const rejected = expect(checking).rejects.toThrow("timed out");
    await vi.advanceTimersByTimeAsync(30_000); await rejected;
    loaded({ detect: vision.detect, close: vision.close }); await Promise.resolve();
    expect(vision.close).toHaveBeenCalledOnce(); expect(vi.getTimerCount()).toBe(0);
  });

  it("cleans up if video playback or inference fails", async () => {
    vision.detect.mockImplementationOnce(() => { throw new Error("Detection failed"); });
    await expect(checkFacePresence(stream, controller.signal)).rejects.toThrow("Detection failed");
    expect(vision.close).toHaveBeenCalledOnce(); expect(video.srcObject).toBeNull();
    expect(vi.getTimerCount()).toBe(0);
  });
});
