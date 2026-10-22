import { checkFacePresence } from "./facePresenceService";
import { openBrowserCamera } from "./browserCamera";

export type CameraAvailabilityFailureReason = "permission-denied" | "no-camera" | "unsupported" | "initialization-failed"
  | "face-not-detected" | "face-check-failed";
export type CameraAvailability = { available: true } | {
  available: false;
  reason: CameraAvailabilityFailureReason;
};

async function probeCamera(signal: AbortSignal): Promise<CameraAvailability> {
  if (!navigator.mediaDevices?.getUserMedia) return { available: false, reason: "unsupported" };
  let stream: MediaStream | null = null;
  let checkingFace = false;
  try {
    // The preflight shares this temporary stream with the start-only face check.
    stream = await openBrowserCamera(signal);
    if (signal.aborted) return { available: false, reason: "initialization-failed" };
    const usable = stream.getVideoTracks().some((track) => track.readyState === "live" && track.enabled);
    if (!usable) return { available: false, reason: "no-camera" };
    checkingFace = true;
    const faceDetected = await checkFacePresence(stream, signal);
    if (!stream.getVideoTracks().some((track) => track.readyState === "live" && track.enabled)) {
      return { available: false, reason: "no-camera" };
    }
    return faceDetected
      ? { available: true } : { available: false, reason: "face-not-detected" };
  } catch (error) {
    const name = typeof error === "object" && error !== null && "name" in error ? error.name : "";
    if (checkingFace) {
      const cameraLost = !stream?.getVideoTracks().some((track) => track.readyState === "live" && track.enabled);
      return { available: false, reason: cameraLost ? "no-camera" : "face-check-failed" };
    }
    const reason = ["NotAllowedError", "PermissionDeniedError", "SecurityError"].includes(String(name))
      ? "permission-denied"
      : ["NotFoundError", "DevicesNotFoundError"].includes(String(name)) ? "no-camera" : "initialization-failed";
    return { available: false, reason };
  } finally {
    // The detached preflight video/model are closed before this stream is released.
    stream?.getTracks().forEach((track) => track.stop());
  }
}

/** One checker per scenario Start flow. Share pending probes and allow failed checks to retry. */
export function createCameraAvailabilityChecker() {
  let confirmed = false;
  let pending: Promise<CameraAvailability> | null = null;
  const controller = new AbortController();
  return {
    check(): Promise<CameraAvailability> {
      if (controller.signal.aborted) return Promise.resolve({ available: false, reason: "initialization-failed" });
      if (confirmed) return Promise.resolve({ available: true });
      if (pending) return pending;
      pending = probeCamera(controller.signal).then((result) => {
        confirmed = result.available;
        return result;
      }).finally(() => { pending = null; });
      return pending;
    },
    cancel() { controller.abort(); },
  };
}
