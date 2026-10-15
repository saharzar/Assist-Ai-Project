import { useCallback, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { API_BASE_URL } from "../services/api";
import { createScenarioAnalyticsTracker } from "../services/scenarioAnalyticsTracker";
import type { Meal, RestaurantStep } from "../lib/restaurantState";
type RestaurantEvent = { client_event_id: string; event_type: "meal_selected" | "alternative_selected" | "menu_reopened" | "order_confirmed"; meal?: Meal };
export function useRestaurantAnalytics(language: string, step: RestaurantStep) {
  const { token, guestSessionToken } = useAuth();
  const tracker = useRef<ReturnType<typeof createScenarioAnalyticsTracker<RestaurantEvent>> | null>(null);
  const currentStep = useRef(step); currentStep.current = step;
  const initialLanguage = useRef(language);
  useEffect(() => {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers.Authorization = `Bearer ${token}`;
    else if (guestSessionToken) headers["X-Guest-Session-Token"] = guestSessionToken;
    const current = createScenarioAnalyticsTracker<RestaurantEvent>(async (path, body) => {
      const response = await fetch(`${API_BASE_URL}/api/restaurant-sessions/${path}`, { method: "POST", headers, body: JSON.stringify(body), keepalive: true });
      if (!response.ok) throw new Error("Analytics unavailable");
      return response.json();
    }, { selected_language: initialLanguage.current });
    tracker.current = current;
    const timer = window.setTimeout(current.start, 0);
    const finish = () => { void current.finish({ final_step_reached: currentStep.current }); };
    window.addEventListener("pagehide", finish);
    return () => { window.clearTimeout(timer); window.removeEventListener("pagehide", finish); finish(); };
  }, [token, guestSessionToken]);
  useEffect(() => { if (step === "success") void tracker.current?.finish({ final_step_reached: step }); }, [step]);
  const event = useCallback((event_type: RestaurantEvent["event_type"], meal?: Meal) => {
    tracker.current?.event({ client_event_id: crypto.randomUUID(), event_type, meal });
  }, []);
  const getSessionId = useCallback(() => tracker.current?.getSessionId() ?? null, []);
  return { event, getSessionId };
}
