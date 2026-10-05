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
  session: ComputerVisionSessionMetadata; summary: ComputerVisionSessionSummary;
  samples: ComputerVisionSample[]; page: number; page_size: number;
};

export type HeadAxisSummary = {
  minimum: number | null; maximum: number | null; mean: number | null;
  standard_deviation: number | null; range: number | null;
};
export type ComputerVisionMetrics = {
  total_samples: number; valid_samples: number; missing_samples: number;
  interacting_samples: number; interacting_percentage: number;
  head_pose: Record<"yaw" | "pitch" | "roll", HeadAxisSummary>;
  eye_direction: Record<"left" | "center" | "right" | "unknown", { count: number; percentage: number }>;
  eye_direction_changes: number;
};
export type ComputerVisionSessionSummary = {
  all_samples: ComputerVisionMetrics; excluding_interaction: ComputerVisionMetrics;
};

export function fetchComputerVisionSessions(page = 1, scenarioKey?: string) {
  const query = new URLSearchParams({ page: String(page), page_size: "10" });
  if (scenarioKey) query.set("scenario_key", scenarioKey);
  return apiRequest<ComputerVisionSessionList>(`/api/admin/computer-vision-sessions?${query}`);
}

export function fetchComputerVisionSession(sessionId: string, page = 1) {
  return apiRequest<ComputerVisionSessionDetail>(`/api/admin/computer-vision-sessions/${encodeURIComponent(sessionId)}?page=${page}&page_size=100`);
}

/** Full saved timeline for charts, independent of the raw table's page. */
export async function fetchComputerVisionTimeline(sessionId: string, signal?: AbortSignal) {
  const path = `/api/admin/computer-vision-sessions/${encodeURIComponent(sessionId)}`;
  const first = await apiRequest<ComputerVisionSessionDetail>(`${path}?page=1&page_size=500`, { signal });
  const samples = [...first.samples];
  const pages = Math.ceil(first.session.sample_count / first.page_size);
  for (let page = 2; page <= pages; page++) {
    const next = await apiRequest<ComputerVisionSessionDetail>(`${path}?page=${page}&page_size=500`, { signal });
    samples.push(...next.samples);
  }
  if (samples.length !== first.session.sample_count) throw new Error("Incomplete computer vision timeline.");
  return { samples, durationMs: first.session.duration_ms };
}
