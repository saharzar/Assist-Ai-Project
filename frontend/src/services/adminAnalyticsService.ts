import { apiRequest } from "./api";

export type AtmAnalyticsFilters = {
  dateFrom?: string;
  dateTo?: string;
  actorType?: "all" | "registered" | "guest";
  completionStatus?: "all" | "in_progress" | "completed" | "abandoned";
  userName?: string;
  language?: string;
  sttProvider?: string;
};

export type AtmAnalyticsSummary = {
  total_sessions: number;
  successful_sessions: number;
  abandoned_sessions: number;
  in_progress_sessions: number;
  success_rate: number;
  average_completion_seconds: number;
  average_incorrect_pin_attempts: number;
  average_retries: number;
  registered_user_sessions: number;
  consenting_guest_sessions: number;
  unsuccessful_sessions:number;security_terminated_sessions:number;average_pin_attempts:number;average_verification_attempts:number;returned_to_pin_sessions:number;correct_first_pin_sessions:number;incorrect_first_pin_sessions:number;
};

export type AtmAnalyticsSession = {
  session_id: string;
  actor_type: "registered" | "guest";
  actor_reference: string;
  display_name: string;
  scenario_type: string;
  started_at: string;
  completed_at: string | null;
  duration_seconds: number | null;
  incorrect_user_pin_count: number;
  simulated_system_error_count: number;
  total_pin_submission_count: number;
  retry_count: number;
  completion_status: "in_progress" | "completed" | "abandoned";
  success: boolean;
  selected_language: string | null;
  stt_provider: string | null;
  used_voice_input: boolean;
  used_keyboard_input: boolean;
  final_step_reached: string;
  first_pin_was_correct:boolean|null;identity_verification_attempt_count:number;incorrect_identity_verification_count:number;identity_verification_succeeded:boolean;returned_to_pin_after_verification:boolean;security_terminated:boolean;termination_reason:string|null;
};

function queryString(filters: AtmAnalyticsFilters) {
  const query = new URLSearchParams();
  if (filters.dateFrom) query.set("date_from", filters.dateFrom);
  if (filters.dateTo) query.set("date_to", filters.dateTo);
  if (filters.actorType && filters.actorType !== "all") query.set("actor_type", filters.actorType);
  if (filters.completionStatus && filters.completionStatus !== "all") {
    query.set("completion_status", filters.completionStatus);
  }
  if (filters.userName?.trim()) query.set("user_name", filters.userName.trim());
  if (filters.language) query.set("language", filters.language);
  if (filters.sttProvider) query.set("stt_provider", filters.sttProvider);
  const value = query.toString();
  return value ? `?${value}` : "";
}

export function fetchAtmAnalyticsSummary(filters: AtmAnalyticsFilters) {
  return apiRequest<AtmAnalyticsSummary>(`/admin/atm-analytics/summary${queryString(filters)}`);
}

export function fetchAtmAnalyticsSessions(filters: AtmAnalyticsFilters) {
  return apiRequest<AtmAnalyticsSession[]>(`/admin/atm-analytics/sessions${queryString(filters)}`);
}

export function fetchActorAtmSessions(actorType: string, actorReference: string) {
  return apiRequest<AtmAnalyticsSession[]>(
    `/admin/atm-analytics/actors/${encodeURIComponent(actorType)}/${encodeURIComponent(actorReference)}`,
  );
}
