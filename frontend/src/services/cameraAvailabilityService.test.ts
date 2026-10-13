import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createCameraAvailabilityChecker } from "./cameraAvailabilityService";

let getUserMedia: ReturnType<typeof vi.fn>;
let track: { readyState: string; enabled: boolean; stop: ReturnType<typeof vi.fn> };
let stream: MediaStream;
beforeEach(() => {
  track = { readyState: "live", enabled: true, stop: vi.fn() };
  stream = { getVideoTracks: () => [track], getTracks: () => [track] } as unknown as MediaStream;
  getUserMedia = vi.fn().mockResolvedValue(stream);
  vi.stubGlobal("navigator", { mediaDevices: { getUserMedia } });
  vi.stubGlobal("fetch", vi.fn());
});
afterEach(() => vi.unstubAllGlobals());

describe("temporary browser camera validation", () => {
  it("does nothing until explicitly checked and requests video only", async () => {
    const checker = createCameraAvailabilityChecker();
    expect(getUserMedia).not.toHaveBeenCalled();
    expect(await checker.check()).toEqual({ available: true });
    expect(getUserMedia).toHaveBeenCalledExactlyOnceWith({
      audio: false, video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
    });
    expect(track.stop).toHaveBeenCalledOnce();
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
    expect(getUserMedia).toHaveBeenCalledTimes(2);
    resolve(stream);
    expect(await first).toEqual({ available: true });
    expect(track.stop).toHaveBeenCalledOnce();
  });
});
