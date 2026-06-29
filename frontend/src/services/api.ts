const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000";

type ApiRequestOptions = RequestInit & {
  auth?: boolean;
};

export class ApiError extends Error {
  constructor(message = "Something went wrong. Please try again.") {
    super(message);
  }
}

export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const { auth = true, headers, ...requestOptions } = options;
  const token = localStorage.getItem("assist_ai_token");
  const requestHeaders = new Headers(headers);

  if (!requestHeaders.has("Content-Type") && requestOptions.body) {
    requestHeaders.set("Content-Type", "application/json");
  }

  if (auth && token) {
    requestHeaders.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...requestOptions,
    headers: requestHeaders,
  });

  if (!response.ok) {
    throw new ApiError();
  }

  return response.json() as Promise<T>;
}
