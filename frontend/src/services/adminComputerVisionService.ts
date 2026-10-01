import { apiRequest } from "./api";

export type ComputerVisionSessionMetadata = {
  session_id: string;
  actor_type: "registered" | "guest";
  actor_reference: string;
  display_name: string | null;
  scenario_key: string;
  scenario_session_id: string | null;
  started_at: string;
  ended_at: string;
  duration_ms: number;
  sample_count: number;
};

export type ComputerVisionSample = {
  timestamp: number;
  yaw: number | null;
  pitch: number | null;
  roll: number | null;
  estimatedEyeDirection: "left" | "center" | "right" | null;
  isUserInteracting: boolean;
};

export type ComputerVisionSessionList = {
  items: ComputerVisionSessionMetadata[]; total: number; page: number; page_size: number;
};
export type ComputerVisionSessionDetail = {
  session: ComputerVisionSessionMetadata; samples: ComputerVisionSample[]; page: number; page_size: number;
};

export function fetchComputerVisionSessions(page = 1) {
  return apiRequest<ComputerVisionSessionList>(`/api/admin/computer-vision-sessions?page=${page}&page_size=10`);
}

export function fetchComputerVisionSession(sessionId: string, page = 1) {
  return apiRequest<ComputerVisionSessionDetail>(`/api/admin/computer-vision-sessions/${encodeURIComponent(sessionId)}?page=${page}&page_size=100`);
}
