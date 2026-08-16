import { CalendarDays, CircleHelp, CreditCard, Eye, EyeOff, Flame, Globe2, Lightbulb, Waves } from "lucide-react";
import { useEffect, useMemo, useReducer, useState } from "react";
import { Navigate } from "react-router-dom";

import { BillCardPreview, type CardPreviewDetails } from "../../components/bill/BillCardPreview";
import { BillPaymentReceipt } from "../../components/bill/BillPaymentReceipt";
import { BillScenarioShell } from "../../components/bill/BillScenarioShell";
import { useTranslation } from "../../i18n";
import { billPaymentTranslations, type BillPaymentText } from "../../lib/billPaymentTranslations";
import { cardHintTranslations, type CardHintField } from "../../lib/cardHintTranslations";
import { createBillStatementMetadata, type BillStatementMetadata } from "../../lib/billStatement";
import { billStatementTranslations } from "../../lib/billStatementTranslations";
import { createPracticeCardDetails, matchesPracticeCard } from "../../lib/practiceCard";
import { practiceCardTranslations } from "../../lib/practiceCardTranslations";
import {
  BILL_SETUP_STORAGE_KEY,
  billDefinitions,
  billPaymentReducer,
  initialBillPaymentState,
  isValidCardExpiry,
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
  const text = billPaymentTranslations[language];
  const statementText = billStatementTranslations[language];
  const currency = language === "tr" ? "TRY" : "EUR";
  const locale = ({ en: "en-IE", es: "es-ES", de: "de-DE", tr: "tr-TR", pt: "pt-PT", fr: "fr-FR" } as const)[language];
  const formatAmount = (amount: number) => new Intl.NumberFormat(locale, { style: "currency", currency, maximumFractionDigits: 0 }).format(amount);
  const formatDueDate = (date: Date) => new Intl.DateTimeFormat(locale, { day: "numeric", month: "long", year: "numeric" }).format(date);
  const statements = useMemo(() => Object.fromEntries(
    billDefinitions.map((bill) => [bill.type, createBillStatementMetadata(bill.type)]),
  ) as Record<BillType, BillStatementMetadata>, []);

  if (!setup) return <Navigate to="/scenario/online-bill-payment/setup" replace />;

  const currentStep = state.step === "login" ? 1 : state.step === "bill-selection" || state.step === "bill-details" ? 2 : state.step === "card-payment" ? 3 : 4;
  const title = state.step === "login" ? text.loginTitle : state.step === "bill-selection" ? text.selectTitle : state.step === "bill-details" ? text.reviewTitle : state.step === "card-payment" ? text.cardTitle : text.completeTitle;
  const subtitle = state.step === "login" ? text.loginSubtitle : state.step === "bill-selection" ? text.selectSubtitle : state.step === "bill-details" ? text.reviewSubtitle : state.step === "card-payment" ? text.cardSubtitle : text.completeSubtitle;
  const billLabel = (type: BillType) => text[type === "natural-gas" ? "naturalGas" : type];
  const customerName = `${setup.firstName} ${setup.lastName}`;

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [state.step]);

  return (
    <BillScenarioShell currentStep={currentStep} title={title} subtitle={subtitle} compact={state.step === "bill-details" || state.step === "card-payment"}>
      {state.step === "login" && <LoginStep setup={setup} text={text} onSuccess={() => dispatch({ type: "LOGIN_SUCCESS" })} />}
      {state.step === "bill-selection" && (
        <div className="grid gap-4 sm:grid-cols-2">
          {billDefinitions.map((bill) => {
            const Icon = billIcons[bill.type];
            return <button key={bill.type} type="button" onClick={() => dispatch({ type: "SELECT_BILL", bill })} className="group flex min-h-28 items-center gap-4 rounded-2xl border border-indigo-200 bg-indigo-50/70 p-5 text-left hover:border-cyan-400 hover:bg-cyan-50 focus:outline-none focus:ring-2 focus:ring-cyan-400"><span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#302992] text-white"><Icon className="h-6 w-6" /></span><span><strong className="block text-lg text-[#1d1a5e]">{billLabel(bill.type)}</strong><span className="mt-1 block text-sm text-slate-600">{text.viewBill}</span></span></button>;
          })}
        </div>
      )}
      {state.step === "bill-details" && state.selectedBill && (
        <div className="mx-auto max-w-4xl">
          <div className="overflow-hidden rounded-2xl border border-indigo-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3 bg-gradient-to-br from-indigo-50 to-cyan-50 p-4 sm:px-5">
              <div><p className="text-xs font-bold uppercase tracking-wide text-[#087f8c]">{statementText.details}</p><h2 className="mt-0.5 text-xl font-extrabold text-[#1d1a5e]">{billLabel(state.selectedBill.type)} {text.bill}</h2></div>
              <div className="text-right"><span className="block text-xs font-semibold text-slate-600">{text.amountDue}</span><strong className="text-3xl text-[#302992]">{formatAmount(state.selectedBill.amount)}</strong></div>
            </div>
            <div className="p-4 sm:px-5">
              <p className="rounded-lg border border-cyan-200 bg-cyan-50/70 p-3 text-sm font-semibold leading-6 text-[#1d1a5e]">{statementText.summary.replace("{name}", customerName).replace("{amount}", formatAmount(state.selectedBill.amount)).replace("{bill}", billLabel(state.selectedBill.type).toLowerCase()).replace("{date}", formatDueDate(statements[state.selectedBill.type].dueDate))}</p>
              <dl className="mt-3 grid gap-2 sm:grid-cols-2">
                <BillDetailItem label={statementText.customer} value={customerName} />
                <BillDetailItem label={statementText.provider} value={billLabel(state.selectedBill.type)} />
                <BillDetailItem label={statementText.subscriptionNumber} value={statements[state.selectedBill.type].subscriptionNumber} mono />
                <BillDetailItem label={statementText.referenceNumber} value={statements[state.selectedBill.type].referenceNumber} mono />
                <BillDetailItem label={statementText.dueDate} value={formatDueDate(statements[state.selectedBill.type].dueDate)} important />
              </dl>
              <p className="mt-3 flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 p-2.5 text-sm font-bold text-amber-950"><CalendarDays className="h-4 w-4 shrink-0" /> {statementText.deadlineNotice.replace("{date}", formatDueDate(statements[state.selectedBill.type].dueDate))}</p>
            </div>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <button type="button" onClick={() => dispatch({ type: "BACK_TO_BILLS" })} className="min-h-12 rounded-xl border-2 border-[#302992] bg-white px-5 py-3 font-bold text-[#302992] hover:bg-indigo-50">{text.anotherBill}</button>
            <button type="button" onClick={() => dispatch({ type: "PAY_BY_CARD" })} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#302992] px-5 py-3 font-bold text-white hover:bg-[#211c72]"><CreditCard className="h-5 w-5" /> {text.payCard}</button>
          </div>
        </div>
      )}
      {state.step === "card-payment" && state.selectedBill && (
        <CardPaymentStep
          amount={formatAmount(state.selectedBill.amount)}
          cardholderName={customerName}
          systemError={state.systemError}
          text={text}
          onBack={() => dispatch({ type: "BACK_TO_BILLS" })}
          onSubmit={() => dispatch({ type: state.paymentAttempts === 0 ? "PAYMENT_SYSTEM_ERROR" : "PAYMENT_SUCCESS" })}
        />
      )}
      {state.step === "success" && state.selectedBill && (
        <BillPaymentReceipt
          details={{
            customerName,
            billLabel: billLabel(state.selectedBill.type),
            amount: formatAmount(state.selectedBill.amount),
            subscriptionNumber: statements[state.selectedBill.type].subscriptionNumber,
            billReference: statements[state.selectedBill.type].referenceNumber,
          }}
          finishLabel={text.finish}
          startAgainLabel={text.startAgain}
          setupPath="/scenario/online-bill-payment/setup"
          onStartAgain={() => sessionStorage.removeItem(BILL_SETUP_STORAGE_KEY)}
        />
      )}
    </BillScenarioShell>
  );
}

