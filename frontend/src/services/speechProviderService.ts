import { apiRequest, expectObjectResponse } from "./api";

export type SpeechMode = "automatic" | "azure" | "browser";
export type SpeechProvider = "azure" | "browser";
export type GlobalSpeechProvider = SpeechProvider | "soniox";
export type SpeechStatus = "normal" | "warning" | "critical" | "quota_reached" | "unavailable";

export type SpeechProviderResolution = {
  service_type: "tts" | "stt";
  provider: GlobalSpeechProvider;
  mode: SpeechMode;
  status: SpeechStatus;
};

export type SpeechProviderSettings = {
  tts_mode: SpeechMode;
  stt_mode: SpeechMode;
  azure_tts_monthly_limit: number;
  azure_stt_monthly_limit_seconds: number;
  warning_threshold_percent: number;
  switch_threshold_percent: number;
};

export type SpeechServiceSnapshot = {
  service_type: "tts" | "stt";
  current_provider: SpeechProvider;
  mode: SpeechMode;
  used: number;
  limit: number;
  remaining: number;
  usage_percent: number;
  successful_requests: number;
  failed_requests: number;
  cached_requests: number;
  billing_period: string;
  reset_date: string;
  status: SpeechStatus;
};

export type SpeechUsageHistory = {
  billing_period: string;
  service_type: "tts" | "stt";
  provider: string;
  successful_requests: number;
  failed_requests: number;
  characters_used: number;
  cached_requests: number;
  audio_seconds_used: number;
};

export type SpeechProviderEvent = {
  id: number;
  created_at: string;
  service_type: "tts" | "stt";
  event_type: string;
  previous_provider: string | null;
  new_provider: string | null;
  reason: string;
  administrator_name: string | null;
};

export type SpeechProviderDashboard = {
  estimate_notice: string;
  settings: SpeechProviderSettings;
  tts: SpeechServiceSnapshot;
  stt: SpeechServiceSnapshot;
  usage_history: SpeechUsageHistory[];
  events: SpeechProviderEvent[];
};

export function resolveSpeechProvider(serviceType: "tts" | "stt") {
  const browserSupported = serviceType === "tts"
    ? "speechSynthesis" in window
    : Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
  return apiRequest<SpeechProviderResolution>(`/api/speech/providers/${serviceType}?browser_supported=${browserSupported}`);
}

export type SpeechCapability = {
  provider_key: GlobalSpeechProvider; display_name: string; service_type: "tts" | "stt";
  enabled: boolean; available: boolean; configured: boolean; priority: number;
  quota_type: "limited" | "unlimited"; quota_limit: number | null; usage_unit: string;
  warning_threshold_value: number; switch_threshold_value: number;
  billing_period_type: "calendar_month" | "custom_monthly" | "no_reset" | "manual";
  reset_day: number | null; health_status: string; quota_status: string; used: number;
  remaining: number | null; usage_percent: number | null; period_start: string;
  period_end: string | null; next_reset_date: string | null;
  last_success_at: string | null; last_failure_at: string | null;
};

export type GlobalSpeechDashboard = {
  estimate_notice: string;
  automatic_tts_routing_enabled: boolean; automatic_stt_routing_enabled: boolean;
  forced_tts_provider_key: GlobalSpeechProvider | null; forced_stt_provider_key: GlobalSpeechProvider | null;
  active_tts_provider: GlobalSpeechProvider; active_stt_provider: GlobalSpeechProvider;
  capabilities: SpeechCapability[]; usage_history: SpeechUsageHistory[]; events: SpeechProviderEvent[];
};

export type GlobalSpeechRoutingUpdate = {
  capabilities: Array<Pick<SpeechCapability,
    "provider_key" | "service_type" | "enabled" | "priority" | "quota_limit" |
    "warning_threshold_value" | "switch_threshold_value" | "billing_period_type" | "reset_day"
  >>;
};

export async function fetchGlobalSpeechDashboard() {
  const path = "/api/admin/speech-providers/global";
  const payload = await apiRequest<unknown>(path);
  return expectObjectResponse<GlobalSpeechDashboard>(payload, path, [
    "active_tts_provider", "active_stt_provider", "capabilities", "usage_history", "events",
  ], ["data", "dashboard"]);
}

export function updateGlobalSpeechRouting(payload: GlobalSpeechRoutingUpdate) {
  return apiRequest<GlobalSpeechDashboard>("/api/admin/speech-providers/global", {
    method: "PUT", body: JSON.stringify(payload),
  });
}

export function testSpeechProvider(serviceType: "tts" | "stt", providerKey: GlobalSpeechProvider) {
  return apiRequest<{ ok: boolean; status: string }>(`/api/admin/speech-providers/test/${serviceType}/${providerKey}`, { method: "POST" });
}

export function fetchSpeechProviderDashboard() {
  return apiRequest<SpeechProviderDashboard>("/api/admin/speech-providers");
}

export function updateSpeechProviderSettings(settings: SpeechProviderSettings) {
  return apiRequest<SpeechProviderSettings>("/api/admin/speech-providers/settings", {
    method: "PUT",
    body: JSON.stringify(settings),
  });
}

export const SPEECH_PROVIDER_UPDATED_EVENT = "assist-ai:speech-provider-updated";
export const SPEECH_PROVIDER_USED_EVENT = "assist-ai:speech-provider-used";

export function notifySpeechProviderUpdated(dashboard: SpeechProviderDashboard | GlobalSpeechDashboard) {
  window.dispatchEvent(new CustomEvent(SPEECH_PROVIDER_UPDATED_EVENT, { detail: dashboard }));
}

export function notifySpeechProviderUsed(serviceType: "tts" | "stt", provider: GlobalSpeechProvider) {
  window.dispatchEvent(new CustomEvent(SPEECH_PROVIDER_USED_EVENT, { detail: { serviceType, provider } }));
}
