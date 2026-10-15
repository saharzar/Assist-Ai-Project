export const FACE_LANDMARKER_WASM_PATH = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm";
export const FACE_LANDMARKER_OPTIONS = {
  baseOptions: { modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task" },
  runningMode: "IMAGE" as const,
  numFaces: 3,
  outputFaceBlendshapes: false,
  outputFacialTransformationMatrixes: false,
};
