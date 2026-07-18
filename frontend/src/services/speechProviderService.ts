import { apiRequest } from "./api";

export type SpeechMode = "automatic" | "azure" | "browser";
export type SpeechProvider = "azure" | "browser";
export type SpeechStatus = "normal" | "warning" | "critical" | "quota_reached" | "unavailable";

export type SpeechProviderResolution = {
  service_type: "tts" | "stt";
  provider: SpeechProvider;
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
  return apiRequest<SpeechProviderResolution>(`/api/speech/providers/${serviceType}`);
}

export function fetchSpeechProviderDashboard() {
  return apiRequest<SpeechProviderDashboard>("/admin/speech-providers");
}

export function updateSpeechProviderSettings(settings: SpeechProviderSettings) {
  return apiRequest<SpeechProviderSettings>("/admin/speech-providers/settings", {
    method: "PUT",
    body: JSON.stringify(settings),
  });
}

export const SPEECH_PROVIDER_UPDATED_EVENT = "assist-ai:speech-provider-updated";

export function notifySpeechProviderUpdated(dashboard: SpeechProviderDashboard) {
  window.dispatchEvent(new CustomEvent(SPEECH_PROVIDER_UPDATED_EVENT, { detail: dashboard }));
}
