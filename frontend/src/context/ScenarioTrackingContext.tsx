import { createContext, useContext, useLayoutEffect, useRef, useState } from "react";
import { Outlet } from "react-router-dom";
import { useFaceTracking } from "../hooks/useFaceTracking";
import type { ComputerVisionScenario, ScenarioAttemptId } from "../services/computerVisionSessionService";

type ScenarioTracking = {
  tracking: ReturnType<typeof useFaceTracking>;
  setActive: (active: boolean) => void;
  attempt: { current: (() => ScenarioAttemptId) | undefined };
};
const ScenarioTrackingContext = createContext<ScenarioTracking | null>(null);

/** Own one camera/recording across account setup and the subsequent activity. */
export function ScenarioTrackingLayout({ scenario }: { scenario: ComputerVisionScenario }) {
  const [active, setActive] = useState(true);
  const attempt = useRef<(() => ScenarioAttemptId) | undefined>(undefined);
  const tracking = useFaceTracking(scenario, active, () => attempt.current?.() ?? null);
  return <ScenarioTrackingContext.Provider value={{ tracking, setActive, attempt }}><Outlet /></ScenarioTrackingContext.Provider>;
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
