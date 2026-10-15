import { beforeEach, describe, expect, it, vi } from "vitest";
import { ScenarioTrackingLayout, useScenarioTracking } from "./ScenarioTrackingContext";
import { useFaceTracking } from "../hooks/useFaceTracking";
import type { ScenarioAttemptId } from "../services/computerVisionSessionService";

const state = vi.hoisted(() => ({ active: true, session: null as unknown,
  attempt: { current: undefined as (() => ScenarioAttemptId) | undefined },
  setActive: vi.fn(), effects: [] as Array<() => void | (() => void)>,
  tracking: { getPreviewFrame: vi.fn(), getCompletedSamples: vi.fn() },
}));
vi.mock("react", async (original) => ({ ...await original<typeof import("react")>(),
  useState: () => [state.active, state.setActive],
  useRef: () => state.attempt,
  useContext: () => state.session,
  useLayoutEffect: (effect: () => void | (() => void)) => { state.effects.push(effect); },
}));
vi.mock("react-router-dom", () => ({ Outlet: () => null }));
vi.mock("../hooks/useFaceTracking", () => ({ useFaceTracking: vi.fn(() => state.tracking) }));
vi.mock("../i18n", () => ({ useTranslation: () => ({ language: "en" }) }));
vi.mock("../hooks/useBillAnalytics", () => ({ useBillAnalytics: () => ({ getSessionId: () => "bill-setup-id" }) }));
vi.mock("../hooks/useAtmSetupAnalytics", () => ({ useAtmSetupAnalytics: () => ({ getSessionId: () => "atm-setup-id", claim: vi.fn() }) }));

function layout(scenario: "atm-withdrawal" | "online-bill-payment" = "atm-withdrawal") {
  const element = ScenarioTrackingLayout({ scenario });
  state.session = element.props.value;
}
function page(active = true, getAttemptId?: () => ScenarioAttemptId) {
  const tracking = useScenarioTracking(active, getAttemptId);
  const cleanups = state.effects.splice(0).map((effect) => effect());
  return { tracking, leave: () => cleanups.forEach((cleanup) => { if (typeof cleanup === "function") cleanup(); }) };
}

beforeEach(() => {
  vi.clearAllMocks(); state.active = true; state.session = null;
  state.attempt.current = undefined; state.effects = [];
  state.setActive.mockImplementation((active: boolean) => { state.active = active; });
});

describe("shared setup and activity tracking", () => {
  it.each(["atm-withdrawal", "online-bill-payment"] as const)("starts %s tracking at account setup", (scenario) => {
    layout(scenario);
    const setup = page();
    expect(useFaceTracking).toHaveBeenCalledWith(scenario, true, expect.any(Function));
    expect(setup.tracking).toBe(state.tracking);
    expect(state.attempt.current).toBeUndefined();
  });

  it("reuses the layout tracker across setup and practice without stopping on child navigation", () => {
    layout(); const setup = page(); setup.leave();
    const practice = page(true, () => "attempt-id");
    expect(practice.tracking).toBe(setup.tracking);
    expect(useFaceTracking).toHaveBeenCalledOnce();
    expect(state.setActive.mock.calls.every(([active]) => active === true)).toBe(true);
    // The same deferred getter supplied before setup now resolves the activity ID.
    expect(vi.mocked(useFaceTracking).mock.calls[0][2]!()).toBe("attempt-id");
    practice.leave();
    expect(vi.mocked(useFaceTracking).mock.calls[0][2]!()).toBe("attempt-id");
  });

  it("passes terminal, timeout and termination states to the existing cleanup hook", () => {
    layout(); page(); page(false, () => "attempt-id"); layout();
    expect(useFaceTracking).toHaveBeenLastCalledWith("atm-withdrawal", false, expect.any(Function));
  });

  it.each(["atm-withdrawal", "online-bill-payment"] as const)("links setup-only recordings to the %s analytics attempt", (scenario) => {
    layout(scenario); const setup = page(); setup.leave();
    expect(vi.mocked(useFaceTracking).mock.calls[0][2]!()).toBe(scenario === "atm-withdrawal" ? "atm-setup-id" : "bill-setup-id");
  });
});
