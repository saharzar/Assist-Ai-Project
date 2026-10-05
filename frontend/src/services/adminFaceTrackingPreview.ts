import { apiRequest } from "./api";
import type { FaceTrackingPreviewFrame } from "./faceTrackingService";
import type { HeadPose } from "./headPose";
import type { EyeDirection } from "./eyeDirection";

export type PreviewSummary = {
  cameraTrackingActive: boolean; faceDetected: boolean; landmarkCount: number;
  headPose: HeadPose | null; estimatedEyeDirection: EyeDirection | null; isUserInteracting: boolean;
};

export async function authorizeAdminPreview(token: string): Promise<boolean> {
  // Explicit credentials prevent localStorage role edits from granting preview access.
  const result = await apiRequest<{ allowed: boolean }>("/api/admin/computer-vision-preview", {
    auth: false, headers: { Authorization: `Bearer ${token}` },
  });
  return result.allowed === true;
}

/** Draws locally from inference's existing video; never opens, clones or stops a stream. */
export function createAdminFaceTrackingPreview({ token, canvas, getFrame, onUpdate, onUnavailable,
  authorize = authorizeAdminPreview,
}: {
  token: string; canvas: HTMLCanvasElement; getFrame: () => FaceTrackingPreviewFrame | null;
  onUpdate: (summary: PreviewSummary) => void; onUnavailable: () => void;
  authorize?: (token: string) => Promise<boolean>;
}) {
  let stopped = false;
  let started = false;
  let timer: ReturnType<typeof setTimeout> | null = null;
  const context = canvas.getContext("2d");

  function stop() {
    stopped = true;
    if (timer !== null) clearTimeout(timer);
    timer = null;
    context?.clearRect(0, 0, canvas.width, canvas.height);
  }

  function draw() {
    if (stopped || !context) return;
    try {
      const frame = getFrame();
      context.clearRect(0, 0, canvas.width, canvas.height);
      if (frame && frame.video.videoWidth > 0 && frame.video.videoHeight > 0) {
        if (canvas.width !== frame.video.videoWidth) canvas.width = frame.video.videoWidth;
        if (canvas.height !== frame.video.videoHeight) canvas.height = frame.video.videoHeight;
        context.drawImage(frame.video, 0, 0, canvas.width, canvas.height);
        context.fillStyle = "#2dd8d8";
        context.beginPath();
        for (const point of frame.landmarks) {
          if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) continue;
          const x = point.x * canvas.width, y = point.y * canvas.height;
          context.moveTo(x + 1.5, y);
          context.arc(x, y, 1.5, 0, 2 * Math.PI);
        }
        context.fill();
      }
      onUpdate({ cameraTrackingActive: frame !== null, faceDetected: Boolean(frame?.landmarks.length),
        landmarkCount: frame?.landmarks.length ?? 0, headPose: frame?.headPose ?? null,
        estimatedEyeDirection: frame?.estimatedEyeDirection ?? null, isUserInteracting: frame?.isUserInteracting ?? false });
      timer = setTimeout(draw, 100);
    } catch {
      stop();
      onUnavailable();
    }
  }

  async function start() {
    if (started || stopped) return;
    started = true;
    try {
      const allowed = await authorize(token);
      if (stopped) return;
      if (!allowed || !context) { stop(); onUnavailable(); return; }
      draw();
    } catch {
      if (!stopped) { stop(); onUnavailable(); }
    }
  }
  return { start, stop };
}
