import { API_BASE_URL } from "./api";
import type { TrackingSample } from "./trackingSessionRecorder";

export type ComputerVisionScenario = "atm-withdrawal" | "online-bill-payment";
export type ScenarioAttemptId = string | null | Promise<string | null>;
type CompletedSession = {
  client_session_id: string;
  consent: true;
  scenario_key: ComputerVisionScenario;
  scenario_session_id: string | null;
  started_at: string;
  ended_at: string;
  duration_ms: number;
  samples: TrackingSample[];
};
type Options = {
  allowed: boolean;
  scenario: ComputerVisionScenario;
  headers: Record<string, string>;
  getAttemptId?: () => ScenarioAttemptId;
  post?: (payload: CompletedSession) => Promise<unknown>;
};

export function createComputerVisionSessionSubmission({ allowed, scenario, headers, getAttemptId, post }: Options) {
  let started: { id: string; wallTime: number; clock: number } | null = null;
  let finished = false;
  let submission: Promise<void> | null = null;
  const send = post ?? (async (payload: CompletedSession) => {
    const body = JSON.stringify(payload);
    const response = await fetch(`${API_BASE_URL}/api/computer-vision-sessions`, {
      method: "POST", headers: { "Content-Type": "application/json", ...headers }, body,
      // Browsers cap keepalive request bodies at 64 KiB. Larger completed runs
      // use normal fetch, which survives navigation inside this React app.
      keepalive: new TextEncoder().encode(body).byteLength <= 60_000,
    });
    if (!response.ok) throw new Error("Computer vision session could not be saved.");
  });

  async function save(payload: CompletedSession) {
    try { await send(payload); }
    catch {
      // One retry with the same UUID is safe even if the first response was lost.
      try { await send(payload); }
      catch {
        if (import.meta.env.DEV) console.warn("[Face tracking] Session save failed. The scenario can continue.");
      }
    }
  }

  return {
    start() {
      if (allowed && !started && !finished) {
        started = { id: crypto.randomUUID(), wallTime: Date.now(), clock: performance.now() };
      }
    },
    finish(samples: TrackingSample[]): Promise<void> {
      if (finished) return submission ?? Promise.resolve();
      finished = true;
      if (!allowed || !started || samples.length === 0) return Promise.resolve();
      const duration = Math.max(Math.round(performance.now() - started.clock), samples[samples.length - 1].timestamp);
      const payload: CompletedSession = {
        client_session_id: started.id, consent: true, scenario_key: scenario, scenario_session_id: null,
        started_at: new Date(started.wallTime).toISOString(),
        ended_at: new Date(started.wallTime + duration).toISOString(), duration_ms: duration,
        // Explicit allowlist prevents accidental future transmission of raw landmarks/media.
        samples: samples.map(({ timestamp, yaw, pitch, roll, estimatedEyeDirection, isUserInteracting }) => ({
          timestamp, yaw, pitch, roll, estimatedEyeDirection, isUserInteracting,
        })),
      };
      let attempt: ScenarioAttemptId = null;
      try { attempt = getAttemptId?.() ?? null; } catch { /* The recording can exist without analytics. */ }
      if (attempt && typeof attempt !== "string") {
        submission = attempt.catch(() => null).then((id) => save({ ...payload, scenario_session_id: id }));
      } else {
        // Dispatch immediately when the attempt is already known, including on pagehide.
        submission = save({ ...payload, scenario_session_id: attempt });
      }
      return submission;
    },
  };
}
