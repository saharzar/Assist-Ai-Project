import type { FaceLandmarker } from "@mediapipe/tasks-vision";
import { FACE_LANDMARKER_OPTIONS, FACE_LANDMARKER_WASM_PATH } from "./faceLandmarkerConfig";
import { createPrimaryFaceSelector } from "./primaryFaceSelection";

export const FACE_START_CHECK_WINDOW_MS = 3000;
const MODEL_TIMEOUT_MS = 30_000;

function wait<T>(promise: Promise<T>, signal: AbortSignal, timeoutMs: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const cleanup = () => { clearTimeout(timer); signal.removeEventListener("abort", abort); };
    const abort = () => { cleanup(); reject(new DOMException("Face check cancelled", "AbortError")); };
    const timer = setTimeout(() => { cleanup(); reject(new Error("Face check timed out")); }, timeoutMs);
    signal.addEventListener("abort", abort, { once: true });
    promise.then((value) => { cleanup(); resolve(value); }, (error) => { cleanup(); reject(error); });
    if (signal.aborted) abort();
  });
}

function nextCheck(signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const abort = () => { clearTimeout(timer); reject(new DOMException("Face check cancelled", "AbortError")); };
    const timer = setTimeout(() => { signal.removeEventListener("abort", abort); resolve(); }, 100);
    signal.addEventListener("abort", abort, { once: true });
    if (signal.aborted) { signal.removeEventListener("abort", abort); abort(); }
  });
}

/** Start-only check using a detached video; never records or uploads frames. */
export async function checkFacePresence(stream: MediaStream, signal: AbortSignal): Promise<boolean> {
  let video: HTMLVideoElement | null = null;
  let landmarker: FaceLandmarker | null = null;
  try {
    const { FaceLandmarker, FilesetResolver } = await wait(import("@mediapipe/tasks-vision"), signal, MODEL_TIMEOUT_MS);
    const fileset = await wait(FilesetResolver.forVisionTasks(FACE_LANDMARKER_WASM_PATH), signal, MODEL_TIMEOUT_MS);
    const creating = FaceLandmarker.createFromOptions(fileset, FACE_LANDMARKER_OPTIONS);
    try {
      landmarker = await wait(creating, signal, MODEL_TIMEOUT_MS);
    } catch (error) {
      // A model may finish loading after cancellation/timeout; it must still be closed.
      void creating.then((instance) => instance.close(), () => {});
      throw error;
    }
    video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.srcObject = stream;
    await wait(video.play(), signal, FACE_START_CHECK_WINDOW_MS);
    const selector = createPrimaryFaceSelector();
    const deadline = performance.now() + FACE_START_CHECK_WINDOW_MS;
    while (!signal.aborted && performance.now() < deadline) {
      if (video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0
        && selector.update(landmarker.detect(video).faceLandmarks)) return true;
      await nextCheck(signal);
    }
    if (signal.aborted) throw new DOMException("Face check cancelled", "AbortError");
    return false;
  } finally {
    landmarker?.close();
    if (video) { video.pause(); video.srcObject = null; }
  }
}
