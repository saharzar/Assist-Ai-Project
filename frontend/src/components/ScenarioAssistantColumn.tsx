import type { ReactNode } from "react";

/** Shared scenario sidebar keeps the assistant and optional preview in one column. */
export function ScenarioAssistantColumn({ assistant, children }: { assistant: ReactNode; children?: ReactNode }) {
  return <div data-scenario-assistant-column className="flex min-w-0 flex-col gap-4 xl:sticky xl:top-5 xl:max-h-[calc(100vh-2.5rem)] xl:overflow-y-auto">
    {assistant}
    {children}
  </div>;
}
