import { describe, expect, it } from "vitest";
import { createBillAnalyticsTracker } from "./billAnalyticsTracker";

const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("bill analytics lifecycle", () => {
  it("flushes pending payments on exit even before session creation resolves", async () => {
    const calls: Array<{ path: string; body: object }> = [];
    let resolveStart!: (value: { session_id: string }) => void;
    const tracker = createBillAnalyticsTracker(async (path, body) => {
      calls.push({ path, body });
      if (path === "start") return new Promise((resolve) => { resolveStart = resolve; });
      return {};
    }, "en");
    tracker.event("payment_success", "success", "water");
    const finished = tracker.finish("exit", "success");
    resolveStart({ session_id: "session" });
    await finished;
    expect(calls.map((call) => call.path)).toEqual(["start", "session/finish"]);
    expect(calls[1].body).toMatchObject({ pending_events: [{ event_type: "payment_success", bill_type: "water" }] });
    tracker.event("login_failed", "login");
    tracker.finish("login_locked", "login");
    expect(calls).toHaveLength(2);
  });

  it("sends no events for guests who decline tracking", async () => {
    const calls: string[] = [];
    const tracker = createBillAnalyticsTracker(async (path) => { calls.push(path); return { session_id: null }; }, "en");
    tracker.event("login_success", "bill-selection");
    await tick();
    await tracker.finish("exit", "bill-selection");
    expect(calls).toEqual(["start"]);
  });

  it("retries with the same event ID and finishes immediately while an event is in flight", async () => {
    const calls: Array<{ path: string; body: object }> = [];
    let attempts = 0;
    const tracker = createBillAnalyticsTracker(async (path, body) => {
      calls.push({ path, body });
      if (path === "start") return { session_id: "session" };
      if (path.endsWith("events") && ++attempts === 1) throw new Error("network failure");
      return {};
    }, "tr");
    tracker.event("login_failed", "login");
    await tick();
    expect(calls[1].body).toEqual(calls[2].body);
    tracker.event("payment_success", "success", "water");
    const finished = tracker.finish("exit", "success");
    expect(calls[calls.length - 1]?.path).toBe("session/finish");
    await finished;
    expect(calls[calls.length - 1]?.body).toMatchObject({ pending_events: [{ event_type: "payment_success" }] });
  });
});

