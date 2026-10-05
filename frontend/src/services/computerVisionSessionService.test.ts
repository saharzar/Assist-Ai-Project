import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createComputerVisionSessionSubmission } from "./computerVisionSessionService";
import type { TrackingSample } from "./trackingSessionRecorder";

const sample: TrackingSample = { timestamp: 500, yaw: 10, pitch: 0, roll: 0, estimatedEyeDirection: "left", isUserInteracting: true };
const attemptId = "00000000-0000-4000-8000-000000000001";

describe("completed CV session submission", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-01T12:00:00Z"));
    vi.stubEnv("DEV", false);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));
  });
  afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

  it("posts only derived samples with captured owner headers and session timing", async () => {
    const submission = createComputerVisionSessionSubmission({ allowed: true, scenario: "atm-withdrawal",
      headers: { Authorization: "Bearer owner" }, getAttemptId: () => attemptId });
    submission.start();
    vi.advanceTimersByTime(500);
    await submission.finish([{ ...sample, landmarks: ["never sent"], video: "never sent" } as TrackingSample]);
    const [url, options] = vi.mocked(fetch).mock.calls[0];
    expect(url).toMatch(/\/api\/computer-vision-sessions$/);
    expect(options).toMatchObject({ method: "POST", keepalive: true, headers: { Authorization: "Bearer owner" } });
    const body = JSON.parse(options!.body as string);
    expect(body).toMatchObject({ consent: true, scenario_key: "atm-withdrawal", scenario_session_id: attemptId,
      started_at: "2026-10-01T12:00:00.000Z", ended_at: "2026-10-01T12:00:00.500Z", duration_ms: 500,
      samples: [sample] });
    expect(body.client_session_id).toMatch(/^[a-f\d-]{36}$/);
    expect(Object.keys(body.samples[0]).sort()).toEqual(Object.keys(sample).sort());
  });

  it("does not submit when consent is No, tracking never started, or no samples were collected", async () => {
    for (const allowed of [false, true]) {
      const submission = createComputerVisionSessionSubmission({ allowed, scenario: "atm-withdrawal", headers: {} });
      if (!allowed) submission.start();
      await submission.finish([sample]);
    }
    const empty = createComputerVisionSessionSubmission({ allowed: true, scenario: "atm-withdrawal", headers: {} });
    empty.start();
    await empty.finish([]);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("deduplicates repeated finish calls and retries with the same session identifier", async () => {
    const post = vi.fn().mockRejectedValueOnce(new Error("Response lost")).mockResolvedValue({});
    const submission = createComputerVisionSessionSubmission({ allowed: true, scenario: "online-bill-payment", headers: {}, post });
    submission.start();
    vi.advanceTimersByTime(500);
    const first = submission.finish([sample]);
    expect(submission.finish([sample])).toBe(first);
    await first;
    expect(post).toHaveBeenCalledTimes(2);
    expect(post.mock.calls[0][0]).toEqual(post.mock.calls[1][0]);
  });

  it("handles saving failure without rejecting completion", async () => {
    const post = vi.fn().mockRejectedValue(new Error("Offline"));
    const submission = createComputerVisionSessionSubmission({ allowed: true, scenario: "atm-withdrawal", headers: {}, post });
    submission.start();
    vi.advanceTimersByTime(500);
    await expect(submission.finish([sample])).resolves.toBeUndefined();
    await submission.finish([sample]);
    expect(post).toHaveBeenCalledTimes(2);
  });

  it("links a pending attempt without changing the recorded completion timing", async () => {
    let resolve!: (id: string) => void;
    const attempt = new Promise<string>((done) => { resolve = done; });
    const post = vi.fn().mockResolvedValue({});
    const submission = createComputerVisionSessionSubmission({ allowed: true, scenario: "atm-withdrawal", headers: {},
      getAttemptId: () => attempt, post });
    submission.start();
    vi.advanceTimersByTime(500);
    const finishing = submission.finish([sample]);
    expect(post).not.toHaveBeenCalled();
    vi.advanceTimersByTime(500);
    resolve(attemptId);
    await finishing;
    expect(post.mock.calls[0][0]).toMatchObject({ scenario_session_id: attemptId, duration_ms: 500 });
  });

  it("can save without an analytics attempt if analytics startup failed", async () => {
    const post = vi.fn().mockResolvedValue({});
    const submission = createComputerVisionSessionSubmission({ allowed: true, scenario: "online-bill-payment", headers: {},
      getAttemptId: () => Promise.reject(new Error("Analytics unavailable")), post });
    submission.start();
    vi.advanceTimersByTime(500);
    await submission.finish([sample]);
    expect(post.mock.calls[0][0].scenario_session_id).toBeNull();
  });

  it("uses normal fetch for completed runs larger than the browser keepalive limit", async () => {
    const submission = createComputerVisionSessionSubmission({ allowed: true, scenario: "atm-withdrawal", headers: {} });
    submission.start();
    vi.advanceTimersByTime(500_000);
    await submission.finish(Array.from({ length: 1000 }, (_, index) => ({ ...sample, timestamp: (index + 1) * 500 })));
    expect(vi.mocked(fetch).mock.calls[0][1]?.keepalive).toBe(false);
  });
});
