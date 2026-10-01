import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AdminComputerVisionPage } from "./AdminComputerVisionPage";
import { adminComputerVisionTranslations } from "../../lib/adminComputerVisionTranslations";

const state = vi.hoisted(() => ({ authenticated: true, role: "admin", sessionId: undefined as string | undefined,
  values: [] as unknown[], index: 0 }));

vi.mock("react", async (original) => ({ ...await original<typeof import("react")>(),
  useState: (initial: unknown) => [state.values.length ? state.values[state.index++] : initial, vi.fn()],
}));
vi.mock("../../context/AuthContext", () => ({ useAuth: () => ({ isAuthenticated: state.authenticated, user: { role: state.role } }) }));
vi.mock("react-router-dom", async (original) => ({ ...await original<typeof import("react-router-dom")>(), useParams: () => ({ sessionId: state.sessionId }) }));
vi.mock("../../i18n", () => ({ useTranslation: () => ({ language: "en", translateScenario: (value: unknown) => value }) }));

const session = { session_id: "record-123", actor_type: "guest", actor_reference: "42", display_name: null,
  scenario_key: "atm-withdrawal", scenario_session_id: "attempt-456", started_at: "2026-10-01T12:00:00Z",
  ended_at: "2026-10-01T12:00:01Z", duration_ms: 1000, sample_count: 101 };
const render = () => renderToStaticMarkup(<MemoryRouter><AdminComputerVisionPage /></MemoryRouter>);

beforeEach(() => {
  state.authenticated = true; state.role = "admin"; state.sessionId = undefined; state.values = []; state.index = 0;
});

describe("admin computer vision page", () => {
  it("does not render recordings for normal users", () => {
    state.role = "user";
    expect(render()).toContain("Access denied.");
    expect(state.index).toBe(0);
  });

  it("does not mount recording state for unauthenticated visitors", () => {
    state.authenticated = false;
    expect(render()).not.toContain("Computer vision recordings");
    expect(state.index).toBe(0);
  });

  it("renders metadata and the detail link", () => {
    state.values = [1, { items: [session], total: 1, page_size: 10 }, null, false, false];
    const html = render();
    expect(html).toContain("#42");
    expect(html).toContain("attempt-456");
    expect(html).toContain("/admin/computer-vision/record-123");
    expect(html).toContain("101");
  });

  it("renders nulls as unavailable and interaction with both a highlight and a text label", () => {
    state.sessionId = "record-123";
    state.values = [1, null, { session, page_size: 100, samples: [
      { timestamp: 500, yaw: 10, pitch: -5, roll: 2, estimatedEyeDirection: "left", isUserInteracting: true },
      { timestamp: 1000, yaw: null, pitch: null, roll: null, estimatedEyeDirection: null, isUserInteracting: false },
    ] }, false, false];
    const html = render();
    expect(html).toContain("bg-amber-50");
    expect(html).toContain(">Yes</span>");
    expect(html).toContain(">No</span>");
    expect(html).toContain("Unavailable");
    expect(html).toContain(">Left</td>");
    expect(html).toContain("1 / 2");
  });

  it("shows a loading failure without stale sample data", () => {
    state.values = [1, null, null, false, true];
    const html = render();
    expect(html).toContain('role="alert"');
    expect(html).not.toContain("<table");
  });

  it("provides every new label in each supported language", () => {
    expect(Object.keys(adminComputerVisionTranslations).sort()).toEqual(["de", "en", "es", "fr", "pt", "tr"]);
    const keys = Object.keys(adminComputerVisionTranslations.en).sort();
    for (const translation of Object.values(adminComputerVisionTranslations)) {
      expect(Object.keys(translation).sort()).toEqual(keys);
      expect(Object.values(translation).every((label) => label.trim().length > 0)).toBe(true);
    }
  });
});
