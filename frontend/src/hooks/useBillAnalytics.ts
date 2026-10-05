import { useCallback, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { API_BASE_URL } from "../services/api";
import type { BillPaymentStep, BillType } from "../lib/billPaymentState";

import { createBillAnalyticsTracker, type BillEventType, type BillFinishReason } from "../services/billAnalyticsTracker";

export function useBillAnalytics(language: string, step: BillPaymentStep) {
  const { token, guestSessionToken } = useAuth();
  const currentStep = useRef(step);
  currentStep.current = step;
  const initialLanguage = useRef(language);
  const tracker = useRef<ReturnType<typeof createBillAnalyticsTracker> | null>(null);

  useEffect(() => {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers.Authorization = `Bearer ${token}`;
    else if (guestSessionToken) headers["X-Guest-Session-Token"] = guestSessionToken;
    const post = async (path: string, body: object) => {
      const response = await fetch(`${API_BASE_URL}/api/bill-sessions/${path}`, {
        method: "POST", headers, body: JSON.stringify(body), keepalive: true,
      });
      if (!response.ok) throw new Error("Analytics request failed");
      return response.json();
    };
    let current = createBillAnalyticsTracker(post, initialLanguage.current);
    tracker.current = current;
    // Cancelling this timer prevents a phantom session during StrictMode's effect replay.
    const timer = window.setTimeout(current.start, 0);
    const onPageHide = () => { void current.finish("exit", currentStep.current); };
    const onPageShow = (event: PageTransitionEvent) => {
      if (!event.persisted) return;
      current = createBillAnalyticsTracker(post, initialLanguage.current);
      tracker.current = current;
      current.event("progress", currentStep.current);
    };
    window.addEventListener("pagehide", onPageHide);
    window.addEventListener("pageshow", onPageShow);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("pagehide", onPageHide);
      window.removeEventListener("pageshow", onPageShow);
      void current.finish("exit", currentStep.current);
      tracker.current = null;
    };
  }, [token, guestSessionToken]);

  useEffect(() => {
    // Defer initial progress for the same StrictMode reason as session creation.
    const timer = window.setTimeout(() => tracker.current?.event("progress", step), 0);
    return () => window.clearTimeout(timer);
  }, [step]);
  const record = useCallback((type: BillEventType, eventStep: BillPaymentStep, bill?: BillType) => tracker.current?.event(type, eventStep, bill), []);
  const finish = useCallback((reason: BillFinishReason) => tracker.current?.finish(reason, currentStep.current), []);
  return { record, finish };
}
