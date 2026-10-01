import { describe, expect, it } from "vitest";
import { createEyeDirectionEstimator, estimateEyeDirection } from "./eyeDirection";

function eyes(first = 0.5, second = first, width = 640, height = 480, tilt = 0, scale = 1) {
  const landmarks = Array.from({ length: 478 }, () => ({ x: 0, y: 0 }));
  const angle = tilt * Math.PI / 180;
  const eyeWidth = width * 0.1 * scale;
  function point(index: number, x: number, y: number) {
    landmarks[index] = {
      x: 0.5 + (x * Math.cos(angle) - y * Math.sin(angle)) / width,
      y: 0.45 + (x * Math.sin(angle) + y * Math.cos(angle)) / height,
    };
  }
  for (const [start, end, top, bottom, iris, center, ratio] of [
    [33, 133, 159, 145, 468, -width * 0.15 * scale, first],
    [362, 263, 386, 374, 473, width * 0.15 * scale, second],
  ]) {
    point(start, center - eyeWidth / 2, 0);
    point(end, center + eyeWidth / 2, 0);
    point(top, center, -eyeWidth * 0.15);
    point(bottom, center, eyeWidth * 0.15);
    point(iris, center + (ratio - 0.5) * eyeWidth, 0);
  }
  return landmarks;
}

describe("approximate iris direction", () => {
  it.each([
    [0.25, "right"], [0.5, "center"], [0.75, "left"],
    [0.4, "center"], [0.6, "center"],
  ] as const)("classifies iris position %s as user's %s", (position, expected) => {
    expect(estimateEyeDirection(eyes(position), 640, 480)).toBe(expected);
  });

  it.each([[640, 480, 30], [480, 640, -30], [800, 800, 0]])(
    "handles aspect ratio, scale, and tilt at %s x %s, %s degrees", (width, height, tilt) => {
      expect(estimateEyeDirection(eyes(0.75, 0.75, width, height, tilt, 0.6), width, height)).toBe("left");
      expect(estimateEyeDirection(eyes(0.25, 0.25, width, height, tilt, 0.6), width, height)).toBe("right");
    },
  );

  it("rejects absent iris data and invalid dimensions or coordinates", () => {
    expect(estimateEyeDirection(undefined, 640, 480)).toBeNull();
    expect(estimateEyeDirection(eyes().slice(0, 468), 640, 480)).toBeNull();
    expect(estimateEyeDirection(eyes(), 0, 480)).toBeNull();
    expect(estimateEyeDirection(eyes(), 640, NaN)).toBeNull();
    const invalid = eyes();
    invalid[473].x = NaN;
    expect(estimateEyeDirection(invalid, 640, 480)).toBeNull();
    invalid[473].x = 1.2;
    expect(estimateEyeDirection(invalid, 640, 480)).toBeNull();
  });

  it("rejects a closed eye, tiny eyes, or collapsed eye corners", () => {
    const closed = eyes();
    closed[145] = closed[159];
    expect(estimateEyeDirection(closed, 640, 480)).toBeNull();
    const collapsed = eyes();
    collapsed[133] = collapsed[33];
    expect(estimateEyeDirection(collapsed, 640, 480)).toBeNull();
    expect(estimateEyeDirection(eyes(0.5, 0.5, 640, 480, 0, 0.05), 640, 480)).toBeNull();
  });

  it("rejects conflicting eyes and implausible iris locations", () => {
    expect(estimateEyeDirection(eyes(0.25, 0.75), 640, 480)).toBeNull();
    expect(estimateEyeDirection(eyes(1.1), 640, 480)).toBeNull();
    const outside = eyes();
    outside[468].y += 0.1;
    expect(estimateEyeDirection(outside, 640, 480)).toBeNull();
    expect(estimateEyeDirection(eyes(0.45, 0.55), 640, 480)).toBe("center");
  });

  it("filters brief direction changes but responds to sustained eye movement", () => {
    const estimator = createEyeDirectionEstimator();
    expect(estimator.update(eyes(), 640, 480)).toBe("center");
    expect(estimator.update(eyes(0.75), 640, 480)).toBe("center");
    let direction;
    for (let i = 0; i < 10; i++) direction = estimator.update(eyes(0.75), 640, 480);
    expect(direction).toBe("left");
    for (let i = 0; i < 10; i++) direction = estimator.update(eyes(0.25), 640, 480);
    expect(direction).toBe("right");
  });

  it("holds direction around its entry boundary until the iris returns toward center", () => {
    const estimator = createEyeDirectionEstimator();
    expect(estimator.update(eyes(0.65), 640, 480)).toBe("left");
    for (let i = 0; i < 20; i++) {
      expect(estimator.update(eyes(i % 2 ? 0.60 : 0.63), 640, 480)).toBe("left");
    }
    let direction;
    for (let i = 0; i < 10; i++) direction = estimator.update(eyes(), 640, 480);
    expect(direction).toBe("center");
  });

  it("clears unreliable/missing eyes and resets smoothing on reacquisition or cleanup", () => {
    const estimator = createEyeDirectionEstimator();
    estimator.update(eyes(0.75), 640, 480);
    expect(estimator.update(eyes(0.25, 0.75), 640, 480)).toBeNull();
    expect(estimator.update(eyes(0.25), 640, 480)).toBe("right");
    expect(estimator.update(undefined, 640, 480)).toBeNull();
    expect(estimator.update(eyes(0.75), 640, 480)).toBe("left");
    estimator.reset();
    expect(estimator.update(eyes(), 640, 480)).toBe("center");
  });
});
