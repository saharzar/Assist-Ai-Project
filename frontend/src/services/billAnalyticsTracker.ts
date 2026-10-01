import type { BillPaymentStep, BillType } from "../lib/billPaymentState";

export type BillEventType = "progress" | "login_success" | "login_failed" | "validation_error" | "payment_success" | "back_navigation";
export type BillFinishReason = "exit" | "inactivity_timeout" | "login_locked";
type Event = { client_event_id: string; event_type: BillEventType; step: BillPaymentStep; bill_type?: BillType };
type Post = (path: string, body: object) => Promise<{ session_id?: string | null }>;

export function createBillAnalyticsTracker(post: Post, language: string) {
  let session: Promise<string | null> | null = null;
  let sessionId: string | null = null;
  let queue = Promise.resolve();
  let finished = false;
  const pending = new Map<string, Event>();
  const start = () => session ??= post("start", { selected_language: language })
    .then((result) => sessionId = result.session_id ?? null).catch(() => null);
  const send = async (path: string, body: object) => {
    try { await post(path, body); }
    catch { await post(path, body); }
  };
  return {
    start,
    getSessionId: () => sessionId ?? session,
    event(event_type: BillEventType, step: BillPaymentStep, bill_type?: BillType) {
      if (finished) return;
      const event = { client_event_id: crypto.randomUUID(), event_type, step, bill_type };
      pending.set(event.client_event_id, event);
      const ready = start();
      queue = queue.then(async () => {
        const id = await ready;
        if (!id || finished) return;
        await send(`${id}/events`, event);
        pending.delete(event.client_event_id);
      }).catch(() => { /* Preserve failed events for the final flush. */ });
    },
    finish(reason: BillFinishReason, step: BillPaymentStep) {
      if (finished || !session) return;
      finished = true;
      const body = { reason, final_step_reached: step, pending_events: [...pending.values()] };
      // Dispatch synchronously when possible: pagehide may be the last JS task.
      // The server deduplicates the pending events against in-flight requests.
      const flush = (id: string | null) => id ? send(`${id}/finish`, body).catch(() => {}) : Promise.resolve();
      if (sessionId) return flush(sessionId);
      return session.then(flush);
    },
  };
}
