import { describe, expect, it } from "vitest";
import type { NormalizedLandmark } from "@mediapipe/tasks-vision";
import { createPrimaryFaceSelector, PRIMARY_FACE_SELECTION } from "./primaryFaceSelection";

function face(x: number, width: number, height = width): NormalizedLandmark[] {
  return [[x - width / 2, 0.5 - height / 2], [x + width / 2, 0.5 - height / 2],
    [x + width / 2, 0.5 + height / 2], [x - width / 2, 0.5 + height / 2]]
    .map(([x, y]) => ({ x, y, z: 0, visibility: 1 }));
}

describe("geometric primary-face selection", () => {
  it("selects one valid face", () => {
    const landmarks = face(0.5, 0.3);
    expect(createPrimaryFaceSelector().update([landmarks])).toEqual({ index: 0, landmarks, changed: true });
  });

  it("initially selects the clearly largest face regardless of detection order", () => {
    const small = face(0.8, 0.1), large = face(0.3, 0.4);
    expect(createPrimaryFaceSelector().update([small, large])?.landmarks).toBe(large);
    expect(createPrimaryFaceSelector().update([large, small])?.landmarks).toBe(large);
  });

  it("keeps similar-sized faces stable even as their detection order changes", () => {
    const selector = createPrimaryFaceSelector();
    const current = face(0.25, 0.3, 0.4);
    selector.update([current, face(0.75, 0.29, 0.4)]);
    for (let index = 0; index < 20; index += 1) {
      const companion = face(0.75, index % 2 ? 0.31 : 0.29, 0.4);
      const result = selector.update(index % 2 ? [companion, current] : [current, companion]);
      expect(result?.landmarks).toBe(current);
      expect(result?.changed).toBe(false);
    }
  });

  it("requires a clearly larger challenger for consecutive frames before switching", () => {
    const selector = createPrimaryFaceSelector();
    const current = face(0.25, 0.3), small = face(0.75, 0.2), large = face(0.75, 0.4);
    selector.update([current, small]);
    for (let index = 1; index < PRIMARY_FACE_SELECTION.confirmationFrames; index += 1) {
      expect(selector.update([large, current])?.landmarks).toBe(current);
    }
    expect(selector.update([current, large])).toEqual({ index: 1, landmarks: large, changed: true });
    expect(selector.update([large, current])).toEqual({ index: 0, landmarks: large, changed: false });
  });

  it("resets the challenger count if the size advantage is not sustained", () => {
    const selector = createPrimaryFaceSelector();
    const current = face(0.25, 0.3), large = face(0.75, 0.4), similar = face(0.75, 0.31);
    selector.update([current]);
    for (let index = 0; index < 10; index += 1) {
      expect(selector.update([current, large])?.landmarks).toBe(current);
      expect(selector.update([similar, current])?.landmarks).toBe(current);
    }
  });

  it("immediately picks the largest remaining face if the primary disappears", () => {
    const selector = createPrimaryFaceSelector();
    const current = face(0.25, 0.4), small = face(0.8, 0.1), remaining = face(0.7, 0.2);
    selector.update([small, current, remaining]);
    expect(selector.update([small, remaining])).toEqual({ index: 1, landmarks: remaining, changed: true });
  });

  it("clears selection on face loss or reset instead of retaining stale faces", () => {
    const selector = createPrimaryFaceSelector();
    selector.update([face(0.25, 0.4)]);
    expect(selector.update([])).toBeNull();
    const next = face(0.75, 0.2);
    expect(selector.update([next])?.changed).toBe(true);
    selector.reset();
    expect(selector.update([face(0.25, 0.4), next])?.index).toBe(0);
  });

  it("ignores empty, degenerate, and non-finite faces while keeping original detection indices", () => {
    const invalid = face(0.25, 0.3); invalid[0].x = NaN;
    const valid = face(0.7, 0.2);
    expect(createPrimaryFaceSelector().update([[], face(0.5, 0), invalid, valid])?.index).toBe(3);
    expect(createPrimaryFaceSelector().update([invalid, []])).toBeNull();
  });

  it("measures visible area rather than inflating a mostly offscreen face", () => {
    const visible = face(0.5, 0.3), offscreen = face(-0.2, 0.5);
    expect(createPrimaryFaceSelector().update([offscreen, visible])?.landmarks).toBe(visible);
  });
});
