import type { NormalizedLandmark } from "@mediapipe/tasks-vision";

export type HeadPose = { yaw: number; pitch: number; roll: number };
type Vector = { x: number; y: number; z: number };
const EPSILON = 1e-6;
const DEGREES = 180 / Math.PI;

function normalize(vector: Vector): Vector | null {
  const length = Math.hypot(vector.x, vector.y, vector.z);
  return length > EPSILON
    ? { x: vector.x / length, y: vector.y / length, z: vector.z / length }
    : null;
}

function subtract(a: Vector, b: Vector): Vector {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

/**
 * Approximate camera-relative degrees from an orthonormal face frame.
 * MediaPipe x/z use image-width scale; y must be adjusted by height/width.
 * Axes: image right, image down, away from camera. R = Rz(roll) Ry(yaw) Rx(pitch).
 * Positive yaw turns toward image left (user's right), pitch looks down,
 * and roll tilts clockwise in the unmirrored camera image.
 * Relative landmark depth makes this an estimate, not calibrated metric pose.
 */
export function calculateHeadPose(
  landmarks: NormalizedLandmark[] | undefined,
  width: number,
  height: number,
): HeadPose | null {
  if (!landmarks || !Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return null;
  const points = [33, 263, 10, 152].map((index) => landmarks[index]);
  if (points.some((point) => !point || ![point.x, point.y, point.z].every(Number.isFinite))) return null;
  const [leftEye, rightEye, forehead, chin] = points.map((point) => ({
    x: point.x, y: point.y * height / width, z: point.z,
  }));
  const right = normalize(subtract(rightEye, leftEye));
  if (!right) return null;
  const vertical = subtract(chin, forehead);
  const projection = vertical.x * right.x + vertical.y * right.y + vertical.z * right.z;
  // Remove the horizontal component so natural asymmetry does not skew the axes.
  const down = normalize({
    x: vertical.x - projection * right.x,
    y: vertical.y - projection * right.y,
    z: vertical.z - projection * right.z,
  });
  if (!down || Math.hypot(right.x, right.y) < EPSILON) return null;
  const back = {
    x: right.y * down.z - right.z * down.y,
    y: right.z * down.x - right.x * down.z,
    z: right.x * down.y - right.y * down.x,
  };
  return {
    yaw: Math.atan2(-right.z, Math.hypot(right.x, right.y)) * DEGREES,
    pitch: Math.atan2(down.z, back.z) * DEGREES,
    roll: Math.atan2(right.y, right.x) * DEGREES,
  };
}

function smoothAngle(previous: number, next: number): number {
  // Follow the shortest path across +/-180 degrees with a small fixed EMA.
  const difference = (next - previous + 540) % 360 - 180;
  return (previous + 0.25 * difference + 540) % 360 - 180;
}

/** Per-tracker smoothing; no time history or timestamps are retained. */
export function createHeadPoseEstimator() {
  let previous: HeadPose | null = null;
  return {
    update(landmarks: NormalizedLandmark[] | undefined, width: number, height: number): HeadPose | null {
      const next = calculateHeadPose(landmarks, width, height);
      previous = next && previous ? {
        yaw: smoothAngle(previous.yaw, next.yaw),
        pitch: smoothAngle(previous.pitch, next.pitch),
        roll: smoothAngle(previous.roll, next.roll),
      } : next;
      return previous;
    },
    reset() { previous = null; },
  };
}
