import { API_BASE_URL, apiRequest } from "./api";

export type AtmPinOutcome = "simulated_system_error" | "incorrect" | "success";
export type AtmInputMode = "voice" | "keyboard";

type SessionStartResponse = {
  tracking_enabled: boolean;
  session_id: string | null;
};

type SessionEvent = {
  client_event_id: string;
  event_type: "progress" | "pin_submission" | "input_mode" | "identity_verification" | "returned_to_pin";
  pin_outcome?: AtmPinOutcome;
  final_step_reached?: string;
  input_mode?: AtmInputMode;
  stt_provider?: string;
  verification_outcome?: "failed" | "success";
};

function guestHeaders() {
  const storedGuest = localStorage.getItem("assist_ai_guest_session");
  if (!storedGuest) {
    return undefined;
  }
  try {
    const guest = JSON.parse(storedGuest) as { guest_session_token?: string };
    return guest.guest_session_token
      ? { "X-Guest-Session-Token": guest.guest_session_token }
      : undefined;
  } catch {
    return undefined;
  }
}

export async function startAtmAnalyticsSession(selectedLanguage: string) {
  const response = await apiRequest<SessionStartResponse>("/api/atm-sessions/start", {
    method: "POST",
    headers: guestHeaders(),
    body: JSON.stringify({
      scenario_type: "atm-withdrawal",
      selected_language: selectedLanguage,
    }),
  });
  return response.tracking_enabled ? response.session_id : null;
}

export function recordAtmAnalyticsEvent(sessionId: string, event: SessionEvent) {
  return apiRequest(`/api/atm-sessions/${sessionId}/events`, {
    method: "POST",
    headers: guestHeaders(),
    body: JSON.stringify(event),
  });
}

export function completeAtmAnalyticsSession(sessionId: string, finalStep: string) {
  return apiRequest(`/api/atm-sessions/${sessionId}/complete`, {
    method: "POST",
    headers: guestHeaders(),
    body: JSON.stringify({ final_step_reached: finalStep }),
  });
}
export function terminateAtmAnalyticsSession(
  sessionId: string,
  reason: "verification_failed" | "pin_failed_after_verification",
) {
  return apiRequest(`/api/atm-sessions/${sessionId}/terminate`, {
    method: "POST",
    headers: guestHeaders(),
    body: JSON.stringify({ reason }),
  });
}

export function abandonAtmAnalyticsSession(
  sessionId: string,
  finalStep: string,
  token?: string | null,
  guestToken?: string | null,
) {
  const headers = new Headers({ "Content-Type": "application/json" });
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  if (guestToken) {
    headers.set("X-Guest-Session-Token", guestToken);
  }
  return fetch(`${API_BASE_URL}/api/atm-sessions/${sessionId}/abandon`, {
    method: "POST",
    headers,
    body: JSON.stringify({ final_step_reached: finalStep }),
    keepalive: true,
  });
}
