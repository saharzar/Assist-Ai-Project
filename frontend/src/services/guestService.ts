import { apiRequest } from "./api";

export type GuestSession = {
  guest_session_token: string;
  save_progress: boolean;
  preferred_language: string;
};

export type GuestSessionPayload = {
  save_progress: boolean;
  preferred_language: string;
};

export function createGuestSession(payload: GuestSessionPayload) {
  return apiRequest<GuestSession>("/guests/session", {
    method: "POST",
    body: JSON.stringify(payload),
    auth: false,
  });
}
