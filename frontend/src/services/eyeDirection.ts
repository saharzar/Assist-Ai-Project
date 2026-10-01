import type { NormalizedLandmark } from "@mediapipe/tasks-vision";

/** Coarse direction from the user's perspective, not a screen gaze target. */
export type EyeDirection = "left" | "center" | "right";
type Point = Pick<NormalizedLandmark, "x" | "y">;
const EYES = [
  { corners: [33, 133], lids: [159, 145], iris: 468 },
  { corners: [362, 263], lids: [386, 374], iris: 473 },
] as const;

function eyePosition(landmarks: Point[] | undefined, width: number, height: number): number | null {
  if (!landmarks || !Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return null;
  const positions: number[] = [];
  for (const eye of EYES) {
    const points = [...eye.corners, ...eye.lids, eye.iris].map((index) => landmarks[index]);
    if (points.some((point) => !point || !Number.isFinite(point.x) || !Number.isFinite(point.y) ||
      point.x < 0 || point.x > 1 || point.y < 0 || point.y > 1)) return null;
    const [start, end, top, bottom, iris] = points.map((point) => ({ x: point.x * width, y: point.y * height }));
    const dx = end.x - start.x, dy = end.y - start.y;
    const length = Math.hypot(dx, dy);
    // Reject tiny/degenerate eyes and blinks. Projection follows the eye line,
    // so image aspect ratio and head tilt do not change the horizontal ratio.
    if (length < 8) return null;
    const opening = Math.abs((bottom.y - top.y) * dx - (bottom.x - top.x) * dy) / length;
    if (opening / length < 0.12) return null;
    const ratio = ((iris.x - start.x) * dx + (iris.y - start.y) * dy) / (length * length);
    const lidMidpoint = { x: (top.x + bottom.x) / 2, y: (top.y + bottom.y) / 2 };
    const verticalOffset = Math.abs((iris.y - lidMidpoint.y) * dx - (iris.x - lidMidpoint.x) * dy) / length;
    if (ratio < 0.05 || ratio > 0.95 || verticalOffset > opening) return null;
    positions.push(ratio);
  }
  // Do not infer a direction from conflicting eyes or a single unreliable eye.
  if (Math.abs(positions[0] - positions[1]) > 0.2) return null;
  return (positions[0] + positions[1]) / 2;
}

function classify(position: number, previous: EyeDirection | null = null): EyeDirection {
  // Raw camera frames are unmirrored: image-right means the user's left.
  if (position < 0.38) return "right";
  if (position > 0.62) return "left";
  if (previous === "right" && position < 0.44) return "right";
  if (previous === "left" && position > 0.56) return "left";
  return "center";
}

export function estimateEyeDirection(landmarks: Point[] | undefined, width: number, height: number): EyeDirection | null {
  const position = eyePosition(landmarks, width, height);
  return position === null ? null : classify(position);
}

/** Per-tracker EMA plus hysteresis; reset immediately on missing/unreliable eyes. */
export function createEyeDirectionEstimator() {
  let smoothedPosition: number | null = null;
  let direction: EyeDirection | null = null;
  function reset() {
    smoothedPosition = null;
    direction = null;
  }
  return {
    update(landmarks: Point[] | undefined, width: number, height: number): EyeDirection | null {
      const position = eyePosition(landmarks, width, height);
      if (position === null) {
        reset();
        return null;
      }
      smoothedPosition = smoothedPosition === null ? position : 0.25 * position + 0.75 * smoothedPosition;
      direction = classify(smoothedPosition, direction);
      return direction;
    },
    reset,
  };
}
