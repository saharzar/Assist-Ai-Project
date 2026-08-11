import { CheckCircle2, CreditCard, Eye, EyeOff, Flame, Globe2, Lightbulb, RotateCcw, Waves } from "lucide-react";
import { useMemo, useReducer, useState } from "react";
import { Link, Navigate } from "react-router-dom";

import { BillCardPreview, type CardPreviewDetails } from "../../components/bill/BillCardPreview";
import { BillScenarioShell } from "../../components/bill/BillScenarioShell";
import { useTranslation } from "../../i18n";
import {
  BILL_SETUP_STORAGE_KEY,
  billDefinitions,
  billPaymentReducer,
  initialBillPaymentState,
  type BillSetupDetails,
  type BillType,
} from "../../lib/billPaymentState";

const billIcons = { electricity: Lightbulb, "natural-gas": Flame, water: Waves, internet: Globe2 } satisfies Record<BillType, typeof Lightbulb>;

function readSetupDetails(): BillSetupDetails | null {
  try {
    const value = sessionStorage.getItem(BILL_SETUP_STORAGE_KEY);
    return value ? JSON.parse(value) as BillSetupDetails : null;
  } catch {
    return null;
  }
}

export function BillPaymentScenarioPage() {
  const setup = useMemo(readSetupDetails, []);
  const [state, dispatch] = useReducer(billPaymentReducer, initialBillPaymentState);
  const { language } = useTranslation();
  const currency = language === "tr" ? "TRY" : "EUR";
  const locale = language === "tr" ? "tr-TR" : "en-IE";
  const formatAmount = (amount: number) => new Intl.NumberFormat(locale, { style: "currency", currency, maximumFractionDigits: 0 }).format(amount);

  if (!setup) return <Navigate to="/scenario/online-bill-payment/setup" replace />;

  const currentStep = state.step === "login" ? 1 : state.step === "bill-selection" || state.step === "bill-details" ? 2 : state.step === "card-payment" ? 3 : 4;
  const title = state.step === "login" ? "Log in to your account" : state.step === "bill-selection" ? "Choose a bill" : state.step === "bill-details" ? "Review your bill" : state.step === "card-payment" ? "Pay by credit card" : "Payment complete";
  const subtitle = state.step === "login" ? "Use the scenario username and password you created." : state.step === "bill-selection" ? "Select the service you want to pay." : state.step === "bill-details" ? "Check the amount owed before continuing." : state.step === "card-payment" ? "Enter scenario-only card details. Do not use a real card." : "Your bill has been paid successfully.";

  return (
    <BillScenarioShell currentStep={currentStep} title={title} subtitle={subtitle}>
      {state.step === "login" && <LoginStep setup={setup} onSuccess={() => dispatch({ type: "LOGIN_SUCCESS" })} />}
      {state.step === "bill-selection" && (
        <div className="grid gap-4 sm:grid-cols-2">
          {billDefinitions.map((bill) => {
            const Icon = billIcons[bill.type];
            return <button key={bill.type} type="button" onClick={() => dispatch({ type: "SELECT_BILL", bill })} className="group flex min-h-28 items-center gap-4 rounded-2xl border border-indigo-200 bg-indigo-50/70 p-5 text-left hover:border-cyan-400 hover:bg-cyan-50 focus:outline-none focus:ring-2 focus:ring-cyan-400"><span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#302992] text-white"><Icon className="h-6 w-6" /></span><span><strong className="block text-lg text-[#1d1a5e]">{bill.label}</strong><span className="mt-1 block text-sm text-slate-600">View bill</span></span></button>;
          })}
        </div>
      )}
      {state.step === "bill-details" && state.selectedBill && (
        <div className="mx-auto max-w-2xl">
          <div className="rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50 to-cyan-50 p-6">
            <p className="text-sm font-bold uppercase tracking-wide text-[#087f8c]">{state.selectedBill.label} bill</p>
            <div className="mt-5 flex items-end justify-between gap-4"><span className="font-semibold text-slate-600">Amount due</span><strong className="text-4xl text-[#302992]">{formatAmount(state.selectedBill.amount)}</strong></div>
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <button type="button" onClick={() => dispatch({ type: "BACK_TO_BILLS" })} className="min-h-12 rounded-xl border-2 border-[#302992] bg-white px-5 py-3 font-bold text-[#302992] hover:bg-indigo-50">Choose another bill</button>
            <button type="button" onClick={() => dispatch({ type: "PAY_BY_CARD" })} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#302992] px-5 py-3 font-bold text-white hover:bg-[#211c72]"><CreditCard className="h-5 w-5" /> Pay by credit card</button>
          </div>
        </div>
      )}
      {state.step === "card-payment" && state.selectedBill && (
        <CardPaymentStep
          amount={formatAmount(state.selectedBill.amount)}
          systemError={state.systemError}
          onBack={() => dispatch({ type: "BACK_TO_BILLS" })}
          onSubmit={() => dispatch({ type: state.paymentAttempts === 0 ? "PAYMENT_SYSTEM_ERROR" : "PAYMENT_SUCCESS" })}
        />
      )}
      {state.step === "success" && state.selectedBill && (
        <div className="mx-auto max-w-2xl text-center">
          <span className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-teal-100 text-teal-700"><CheckCircle2 className="h-11 w-11" /></span>
          <h2 className="mt-5 text-3xl font-extrabold text-[#1d1a5e]">Thank you, {setup.firstName}!</h2>
          <p className="mt-3 text-lg leading-8 text-slate-600">Your {state.selectedBill.label.toLowerCase()} bill of <strong>{formatAmount(state.selectedBill.amount)}</strong> has been paid successfully.</p>
          <div className="mt-7 grid gap-3 sm:grid-cols-2">
            <Link to="/scenarios" className="inline-flex min-h-12 items-center justify-center rounded-xl bg-[#302992] px-5 py-3 font-bold text-white hover:bg-[#211c72]">Finish scenario</Link>
            <Link to="/scenario/online-bill-payment/setup" onClick={() => sessionStorage.removeItem(BILL_SETUP_STORAGE_KEY)} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border-2 border-[#302992] bg-white px-5 py-3 font-bold text-[#302992] hover:bg-indigo-50"><RotateCcw className="h-5 w-5" /> Start again</Link>
          </div>
        </div>
      )}
    </BillScenarioShell>
  );
}

function LoginStep({ setup, onSuccess }: { setup: BillSetupDetails; onSuccess: () => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  return <form className="mx-auto max-w-xl space-y-5" autoComplete="off" onSubmit={(event) => { event.preventDefault(); if (username === setup.username && password === setup.password) { setError(""); onSuccess(); } else setError("The username or password is incorrect. Please try again."); }}>
    <ScenarioInput label="Username" value={username} onChange={setUsername} name="bill-login-scenario-user" />
    <label className="block text-sm font-bold text-slate-800">Password<div className="relative mt-2"><input value={password} onChange={(event) => setPassword(event.target.value)} type={showPassword ? "text" : "password"} name="bill-login-scenario-pass" autoComplete="new-password" data-lpignore="true" data-1p-ignore="true" className="min-h-12 w-full rounded-xl border border-slate-300 px-4 pr-12 outline-none focus:border-[#302992] focus:ring-2 focus:ring-cyan-300" /><button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Hide password" : "Show password"} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-600 hover:bg-slate-100">{showPassword ? <Eye className="h-5 w-5" /> : <EyeOff className="h-5 w-5" />}</button></div></label>
    {error && <p role="alert" className="rounded-lg border border-rose-300 bg-rose-50 p-3 font-semibold text-rose-800">{error}</p>}
    <button type="submit" className="min-h-12 w-full rounded-xl bg-[#302992] px-5 py-3 font-bold text-white hover:bg-[#211c72]">Log in</button>
  </form>;
}

function CardPaymentStep({ amount, systemError, onBack, onSubmit }: { amount: string; systemError: boolean; onBack: () => void; onSubmit: () => void }) {
  const [details, setDetails] = useState<CardPreviewDetails & { cvv: string }>({ cardNumber: "", expiry: "", cardholderName: "", cvv: "" });
  const [submitted, setSubmitted] = useState(false);
  const cardValid = /^\d{16}$/.test(details.cardNumber) && /^(0[1-9]|1[0-2])\/\d{2}$/.test(details.expiry) && /^\d{3}$/.test(details.cvv) && /^[A-Za-z]+(?:[ '-][A-Za-z]+)+$/.test(details.cardholderName.trim());
  const update = (field: keyof typeof details, value: string) => setDetails((current) => ({ ...current, [field]: value }));
  return <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(300px,0.85fr)]">
    <form autoComplete="off" onSubmit={(event) => { event.preventDefault(); setSubmitted(true); if (!cardValid) return; onSubmit(); if (!systemError) setDetails({ cardNumber: "", expiry: "", cardholderName: details.cardholderName, cvv: "" }); }}>
      <div className="rounded-xl bg-indigo-50 p-4"><span className="text-sm font-semibold text-slate-600">Payment amount</span><strong className="ml-3 text-xl text-[#302992]">{amount}</strong></div>
      {systemError && <div role="alert" className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-950"><strong>Payment system error</strong><p className="mt-1 text-sm">The payment could not be processed. Please enter the card information again and retry.</p></div>}
      <div className="mt-5 space-y-4">
        <ScenarioInput label="Cardholder name" value={details.cardholderName} onChange={(value) => update("cardholderName", value.replace(/[^A-Za-z '-]/g, "").toUpperCase())} name="bill-cardholder" />
        <ScenarioInput label="Card number" value={details.cardNumber} onChange={(value) => update("cardNumber", value.replace(/\D/g, "").slice(0, 16))} name="bill-card-number" inputMode="numeric" placeholder="16 digits" />
        <div className="grid grid-cols-2 gap-4">
          <ScenarioInput label="Expiry date" value={details.expiry} onChange={(value) => { const digits = value.replace(/\D/g, "").slice(0, 4); update("expiry", digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits); }} name="bill-card-expiry" inputMode="numeric" placeholder="MM/YY" />
          <ScenarioInput label="CVV" value={details.cvv} onChange={(value) => update("cvv", value.replace(/\D/g, "").slice(0, 3))} name="bill-card-cvv" inputMode="numeric" placeholder="3 digits" password />
        </div>
      </div>
      {submitted && !cardValid && <p role="alert" className="mt-4 rounded-lg border border-rose-300 bg-rose-50 p-3 font-semibold text-rose-800">Please enter valid card information in every field.</p>}
      <div className="mt-6 grid gap-3 sm:grid-cols-2"><button type="button" onClick={onBack} className="min-h-12 rounded-xl border-2 border-[#302992] bg-white px-5 py-3 font-bold text-[#302992] hover:bg-indigo-50">Cancel</button><button type="submit" className="min-h-12 rounded-xl bg-[#302992] px-5 py-3 font-bold text-white hover:bg-[#211c72]">Confirm payment</button></div>
    </form>
    <aside className="lg:sticky lg:top-8"><BillCardPreview details={details} /><p className="mt-3 text-center text-xs font-semibold text-slate-500">Your scenario card updates as you type.</p></aside>
  </div>;
}

function ScenarioInput({ label, value, onChange, name, inputMode, placeholder, password = false }: { label: string; value: string; onChange: (value: string) => void; name: string; inputMode?: "numeric"; placeholder?: string; password?: boolean }) {
  return <label className="block text-sm font-bold text-slate-800">{label}<input value={value} onChange={(event) => onChange(event.target.value)} type={password ? "password" : "text"} name={name} inputMode={inputMode} placeholder={placeholder} autoComplete="new-password" data-lpignore="true" data-1p-ignore="true" className="mt-2 min-h-12 w-full rounded-xl border border-slate-300 px-4 outline-none focus:border-[#302992] focus:ring-2 focus:ring-cyan-300" /></label>;
}

