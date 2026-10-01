import { describe, expect, it } from "vitest";
import type { NormalizedLandmark } from "@mediapipe/tasks-vision";
import { calculateHeadPose, createHeadPoseEstimator, type HeadPose } from "./headPose";

// A synthetic rigid face, rotated independently before encoding MediaPipe coordinates.
function face(pose: HeadPose, width = 640, height = 480, scale = 1, offset = 0) {
  const landmarks: NormalizedLandmark[] = Array.from({ length: 478 }, () => ({ x: 0, y: 0, z: 0, visibility: 1 }));
  const radians = Math.PI / 180;
  const pitch = pose.pitch * radians, yaw = pose.yaw * radians, roll = pose.roll * radians;
  const points = [
    [33, -0.1, -0.05], [263, 0.1, -0.05], [10, 0, -0.2], [152, 0, 0.2],
  ];
  for (const [index, x, y] of points) {
    const y1 = y * Math.cos(pitch), z1 = y * Math.sin(pitch);
    const x2 = x * Math.cos(yaw) + z1 * Math.sin(yaw);
    const z2 = -x * Math.sin(yaw) + z1 * Math.cos(yaw);
    const x3 = x2 * Math.cos(roll) - y1 * Math.sin(roll);
    const y3 = x2 * Math.sin(roll) + y1 * Math.cos(roll);
    landmarks[index] = {
      x: 0.5 + offset + scale * x3,
      y: 0.5 + offset + scale * y3 * width / height,
      z: -0.1 + offset + scale * z2,
      visibility: 1,
    };
  }
  return landmarks;
}
const neutral = { yaw: 0, pitch: 0, roll: 0 };

describe("landmark head pose", () => {
  it.each([
    neutral,
    { yaw: 30, pitch: 0, roll: 0 }, { yaw: -30, pitch: 0, roll: 0 },
    { yaw: 0, pitch: 25, roll: 0 }, { yaw: 0, pitch: -25, roll: 0 },
    { yaw: 0, pitch: 0, roll: 20 }, { yaw: 0, pitch: 0, roll: -20 },
    { yaw: 20, pitch: -15, roll: 12 },
  ])("recovers rigid rotations %j in degrees", (expected) => {
    const pose = calculateHeadPose(face(expected), 640, 480)!;
    expect(pose.yaw).toBeCloseTo(expected.yaw, 6);
    expect(pose.pitch).toBeCloseTo(expected.pitch, 6);
    expect(pose.roll).toBeCloseTo(expected.roll, 6);
  });

  it.each([[640, 480], [480, 640], [800, 800]])("corrects aspect ratio at %s x %s", (width, height) => {
    const expected = { yaw: 20, pitch: 15, roll: -25 };
    const pose = calculateHeadPose(face(expected, width, height, 0.6, 0.05), width, height)!;
    expect(pose.yaw).toBeCloseTo(expected.yaw, 6);
    expect(pose.pitch).toBeCloseTo(expected.pitch, 6);
    expect(pose.roll).toBeCloseTo(expected.roll, 6);
  });

  it("rejects missing, non-finite, degenerate, and singular inputs", () => {
    expect(calculateHeadPose(undefined, 640, 480)).toBeNull();
    expect(calculateHeadPose([], 640, 480)).toBeNull();
    expect(calculateHeadPose(face(neutral), 0, 480)).toBeNull();
    expect(calculateHeadPose(face(neutral), 640, NaN)).toBeNull();
    const invalid = face(neutral);
    invalid[10].z = NaN;
    expect(calculateHeadPose(invalid, 640, 480)).toBeNull();
    const collapsed = face(neutral);
    collapsed[263] = collapsed[33];
    expect(calculateHeadPose(collapsed, 640, 480)).toBeNull();
    const collinear = face(neutral);
    collinear[10] = collinear[33];
    collinear[152] = collinear[263];
    expect(calculateHeadPose(collinear, 640, 480)).toBeNull();
    expect(calculateHeadPose(face({ ...neutral, yaw: 90 }), 640, 480)).toBeNull();
  });

  it("smooths all three angles with a 25% update", () => {
    const estimator = createHeadPoseEstimator();
    estimator.update(face(neutral), 640, 480);
    const pose = estimator.update(face({ yaw: 20, pitch: -20, roll: 20 }), 640, 480)!;
    expect(pose.yaw).toBeCloseTo(5);
    expect(pose.pitch).toBeCloseTo(-5);
    expect(pose.roll).toBeCloseTo(5);
  });

  it("clears missing-face state and starts fresh after reacquisition or reset", () => {
    const estimator = createHeadPoseEstimator();
    estimator.update(face(neutral), 640, 480);
    expect(estimator.update(undefined, 640, 480)).toBeNull();
    expect(estimator.update(face({ ...neutral, yaw: 30 }), 640, 480)?.yaw).toBeCloseTo(30);
    estimator.reset();
    expect(estimator.update(face({ ...neutral, yaw: -30 }), 640, 480)?.yaw).toBeCloseTo(-30);
  });

  it("smooths across the roll boundary without jumping through zero", () => {
    const estimator = createHeadPoseEstimator();
    estimator.update(face({ ...neutral, roll: 179 }), 640, 480);
    expect(estimator.update(face({ ...neutral, roll: -179 }), 640, 480)?.roll).toBeCloseTo(179.5);
  });
});
