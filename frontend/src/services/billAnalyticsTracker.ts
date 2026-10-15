import type { BillPaymentStep, BillType } from "../lib/billPaymentState";
import { createScenarioAnalyticsTracker } from "./scenarioAnalyticsTracker";
export type BillAnalyticsStep = BillPaymentStep | "setup";

export type BillEventType = "progress" | "login_success" | "login_failed" | "validation_error" | "payment_success" | "back_navigation";
export type BillFinishReason = "exit" | "inactivity_timeout" | "login_locked";
type Event = { client_event_id: string; event_type: BillEventType; step: BillAnalyticsStep; bill_type?: BillType };
type Post = (path: string, body: object) => Promise<{ session_id?: string | null }>;

export function createBillAnalyticsTracker(post: Post, language: string) {
  const tracker = createScenarioAnalyticsTracker<Event>(post, { selected_language: language });
  return {
    start: tracker.start,
    getSessionId: tracker.getSessionId,
    event(event_type: BillEventType, step: BillAnalyticsStep, bill_type?: BillType) {
      tracker.event({ client_event_id: crypto.randomUUID(), event_type, step, bill_type });
    },
    finish(reason: BillFinishReason, step: BillAnalyticsStep) {
      return tracker.finish({ reason, final_step_reached: step });
    },
  };
}
