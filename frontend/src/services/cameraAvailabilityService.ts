export type CameraAvailability = { available: true } | {
  available: false;
  reason: "permission-denied" | "no-camera" | "unsupported" | "initialization-failed";
};

async function probeCamera(): Promise<CameraAvailability> {
  if (!navigator.mediaDevices?.getUserMedia) return { available: false, reason: "unsupported" };
  let stream: MediaStream | null = null;
  try {
    // Match the scenario tracker's camera preferences without starting MediaPipe.
    stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
    });
    const usable = stream.getVideoTracks().some((track) => track.readyState === "live" && track.enabled);
    return usable ? { available: true } : { available: false, reason: "no-camera" };
  } catch (error) {
    const name = typeof error === "object" && error !== null && "name" in error ? error.name : "";
    const reason = ["NotAllowedError", "PermissionDeniedError", "SecurityError"].includes(String(name))
      ? "permission-denied"
      : ["NotFoundError", "DevicesNotFoundError"].includes(String(name)) ? "no-camera" : "initialization-failed";
    return { available: false, reason };
  } finally {
    // This is only a capability check: never attach media to video/canvas or keep a stream.
    stream?.getTracks().forEach((track) => track.stop());
  }
}

/** One checker per scenario Start flow. Share pending probes and allow failed checks to retry. */
export function createCameraAvailabilityChecker() {
  let confirmed = false;
  let pending: Promise<CameraAvailability> | null = null;
  return {
    check(): Promise<CameraAvailability> {
      if (confirmed) return Promise.resolve({ available: true });
      if (pending) return pending;
      pending = probeCamera().then((result) => {
        confirmed = result.available;
        return result;
      }).finally(() => { pending = null; });
      return pending;
    },
  };
}
