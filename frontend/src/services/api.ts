export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000";

type ApiRequestOptions = RequestInit & {
  auth?: boolean;
};

export class ApiError extends Error {
  status: number;

  constructor(message = "Something went wrong. Please try again.", status = 0) {
    super(message);
    this.status = status;
  }
}

export function getSessionHeaders(): Record<string, string> {
  const token = localStorage.getItem("assist_ai_token");
  if (token) return { Authorization: `Bearer ${token}` };
  try {
    const stored = localStorage.getItem("assist_ai_guest_session");
    const guest = stored ? JSON.parse(stored) as { guest_session_token?: string } : null;
    return guest?.guest_session_token
      ? { "X-Guest-Session-Token": guest.guest_session_token }
      : {};
  } catch {
    return {};
  }
}

export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const { auth = true, headers, ...requestOptions } = options;
  const requestHeaders = new Headers(headers);

  if (!requestHeaders.has("Content-Type") && requestOptions.body) {
    requestHeaders.set("Content-Type", "application/json");
  }

  if (auth) {
    Object.entries(getSessionHeaders()).forEach(([key, value]) => requestHeaders.set(key, value));
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...requestOptions,
    headers: requestHeaders,
  });

  if (!response.ok) {
    let message = "Something went wrong. Please try again.";
    try {
      const data = (await response.json()) as { detail?: string };
      if (data.detail) {
        message = data.detail;
      }
    } catch {
      // Keep friendly fallback.
    }
    throw new ApiError(message, response.status);
  }

  return response.json() as Promise<T>;
}
