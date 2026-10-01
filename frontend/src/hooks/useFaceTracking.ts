import { useEffect, useRef } from "react";
import type { NormalizedLandmark } from "@mediapipe/tasks-vision";
import { readComputerVisionConsent } from "../lib/computerVisionConsent";
import { createFaceTracking } from "../services/faceTrackingService";

export function useFaceTracking(scenario: string, active: boolean) {
  const landmarksRef = useRef<NormalizedLandmark[][]>([]);

  useEffect(() => {
    if (!active || readComputerVisionConsent(scenario) !== true) return;

    const tracker = createFaceTracking({
      allowed: true,
      onLandmarks: (landmarks) => { landmarksRef.current = landmarks; },
      onError: () => { console.warn("Face tracking is unavailable. The scenario can continue."); },
    });
    // Defer to avoid a duplicate permission request during StrictMode's effect replay.
    const startTimer = window.setTimeout(() => { void tracker.start(); }, 0);
    const stop = () => {
      window.clearTimeout(startTimer);
      tracker.stop();
    };
    window.addEventListener("pagehide", stop);
    return () => {
      window.removeEventListener("pagehide", stop);
      stop();
    };
  }, [scenario, active]);

  return landmarksRef;
}
