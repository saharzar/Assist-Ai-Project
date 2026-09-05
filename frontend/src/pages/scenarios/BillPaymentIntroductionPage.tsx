import { ArrowLeft, ArrowRight, CheckCircle2, CreditCard, Droplets, FileText, Flame, Lightbulb, LogIn, Mic2, UserRound, Wifi } from "lucide-react";
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
          <section className="overflow-hidden rounded-3xl border border-indigo-200/80 bg-white shadow-[0_28px_60px_-34px_rgba(30,27,100,0.55)]">
            <div className="bg-gradient-to-br from-[#171856] via-[#29237f] to-[#087f8c] p-6 text-white sm:p-8">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div><p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-200">ASSIST-AI</p><h2 className="mt-1 text-2xl font-extrabold">{text.introPreviewTitle}</h2></div>
                <span className="rounded-full bg-amber-300 px-3 py-1 text-xs font-extrabold uppercase tracking-wide text-amber-950">{text.introUnpaidBills}</span>
              </div>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <BillPreview icon={Lightbulb} label={text.electricity} />
                <BillPreview icon={Flame} label={text.naturalGas} />
                <BillPreview icon={Droplets} label={text.water} />
                <BillPreview icon={Wifi} label={text.internet} />
              </div>
              <div className="mt-5 flex items-start gap-3 rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur-sm">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-cyan-300 text-[#171856]"><Mic2 className="h-6 w-6" aria-hidden="true" /></span>
                <div><strong className="block text-sm">{text.introHelpTitle}</strong><p className="mt-1 text-sm leading-6 text-cyan-50/90">{text.introHelpBody}</p></div>
              </div>
            </div>
            <Link
              to="/scenario/online-bill-payment/setup"
              onPointerDown={() => { void unlockAssistantAudioPlayback(); }}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") void unlockAssistantAudioPlayback();
              }}
              className="m-6 inline-flex min-h-16 w-[calc(100%-3rem)] items-center justify-center gap-3 rounded-xl bg-[#079c6b] px-8 py-4 text-xl font-extrabold text-white shadow-lg shadow-emerald-950/20 transition hover:-translate-y-0.5 hover:bg-[#057a55] focus:outline-none focus:ring-4 focus:ring-emerald-300 focus:ring-offset-2 sm:m-8 sm:w-[calc(100%-4rem)]"
            >
              {text.introStartButton} <ArrowRight className="h-6 w-6" aria-hidden="true" />
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

function BillPreview({ icon: Icon, label }: { icon: typeof Lightbulb; label: string }) {
  return <div className="flex items-center gap-3 rounded-2xl border border-white/15 bg-white/95 p-3 text-[#1d1a5e] shadow-lg"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-[#302992]"><Icon className="h-5 w-5" aria-hidden="true" /></span><span className="min-w-0 flex-1 font-bold">{label}</span><span className="h-3 w-3 rounded-full bg-amber-400 ring-4 ring-amber-100" aria-hidden="true" /></div>;
}
