import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdminSpeechProvidersPage } from "./AdminSpeechProvidersPage";
import type { GlobalSpeechDashboard } from "../../services/speechProviderService";
import type { LanguageCode } from "../../i18n";

const state = vi.hoisted(() => ({ values: [] as unknown[], index: 0, language: "en" as LanguageCode }));
vi.mock("react", async (original) => ({ ...await original<typeof import("react")>(),
  useState: (initial: unknown) => [state.index < state.values.length ? state.values[state.index++] : initial, vi.fn()], useEffect: vi.fn(),
}));
vi.mock("../../context/AuthContext", () => ({ useAuth: () => ({ isAuthenticated: true, user: { role: "admin" } }) }));
vi.mock("../../i18n", () => ({ useTranslation: () => ({ language: state.language }) }));
vi.mock("../../components/admin/SonioxUsageCard", () => ({ SonioxUsageCard: () => <section>Official Soniox usage</section> }));

const dashboard: GlobalSpeechDashboard = {
  estimate_notice: "Estimated usage", automatic_tts_routing_enabled: true, automatic_stt_routing_enabled: true,
  forced_tts_provider_key: null, forced_stt_provider_key: null, active_tts_provider: "soniox", active_stt_provider: "soniox",
  capabilities: [], events: [],
  usage_history: [{ billing_period: "2026-09-01", service_type: "tts", provider: "soniox", characters_used: 33761,
    audio_seconds_used: 0, successful_requests: 200, failed_requests: 0, cached_requests: 0 }],
  current_month_usage: { month: "2026-10-01", items: [{ provider: "soniox", service_type: "tts", characters_used: 727, audio_seconds_used: 0 }] },
};
function render(value = dashboard) {
  state.values = [value, value, "", false, "", false, "routing", "stt"]; state.index = 0;
  return renderToStaticMarkup(<MemoryRouter><AdminSpeechProvidersPage /></MemoryRouter>);
}
beforeEach(() => { state.language = "en"; });

describe("speech provider monthly overview", () => {
  it("shows the current UTC month instead of summing historical usage", () => {
    const html = render();
    expect(html).toContain("727 characters");
    expect(html).toContain("0 minutes");
    expect(html).not.toContain("33,761");
    expect(html).toContain("STT usage (this month)");
    expect(html).toContain("TTS characters (this month)");
    expect(html).toContain("October 2026 (UTC)");
    expect(html).toContain("Official Soniox usage");
    expect(html).not.toContain("30 days");
  });

  it("shows zero totals for an unused month even when historical usage exists", () => {
    const html = render({ ...dashboard, current_month_usage: { ...dashboard.current_month_usage, items: [] } });
    expect(html).toContain("0 characters"); expect(html).toContain("0 minutes");
    expect(html).not.toContain("33,761");
  });

  it("sums current-month usage across providers", () => {
    const html = render({ ...dashboard, current_month_usage: { ...dashboard.current_month_usage, items: [
      ...dashboard.current_month_usage.items,
      { provider: "browser", service_type: "tts", characters_used: 20, audio_seconds_used: 0 },
      { provider: "soniox", service_type: "stt", characters_used: 0, audio_seconds_used: 90 },
    ] } });
    expect(html).toContain("747 characters"); expect(html).toContain("1.5 minutes");
  });

  it.each(["en", "es", "de", "tr", "pt", "fr"] as const)("updates monthly labels in %s", (language) => {
    state.language = language;
    const html = render();
    expect(html).not.toMatch(/30 days|30 días|30 Tage|30 gün|30 dias|30 jours/);
    expect(html).toContain("(UTC)");
  });
});
