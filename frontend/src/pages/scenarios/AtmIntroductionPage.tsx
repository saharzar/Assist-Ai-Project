import { ArrowLeft, ArrowRight, Banknote, CheckCircle2, KeyRound, Keyboard, Mic, ShieldCheck, UserRound } from "lucide-react";
import { Link } from "react-router-dom";

import atmImageUrl from "../../assets/atm-realistic.png";
import { useTranslation } from "../../i18n";
import { atmIntroductionTranslations } from "../../lib/atmIntroductionTranslations";

const stepIcons = [UserRound, KeyRound, ShieldCheck, Banknote, CheckCircle2];
const stepStyles = [
  { accent: "bg-[#2dd8d8]", icon: "bg-cyan-100 text-[#087f8c]", panel: "bg-cyan-50/80", number: "text-cyan-200/70" },
  { accent: "bg-[#5147d9]", icon: "bg-indigo-100 text-[#302992]", panel: "bg-indigo-50/80", number: "text-indigo-200/70" },
  { accent: "bg-[#8b5cf6]", icon: "bg-violet-100 text-violet-700", panel: "bg-violet-50/80", number: "text-violet-200/70" },
  { accent: "bg-[#f4b740]", icon: "bg-amber-100 text-amber-800", panel: "bg-amber-50/80", number: "text-amber-200/70" },
  { accent: "bg-[#20b486]", icon: "bg-emerald-100 text-emerald-700", panel: "bg-emerald-50/80", number: "text-emerald-200/70" },
];

export function AtmIntroductionPage() {
  const { language } = useTranslation();
  const text = atmIntroductionTranslations[language];

  return (
    <section className="catalogue-page relative isolate min-h-[calc(100vh-6rem)] overflow-hidden">
      <div className="pointer-events-none absolute right-[-8%] top-0 -z-10 h-72 w-[44%] bg-cyan-100/55 [clip-path:polygon(35%_0,100%_0,100%_100%,0_62%)]" aria-hidden="true" />
      <div className="pointer-events-none absolute bottom-0 left-0 -z-10 h-48 w-[30%] bg-indigo-100/55 [clip-path:polygon(0_0,100%_100%,0_100%)]" aria-hidden="true" />

      <div className="mx-auto w-full max-w-7xl px-5 py-10 sm:px-8 lg:px-10">
        <header className="mx-auto max-w-4xl border-b border-indigo-950/10 pb-8 text-center">
          <span className="mx-auto mb-5 flex h-1.5 w-24 overflow-hidden rounded-full" aria-hidden="true">
            <i className="w-2/3 bg-[#3730a3]" />
            <i className="w-1/3 bg-[#2dd8d8]" />
          </span>
          <p className="text-xs font-bold uppercase text-[#087f8c]">{text.eyebrow}</p>
          <h1 className="landing-title-accent mx-auto mt-2 font-display text-3xl font-extrabold sm:text-4xl">{text.title}</h1>
          <p className="mx-auto mt-3 max-w-3xl text-base leading-7 text-[#5b5a78]">{text.subtitle}</p>
        </header>

        <div className="mt-8 grid items-start gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
          <div className="min-w-0">
            <h2 className="text-center font-display text-xl font-bold text-[#1d1a5e] lg:text-left">{text.whatWillHappen}</h2>
            <ol className="mt-5 grid gap-4 sm:grid-cols-2">
              {text.steps.map((step, index) => {
                const Icon = stepIcons[index];
                const style = stepStyles[index];
                return (
                  <li key={step.title} className={`group relative min-h-48 overflow-hidden rounded-2xl border border-indigo-950/10 p-5 shadow-[0_14px_34px_-28px_rgba(48,41,146,0.45)] transition duration-300 hover:-translate-y-1 hover:border-cyan-300 hover:bg-white hover:shadow-[0_22px_42px_-25px_rgba(45,216,216,0.55)] ${style.panel} ${index === text.steps.length - 1 ? "sm:col-span-2" : ""}`}>
                    <span className={`pointer-events-none absolute right-4 top-0 text-7xl font-extrabold leading-none transition duration-300 group-hover:-translate-y-1 group-hover:scale-105 ${style.number}`} aria-hidden="true">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <div className={`relative z-10 flex h-12 w-12 items-center justify-center rounded-xl ring-4 ring-white/70 transition duration-300 group-hover:-rotate-3 group-hover:scale-105 ${style.icon}`}>
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <span className={`mt-5 block h-1 w-10 rounded-full transition-all duration-300 group-hover:w-16 ${style.accent}`} aria-hidden="true" />
                    <h3 className="relative z-10 mt-3 font-display text-base font-bold text-[#1d1a5e] sm:text-lg">{step.title}</h3>
                    <p className="relative z-10 mt-1 text-sm leading-6 text-[#5b5a78]">{step.body}</p>
                  </li>
                );
              })}
            </ol>
          </div>

          <aside className="overflow-hidden rounded-2xl border border-cyan-200/80 bg-white/90 shadow-[0_22px_48px_-30px_rgba(48,41,146,0.42)] backdrop-blur-sm lg:sticky lg:top-6">
            <div className="border-b-4 border-[#2dd8d8] bg-[#111936] p-3">
              <img src={atmImageUrl} alt={text.atmPreviewAlt} className="aspect-[3/2] w-full object-contain" />
            </div>
            <div className="p-5 sm:p-6">
              <h2 className="font-display text-xl font-bold text-[#1d1a5e]">{text.waysToRespond}</h2>
              <div className="mt-4 grid gap-3">
                <div className="group flex gap-3 rounded-xl border border-indigo-100 bg-indigo-50/70 p-4 transition hover:-translate-y-0.5 hover:border-indigo-300 hover:bg-indigo-100/80">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-[#302992]"><Keyboard className="h-5 w-5" aria-hidden="true" /></span>
                  <div><h3 className="font-bold text-[#1d1a5e]">{text.keypadTitle}</h3><p className="mt-1 text-sm leading-6 text-[#5b5a78]">{text.keypadBody}</p></div>
                </div>
                <div className="group flex gap-3 rounded-xl border border-cyan-100 bg-cyan-50/70 p-4 transition hover:-translate-y-0.5 hover:border-cyan-300 hover:bg-cyan-100/80">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-cyan-100 text-[#087f8c]"><Mic className="h-5 w-5" aria-hidden="true" /></span>
                  <div><h3 className="font-bold text-[#1d1a5e]">{text.voiceTitle}</h3><p className="mt-1 text-sm leading-6 text-[#5b5a78]">{text.voiceBody}</p></div>
                </div>
              </div>
              <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
                <h3 className="font-bold text-amber-950">{text.safetyTitle}</h3>
                <p className="mt-1 text-sm leading-6 text-amber-900">{text.safetyBody}</p>
              </div>
              <p className="mt-3 rounded-xl border border-violet-200 bg-violet-50 p-4 text-sm font-semibold leading-6 text-violet-900">{text.reassurance}</p>
            </div>
          </aside>
        </div>

        <div className="mt-8 flex flex-col-reverse gap-3 border-t border-indigo-950/10 pt-6 sm:flex-row sm:justify-between">
          <Link to="/scenarios" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-indigo-950/15 bg-white px-5 py-3 font-bold text-[#302992] hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-cyan-400">
            <ArrowLeft className="h-5 w-5" aria-hidden="true" /> {text.back}
          </Link>
          <Link to="/scenario/atm-withdrawal/practice" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-[#302992] px-6 py-3 font-bold text-white shadow-lg shadow-indigo-950/15 hover:bg-[#211c72] focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2">
            {text.start} <ArrowRight className="h-5 w-5" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  );
}