function BillDetailItem({ label, value, mono = false, important = false }: { label: string; value: string; mono?: boolean; important?: boolean }) {
  return (
    <div className={`rounded-lg border px-3 py-2 ${important ? "border-amber-300 bg-amber-50" : "border-slate-200 bg-slate-50"}`}>
      <dt className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className={`mt-0.5 text-sm font-bold ${mono ? "font-mono tracking-wide" : ""} ${important ? "text-amber-950" : "text-[#1d1a5e]"}`}>{value}</dd>
    </div>
  );
}

function LoginStep({ setup, text, onSuccess }: { setup: BillSetupDetails; text: BillPaymentText; onSuccess: () => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  return <form className="mx-auto max-w-xl space-y-5" autoComplete="off" onSubmit={(event) => { event.preventDefault(); if (username === setup.username && password === setup.password) { setError(""); onSuccess(); } else setError(text.loginError); }}>
    <ScenarioInput label={text.username} value={username} onChange={setUsername} name="bill-login-scenario-user" />
    <label className="block text-sm font-bold text-slate-800">{text.password}<div className="relative mt-2"><input value={password} onChange={(event) => setPassword(event.target.value)} type={showPassword ? "text" : "password"} name="bill-login-scenario-pass" autoComplete="new-password" data-lpignore="true" data-1p-ignore="true" className="min-h-12 w-full rounded-xl border border-slate-300 px-4 pr-12 outline-none focus:border-[#302992] focus:ring-2 focus:ring-cyan-300" /><button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? text.hidePassword : text.showPassword} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-600 hover:bg-slate-100">{showPassword ? <Eye className="h-5 w-5" /> : <EyeOff className="h-5 w-5" />}</button></div></label>
    {error && <p role="alert" className="rounded-lg border border-rose-300 bg-rose-50 p-3 font-semibold text-rose-800">{error}</p>}
    <button type="submit" className="min-h-12 w-full rounded-xl bg-[#302992] px-5 py-3 font-bold text-white hover:bg-[#211c72]">{text.loginButton}</button>
  </form>;
}

