import type { FaceLandmarker, NormalizedLandmark } from "@mediapipe/tasks-vision";

const WASM_PATH = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm";
const MODEL_PATH = "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";

type FaceTrackingOptions = {
  allowed: boolean;
  onLandmarks: (landmarks: NormalizedLandmark[][]) => void;
  onError: (error: unknown) => void;
};

/** Browser-only prototype: keeps just the latest landmarks, with no recording. */
export function createFaceTracking({ allowed, onLandmarks, onError }: FaceTrackingOptions) {
  let stopped = false;
  let started = false;
  let stream: MediaStream | null = null;
  let video: HTMLVideoElement | null = null;
  let landmarker: FaceLandmarker | null = null;
  let frameTimer: ReturnType<typeof setTimeout> | null = null;

  function stop() {
    if (stopped) return;
    stopped = true;
    if (frameTimer !== null) clearTimeout(frameTimer);
    stream?.getTracks().forEach((track) => track.stop());
    stream = null;
    if (video) {
      video.pause();
      video.srcObject = null;
      video = null;
    }
    landmarker?.close();
    landmarker = null;
    onLandmarks([]);
  }

  function fail(error: unknown) {
    if (stopped) return;
    stop();
    onError(error);
  }

  function detectFrame() {
    if (stopped || !video || !landmarker) return;
    try {
      if (video.readyState >= 2 && video.videoWidth > 0) {
        // IMAGE mode avoids application timestamps. No pose or eye calculations.
        onLandmarks(landmarker.detect(video).faceLandmarks);
      }
      // Limit inference frequency because this minimal prototype runs on the UI thread.
      frameTimer = setTimeout(detectFrame, 100);
    } catch (error) {
      fail(error);
    }
  }

  async function start() {
    if (!allowed || stopped || started) return;
    started = true;
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
      // The video is never attached to the DOM: no preview or tracking overlay.
      video = document.createElement("video");
      video.muted = true;
      video.playsInline = true;
      video.srcObject = camera;
      await video.play();
      if (!stopped) detectFrame();
    } catch (error) {
      fail(error);
    }
  }

  return { start, stop };
}
