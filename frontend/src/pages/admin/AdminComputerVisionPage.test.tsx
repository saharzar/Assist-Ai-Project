import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AdminComputerVisionPage } from "./AdminComputerVisionPage";
import { adminComputerVisionTranslations } from "../../lib/adminComputerVisionTranslations";
import { computerVisionSummaryTranslations } from "../../lib/computerVisionSummaryTranslations";
import type { ComputerVisionMetrics } from "../../services/adminComputerVisionService";
import { ComputerVisionSessionSummary } from "../../components/ComputerVisionSessionSummary";

const state = vi.hoisted(() => ({ authenticated: true, role: "admin", sessionId: undefined as string | undefined, routeKey: undefined as string | undefined,
  values: [] as unknown[], index: 0 }));

vi.mock("react", async (original) => ({ ...await original<typeof import("react")>(),
  useState: (initial: unknown) => [state.values.length ? state.values[state.index++] : initial, vi.fn()],
}));
vi.mock("../../context/AuthContext", () => ({ useAuth: () => ({ isAuthenticated: state.authenticated, user: { role: state.role } }) }));
vi.mock("react-router-dom", async (original) => ({ ...await original<typeof import("react-router-dom")>(), useParams: () => ({ sessionId: state.sessionId, routeKey: state.routeKey }) }));
vi.mock("../../i18n", () => ({ useTranslation: () => ({ language: "en", translateScenario: (value: unknown) => value }) }));
vi.mock("../../components/HeadPoseCharts", () => ({ SavedHeadPoseCharts: ({ sessionId }: { sessionId: string }) => <section data-session={sessionId}>Head movement over time</section> }));

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
  state.authenticated = true; state.role = "admin"; state.sessionId = undefined; state.routeKey = undefined; state.values = []; state.index = 0;
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
    expect(html).not.toContain("attempt-456");
    expect(html).toContain("/admin/computer-vision/atm-withdrawal/sessions/record-123");
    expect(html).not.toContain(">101<");
    expect(html).not.toContain("Scenario attempt");
    expect(html).not.toContain("Samples");
    expect(html).toContain("View details");
    expect(html.match(/scope="col"/g)).toHaveLength(5);
  });

  it("shows scenario cards from shared scenario metadata at the recordings index", () => {
    const html = renderToStaticMarkup(<MemoryRouter><AdminComputerVisionPage view="index" /></MemoryRouter>);
    expect(html).toContain("Select a scenario to review its computer vision recordings.");
    expect(html).toContain("Withdrawing Money from an ATM");
    expect(html).toContain("Paying a Bill Online");
    expect(html).toContain("/admin/computer-vision/atm-withdrawal");
    expect(html).toContain("/admin/computer-vision/online-bill-payment");
    expect(html.match(/<article/g)).toHaveLength(12);
    expect(html).toContain("Coming soon");
  });

  it("shows only the selected scenario's sessions and keeps pagination metadata", () => {
    state.routeKey = "online-bill-payment";
    state.values = [1, { items: [{ ...session, scenario_key: "online-bill-payment" }], total: 11, page: 1, page_size: 10 }, null, false, false];
    const html = renderToStaticMarkup(<MemoryRouter><AdminComputerVisionPage view="route" /></MemoryRouter>);
    expect(html).toContain("Paying a Bill Online — Computer vision recordings");
    expect(html).toContain("/ 2");
    expect(html).toContain("/admin/computer-vision/online-bill-payment/sessions/record-123");
    expect(html).toContain("/admin/computer-vision");
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
    expect(html).toContain("Session Overview");
    expect(html).toContain("Excluding keyboard/mouse activity");
    expect(html.indexOf("Session Overview")).toBeLessThan(html.indexOf("Head movement over time"));
    expect(html.indexOf("Head movement over time")).toBeLessThan(html.indexOf("Show tracking data"));
    const disclosures = html.match(/<details[^>]*>/g);
    expect(disclosures).toHaveLength(2);
    expect(disclosures?.every((tag) => !tag.includes("open"))).toBe(true);
    const technical = html.slice(html.indexOf("<details"), html.indexOf("</details>"));
    expect(technical).toContain("attempt-456");
    expect(technical).toContain("record-123");
    expect(html).toContain('data-session="record-123"');
    expect(html).toContain("12.34");
    expect(html).toContain("24.75%");
    expect(html).toContain("49.5%");
  });

  it("shows null statistics as unavailable and zero percentages for an empty session", () => {
    const html = renderToStaticMarkup(<ComputerVisionSessionSummary durationMs={0} summary={{ all_samples: emptyMetrics, excluding_interaction: emptyMetrics }} />);
    expect(html).toContain("Unavailable");
    expect(html).toContain("0%");
    expect(html).not.toMatch(/NaN|Infinity/);
    const overview = html.split("<details")[0];
    expect(overview).toContain("0 sec");
    expect(overview).toContain("Unknown");
    expect(overview).not.toContain("0%"); // An empty session has no percentage denominator.
  });

  it("shows simple overview values while keeping all technical statistics collapsed", () => {
    const html = renderToStaticMarkup(<ComputerVisionSessionSummary durationMs={127313} summary={summary} />);
    const [overview, technical] = html.split("<details");
    expect(overview).toContain("2 min 7 sec");
    expect(overview).toContain("99%" );
    expect(overview).toContain("24.8%");
    expect(overview).toContain("Most common eye direction");
    expect(overview).toContain(">Left</dd>");
    expect(overview).toContain("Eye-direction changes");
    expect(overview).toContain(">9</dd>");
    expect(overview).toContain("Left / right movement range");
    expect(overview).toContain("Up / down movement range");
    expect(overview).toContain("Head tilt range");
    expect(overview).toContain("30°");
    expect(overview).not.toMatch(/Minimum|Maximum|Mean|Standard deviation|tracking points|<table/);
    expect(technical).toContain("Show technical details");
    expect(technical).toContain("Standard deviation");
    expect(technical).toContain("Valid tracking points");
    expect(technical).toContain("Tracking unavailable");
    expect(technical).toContain("Excluding keyboard/mouse activity");
    expect(technical).toContain("12.34");
    expect(html).not.toContain("<details open");
  });

  it("shows unknown or tied eye directions without inventing a dominant direction", () => {
    const metrics = { ...emptyMetrics, total_samples: 2, eye_direction: {
      ...emptyMetrics.eye_direction, left: { count: 1, percentage: 50 }, right: { count: 1, percentage: 50 },
    } };
    const html = renderToStaticMarkup(<ComputerVisionSessionSummary durationMs={1000} summary={{ all_samples: metrics, excluding_interaction: emptyMetrics }} />);
    expect(html.split("<details")[0]).toContain("Left / Right");
    const unavailable = { ...metrics, eye_direction: { ...emptyMetrics.eye_direction, unknown: { count: 2, percentage: 100 } } };
    const unknownHtml = renderToStaticMarkup(<ComputerVisionSessionSummary durationMs={1000} summary={{ all_samples: unavailable, excluding_interaction: emptyMetrics }} />);
    expect(unknownHtml.split("<details")[0]).toContain(">Unknown</dd>");
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
