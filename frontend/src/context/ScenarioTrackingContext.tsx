import { createContext, useContext, useLayoutEffect, useRef, useState } from "react";
import { Outlet } from "react-router-dom";
import { useFaceTracking } from "../hooks/useFaceTracking";
import type { ComputerVisionScenario, ScenarioAttemptId } from "../services/computerVisionSessionService";
import { useTranslation } from "../i18n";
import { useBillAnalytics } from "../hooks/useBillAnalytics";
import { useAtmSetupAnalytics } from "../hooks/useAtmSetupAnalytics";
import type { BillAnalyticsStep } from "../services/billAnalyticsTracker";

type ScenarioTracking = {
  tracking: ReturnType<typeof useFaceTracking>;
  setActive: (active: boolean) => void;
  attempt: { current: (() => ScenarioAttemptId) | undefined };
  bill: ReturnType<typeof useBillAnalytics>;
  setBillStep: (step: BillAnalyticsStep) => void;
  atm: ReturnType<typeof useAtmSetupAnalytics>;
};
const ScenarioTrackingContext = createContext<ScenarioTracking | null>(null);

/** Own one camera/recording across account setup and the subsequent activity. */
export function ScenarioTrackingLayout({ scenario }: { scenario: ComputerVisionScenario }) {
  const [active, setActive] = useState(true);
  const attempt = useRef<(() => ScenarioAttemptId) | undefined>(undefined);
  const { language } = useTranslation();
  const [billStep, setBillStep] = useState<BillAnalyticsStep>("setup");
  const bill = useBillAnalytics(language, billStep, scenario === "online-bill-payment");
  const atm = useAtmSetupAnalytics(language, scenario === "atm-withdrawal");
  const tracking = useFaceTracking(scenario, active, () => attempt.current?.() ??
    (scenario === "online-bill-payment" ? bill.getSessionId() : atm.getSessionId()));
  return <ScenarioTrackingContext.Provider value={{ tracking, setActive, attempt, bill, setBillStep, atm }}><Outlet /></ScenarioTrackingContext.Provider>;
}

export function useScenarioTracking(active = true, getAttemptId?: () => ScenarioAttemptId) {
  const session = useContext(ScenarioTrackingContext);
  if (!session) throw new Error("Scenario tracking requires its scenario layout");
  const { setActive, attempt, tracking } = session;
  useLayoutEffect(() => { setActive(active); }, [active, setActive]);
  useLayoutEffect(() => { attempt.current = getAttemptId; });
  // Child navigation must not stop tracking or clear the final analytics ID.
  // The layout owns cleanup on exit; terminal activity states set active=false.
  return tracking;
}

export function useScenarioBillAnalytics(step: BillAnalyticsStep) {
  const session = useContext(ScenarioTrackingContext);
  if (!session) throw new Error("Bill analytics requires its scenario layout");
  const { setBillStep, bill } = session;
  useLayoutEffect(() => { setBillStep(step); }, [step, setBillStep]);
  return bill;
}

export function useScenarioAtmAnalytics() {
  const session = useContext(ScenarioTrackingContext);
  if (!session) throw new Error("ATM analytics requires its scenario layout");
  return session.atm;
}
