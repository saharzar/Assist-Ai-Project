import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { openBrowserCamera } from "./browserCamera";

const device = (deviceId: string, label: string, kind = "videoinput") => ({ deviceId, label, kind });
let enumerateDevices: ReturnType<typeof vi.fn>;
let getUserMedia: ReturnType<typeof vi.fn>;
let stop: ReturnType<typeof vi.fn>;
let track: { label: string; stop: ReturnType<typeof vi.fn> };
beforeEach(() => {
  stop = vi.fn(); track = { label: "Integrated webcam", stop };
  enumerateDevices = vi.fn().mockResolvedValue([device("pc", "Integrated webcam")]);
  getUserMedia = vi.fn().mockResolvedValue({ getVideoTracks: () => [track], getTracks: () => [track] });
  vi.stubGlobal("navigator", { mediaDevices: { enumerateDevices, getUserMedia } });
});
afterEach(() => vi.unstubAllGlobals());

describe("browser camera selection", () => {
  it("checks device presence before requesting camera access", async () => {
    enumerateDevices.mockResolvedValue([device("mic", "Microphone", "audioinput")]);
    await expect(openBrowserCamera()).rejects.toMatchObject({ name: "NotFoundError" });
    expect(getUserMedia).not.toHaveBeenCalled();
  });
  it("prefers the PC webcam over a default phone bridge and uses its exact ID", async () => {
    enumerateDevices.mockResolvedValue([device("phone", "Windows Virtual Camera"), device("pc", "Integrated webcam")]);
    await openBrowserCamera();
    expect(getUserMedia).toHaveBeenCalledExactlyOnceWith({ audio: false,
      video: { deviceId: { exact: "pc" }, width: { ideal: 640 }, height: { ideal: 480 } } });
  });
  it("does not open recognizable phone-only cameras", async () => {
    enumerateDevices.mockResolvedValue([device("phone", "Phone Link")]);
    await expect(openBrowserCamera()).rejects.toMatchObject({ name: "NotFoundError" });
    expect(getUserMedia).not.toHaveBeenCalled();
  });
  it("supports unnamed cameras before permission and releases a revealed phone bridge", async () => {
    enumerateDevices.mockResolvedValue([device("hidden", "")]);
    track.label = "DroidCam";
    await expect(openBrowserCamera()).rejects.toMatchObject({ name: "NotFoundError" });
    expect(stop).toHaveBeenCalledOnce();
  });
  it("does not fall back to another device if the selected webcam fails", async () => {
    getUserMedia.mockRejectedValue(new DOMException("Disconnected", "NotFoundError"));
    await expect(openBrowserCamera()).rejects.toMatchObject({ name: "NotFoundError" });
    expect(getUserMedia).toHaveBeenCalledOnce();
  });
  it("does not open a camera when navigation cancels device enumeration", async () => {
    const controller = new AbortController(); controller.abort();
    await expect(openBrowserCamera(controller.signal)).rejects.toMatchObject({ name: "AbortError" });
    expect(getUserMedia).not.toHaveBeenCalled();
  });
});
