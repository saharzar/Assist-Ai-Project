import { ArrowLeft, ArrowRight, CheckCircle2, CreditCard, FileText, LogIn, UserRound } from "lucide-react";
import { Link } from "react-router-dom";

const steps = [
  { icon: UserRound, title: "Create scenario details", body: "Choose a name, username, and password for this scenario." },
  { icon: LogIn, title: "Log in", body: "Use the username and password you created." },
  { icon: FileText, title: "Choose a bill", body: "Select the bill you want to review and pay." },
  { icon: CreditCard, title: "Enter card details", body: "Complete the simulated credit-card payment form." },
  { icon: CheckCircle2, title: "Complete payment", body: "Review the confirmation that your bill was paid." },
];

export function BillPaymentIntroductionPage() {
  return (
    <section className="catalogue-page min-h-[calc(100vh-6rem)] px-5 py-10 sm:px-8">
      <div className="mx-auto w-full max-w-6xl">
        <header className="mx-auto max-w-3xl text-center">
          <span className="mx-auto flex h-1.5 w-24 overflow-hidden rounded-full" aria-hidden="true"><i className="w-2/3 bg-[#3730a3]" /><i className="w-1/3 bg-[#2dd8d8]" /></span>
          <p className="mt-5 text-xs font-bold uppercase tracking-wide text-[#087f8c]">Before you begin</p>
          <h1 className="landing-title-accent mt-2 font-display text-4xl font-extrabold">Paying a Bill Online</h1>
          <p className="mt-4 text-lg leading-8 text-[#5b5a78]">Follow a simple guided journey from account login to successful bill payment.</p>
        </header>

        <section className="mt-9 rounded-3xl border border-cyan-200/80 bg-white/95 p-6 shadow-[0_22px_48px_-34px_rgba(48,41,146,0.42)] sm:p-8" aria-labelledby="bill-flow-title">
          <h2 id="bill-flow-title" className="text-center font-display text-2xl font-bold text-[#1d1a5e]">What you will do</h2>
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
          <div className="mt-6 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm font-semibold text-amber-950">Use scenario-only account and card details. Do not enter real financial information.</div>
        </section>

        <div className="mt-8 flex flex-col-reverse gap-3 border-t border-indigo-950/10 pt-6 sm:flex-row sm:justify-between">
          <Link to="/scenarios" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-indigo-950/15 bg-white px-5 py-3 font-bold text-[#302992] hover:bg-indigo-50"><ArrowLeft className="h-5 w-5" /> Back to scenarios</Link>
          <Link to="/scenario/online-bill-payment/setup" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-[#302992] px-6 py-3 font-bold text-white hover:bg-[#211c72]">Set up scenario <ArrowRight className="h-5 w-5" /></Link>
        </div>
      </div>
    </section>
  );
}

