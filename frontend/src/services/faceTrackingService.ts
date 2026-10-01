import type { FaceLandmarker, NormalizedLandmark } from "@mediapipe/tasks-vision";
import { createHeadPoseEstimator, type HeadPose } from "./headPose";
import { createEyeDirectionEstimator, type EyeDirection } from "./eyeDirection";
import { createTrackingSessionRecorder, type TrackingSample } from "./trackingSessionRecorder";

const WASM_PATH = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm";
const MODEL_PATH = "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";

type FaceTrackingOptions = {
  allowed: boolean;
  onLandmarks: (landmarks: NormalizedLandmark[][]) => void;
  onHeadPose?: (pose: HeadPose | null) => void;
  onEyeDirection?: (direction: EyeDirection | null) => void;
  onSessionComplete?: (samples: TrackingSample[]) => void;
  onError: (error: unknown) => void;
};

/** Browser-only prototype: records derived values in memory, never raw media. */
export function createFaceTracking({ allowed, onLandmarks, onHeadPose, onEyeDirection, onSessionComplete, onError }: FaceTrackingOptions) {
  const recorder = createTrackingSessionRecorder(allowed);
  const poseEstimator = createHeadPoseEstimator();
  const eyeEstimator = createEyeDirectionEstimator();
  let headPose: HeadPose | null = null;
  let eyeDirection: EyeDirection | null = null;
  let stopped = false;
  let started = false;
  let stream: MediaStream | null = null;
  let video: HTMLVideoElement | null = null;
  let landmarker: FaceLandmarker | null = null;
  let frameTimer: ReturnType<typeof setTimeout> | null = null;
  let debugTimer: ReturnType<typeof setInterval> | null = null;
  let landmarkCount = 0;

  function stop() {
    if (stopped) return;
    stopped = true;
    const completedSamples = recorder.stop();
    if (frameTimer !== null) clearTimeout(frameTimer);
    const wasDebugging = debugTimer !== null;
    if (debugTimer !== null) clearInterval(debugTimer);
    debugTimer = null;
    stream?.getTracks().forEach((track) => track.stop());
    stream = null;
    if (video) {
      video.pause();
      video.srcObject = null;
      video = null;
    }
    landmarker?.close();
    landmarker = null;
    landmarkCount = 0;
    poseEstimator.reset();
    headPose = null;
    eyeEstimator.reset();
    eyeDirection = null;
    onLandmarks([]);
    onHeadPose?.(null);
    onEyeDirection?.(null);
    if (started && allowed) onSessionComplete?.(completedSamples);
    if (import.meta.env.DEV && wasDebugging) {
      console.info("[Face tracking]", {
        cameraTrackingActive: false, faceDetected: false, landmarkCount: 0,
        yaw: null, pitch: null, roll: null,
        estimatedEyeDirection: null,
      });
    }
  }

  function fail(error: unknown, stage: "camera" | "initialization" | "playback" | "inference") {
    if (stopped) return;
    if (import.meta.env.DEV) {
      const name = error instanceof Error ? error.name : "UnknownError";
      const reason = stage === "camera"
        ? ["NotAllowedError", "PermissionDeniedError", "SecurityError"].includes(name)
          ? "Camera permission denied"
          : ["NotFoundError", "DevicesNotFoundError"].includes(name)
            ? "No camera available"
            : "Camera unavailable"
        : stage === "initialization" ? "MediaPipe initialization failed"
        : stage === "playback" ? "Camera playback failed" : "MediaPipe detection failed";
      console.warn(`[Face tracking] ${reason}. The scenario can continue.`, { stage, errorName: name });
    }
    stop();
    onError(error);
  }

  function detectFrame() {
    if (stopped || !video || !landmarker) return;
    try {
      if (video.readyState >= 2 && video.videoWidth > 0) {
        // IMAGE mode does not require inference timestamps; the recorder samples separately.
        const landmarks = landmarker.detect(video).faceLandmarks;
        headPose = poseEstimator.update(landmarks[0], video.videoWidth, video.videoHeight);
        eyeDirection = eyeEstimator.update(landmarks[0], video.videoWidth, video.videoHeight);
        recorder.update({
          yaw: headPose?.yaw ?? null, pitch: headPose?.pitch ?? null, roll: headPose?.roll ?? null,
          estimatedEyeDirection: eyeDirection,
        });
        if (import.meta.env.DEV) landmarkCount = landmarks[0]?.length ?? 0;
        onLandmarks(landmarks);
        onHeadPose?.(headPose);
        onEyeDirection?.(eyeDirection);
      }
      // Limit inference frequency because this minimal prototype runs on the UI thread.
      frameTimer = setTimeout(detectFrame, 100);
    } catch (error) {
      fail(error, "inference");
    }
  }

  async function start() {
    if (!allowed || stopped || started) return;
    started = true;
    recorder.start();
    let stage: "camera" | "initialization" | "playback" = "camera";
    try {
      const camera = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
      });
      // Permission can resolve after the scenario has already been left.
      if (stopped) {
        camera.getTracks().forEach((track) => track.stop());
        return;
      }
      stream = camera;
      stage = "initialization";
      const { FaceLandmarker, FilesetResolver } = await import("@mediapipe/tasks-vision");
      if (stopped) return;
      const fileset = await FilesetResolver.forVisionTasks(WASM_PATH);
      if (stopped) return;
      const instance = await FaceLandmarker.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: MODEL_PATH },
        runningMode: "IMAGE",
        numFaces: 1,
        outputFaceBlendshapes: false,
        outputFacialTransformationMatrixes: false,
      });
      if (stopped) {
        instance.close();
        return;
      }
      landmarker = instance;
      stage = "playback";
      // The video is never attached to the DOM: no preview or tracking overlay.
      video = document.createElement("video");
      video.muted = true;
      video.playsInline = true;
      video.srcObject = camera;
      await video.play();
      if (!stopped) {
        detectFrame();
        if (import.meta.env.DEV && !stopped) {
          // Temporary verification only; this entire block is removed in production.
          debugTimer = setInterval(() => {
            console.info("[Face tracking]", {
              cameraTrackingActive: stream?.getTracks().some((track) => track.kind === "video" && track.readyState === "live") ?? false,
              faceDetected: landmarkCount > 0,
              landmarkCount,
              yaw: headPose ? Number(headPose.yaw.toFixed(1)) : null,
              pitch: headPose ? Number(headPose.pitch.toFixed(1)) : null,
              roll: headPose ? Number(headPose.roll.toFixed(1)) : null,
              estimatedEyeDirection: eyeDirection,
            });
          }, 2000);
        }
      }
    } catch (error) {
      fail(error, stage);
    }
  }

  return {
    start, stop, getHeadPose: () => headPose, getEyeDirection: () => eyeDirection,
    getCompletedSamples: recorder.getCompletedSamples,
  };
}
