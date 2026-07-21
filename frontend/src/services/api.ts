export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000";

type ApiRequestOptions = RequestInit & {
  auth?: boolean;
};

export class ApiError extends Error {
  status: number;
  url: string;
  responseBody: string;

  constructor(message = "Something went wrong. Please try again.", status = 0, url = "", responseBody = "") {
    super(message);
    this.status = status;
    this.url = url;
    this.responseBody = responseBody;
  }
}

function reportApiError(url: string, status: number, responseBody: string) {
  console.error("ASSIST-AI API request failed", { url, status, responseBody });
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
  if (!requestHeaders.has("Accept")) requestHeaders.set("Accept", "application/json");

  if (auth) {
    Object.entries(getSessionHeaders()).forEach(([key, value]) => requestHeaders.set(key, value));
  }

  const url = `${API_BASE_URL}${path}`;
  const method = (requestOptions.method ?? "GET").toUpperCase();
  const fetchOptions: RequestInit = {
    ...requestOptions,
    cache: requestOptions.cache ?? (method === "GET" ? "no-store" : undefined),
    headers: requestHeaders,
  };
  let response: Response;
  try {
    response = await fetch(url, fetchOptions);
  } catch (reason) {
    const responseBody = reason instanceof Error ? reason.message : String(reason);
    reportApiError(url, 0, responseBody);
    throw new ApiError("The server could not be reached.", 0, url, responseBody);
  }

  // A proxy or stale browser cache can expose a bodyless 304 to fetch. Retry
  // dynamic GETs once without validators so callers always receive JSON.
  if (response.status === 304 && method === "GET") {
    const retryHeaders = new Headers(requestHeaders);
    retryHeaders.delete("If-None-Match");
    retryHeaders.delete("If-Modified-Since");
    try {
      response = await fetch(url, { ...fetchOptions, cache: "reload", headers: retryHeaders });
    } catch (reason) {
      const responseBody = reason instanceof Error ? reason.message : String(reason);
      reportApiError(url, 0, responseBody);
      throw new ApiError("The server could not be reached.", 0, url, responseBody);
    }
  }

  const responseBody = await response.text();
  let data: unknown;
  if (responseBody) {
    try {
      data = JSON.parse(responseBody);
    } catch {
      reportApiError(url, response.status, responseBody.slice(0, 2000));
      throw new ApiError("The server returned an invalid response.", response.status, url, responseBody);
    }
  }

  if (!response.ok) {
    let message = "Something went wrong. Please try again.";
    if (data && typeof data === "object" && "detail" in data && typeof data.detail === "string") message = data.detail;
    reportApiError(url, response.status, responseBody.slice(0, 2000));
    throw new ApiError(message, response.status, url, responseBody);
  }

  if (response.status === 204) return undefined as T;
  if (data === undefined) {
    reportApiError(url, response.status, "<empty response body>");
    throw new ApiError("The server returned an empty response.", response.status, url, "");
  }
  return data as T;
}

export function expectArrayResponse<T>(payload: unknown, path: string, wrapperKeys: string[] = []): T[] {
  if (Array.isArray(payload)) return payload as T[];
  if (payload && typeof payload === "object") {
    for (const key of wrapperKeys) {
      const value = (payload as Record<string, unknown>)[key];
      if (Array.isArray(value)) return value as T[];
    }
  }
  const body = JSON.stringify(payload);
  reportApiError(`${API_BASE_URL}${path}`, 200, body);
  throw new ApiError("The server returned an unexpected list format.", 200, `${API_BASE_URL}${path}`, body);
}

export function expectObjectResponse<T extends object>(payload: unknown, path: string, requiredKeys: string[], wrapperKeys: string[] = []): T {
  let candidate = payload;
  if (payload && typeof payload === "object") {
    for (const key of wrapperKeys) {
      const value = (payload as Record<string, unknown>)[key];
      if (value && typeof value === "object" && !Array.isArray(value)) candidate = value;
    }
  }
  if (candidate && typeof candidate === "object" && !Array.isArray(candidate) && requiredKeys.every((key) => key in candidate!)) return candidate as T;
  const body = JSON.stringify(payload);
  reportApiError(`${API_BASE_URL}${path}`, 200, body);
  throw new ApiError("The server returned an unexpected object format.", 200, `${API_BASE_URL}${path}`, body);
}