function CardPaymentStep({ amount, cardholderName, systemError, text, onBack, onSubmit }: { amount: string; cardholderName: string; systemError: boolean; text: BillPaymentText; onBack: () => void; onSubmit: () => void }) {
  const { language } = useTranslation();
  const practiceText = practiceCardTranslations[language];
  const hintText = cardHintTranslations[language];
  const expectedCard = useMemo(() => createPracticeCardDetails(cardholderName), [cardholderName]);
  const [details, setDetails] = useState<CardPreviewDetails>({ cardNumber: "", expiry: "", cardholderName: "", cvv: "" });
  const [submitted, setSubmitted] = useState(false);
  const [hintsVisible, setHintsVisible] = useState(false);
  const [hintField, setHintField] = useState<CardHintField>("cardholderName");
  const expiryFormatValid = /^(0[1-9]|1[0-2])\/\d{2}$/.test(details.expiry);
  const cardExpired = expiryFormatValid && !isValidCardExpiry(details.expiry);
  const cardMatches = matchesPracticeCard(details, expectedCard);
  const update = (field: keyof typeof details, value: string) => setDetails((current) => ({ ...current, [field]: value }));
  const submitPayment = () => {
    setSubmitted(true);
    if (!cardMatches) return;
    onSubmit();
    if (!systemError) {
      setDetails({ cardNumber: "", expiry: "", cardholderName: "", cvv: "" });
      setSubmitted(false);
    }
  };
  return <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.08fr)_minmax(320px,0.92fr)]">
    <div role="group" aria-label={text.cardTitle} data-form-type="other">
      <div className="rounded-xl bg-indigo-50 px-4 py-2.5"><span className="text-sm font-semibold text-slate-600">{text.paymentAmount}</span><strong className="ml-3 text-xl text-[#302992]">{amount}</strong></div>
      <div className="mt-3 rounded-xl border border-cyan-200 bg-cyan-50/70 px-4 py-3">
        <div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0 flex-1"><strong className="text-base text-[#1d1a5e]">{practiceText.instructionTitle}</strong><p className="mt-1 text-sm leading-5 text-slate-700">{practiceText.instruction}</p></div><button type="button" aria-expanded={hintsVisible} onClick={() => setHintsVisible((current) => !current)} className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-lg border-2 border-[#302992] bg-white px-3 py-2 text-sm font-bold text-[#302992] hover:bg-indigo-50"><CircleHelp className="h-5 w-5" /> {hintsVisible ? hintText.hide : hintText.show}</button></div>
        {hintsVisible && <p role="status" className="mt-2 rounded-lg bg-amber-100 px-3 py-2 text-sm font-semibold text-amber-950">{hintText.help}</p>}
      </div>
      {systemError && <div role="alert" className="mt-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-amber-950"><strong className="text-sm">{text.systemErrorTitle}</strong><p className="text-xs leading-5">{text.systemErrorBody}</p></div>}
      <div className="mt-3 space-y-3">
        <ScenarioInput compact label={text.cardholder} value={details.cardholderName} onChange={(value) => update("cardholderName", value.replace(/[^A-Za-z '-]/g, "").toUpperCase())} onFocus={() => setHintField("cardholderName")} name="scenario-copy-holder" />
        <ScenarioInput compact label={text.cardNumber} value={details.cardNumber} onChange={(value) => update("cardNumber", value.replace(/\D/g, "").slice(0, 16))} onFocus={() => setHintField("cardNumber")} name="scenario-copy-number" inputMode="numeric" placeholder={text.digits16} />
        <div className="grid grid-cols-2 gap-3">
          <ScenarioInput compact label={text.expiry} value={details.expiry} onChange={(value) => { const digits = value.replace(/\D/g, "").slice(0, 4); update("expiry", digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits); }} onFocus={() => setHintField("expiry")} name="scenario-copy-date" inputMode="numeric" placeholder="MM/YY" />
          <ScenarioInput compact label="CVV" value={details.cvv} onChange={(value) => update("cvv", value.replace(/\D/g, "").slice(0, 3))} onFocus={() => setHintField("cvv")} name="scenario-copy-code" inputMode="numeric" placeholder={text.digits3} />
        </div>
      </div>
      {submitted && cardExpired && <p role="alert" className="mt-2 rounded-lg border border-rose-300 bg-rose-50 p-2 text-xs font-semibold text-rose-800">{text.expiredError}</p>}
      {submitted && !cardExpired && !cardMatches && <p role="alert" className="mt-2 rounded-lg border border-rose-300 bg-rose-50 p-2 text-xs font-semibold text-rose-800">{practiceText.mismatchError}</p>}
      <div className="mt-4 grid gap-3 sm:grid-cols-2"><button type="button" onClick={onBack} className="min-h-11 rounded-xl border-2 border-[#302992] bg-white px-4 py-2 text-sm font-bold text-[#302992] hover:bg-indigo-50">{text.cancel}</button><button type="button" onClick={submitPayment} className="min-h-11 rounded-xl bg-[#302992] px-4 py-2 text-sm font-bold text-white hover:bg-[#211c72]">{text.confirmPayment}</button></div>
    </div>
    <aside className="lg:sticky lg:top-8">
      <BillCardPreview details={expectedCard} hintsVisible={hintsVisible} hintField={hintField} />
      <p className="mt-3 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-center text-sm font-semibold leading-5 text-[#1d1a5e]">{hintText.stuckMessage}</p>
    </aside>
  </div>;
}

function ScenarioInput({ label, value, onChange, onFocus, name, inputMode, placeholder, password = false, compact = false }: { label: string; value: string; onChange: (value: string) => void; onFocus?: () => void; name: string; inputMode?: "numeric"; placeholder?: string; password?: boolean; compact?: boolean }) {
  return <label className="block text-sm font-bold text-slate-800">{label}<input value={value} onChange={(event) => onChange(event.currentTarget.value)} onFocus={onFocus} type={password ? "password" : "text"} name={name} inputMode={inputMode} placeholder={placeholder} autoComplete="off" aria-autocomplete="none" spellCheck={false} data-form-type="other" data-lpignore="true" data-1p-ignore="true" data-bwignore="true" data-protonpass-ignore="true" className={`${compact ? "mt-1.5 min-h-11 rounded-xl px-3 text-sm" : "mt-2 min-h-12 rounded-xl px-4"} w-full border border-slate-300 bg-white text-slate-950 outline-none focus:border-[#302992] focus:ring-2 focus:ring-cyan-300`} /></label>;
}
