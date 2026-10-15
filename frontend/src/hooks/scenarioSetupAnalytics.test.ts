import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useBillAnalytics } from "./useBillAnalytics";
import { useAtmSetupAnalytics } from "./useAtmSetupAnalytics";

const hooks = vi.hoisted(() => ({
  refs: [] as Array<{ current: unknown }>, refIndex: 0, effectIndex: 0,
  effects: [] as Array<{ deps: unknown[]; cleanup?: () => void }>,
  pending: [] as Array<() => void>,
  startAtm: vi.fn(), eventAtm: vi.fn(), abandonAtm: vi.fn(),
}));
vi.mock("react", () => ({
  useRef: (initial: unknown) => {
    const index = hooks.refIndex++;
    return hooks.refs[index] ?? (hooks.refs[index] = { current: initial });
  },
  useCallback: (callback: unknown) => callback,
  useEffect: (setup: () => void | (() => void), deps: unknown[]) => {
    const index = hooks.effectIndex++;
    const previous = hooks.effects[index];
    if (previous && deps.every((value, i) => Object.is(value, previous.deps[i]))) return;
    hooks.pending.push(() => {
      previous?.cleanup?.();
      const cleanup = setup();
      hooks.effects[index] = { deps, cleanup: typeof cleanup === "function" ? cleanup : undefined };
    });
  },
}));
vi.mock("../context/AuthContext", () => ({ useAuth: () => ({ token: "test-owner", guestSessionToken: null }) }));
vi.mock("../services/atmAnalyticsService", () => ({ startAtmAnalyticsSession: hooks.startAtm,
  recordAtmAnalyticsEvent: hooks.eventAtm, abandonAtmAnalyticsSession: hooks.abandonAtm }));

function render<T>(hook: () => T): T {
  hooks.refIndex = 0; hooks.effectIndex = 0;
  const result = hook(); hooks.pending.splice(0).forEach((effect) => effect()); return result;
}
const exit = () => hooks.effects.forEach((effect) => effect.cleanup?.());
const requests = () => vi.mocked(fetch).mock.calls.map(([url, options]) => ({ url: String(url), body: JSON.parse(options!.body as string) }));

beforeEach(() => {
  vi.useFakeTimers(); vi.clearAllMocks();
  hooks.refs = []; hooks.effects = []; hooks.pending = [];
  hooks.startAtm.mockResolvedValue("atm-id"); hooks.eventAtm.mockResolvedValue({}); hooks.abandonAtm.mockResolvedValue({});
  vi.stubGlobal("window", Object.assign(new EventTarget(), { setTimeout, clearTimeout }));
  vi.stubGlobal("fetch", vi.fn(async (url: string) => ({ ok: true, json: async () => url.endsWith("/start") ? { session_id: "bill-id" } : {} })));
});
afterEach(() => { exit(); vi.useRealTimers(); vi.unstubAllGlobals(); });

describe("analytics starts at setup", () => {
  it("saves a setup-only bill visit once on exit", async () => {
    render(() => useBillAnalytics("en", "setup")); await vi.advanceTimersByTimeAsync(10);
    exit(); window.dispatchEvent(new Event("pagehide")); await vi.advanceTimersByTimeAsync(0);
    const finished = requests().filter((request) => request.url.endsWith("/finish"));
    expect(finished).toHaveLength(1);
    expect(finished[0].body).toMatchObject({ final_step_reached: "setup", reason: "exit" });
  });
  it("keeps one bill attempt from setup through login and multiple payments", async () => {
    const setup = render(() => useBillAnalytics("en", "setup")); await vi.advanceTimersByTimeAsync(10);
    render(() => useBillAnalytics("en", "login")); await vi.advanceTimersByTimeAsync(10);
    render(() => useBillAnalytics("en", "success")); await vi.advanceTimersByTimeAsync(10);
    const practice = render(() => useBillAnalytics("en", "bill-selection")); await vi.advanceTimersByTimeAsync(10);
    expect(setup.getSessionId()).toBe(practice.getSessionId());
    expect(requests().filter((request) => request.url.endsWith("/start"))).toHaveLength(1);
    expect(requests().filter((request) => request.url.endsWith("/finish"))).toHaveLength(0);
    exit(); await vi.advanceTimersByTimeAsync(0);
    expect(requests().filter((request) => request.url.endsWith("/finish"))).toHaveLength(1);
  });
  it("does not create bill analytics for the ATM layout", async () => {
    render(() => useBillAnalytics("en", "setup", false)); await vi.advanceTimersByTimeAsync(10);
    exit(); expect(fetch).not.toHaveBeenCalled();
  });
  it("starts ATM analytics in setup and abandons it if the user leaves there", async () => {
    render(() => useAtmSetupAnalytics("en", true)); await vi.advanceTimersByTimeAsync(10);
    exit(); await vi.advanceTimersByTimeAsync(0);
    expect(hooks.startAtm).toHaveBeenCalledOnce();
    expect(hooks.eventAtm).toHaveBeenCalledWith("atm-id", expect.objectContaining({ final_step_reached: "setup" }));
    expect(hooks.abandonAtm).toHaveBeenCalledExactlyOnceWith("atm-id", "setup", "test-owner", null);
  });
  it("hands the existing ATM attempt to practice without abandoning or duplicating it", async () => {
    const setup = render(() => useAtmSetupAnalytics("en", true)); await vi.advanceTimersByTimeAsync(10);
    expect(await setup.claim()).toBe("atm-id"); exit(); await vi.advanceTimersByTimeAsync(0);
    expect(hooks.startAtm).toHaveBeenCalledOnce(); expect(hooks.abandonAtm).not.toHaveBeenCalled();
  });
  it("does not create a phantom ATM attempt during an immediate StrictMode cleanup", async () => {
    render(() => useAtmSetupAnalytics("en", true)); exit(); await vi.advanceTimersByTimeAsync(10);
    expect(hooks.startAtm).not.toHaveBeenCalled(); expect(hooks.abandonAtm).not.toHaveBeenCalled();
  });
});
