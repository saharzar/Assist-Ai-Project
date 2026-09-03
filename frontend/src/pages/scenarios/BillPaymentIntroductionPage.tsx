import { ArrowLeft, ArrowRight, CheckCircle2, CreditCard, FileText, LogIn, UserRound } from "lucide-react";
import { useEffect } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "../../i18n";
import { billPaymentTranslations } from "../../lib/billPaymentTranslations";
import { preloadAssistantMessage, unlockAssistantAudioPlayback } from "../../services/speechSynthesisService";
import { BillVoiceAssistant } from "../../components/bill/BillVoiceAssistant";

export function BillPaymentIntroductionPage() {
  const { language } = useTranslation();
  const text = billPaymentTranslations[language];
  useEffect(() => {
    // Prepare the message used on this page so returning from the payment flow
    // starts with Soniox audio instead of issuing an unrelated setup request.
    void preloadAssistantMessage(text.introAssistantMessage, language);
  }, [language, text.introAssistantMessage]);
  const steps = [
    { icon: UserRound, title: text.introStep1, body: text.introBody1 }, { icon: LogIn, title: text.introStep2, body: text.introBody2 },
    { icon: FileText, title: text.introStep3, body: text.introBody3 }, { icon: CreditCard, title: text.introStep4, body: text.introBody4 },
    { icon: CheckCircle2, title: text.introStep5, body: text.introBody5 },
  ];
  return (
    <section className="catalogue-page min-h-[calc(100vh-6rem)] px-5 py-10 sm:px-8">
      <div className="mx-auto w-full max-w-6xl">
        <header className="mx-auto max-w-3xl text-center">
          <span className="mx-auto flex h-1.5 w-24 overflow-hidden rounded-full" aria-hidden="true"><i className="w-2/3 bg-[#3730a3]" /><i className="w-1/3 bg-[#2dd8d8]" /></span>
          <p className="mt-5 text-xs font-bold uppercase tracking-wide text-[#087f8c]">ASSIST-AI</p>
          <h1 className="landing-title-accent mt-2 font-display text-4xl font-extrabold sm:text-5xl">{text.introWelcomeTitle}</h1>
          <p className="mt-4 text-lg leading-8 text-[#5b5a78]">{text.introWelcomeSubtitle}</p>
        </header>

        <div className="mt-9 grid items-stretch gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
          <section className="flex flex-col justify-center rounded-3xl border border-cyan-200/80 bg-gradient-to-br from-white via-cyan-50/70 to-indigo-50/70 p-6 shadow-[0_22px_48px_-34px_rgba(48,41,146,0.42)] sm:p-9">
            <div className="mx-auto grid w-full max-w-2xl grid-cols-[1fr_auto_1fr_auto_1fr] items-center gap-3 rounded-3xl border border-indigo-100 bg-white/90 p-6 shadow-inner sm:p-8">
              <span className="flex aspect-square items-center justify-center rounded-2xl bg-indigo-100 text-[#302992]"><FileText className="h-9 w-9" aria-hidden="true" /></span>
              <ArrowRight className="h-6 w-6 text-cyan-500" aria-hidden="true" />
              <span className="flex aspect-square items-center justify-center rounded-2xl bg-cyan-100 text-[#087f8c]"><CreditCard className="h-9 w-9" aria-hidden="true" /></span>
              <ArrowRight className="h-6 w-6 text-cyan-500" aria-hidden="true" />
              <span className="flex aspect-square items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700"><CheckCircle2 className="h-9 w-9" aria-hidden="true" /></span>
            </div>
            <Link
              to="/scenario/online-bill-payment/setup"
              onPointerDown={() => { void unlockAssistantAudioPlayback(); }}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") void unlockAssistantAudioPlayback();
              }}
              className="mx-auto mt-7 inline-flex min-h-16 w-full max-w-2xl items-center justify-center gap-3 rounded-xl bg-[#079c6b] px-8 py-4 text-xl font-extrabold text-white shadow-lg shadow-emerald-950/20 hover:bg-[#057a55] focus:outline-none focus:ring-4 focus:ring-emerald-300 focus:ring-offset-2"
            >
              {text.setupScenario} <ArrowRight className="h-6 w-6" aria-hidden="true" />
            </Link>
          </section>
          <BillVoiceAssistant message={text.introAssistantMessage} />
        </div>

        <section className="mt-12 rounded-3xl border border-cyan-200/80 bg-white/95 p-6 shadow-[0_22px_48px_-34px_rgba(48,41,146,0.42)] sm:p-8" aria-labelledby="bill-flow-title">
          <h2 id="bill-flow-title" className="text-center font-display text-2xl font-bold text-[#1d1a5e]">{text.whatYouDo}</h2>
          <ol className="mt-6 grid overflow-hidden rounded-2xl border border-indigo-950/10 sm:grid-cols-2 xl:grid-cols-5">
            {steps.map(({ icon: Icon, title, body }, index) => (
              <li key={title} className="border-b border-r border-indigo-950/10 bg-gradient-to-br from-white to-indigo-50/70 p-5 last:border-r-0 xl:border-b-0">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#302992] text-white"><Icon className="h-5 w-5" aria-hidden="true" /></span>
                <span className="mt-4 block text-xs font-bold text-slate-400">{String(index + 1).padStart(2, "0")}</span>
                <h3 className="mt-1 font-bold text-[#1d1a5e]">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{body}</p>
              </li>
            ))}
          </ol>
          <div className="mt-6 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm font-semibold text-amber-950">{text.safety}</div>
        </section>

        <div className="mt-8 flex border-t border-indigo-950/10 pt-6">
          <Link to="/scenarios" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-indigo-950/15 bg-white px-5 py-3 font-bold text-[#302992] hover:bg-indigo-50"><ArrowLeft className="h-5 w-5" /> {text.backScenarios}</Link>
        </div>
      </div>
    </section>
  );
}
