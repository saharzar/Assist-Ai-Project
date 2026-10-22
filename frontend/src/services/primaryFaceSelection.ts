import type { NormalizedLandmark } from "@mediapipe/tasks-vision";

// Geometric continuity only: these thresholds do not establish anyone's identity.
export const PRIMARY_FACE_SELECTION = {
  switchAreaRatio: 1.3,
  confirmationFrames: 3,
  minimumOverlap: 0.15,
  maximumCenterDistance: 0.35,
} as const;
type Box = { left: number; top: number; right: number; bottom: number; area: number };
type Candidate = { index: number; landmarks: NormalizedLandmark[]; box: Box };
export type PrimaryFace = { index: number; landmarks: NormalizedLandmark[]; changed: boolean };

function bounds(landmarks: NormalizedLandmark[]): Box | null {
  if (landmarks.length < 3) return null;
  let left = 1, top = 1, right = 0, bottom = 0;
  for (const point of landmarks) {
    if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) return null;
    // Measure only the visible portion of a face at the edge of the frame.
    const x = Math.max(0, Math.min(1, point.x));
    const y = Math.max(0, Math.min(1, point.y));
    left = Math.min(left, x); right = Math.max(right, x);
    top = Math.min(top, y); bottom = Math.max(bottom, y);
  }
  const area = (right - left) * (bottom - top);
  return area > 1e-6 ? { left, top, right, bottom, area } : null;
}

function matchScore(previous: Box, next: Box): number | null {
  const sizeRatio = next.area / previous.area;
  if (sizeRatio < 0.4 || sizeRatio > 2.5) return null;
  const intersection = Math.max(0, Math.min(previous.right, next.right) - Math.max(previous.left, next.left))
    * Math.max(0, Math.min(previous.bottom, next.bottom) - Math.max(previous.top, next.top));
  const overlap = intersection / (previous.area + next.area - intersection);
  const diagonal = Math.hypot(previous.right - previous.left, previous.bottom - previous.top);
  const distance = Math.hypot((previous.left + previous.right - next.left - next.right) / 2,
    (previous.top + previous.bottom - next.top - next.bottom) / 2) / diagonal;
  if (overlap < PRIMARY_FACE_SELECTION.minimumOverlap && distance > PRIMARY_FACE_SELECTION.maximumCenterDistance) return null;
  return overlap - distance * 0.25 - Math.abs(Math.log(sizeRatio)) * 0.1;
}

export function createPrimaryFaceSelector() {
  let previous: Box | null = null;
  let challenger: Box | null = null;
  let challengerFrames = 0;
  function reset() { previous = null; challenger = null; challengerFrames = 0; }

  function update(faces: NormalizedLandmark[][]): PrimaryFace | null {
    const candidates: Candidate[] = [];
    faces.forEach((landmarks, index) => {
      const box = bounds(landmarks);
      if (box) candidates.push({ index, landmarks, box });
    });
    if (!candidates.length) { reset(); return null; }
    const largest = candidates.reduce((best, candidate) => candidate.box.area > best.box.area ? candidate : best);
    let current: Candidate | null = null;
    let bestScore = -Infinity;
    if (previous) {
      for (const candidate of candidates) {
        const score = matchScore(previous, candidate.box);
        if (score !== null && score > bestScore) { current = candidate; bestScore = score; }
      }
    }
    let selected = current ?? largest;
    let changed = current === null;
    if (current && largest !== current && largest.box.area > current.box.area * PRIMARY_FACE_SELECTION.switchAreaRatio) {
      challengerFrames = challenger && matchScore(challenger, largest.box) !== null ? challengerFrames + 1 : 1;
      challenger = largest.box;
      if (challengerFrames >= PRIMARY_FACE_SELECTION.confirmationFrames) { selected = largest; changed = true; }
    } else {
      challenger = null; challengerFrames = 0;
    }
    if (changed) { challenger = null; challengerFrames = 0; }
    previous = selected.box;
    return { index: selected.index, landmarks: selected.landmarks, changed };
  }
  return { update, reset };
}
