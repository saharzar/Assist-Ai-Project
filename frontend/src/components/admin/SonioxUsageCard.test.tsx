import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SonioxUsageCard, SonioxUsageContent } from "./SonioxUsageCard";
import { AdminSpeechProvidersPage } from "../../pages/admin/AdminSpeechProvidersPage";
import { fetchSonioxUsage, type SonioxUsageSummary } from "../../services/speechProviderService";
import { sonioxUsageTranslations } from "../../lib/sonioxUsageTranslations";

const state = vi.hoisted(() => ({ authenticated: true, role: "admin", effects: [] as Array<() => (() => void) | void>, setter: vi.fn() }));
vi.mock("react", async (original) => ({ ...await original<typeof import("react")>(),
  useState: (initial: unknown) => [initial, state.setter],
  useEffect: (effect: () => (() => void) | void) => { state.effects.push(effect); },
}));
vi.mock("../../context/AuthContext", () => ({ useAuth: () => ({ isAuthenticated: state.authenticated, user: { role: state.role } }) }));
vi.mock("../../i18n", () => ({ useTranslation: () => ({ language: "en" }) }));
vi.mock("../../services/speechProviderService", () => ({ fetchSonioxUsage: vi.fn(), fetchGlobalSpeechDashboard: vi.fn(),
  notifySpeechProviderUpdated: vi.fn(), updateGlobalSpeechRouting: vi.fn(), testSpeechProvider: vi.fn() }));

const usage: SonioxUsageSummary = {
  month: "2026-10", period_start: "2026-10-01T00:00:00Z", period_end: "2026-11-01T00:00:00Z", updated_at: "2026-10-04T12:00:00Z",
  total_cost_usd: "0.3000000000", total_requests: 15,
  models: [{ model: "stt-rt-v5", cost_usd: "0.1", requests: 10 }, { model: "tts-rt-v1", cost_usd: "0.2", requests: 5 }],
  daily: [{ date: "2026-10-01", cost_usd: "0.3", requests: 15 }],
};
const render = (value: SonioxUsageSummary | null = usage, loading = false, error = false) => renderToStaticMarkup(
  <SonioxUsageContent usage={value} loading={loading} error={error} onRefresh={vi.fn()} />,
);

beforeEach(() => { vi.clearAllMocks(); state.authenticated = true; state.role = "admin"; state.effects = []; });

describe("Soniox official usage card", () => {
  it("renders provider-reported month, total cost, models, daily costs and update time", () => {
    const html = render();
    expect(html).toContain("Official usage for this Soniox project");
    expect(html).toContain("October 2026");
    expect(html).toContain("$0.30");
    expect(html).toContain("stt-rt-v5"); expect(html).toContain("tts-rt-v1");
    expect(html).toContain("$0.10"); expect(html).toContain("$0.20");
    expect(html).toContain("Show daily usage"); expect(html).not.toContain("<details open");
    expect(html).toContain('dateTime="2026-10-04T12:00:00Z"');
    expect(html).toContain("Last updated"); expect(html).toContain("UTC");
    expect(html).not.toMatch(/balance|Authorization|api_key/);
  });

  it("mounts on the existing admin page independently of internal dashboard loading", () => {
    const html = renderToStaticMarkup(<AdminSpeechProvidersPage />);
    expect(html).toContain("Speech Provider Management");
    expect(html).toContain("Official usage for this Soniox project");
  });

  it.each(["user", "guest"])("does not render or fetch for %s", (role) => {
    state.role = role;
    expect(renderToStaticMarkup(<SonioxUsageCard />)).toBe("");
    expect(state.effects).toEqual([]);
    expect(fetchSonioxUsage).not.toHaveBeenCalled();
  });

  it("does not render or fetch for unauthenticated visitors", () => {
    state.authenticated = false;
    expect(renderToStaticMarkup(<SonioxUsageCard />)).toBe("");
    expect(state.effects).toEqual([]);
  });

  it("shows zero cost for an empty month, rather than an error", () => {
    const html = render({ ...usage, total_cost_usd: "0", total_requests: 0, models: [], daily: [] });
    expect(html).toContain("$0.00"); expect(html).toContain("No Soniox usage this month.");
    expect(html).not.toMatch(/NaN|Infinity/);
  });

  it("keeps provider failures local to the card and never displays stale totals", () => {
    const html = render(usage, false, true);
    expect(html).toContain('role="alert"');
    expect(html).toContain("You can still manage speech providers.");
    expect(html).not.toContain("$0.30");
    expect(html).toContain(">Refresh</button>");
  });

  it("does not display totals until the request completes", () => {
    const html = render(usage, true);
    expect(html).toContain('role="status"'); expect(html).toContain('disabled=""');
    expect(html).not.toContain("$0.30");
  });

  it("fetches through the backend and aborts on leaving the page", async () => {
    vi.mocked(fetchSonioxUsage).mockResolvedValue(usage);
    renderToStaticMarkup(<SonioxUsageCard />);
    const cleanup = state.effects[0]();
    await Promise.resolve();
    expect(state.setter).toHaveBeenCalledWith(usage);
    const signal = vi.mocked(fetchSonioxUsage).mock.calls[0][0]!;
    expect(signal.aborted).toBe(false);
    if (typeof cleanup === "function") cleanup();
    expect(signal.aborted).toBe(true);
  });

  it("ignores a late response after cleanup", async () => {
    let resolve!: (value: SonioxUsageSummary) => void;
    vi.mocked(fetchSonioxUsage).mockReturnValue(new Promise((done) => { resolve = done; }));
    renderToStaticMarkup(<SonioxUsageCard />);
    const cleanup = state.effects[0]();
    if (typeof cleanup === "function") cleanup();
    state.setter.mockClear(); resolve(usage); await Promise.resolve();
    expect(state.setter).not.toHaveBeenCalled();
  });

  it("provides complete wording in all six app languages", () => {
    expect(Object.keys(sonioxUsageTranslations).sort()).toEqual(["de", "en", "es", "fr", "pt", "tr"]);
    for (const text of Object.values(sonioxUsageTranslations)) {
      expect(Object.keys(text).sort()).toEqual(Object.keys(sonioxUsageTranslations.en).sort());
      expect(Object.values(text).every((value) => value.trim())).toBe(true);
    }
  });
});
