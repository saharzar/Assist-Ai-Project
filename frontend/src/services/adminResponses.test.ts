import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError, apiRequest } from "./api";
import { fetchAdminUsers } from "./adminService";
import { fetchGlobalSpeechDashboard } from "./speechProviderService";

const storage = new Map<string, string>();

beforeEach(() => {
  storage.clear();
  vi.restoreAllMocks();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
    removeItem: (key: string) => storage.delete(key),
  });
});

describe("admin API response parsing", () => {
  it("accepts the backend's direct user array and an empty pending array", async () => {
    const user = {
      id: 2, email: "person@example.com", full_name: "Person", user_category: "personal",
      preferred_language: "en", role: "user", approval_status: "approved", approved_by: 1,
      approved_at: null, denied_at: null, rejection_reason: null, is_active: true,
      created_at: "2026-07-21T10:00:00Z", updated_at: "2026-07-21T10:00:00Z",
    };
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(Response.json([user]))
      .mockResolvedValueOnce(Response.json([]));
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchAdminUsers("all")).resolves.toEqual([user]);
    await expect(fetchAdminUsers("pending")).resolves.toEqual([]);
  });

  it("accepts the exact global speech dashboard response format", async () => {
    const dashboard = {
      estimate_notice: "Estimated usage", automatic_tts_routing_enabled: true,
      automatic_stt_routing_enabled: true, forced_tts_provider_key: null,
      forced_stt_provider_key: null, active_tts_provider: "azure", active_stt_provider: "soniox",
      capabilities: [], usage_history: [], events: [],
    };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json(dashboard)));

    await expect(fetchGlobalSpeechDashboard()).resolves.toEqual(dashboard);
  });

  it("retries a bodyless 304 and returns the fresh JSON response", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(null, { status: 304 }))
      .mockResolvedValueOnce(Response.json({ status: "ok" }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(apiRequest<{ status: string }>("/health", { auth: false })).resolves.toEqual({ status: "ok" });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("includes URL, status, and response body for invalid JSON", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("<html>wrong upstream</html>", {
      status: 200, headers: { "Content-Type": "text/html" },
    })));

    const error = await apiRequest("/api/admin/users", { auth: false }).catch((reason: unknown) => reason) as ApiError;
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 200, responseBody: "<html>wrong upstream</html>" });
    expect(error.url).toMatch(/\/api\/admin\/users$/);
  });
});
