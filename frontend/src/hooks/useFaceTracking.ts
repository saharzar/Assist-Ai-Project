import { useCallback, useEffect, useRef } from "react";
import type { NormalizedLandmark } from "@mediapipe/tasks-vision";
import { readComputerVisionConsent } from "../lib/computerVisionConsent";
import { createFaceTracking } from "../services/faceTrackingService";
import type { HeadPose } from "../services/headPose";
import type { EyeDirection } from "../services/eyeDirection";
import type { TrackingSample } from "../services/trackingSessionRecorder";
import { useAuth } from "../context/AuthContext";
import { createComputerVisionSessionSubmission, type ComputerVisionScenario, type ScenarioAttemptId } from "../services/computerVisionSessionService";

export function useFaceTracking(scenario: ComputerVisionScenario, active: boolean, getAttemptId?: () => ScenarioAttemptId) {
  const { token, guestSessionToken } = useAuth();
  const attemptGetterRef = useRef(getAttemptId);
  attemptGetterRef.current = getAttemptId;
  const landmarksRef = useRef<NormalizedLandmark[][]>([]);
  const headPoseRef = useRef<HeadPose | null>(null);
  const eyeDirectionRef = useRef<EyeDirection | null>(null);
  const completedSamplesRef = useRef<TrackingSample[]>([]);
  const getCompletedSamples = useCallback(
    () => completedSamplesRef.current.map((sample) => ({ ...sample })),
    [],
  );

  useEffect(() => {
    if (!active) return;
    completedSamplesRef.current = [];
    if (readComputerVisionConsent(scenario) !== true) return;

    // Capture the credentials of the session owner before logout/navigation cleanup.
    const headers: Record<string, string> = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    else if (guestSessionToken) headers["X-Guest-Session-Token"] = guestSessionToken;
    const submission = createComputerVisionSessionSubmission({
      allowed: true, scenario, headers, getAttemptId: () => attemptGetterRef.current?.() ?? null,
    });

    const tracker = createFaceTracking({
      allowed: true,
      onLandmarks: (landmarks) => { landmarksRef.current = landmarks; },
      onHeadPose: (pose) => { headPoseRef.current = pose; },
      onEyeDirection: (direction) => { eyeDirectionRef.current = direction; },
      onSessionComplete: (samples) => {
        completedSamplesRef.current = samples;
        void submission.finish(samples);
      },
      onError: () => { console.warn("Face tracking is unavailable. The scenario can continue."); },
    });
    // Defer to avoid a duplicate permission request during StrictMode's effect replay.
    const startTimer = window.setTimeout(() => { submission.start(); void tracker.start(); }, 0);
    const stop = () => {
      window.clearTimeout(startTimer);
      tracker.stop();
    };
    window.addEventListener("pagehide", stop);
    return () => {
      window.removeEventListener("pagehide", stop);
      stop();
    };
  }, [scenario, active, token, guestSessionToken]);

  return { landmarksRef, headPoseRef, eyeDirectionRef, getCompletedSamples };
}
