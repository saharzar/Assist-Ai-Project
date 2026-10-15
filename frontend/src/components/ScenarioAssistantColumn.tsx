import type { ReactNode } from "react";

/** Shared scenario sidebar keeps the assistant and optional preview in one column. */
export function ScenarioAssistantColumn({ assistant, children, breakpoint = "xl" }: { assistant: ReactNode; children?: ReactNode; breakpoint?: "lg" | "xl" }) {
  const desktop = breakpoint === "lg"
    ? "lg:sticky lg:top-5 lg:max-h-[calc(100vh-2.5rem)] lg:overflow-y-auto"
    : "xl:sticky xl:top-5 xl:max-h-[calc(100vh-2.5rem)] xl:overflow-y-auto";
  return <div data-scenario-assistant-column className={`flex min-w-0 flex-col gap-4 ${desktop}`}>
    {assistant}
    {children}
  </div>;
}
