import type { ReactNode } from "react";
import { useTranslation } from "../../i18n";
import { billPaymentTranslations } from "../../lib/billPaymentTranslations";

export function BillScenarioShell({ currentStep, title, subtitle, compact = false, children }: {
  currentStep: number;
  title: string;
  subtitle: string;
  compact?: boolean;
  children: ReactNode;
}) {
  const { language } = useTranslation();
  const text = billPaymentTranslations[language];
  const steps = [text.progressLogin, text.progressBill, text.progressPayment, text.progressComplete];
  return (
    <section className={`catalogue-page min-h-screen px-5 sm:px-8 ${compact ? "py-3" : "py-8"}`}>
      <div className="mx-auto w-full max-w-5xl overflow-hidden rounded-3xl border border-cyan-200/80 bg-white/95 shadow-[0_24px_60px_-34px_rgba(48,41,146,0.5)]">
        <header className={`border-b border-indigo-950/10 bg-gradient-to-r from-indigo-50 via-white to-cyan-50 px-6 sm:px-9 ${compact ? "py-3" : "py-6"}`}>
          <p className="text-xs font-bold uppercase tracking-wide text-[#087f8c]">{text.scenario}</p>
          <h1 className={`font-display font-extrabold text-[#1d1a5e] ${compact ? "mt-1 text-2xl" : "mt-2 text-3xl"}`}>{title}</h1>
          <p className={`max-w-3xl text-slate-600 ${compact ? "mt-1 text-sm leading-5" : "mt-2 leading-7"}`}>{subtitle}</p>
          <ol className={`grid grid-cols-4 gap-2 ${compact ? "mt-3" : "mt-6"}`} aria-label={text.progressLabel}>
            {steps.map((step, index) => {
              const number = index + 1;
              const active = number <= currentStep;
              return (
                <li key={step} className="min-w-0">
                  <div className={`${compact ? "h-1.5" : "h-2"} rounded-full ${active ? "bg-[#302992]" : "bg-slate-200"}`} />
                  <span className={`${compact ? "mt-1" : "mt-2"} block truncate text-xs font-bold ${active ? "text-[#302992]" : "text-slate-500"}`}>{step}</span>
                </li>
              );
            })}
          </ol>
        </header>
        <div className={compact ? "p-4 sm:p-5" : "p-6 sm:p-9"}>{children}</div>
      </div>
    </section>
  );
}
