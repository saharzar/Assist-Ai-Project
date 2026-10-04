import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchSonioxUsage } from "./speechProviderService";

afterEach(() => vi.unstubAllGlobals());

describe("Soniox usage backend request", () => {
  it("uses only the application's admin token and never calls Soniox from the browser", async () => {
    vi.stubGlobal("localStorage", { getItem: () => "assist-ai-admin-token" });
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ month: "2026-10", total_cost_usd: "0.3" }), { status: 200 }));
    vi.stubGlobal("fetch", fetch);
    const signal = new AbortController().signal;
    await expect(fetchSonioxUsage(signal)).resolves.toEqual({ month: "2026-10", total_cost_usd: "0.3" });
    const [url, options] = fetch.mock.calls[0];
    expect(url).toMatch(/\/api\/admin\/speech-providers\/soniox-usage$/);
    expect(url).not.toContain("api.soniox.com");
    expect(options.headers.get("Authorization")).toBe("Bearer assist-ai-admin-token");
    expect(options.signal).toBe(signal);
    expect(options.cache).toBe("no-store");
  });
});
