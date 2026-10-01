import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AdminComputerVisionPage } from "./AdminComputerVisionPage";
import { adminComputerVisionTranslations } from "../../lib/adminComputerVisionTranslations";
import { computerVisionSummaryTranslations } from "../../lib/computerVisionSummaryTranslations";
import type { ComputerVisionMetrics } from "../../services/adminComputerVisionService";
import { ComputerVisionSessionSummary } from "../../components/ComputerVisionSessionSummary";

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
const emptyAxis = { minimum: null, maximum: null, mean: null, standard_deviation: null, range: null };
const emptyMetrics: ComputerVisionMetrics = {
  total_samples: 0, valid_samples: 0, missing_samples: 0, interacting_samples: 0, interacting_percentage: 0,
  head_pose: { yaw: emptyAxis, pitch: emptyAxis, roll: emptyAxis },
  eye_direction: { left: { count: 0, percentage: 0 }, center: { count: 0, percentage: 0 },
    right: { count: 0, percentage: 0 }, unknown: { count: 0, percentage: 0 } }, eye_direction_changes: 0,
};
const summary = { all_samples: { ...emptyMetrics, total_samples: 101, valid_samples: 100, missing_samples: 1,
  interacting_samples: 25, interacting_percentage: 24.75, eye_direction_changes: 9,
  head_pose: { ...emptyMetrics.head_pose, yaw: { minimum: -10, maximum: 20, mean: 5, standard_deviation: 12.34, range: 30 } },
  eye_direction: { ...emptyMetrics.eye_direction, left: { count: 50, percentage: 49.5 } },
}, excluding_interaction: { ...emptyMetrics, total_samples: 76 } };
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
    state.values = [1, null, { session, summary, page_size: 100, samples: [
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
    expect(html).toContain("Session Summary");
    expect(html).toContain("Excluding interaction samples");
    expect(html.indexOf("Session Summary")).toBeLessThan(html.indexOf("Elapsed time (ms)"));
    expect(html).toContain("12.34");
    expect(html).toContain("24.75%");
    expect(html).toContain("49.5%");
  });

  it("shows null statistics as unavailable and zero percentages for an empty session", () => {
    const html = renderToStaticMarkup(<ComputerVisionSessionSummary summary={{ all_samples: emptyMetrics, excluding_interaction: emptyMetrics }} />);
    expect(html).toContain("Unavailable");
    expect(html).toContain("0%");
    expect(html).not.toMatch(/NaN|Infinity/);
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
    expect(Object.keys(computerVisionSummaryTranslations).sort()).toEqual(["de", "en", "es", "fr", "pt", "tr"]);
    const summaryKeys = Object.keys(computerVisionSummaryTranslations.en).sort();
    for (const translation of Object.values(computerVisionSummaryTranslations)) {
      expect(Object.keys(translation).sort()).toEqual(summaryKeys);
      expect(Object.values(translation).every((label) => label.trim().length > 0)).toBe(true);
    }
  });
});
