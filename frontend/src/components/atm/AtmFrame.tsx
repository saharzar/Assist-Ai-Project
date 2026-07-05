import type { ReactNode } from "react";

import { ATMRealisticShell } from "./ATMRealisticShell";

export function AtmFrame({
  assistantMessage,
  soundControls,
  keypadMode,
  labels,
  onDigit,
  onLetter,
  onClear,
  onBackspace,
  onEnter,
  onCancel,
  children,
}: {
  assistantMessage: ReactNode;
  soundControls: ReactNode;
  keypadMode: "none" | "numeric" | "letters" | "confirm";
  labels: {
    panelTitle: string;
    practiceMode: string;
    warning: string;
  };
  onDigit?: (digit: string) => void;
  onLetter?: (letter: string) => void;
  onClear?: () => void;
  onBackspace?: () => void;
  onEnter?: () => void;
  onCancel?: () => void;
  children: ReactNode;
}) {
  return (
    <section className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-4">
      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
        <ATMRealisticShell
          keypadMode={keypadMode}
          onDigit={onDigit}
          onLetter={onLetter}
          onClear={onClear}
          onBackspace={onBackspace}
          onEnter={onEnter}
          onCancel={onCancel}
        >
          {children}
        </ATMRealisticShell>

        <aside className="flex flex-col gap-4 rounded-2xl border border-slate-700 bg-slate-900 p-4 shadow-2xl">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-bold uppercase tracking-wide text-slate-300">{labels.panelTitle}</p>
              <p className="text-xs font-semibold text-slate-400">{labels.practiceMode}</p>
            </div>
            <div className="h-3 w-20 rounded-full bg-teal-300" aria-hidden="true" />
          </div>

          {soundControls}
          {assistantMessage}

          <div className="rounded-lg border border-amber-300/40 bg-amber-100 p-4 text-sm font-bold leading-6 text-amber-950">
            {labels.warning}
          </div>
        </aside>
      </div>
    </section>
  );
}
