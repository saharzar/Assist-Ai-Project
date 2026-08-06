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
  cardInserted,
  cardAnimating,
  receiptAnimating,
  receiptAnimationDurationMs,
  cashAnimating,
  cashAnimationDurationMs,
  cashCollectible,
  onCashCollect,
  onCardInsert,
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
  cardInserted: boolean;
  cardAnimating: boolean;
  receiptAnimating: boolean;
  receiptAnimationDurationMs: number;
  cashAnimating: boolean;
  cashAnimationDurationMs: number;
  cashCollectible: boolean;
  onCashCollect: () => void;
  onCardInsert: () => void;
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
          cardInserted={cardInserted}
          cardAnimating={cardAnimating}
          receiptAnimating={receiptAnimating}
          receiptAnimationDurationMs={receiptAnimationDurationMs}
          cashAnimating={cashAnimating}
          cashAnimationDurationMs={cashAnimationDurationMs}
          cashCollectible={cashCollectible}
          onCashCollect={onCashCollect}
          onCardInsert={onCardInsert}
        >
          {children}
        </ATMRealisticShell>

        <aside className="flex flex-col gap-4 rounded-xl border border-cyan-300/25 bg-[#111735]/95 p-5 shadow-[0_20px_55px_rgba(3,7,18,0.38)] backdrop-blur-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-display text-sm font-bold uppercase tracking-wide text-white">{labels.panelTitle}</p>
              <p className="text-xs font-semibold text-cyan-100/65">{labels.practiceMode}</p>
            </div>
            <div className="flex h-2.5 w-20 overflow-hidden rounded-full" aria-hidden="true"><i className="w-2/3 bg-[#5148cf]" /><i className="w-1/3 bg-[#2dd8d8]" /></div>
          </div>

          {soundControls}
          {assistantMessage}

          <div className="border-t border-cyan-100/15 pt-4 text-sm font-semibold leading-6 text-slate-200">
            {labels.warning}
          </div>
        </aside>
      </div>
    </section>
  );
}
