import { useCallback, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { createAtmSetupAnalytics } from "../services/atmSetupAnalytics";
import { abandonAtmAnalyticsSession, recordAtmAnalyticsEvent, startAtmAnalyticsSession } from "../services/atmAnalyticsService";

export function useAtmSetupAnalytics(language: string, enabled: boolean) {
  const { token, guestSessionToken } = useAuth();
  const owner = useRef<ReturnType<typeof createAtmSetupAnalytics> | null>(null);
  useEffect(() => {
    if (!enabled) return;
    const current = createAtmSetupAnalytics(async () => {
      const id = await startAtmAnalyticsSession(language);
      if (id) await recordAtmAnalyticsEvent(id, { client_event_id: crypto.randomUUID(), event_type: "progress", final_step_reached: "setup" }).catch(() => {});
      return id;
    }, (id) => abandonAtmAnalyticsSession(id, "setup", token, guestSessionToken));
    owner.current = current;
    const timer = window.setTimeout(current.start, 0);
    window.addEventListener("pagehide", current.finish);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("pagehide", current.finish);
      current.finish();
    };
  }, [enabled, token, guestSessionToken]);
  const getSessionId = useCallback(() => owner.current?.getSessionId() ?? null, []);
  const claim = useCallback(() => owner.current?.claim() ?? Promise.resolve(null), []);
  return { getSessionId, claim };
}
