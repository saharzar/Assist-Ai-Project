import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createCameraAvailabilityChecker } from "./cameraAvailabilityService";
import { checkFacePresence } from "./facePresenceService";
vi.mock("./facePresenceService", () => ({ checkFacePresence: vi.fn() }));

let getUserMedia: ReturnType<typeof vi.fn>;
let track: { readyState: string; enabled: boolean; stop: ReturnType<typeof vi.fn> };
let stream: MediaStream;
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(checkFacePresence).mockResolvedValue(true);
  track = { readyState: "live", enabled: true, stop: vi.fn() };
  stream = { getVideoTracks: () => [track], getTracks: () => [track] } as unknown as MediaStream;
  getUserMedia = vi.fn().mockResolvedValue(stream);
  vi.stubGlobal("navigator", { mediaDevices: { getUserMedia } });
  vi.stubGlobal("fetch", vi.fn());
});
afterEach(() => vi.unstubAllGlobals());

describe("temporary browser camera validation", () => {
  it("keeps reporting camera unavailable on retry without loading face detection when there are no cameras", async () => {
    vi.stubGlobal("navigator", { mediaDevices: { getUserMedia, enumerateDevices: vi.fn().mockResolvedValue([]) } });
    const checker = createCameraAvailabilityChecker();
    expect(await checker.check()).toEqual({ available: false, reason: "no-camera" });
    expect(await checker.check()).toEqual({ available: false, reason: "no-camera" });
    expect(getUserMedia).not.toHaveBeenCalled();
    expect(checkFacePresence).not.toHaveBeenCalled();
  });
  it("does nothing until explicitly checked and requests video only", async () => {
    const checker = createCameraAvailabilityChecker();
    expect(getUserMedia).not.toHaveBeenCalled();
    expect(await checker.check()).toEqual({ available: true });
    expect(getUserMedia).toHaveBeenCalledExactlyOnceWith({
      audio: false, video: { width: { ideal: 640 }, height: { ideal: 480 } },
    });
    expect(track.stop).toHaveBeenCalledOnce();
    expect(checkFacePresence).toHaveBeenCalledWith(stream, expect.any(AbortSignal));
    expect(fetch).not.toHaveBeenCalled();
    expect(await checker.check()).toEqual({ available: true });
    expect(getUserMedia).toHaveBeenCalledOnce();
  });

  it.each([
    ["NotAllowedError", "permission-denied"], ["PermissionDeniedError", "permission-denied"],
    ["SecurityError", "permission-denied"], ["NotFoundError", "no-camera"],
    ["NotReadableError", "initialization-failed"], ["AbortError", "initialization-failed"],
  ])("classifies %s without sending diagnostics or frames to the backend", async (name, reason) => {
    getUserMedia.mockRejectedValueOnce(new DOMException("Camera failed", name));
    expect(await createCameraAvailabilityChecker().check()).toEqual({ available: false, reason });
    expect(checkFacePresence).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("reports unsupported browser camera APIs", async () => {
    vi.stubGlobal("navigator", {});
    expect(await createCameraAvailabilityChecker().check()).toEqual({ available: false, reason: "unsupported" });
    expect(getUserMedia).not.toHaveBeenCalled();
  });

  it.each(["ended", "disabled", "missing"])("rejects a %s video track and releases any acquired tracks", async (kind) => {
    if (kind === "ended") track.readyState = "ended";
    if (kind === "disabled") track.enabled = false;
    if (kind === "missing") getUserMedia.mockResolvedValueOnce({ getVideoTracks: () => [], getTracks: () => [track] });
    expect(await createCameraAvailabilityChecker().check()).toEqual({ available: false, reason: "no-camera" });
    expect(track.stop).toHaveBeenCalledOnce();
  });

  it("releases tracks even if inspecting them fails", async () => {
    getUserMedia.mockResolvedValueOnce({ getVideoTracks: () => { throw new Error("Device failed"); }, getTracks: () => [track] });
    expect(await createCameraAvailabilityChecker().check()).toEqual({ available: false, reason: "initialization-failed" });
    expect(track.stop).toHaveBeenCalledOnce();
  });

  it("shares an in-flight permission request and lets a failed check retry", async () => {
    let resolve!: (value: MediaStream) => void;
    getUserMedia.mockRejectedValueOnce(new DOMException("Blocked", "NotAllowedError"))
      .mockImplementationOnce(() => new Promise<MediaStream>((complete) => { resolve = complete; }));
    const checker = createCameraAvailabilityChecker();
    expect((await checker.check()).available).toBe(false);
    const first = checker.check(); const duplicate = checker.check();
    expect(first).toBe(duplicate);
    await vi.waitFor(() => expect(getUserMedia).toHaveBeenCalledTimes(2));
    expect(getUserMedia).toHaveBeenCalledTimes(2);
    resolve(stream);
    expect(await first).toEqual({ available: true });
    expect(track.stop).toHaveBeenCalledOnce();
  });

  it("fails when no face is visible and retries the camera and face together", async () => {
    vi.mocked(checkFacePresence).mockResolvedValueOnce(false);
    const checker = createCameraAvailabilityChecker();
    expect(await checker.check()).toEqual({ available: false, reason: "face-not-detected" });
    expect(track.stop).toHaveBeenCalledOnce();
    expect(await checker.check()).toEqual({ available: true });
    expect(getUserMedia).toHaveBeenCalledTimes(2);
    expect(track.stop).toHaveBeenCalledTimes(2);
  });

  it("handles face-model initialization failure and releases the camera", async () => {
    vi.mocked(checkFacePresence).mockRejectedValueOnce(new Error("Model unavailable"));
    expect(await createCameraAvailabilityChecker().check()).toEqual({ available: false, reason: "face-check-failed" });
    expect(track.stop).toHaveBeenCalledOnce();
  });

  it("reports camera loss as a camera problem, even during the face check", async () => {
    vi.mocked(checkFacePresence).mockImplementationOnce(async () => { track.readyState = "ended"; return false; });
    expect(await createCameraAvailabilityChecker().check()).toEqual({ available: false, reason: "no-camera" });
    expect(track.stop).toHaveBeenCalledOnce();
  });

  it("releases a late permission grant after cancellation without initializing face detection", async () => {
    let grant!: (value: MediaStream) => void;
    getUserMedia.mockImplementationOnce(() => new Promise<MediaStream>((resolve) => { grant = resolve; }));
    const checker = createCameraAvailabilityChecker();
    const checking = checker.check(); checker.cancel(); grant(stream);
    expect((await checking).available).toBe(false);
    expect(track.stop).toHaveBeenCalledOnce();
    expect(checkFacePresence).not.toHaveBeenCalled();
  });
});
