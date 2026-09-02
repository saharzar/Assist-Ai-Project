import { ArrowLeft, ArrowRight, Banknote, CheckCircle2, KeyRound, Keyboard, Mic, ShieldCheck, UserRound } from "lucide-react";
import { Link } from "react-router-dom";

import atmImageUrl from "../../assets/atm-realistic.png";
import { useTranslation } from "../../i18n";
import { atmIntroductionTranslations } from "../../lib/atmIntroductionTranslations";
import { unlockAssistantAudioPlayback } from "../../services/speechSynthesisService";

const stepIcons = [UserRound, KeyRound, ShieldCheck, Banknote, CheckCircle2];
const stepColors = [
  "bg-cyan-50/80 hover:bg-cyan-100/75",
  "bg-indigo-50/75 hover:bg-indigo-100/70",
  "bg-violet-50/70 hover:bg-violet-100/65",
  "bg-sky-50/80 hover:bg-sky-100/70",
  "bg-teal-50/75 hover:bg-teal-100/70",
];
const stepIconColors = ["bg-[#159fb5]", "bg-[#3d36ad]", "bg-[#6651c7]", "bg-[#287ec1]", "bg-[#138f8f]"];

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

        <div className="mx-auto mt-8 max-w-6xl">
          <div className="overflow-hidden rounded-3xl border border-cyan-200/80 bg-white/90 shadow-[0_22px_48px_-32px_rgba(48,41,146,0.42)] backdrop-blur-sm">
            <div className="grid items-center gap-0 lg:grid-cols-[minmax(360px,0.9fr)_minmax(0,1.1fr)]">
              <div className="bg-[#111936] p-4 sm:p-6">
                <img src={atmImageUrl} alt={text.atmPreviewAlt} className="mx-auto aspect-[3/2] w-full max-w-xl object-contain" />
              </div>
              <div className="border-t-4 border-[#2dd8d8] p-6 text-center lg:border-l-4 lg:border-t-0 lg:p-8 lg:text-left">
                <p className="font-display text-xl font-bold leading-8 text-[#1d1a5e]">{text.reassurance}</p>
                <div className="mt-5 flex gap-4 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-left shadow-[0_12px_28px_-22px_rgba(180,83,9,0.55)]">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-white shadow-sm" aria-hidden="true">
                    <ShieldCheck className="h-6 w-6" />
                  </span>
                  <div>
                    <h3 className="font-bold text-amber-950">{text.safetyTitle}</h3>
                    <p className="mt-1 text-sm leading-6 text-amber-900">{text.safetyBody}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <section className="mt-8 rounded-3xl border border-cyan-200/70 bg-gradient-to-br from-cyan-50/70 via-white/80 to-indigo-50/75 px-4 py-7 shadow-[0_22px_48px_-38px_rgba(48,41,146,0.5)] sm:px-6" aria-labelledby="atm-introduction-steps">
            <span className="mx-auto mb-4 flex h-1.5 w-20 overflow-hidden rounded-full" aria-hidden="true">
              <i className="w-1/2 bg-[#3730a3]" />
              <i className="w-1/2 bg-[#2dd8d8]" />
            </span>
            <h2 id="atm-introduction-steps" className="text-center font-display text-2xl font-bold text-[#1d1a5e]">{text.whatWillHappen}</h2>
            <ol className="mx-auto mt-6 grid max-w-6xl overflow-hidden rounded-3xl border border-indigo-950/10 bg-white shadow-[0_22px_48px_-34px_rgba(48,41,146,0.42)] sm:grid-cols-2 xl:grid-cols-5">
              {text.steps.map((step, index) => {
                const Icon = stepIcons[index];
                return (
                  <li
                    key={step.title}
                    className={`group relative flex min-h-32 gap-4 border-indigo-950/10 p-5 transition-all duration-200 hover:-translate-y-0.5 ${stepColors[index]} sm:min-h-40 sm:flex-col sm:border-b sm:border-r xl:border-b-0 ${
                      index === text.steps.length - 1 ? "sm:col-span-2 sm:border-b-0 xl:col-span-1 xl:border-r-0" : ""
                    }`}
                  >
                    <div className="flex shrink-0 items-center gap-3 sm:w-full">
                      <span className={`flex h-11 w-11 items-center justify-center rounded-full text-white shadow-[0_7px_18px_-8px_rgba(48,41,146,0.75)] ${stepIconColors[index]}`} aria-hidden="true">
                        <Icon className="h-5 w-5" />
                      </span>
                      <span className="text-xs font-bold text-[#8f8da8]">{String(index + 1).padStart(2, "0")}</span>
                    </div>
                    <div>
                      <h3 className="font-display text-base font-bold leading-6 text-[#1d1a5e]">{step.title}</h3>
                      <p className="mt-1 text-sm leading-5 text-[#5b5a78]">{step.body}</p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </section>

          <section className="mt-8 overflow-hidden rounded-3xl border border-indigo-200/70 bg-gradient-to-r from-indigo-50/80 via-white/90 to-cyan-50/80 p-5 shadow-[0_20px_44px_-34px_rgba(48,41,146,0.45)] backdrop-blur-sm sm:p-7" aria-labelledby="atm-response-methods">
              <h2 id="atm-response-methods" className="text-center font-display text-2xl font-bold text-[#1d1a5e]">{text.waysToRespond}</h2>
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <div className="group flex items-center gap-4 rounded-2xl border border-indigo-200/70 bg-indigo-50/85 p-5 transition hover:-translate-y-0.5 hover:border-indigo-300 hover:bg-indigo-100/75">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#3d36ad] text-white shadow-md shadow-indigo-900/10"><Keyboard className="h-6 w-6" aria-hidden="true" /></span>
                  <div><h3 className="font-display text-lg font-bold text-[#1d1a5e]">{text.keypadTitle}</h3><p className="mt-1 text-sm leading-6 text-[#5b5a78]">{text.keypadBody}</p></div>
                </div>
                <div className="group flex items-center gap-4 rounded-2xl border border-cyan-200/80 bg-cyan-50/85 p-5 transition hover:-translate-y-0.5 hover:border-cyan-300 hover:bg-cyan-100/75">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#159fb5] text-white shadow-md shadow-cyan-900/10"><Mic className="h-6 w-6" aria-hidden="true" /></span>
                  <div><h3 className="font-display text-lg font-bold text-[#1d1a5e]">{text.voiceTitle}</h3><p className="mt-1 text-sm leading-6 text-[#5b5a78]">{text.voiceBody}</p></div>
                </div>
              </div>
          </section>
        </div>

        <div className="mt-8 flex flex-col-reverse gap-3 border-t border-indigo-950/10 pt-6 sm:flex-row sm:justify-between">
          <Link to="/scenarios" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-indigo-950/15 bg-white px-5 py-3 font-bold text-[#302992] hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-cyan-400">
            <ArrowLeft className="h-5 w-5" aria-hidden="true" /> {text.back}
          </Link>
          <Link
            to="/scenario/atm-withdrawal/setup"
            onPointerDown={() => { void unlockAssistantAudioPlayback(); }}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") void unlockAssistantAudioPlayback();
            }}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-[#302992] px-6 py-3 font-bold text-white shadow-lg shadow-indigo-950/15 hover:bg-[#211c72] focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2"
          >
            {text.start} <ArrowRight className="h-5 w-5" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  );
}
