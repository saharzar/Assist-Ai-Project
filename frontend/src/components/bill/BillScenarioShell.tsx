import type { ReactNode } from "react";

const steps = ["Login", "Select bill", "Payment", "Complete"];

export function BillScenarioShell({ currentStep, title, subtitle, children }: {
  currentStep: number;
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <section className="catalogue-page min-h-screen px-5 py-8 sm:px-8">
      <div className="mx-auto w-full max-w-5xl overflow-hidden rounded-3xl border border-cyan-200/80 bg-white/95 shadow-[0_24px_60px_-34px_rgba(48,41,146,0.5)]">
        <header className="border-b border-indigo-950/10 bg-gradient-to-r from-indigo-50 via-white to-cyan-50 px-6 py-6 sm:px-9">
          <p className="text-xs font-bold uppercase tracking-wide text-[#087f8c]">Paying a Bill Online</p>
          <h1 className="mt-2 font-display text-3xl font-extrabold text-[#1d1a5e]">{title}</h1>
          <p className="mt-2 max-w-3xl leading-7 text-slate-600">{subtitle}</p>
          <ol className="mt-6 grid grid-cols-4 gap-2" aria-label="Scenario progress">
            {steps.map((step, index) => {
              const number = index + 1;
              const active = number <= currentStep;
              return (
                <li key={step} className="min-w-0">
                  <div className={`h-2 rounded-full ${active ? "bg-[#302992]" : "bg-slate-200"}`} />
                  <span className={`mt-2 block truncate text-xs font-bold ${active ? "text-[#302992]" : "text-slate-500"}`}>{step}</span>
                </li>
              );
            })}
          </ol>
        </header>
        <div className="p-6 sm:p-9">{children}</div>
      </div>
    </section>
  );
}

