import { AlertTriangle, ArrowRight, CreditCard, Eye, EyeOff, Flame, Globe2, Lightbulb, LockKeyhole, LogIn, LogOut, ShieldCheck, UserRound, Waves } from "lucide-react";
import { useCallback, useEffect, useMemo, useReducer, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";

import { BillCardPreview, type ActiveCardField, type CardPreviewDetails } from "../../components/bill/BillCardPreview";
import { BillPaymentReceipt } from "../../components/bill/BillPaymentReceipt";
import { BillScenarioShell } from "../../components/bill/BillScenarioShell";
import { BillVoiceAssistant } from "../../components/bill/BillVoiceAssistant";
import { useTranslation } from "../../i18n";
import { billAssistantTranslations, billCardPaymentGuidance, type BillAssistantStep } from "../../lib/billAssistantTranslations";
import { isValidBillAccountName, sanitizeBillAccountName } from "../../lib/billAccountValidation";
import { billPaymentTranslations, type BillPaymentText } from "../../lib/billPaymentTranslations";
import { billLoginSecurityTranslations } from "../../lib/billLoginSecurityTranslations";
import { billInactivityTranslations } from "../../lib/billInactivityTranslations";
import { createBillStatementMetadata, type BillStatementMetadata } from "../../lib/billStatement";
import { billStatementTranslations } from "../../lib/billStatementTranslations";
import { billStatusTranslations } from "../../lib/billStatusTranslations";
import { createPracticeCardDetails, matchesPracticeCard } from "../../lib/practiceCard";
import { practiceCardTranslations } from "../../lib/practiceCardTranslations";
import {
  BILL_SETUP_STORAGE_KEY,
  billPaymentReducer,
  createRandomBillDefinitions,
  initialBillPaymentState,
  isValidCardExpiry,
  type BillSetupDetails,
  type BillType,
} from "../../lib/billPaymentState";
import { playSuccessSound, stopSuccessSound, unlockAssistantAudioPlayback } from "../../services/speechSynthesisService";

const billIcons = { electricity: Lightbulb, "natural-gas": Flame, water: Waves, internet: Globe2 } satisfies Record<BillType, typeof Lightbulb>;

function readSetupDetails(): BillSetupDetails | null {
  try {
    const value = sessionStorage.getItem(BILL_SETUP_STORAGE_KEY);
    return value ? JSON.parse(value) as BillSetupDetails : null;
  } catch {
    return null;
  }
}

type LoginFailure = { kind: "incorrect"; attemptsRemaining: number } | { kind: "locked" };

export function BillPaymentScenarioPage() {
  const navigate = useNavigate();
  const setup = useMemo(readSetupDetails, []);
  const [state, dispatch] = useReducer(billPaymentReducer, initialBillPaymentState);
  const { language } = useTranslation();
  const text = billPaymentTranslations[language];
  const assistantText = billAssistantTranslations[language];
  const loginSecurityText = billLoginSecurityTranslations[language];
  const inactivityText = billInactivityTranslations[language];
  const statusText = billStatusTranslations[language];
  const [receiptVisible, setReceiptVisible] = useState(false);
  const [cardValidationMessage, setCardValidationMessage] = useState("");
  const [cardValidationSpeechRequestId, setCardValidationSpeechRequestId] = useState(0);
  const [loginFailure, setLoginFailure] = useState<LoginFailure | null>(null);
  const [loginLocked, setLoginLocked] = useState(false);
  const [, setInactivitySeconds] = useState(0);
  const [inactivityWarningRemaining, setInactivityWarningRemaining] = useState<number | null>(null);
  const [inactivityTimedOut, setInactivityTimedOut] = useState(false);
  const [assistantSpeaking, setAssistantSpeaking] = useState(false);
  const statementText = billStatementTranslations[language];
  const currency = language === "tr" ? "TRY" : "EUR";
  const sessionBills = useMemo(() => createRandomBillDefinitions(currency), [currency]);
  const locale = ({ en: "en-IE", es: "es-ES", de: "de-DE", tr: "tr-TR", pt: "pt-PT", fr: "fr-FR" } as const)[language];
  const formatAmount = (amount: number) => new Intl.NumberFormat(locale, { style: "currency", currency, maximumFractionDigits: 0 }).format(amount);
  const formatDueDate = (date: Date) => new Intl.DateTimeFormat(locale, { day: "numeric", month: "long", year: "numeric" }).format(date);
  const statements = useMemo(() => Object.fromEntries(
    sessionBills.map((bill) => [bill.type, createBillStatementMetadata(bill.type)]),
  ) as Record<BillType, BillStatementMetadata>, [sessionBills]);

  if (!setup) return <Navigate to="/scenario/online-bill-payment/setup" replace />;

  const currentStep = state.step === "login" ? 1 : state.step === "bill-selection" || state.step === "bill-details" ? 2 : state.step === "card-payment" ? 3 : 4;
  const title = state.step === "login" ? text.loginTitle : state.step === "bill-selection" ? text.selectTitle : state.step === "bill-details" ? text.reviewTitle : state.step === "card-payment" ? text.cardTitle : text.completeTitle;
  const subtitle = state.step === "login" ? text.loginSubtitle : state.step === "bill-selection" ? text.selectSubtitle : state.step === "bill-details" ? text.reviewSubtitle : state.step === "card-payment" ? text.cardSubtitle : text.completeSubtitle;
  const billLabel = (type: BillType) => text[type === "natural-gas" ? "naturalGas" : type];
  const customerName = `${setup.firstName} ${setup.lastName}`;
  const SelectedBillIcon = state.selectedBill ? billIcons[state.selectedBill.type] : CreditCard;
  const assistantStep: BillAssistantStep = state.step === "card-payment" && state.systemError
    ? "payment-error"
    : state.step === "success" && receiptVisible
      ? "receipt"
      : state.step;
  const loginAssistantMessage = loginFailure?.kind === "locked"
    ? loginSecurityText.locked
    : loginFailure?.kind === "incorrect"
      ? loginSecurityText.incorrect(loginFailure.attemptsRemaining)
      : "";
  const assistantMessage = inactivityTimedOut
    ? inactivityText.timeoutAssistant
    : inactivityWarningRemaining !== null
      ? inactivityText.warning(inactivityWarningRemaining)
    : state.step === "card-payment" && cardValidationMessage
    ? cardValidationMessage
    : state.step === "login" && loginAssistantMessage
    ? loginAssistantMessage
    : assistantStep === "bill-selection"
    ? `${statusText.welcome(customerName)}. ${assistantText.messages[assistantStep]}`
    : assistantStep === "bill-details" && state.selectedBill
      ? assistantText.reviewBill(billLabel(state.selectedBill.type))
    : assistantStep === "card-payment"
      ? billCardPaymentGuidance[language]
    : assistantText.messages[assistantStep];

  const resetInactivityTimer = useCallback(() => {
    if (inactivityTimedOut || loginLocked) return;
    setInactivitySeconds(0);
    setInactivityWarningRemaining(null);
  }, [inactivityTimedOut, loginLocked]);

  const handleAssistantSpeakingChange = useCallback((speaking: boolean) => {
    setAssistantSpeaking(speaking);
    // Assistant speech only pauses the countdown. The elapsed idle time is
    // preserved and continues after speech ends; only user activity resets it.
  }, []);

  const finishInactiveSession = useCallback(() => {
    navigate("/scenario/online-bill-payment", { replace: true });
  }, [navigate]);

  const handleAssistantMessageEnd = useCallback(() => {
    if (inactivityTimedOut || loginLocked) {
      finishInactiveSession();
      return;
    }
    if (inactivityWarningRemaining !== null) setInactivityWarningRemaining(null);
  }, [finishInactiveSession, inactivityTimedOut, inactivityWarningRemaining, loginLocked]);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [state.step]);

  useEffect(() => {
    if (state.step !== "success") return;
    if (localStorage.getItem("assist_ai_sound_enabled") !== "false") playSuccessSound();
    return stopSuccessSound;
  }, [state.step]);

  useEffect(() => {
    if (!loginLocked) return;
    const soundEnabled = localStorage.getItem("assist_ai_sound_enabled") !== "false";
    // With sound enabled, handleAssistantMessageEnd redirects only after the
    // complete security message finishes (or playback reports an error).
    if (soundEnabled) return;
    const fallbackTimer = window.setTimeout(() => navigate("/scenario/online-bill-payment", { replace: true }), 1500);
    return () => window.clearTimeout(fallbackTimer);
  }, [loginLocked, navigate]);

  useEffect(() => {
    if (inactivityTimedOut || loginLocked || assistantSpeaking) return;
    const timer = window.setInterval(() => {
      setInactivitySeconds((current) => {
        const next = current + 1;
        if (next >= 60) {
          setInactivityWarningRemaining(null);
          setInactivityTimedOut(true);
          return 60;
        }
        if (next % 15 === 0) setInactivityWarningRemaining(60 - next);
        return next;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [assistantSpeaking, inactivityTimedOut, loginLocked]);

  useEffect(() => {
    if (!inactivityTimedOut) return;
    const soundEnabled = localStorage.getItem("assist_ai_sound_enabled") !== "false";
    const fallbackTimer = window.setTimeout(finishInactiveSession, soundEnabled ? 8000 : 2000);
    return () => window.clearTimeout(fallbackTimer);
  }, [finishInactiveSession, inactivityTimedOut]);

  useEffect(() => {
    if (inactivityWarningRemaining === null || localStorage.getItem("assist_ai_sound_enabled") !== "false") return;
    const timer = window.setTimeout(() => setInactivityWarningRemaining(null), 5000);
    return () => window.clearTimeout(timer);
  }, [inactivityWarningRemaining]);

  return (
    <div onPointerDownCapture={() => { unlockAssistantAudioPlayback(); resetInactivityTimer(); }} onKeyDownCapture={resetInactivityTimer}>
    <BillScenarioShell currentStep={currentStep} title={title} subtitle={subtitle} compact={state.step === "card-payment"} assistant={<BillVoiceAssistant message={assistantMessage} speechRequestId={cardValidationSpeechRequestId} onMessageEnd={handleAssistantMessageEnd} onSpeakingChange={handleAssistantSpeakingChange} />}>
      {inactivityTimedOut ? (
        <div className="mx-auto max-w-2xl rounded-2xl border-2 border-amber-400 bg-amber-50 p-7 text-center shadow-sm" role="alert">
          <AlertTriangle className="mx-auto h-12 w-12 text-amber-700" />
          <p className="mt-4 text-xs font-extrabold uppercase tracking-wide text-amber-700">{inactivityText.timeoutTitle}</p>
          <h2 className="mt-2 text-2xl font-extrabold text-slate-950">{inactivityText.timeoutMessage}</h2>
        </div>
      ) : <>
      {inactivityWarningRemaining !== null && (
        <div className="mb-5 flex items-start gap-3 rounded-xl border-2 border-amber-400 bg-amber-50 p-4 text-amber-950 shadow-sm" role="alert">
          <AlertTriangle className="mt-0.5 h-6 w-6 shrink-0 text-amber-700" />
          <div><p className="text-xs font-extrabold uppercase tracking-wide text-amber-700">{inactivityText.warningTitle}</p><p className="mt-1 font-bold">{inactivityText.warning(inactivityWarningRemaining)}</p></div>
        </div>
      )}
      {state.step === "login" && <LoginStep setup={setup} text={text} securityText={loginSecurityText} onFailed={setLoginFailure} onLocked={() => setLoginLocked(true)} onSuccess={() => { setLoginFailure(null); dispatch({ type: "LOGIN_SUCCESS" }); }} />}
      {state.step === "bill-selection" && (
        <div className="mx-auto max-w-5xl">
        <div className="relative mb-6 overflow-hidden rounded-3xl bg-gradient-to-r from-[#211c72] via-[#302992] to-[#087f8c] px-6 py-6 text-white shadow-[0_22px_45px_-30px_rgba(48,41,146,0.85)] sm:px-8">
          <div className="absolute -right-10 -top-16 h-44 w-44 rounded-full border-[22px] border-white/10" aria-hidden="true" />
          <div className="relative flex items-center gap-4"><span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/25"><UserRound className="h-9 w-9" aria-hidden="true" /></span><div><h2 className="text-2xl font-extrabold sm:text-3xl">{statusText.welcome(customerName)}</h2><p className="mt-1 font-medium text-cyan-50">{text.selectSubtitle}</p></div></div>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          {sessionBills.map((bill) => {
            const Icon = billIcons[bill.type];
            const isPaid = state.paidBillTypes.includes(bill.type);
            const serviceTheme = bill.type === "electricity" ? "from-amber-50 to-yellow-100/70 border-amber-200" : bill.type === "natural-gas" ? "from-orange-50 to-rose-100/60 border-orange-200" : bill.type === "water" ? "from-cyan-50 to-blue-100/70 border-cyan-200" : "from-violet-50 to-indigo-100/70 border-violet-200";
            const iconTheme = bill.type === "electricity" ? "bg-amber-500" : bill.type === "natural-gas" ? "bg-orange-600" : bill.type === "water" ? "bg-cyan-600" : "bg-violet-700";
            return <button key={bill.type} type="button" disabled={isPaid} onClick={() => dispatch({ type: "SELECT_BILL", bill })} className={`group relative flex min-h-40 items-center gap-5 overflow-hidden rounded-3xl border-2 bg-gradient-to-br px-6 pb-6 pt-11 text-left shadow-sm transition focus:outline-none focus:ring-4 focus:ring-cyan-300 ${isPaid ? "cursor-not-allowed border-emerald-200 from-emerald-50 to-teal-100/70 opacity-80" : `${serviceTheme} hover:-translate-y-1 hover:shadow-xl`}`}><span className="absolute -bottom-10 -right-8 h-28 w-28 rounded-full bg-white/40" aria-hidden="true" /><span className={`absolute right-5 top-4 rounded-full px-3 py-1 text-xs font-extrabold uppercase tracking-wide text-white shadow-sm ${isPaid ? "bg-emerald-700" : "bg-amber-700"}`}>{isPaid ? statusText.paid : statusText.unpaid}</span><span className={`relative flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl text-white shadow-lg ${isPaid ? "bg-emerald-700" : iconTheme}`}><Icon className="h-9 w-9" /></span><span className="relative min-w-0 flex-1"><strong className="block text-2xl font-extrabold text-[#1d1a5e]">{billLabel(bill.type)}</strong><span className={`mt-2 inline-flex items-center gap-2 text-base font-bold ${isPaid ? "text-emerald-800" : "text-[#302992]"}`}>{isPaid ? statusText.paid : text.viewBill}{!isPaid && <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" aria-hidden="true" />}</span></span></button>;
          })}
        </div>
        <div className="mt-6 flex justify-center sm:justify-end"><Link to="/scenarios" className="inline-flex min-h-14 items-center justify-center gap-2 rounded-xl border-2 border-slate-400 bg-white px-6 py-3 font-extrabold text-slate-700 shadow-sm hover:border-[#302992] hover:bg-indigo-50 hover:text-[#302992]"><LogOut className="h-5 w-5" /> {statusText.leave}</Link></div>
        </div>
      )}
      {state.step === "bill-details" && state.selectedBill && (
        <div className="mx-auto max-w-5xl">
          <div className="overflow-hidden rounded-3xl border-2 border-indigo-200 bg-white shadow-[0_24px_55px_-35px_rgba(48,41,146,0.65)]">
            <div className="flex flex-wrap items-center justify-between gap-5 bg-gradient-to-br from-[#211c72] via-[#302992] to-[#087f8c] p-6 text-white sm:px-8 sm:py-7">
              <div className="flex items-center gap-4">
                <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/25"><SelectedBillIcon className="h-9 w-9" aria-hidden="true" /></span>
                <div><p className="text-sm font-extrabold uppercase tracking-[0.12em] text-cyan-100">{statementText.details}</p><h2 className="mt-1 text-3xl font-extrabold">{billLabel(state.selectedBill.type)} {text.bill}</h2></div>
              </div>
              <div className="min-w-48 rounded-2xl bg-white px-5 py-3 text-right shadow-lg"><span className="block text-sm font-bold uppercase tracking-wide text-slate-500">{text.amountDue}</span><strong className="mt-1 block text-4xl text-[#302992]">{formatAmount(state.selectedBill.amount)}</strong></div>
            </div>
            <div className="p-5 sm:p-8">
              <dl className="grid gap-4 md:grid-cols-3">
                <BillDetailItem label={statementText.customer} value={customerName} />
                <BillDetailItem label={statementText.subscriptionNumber} value={statements[state.selectedBill.type].subscriptionNumber} mono />
                <BillDetailItem label={statementText.dueDate} value={formatDueDate(statements[state.selectedBill.type].dueDate)} important />
              </dl>
            </div>
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <button type="button" onClick={() => dispatch({ type: "BACK_TO_BILLS" })} className="min-h-14 rounded-xl border-2 border-[#302992] bg-white px-6 py-4 text-lg font-extrabold text-[#302992] hover:bg-indigo-50">{text.anotherBill}</button>
            <button type="button" onClick={() => dispatch({ type: "PAY_BY_CARD" })} className="inline-flex min-h-14 items-center justify-center gap-3 rounded-xl bg-[#079c6b] px-6 py-4 text-lg font-extrabold text-white shadow-lg shadow-emerald-950/15 hover:bg-[#057a55]"><CreditCard className="h-6 w-6" /> {text.payCard}</button>
          </div>
        </div>
      )}
      {state.step === "card-payment" && state.selectedBill && (
        <CardPaymentStep
          amount={formatAmount(state.selectedBill.amount)}
          customerName={customerName}
          systemError={state.systemError}
          text={text}
          onBack={() => {
            setCardValidationMessage("");
            dispatch({ type: "BACK_TO_BILLS" });
          }}
          onValidationError={(message) => {
            setCardValidationMessage(message);
            setCardValidationSpeechRequestId((current) => current + 1);
          }}
          onSubmit={() => {
            setCardValidationMessage("");
            setReceiptVisible(true);
            dispatch({ type: "PAYMENT_SUCCESS" });
          }}
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
          thanksTitle={text.thanks.replace("{name}", setup.firstName)}
          confirmationMessage={text.paidSuccess.replace("{bill}", billLabel(state.selectedBill.type).toLowerCase()).replace("{amount}", formatAmount(state.selectedBill.amount))}
          onPayAnother={() => { setReceiptVisible(false); dispatch({ type: "PAY_ANOTHER_BILL" }); }}
          onReceiptVisibilityChange={setReceiptVisible}
        />
      )}
      </>}
    </BillScenarioShell>
    </div>
  );
}

function BillDetailItem({ label, value, mono = false, important = false }: { label: string; value: string; mono?: boolean; important?: boolean }) {
  return (
    <div className={`min-h-28 rounded-2xl border-2 px-5 py-4 ${important ? "border-amber-300 bg-gradient-to-br from-amber-50 to-orange-50" : "border-indigo-100 bg-gradient-to-br from-slate-50 to-indigo-50/70"}`}>
      <dt className={`text-sm font-extrabold uppercase tracking-wide ${important ? "text-amber-700" : "text-slate-500"}`}>{label}</dt>
      <dd className={`mt-3 break-words text-xl font-extrabold ${mono ? "font-mono tracking-wide" : ""} ${important ? "text-amber-950" : "text-[#1d1a5e]"}`}>{value}</dd>
    </div>
  );
}

function LoginStep({ setup, text, securityText, onSuccess, onFailed, onLocked }: { setup: BillSetupDetails; text: BillPaymentText; securityText: { incorrect: (attempts: number) => string; locked: string }; onSuccess: () => void; onFailed: (failure: LoginFailure) => void; onLocked: () => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [failure, setFailure] = useState<LoginFailure | null>(null);
  const [attemptsRemaining, setAttemptsRemaining] = useState(3);
  const [locked, setLocked] = useState(false);
  const error = failure?.kind === "locked"
    ? securityText.locked
    : failure?.kind === "incorrect"
      ? securityText.incorrect(failure.attemptsRemaining)
      : "";
  return <div className="mx-auto max-w-3xl overflow-hidden rounded-3xl border-2 border-indigo-100 bg-gradient-to-br from-white via-indigo-50/40 to-cyan-50/70 shadow-[0_24px_55px_-40px_rgba(48,41,146,0.7)]">
    <div className="relative overflow-hidden bg-gradient-to-r from-[#211c72] via-[#302992] to-[#087f8c] px-6 py-5 text-white sm:px-8">
      <div className="absolute -right-8 -top-12 h-36 w-36 rounded-full border-[18px] border-white/10" aria-hidden="true" />
      <div className="relative flex items-center gap-4"><span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/25"><LockKeyhole className="h-8 w-8" aria-hidden="true" /></span><div><h2 className="text-xl font-extrabold sm:text-2xl">{text.loginTitle}</h2><p className="mt-1 text-sm font-medium text-cyan-50 sm:text-base">{text.loginSubtitle}</p></div></div>
    </div>
  <form className="space-y-5 p-5 sm:p-8" autoComplete="off" onSubmit={(event) => {
    event.preventDefault();
    if (locked) return;
    if (username === setup.username && password === setup.password) { setFailure(null); onSuccess(); return; }
    const nextAttempts = attemptsRemaining - 1;
    setAttemptsRemaining(nextAttempts);
    setPassword("");
    if (nextAttempts <= 0) {
      setLocked(true);
      const lockedFailure: LoginFailure = { kind: "locked" };
      setFailure(lockedFailure);
      onFailed(lockedFailure);
      onLocked();
      return;
    }
    const incorrectFailure: LoginFailure = { kind: "incorrect", attemptsRemaining: nextAttempts };
    setFailure(incorrectFailure);
    onFailed(incorrectFailure);
  }}>
    <div className="rounded-2xl border border-indigo-100 bg-white/90 p-5 shadow-sm sm:p-6">
      <div className="mb-5 flex items-center gap-3 text-[#1d1a5e]"><UserRound className="h-6 w-6" aria-hidden="true" /><ShieldCheck className="h-5 w-5 text-cyan-700" aria-hidden="true" /></div>
      <div className="space-y-5"><ScenarioInput label={text.username} value={username} onChange={setUsername} name="bill-login-scenario-user" />
      <label className="block text-sm font-extrabold text-slate-800">{text.password}<div className="relative mt-2"><input value={password} onChange={(event) => setPassword(event.target.value)} type={showPassword ? "text" : "password"} name="bill-login-scenario-pass" autoComplete="new-password" data-lpignore="true" data-1p-ignore="true" className="min-h-12 w-full rounded-xl border-2 border-slate-200 bg-white px-4 pr-12 shadow-sm outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200" /><button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? text.hidePassword : text.showPassword} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-600 hover:bg-slate-100">{showPassword ? <Eye className="h-5 w-5" /> : <EyeOff className="h-5 w-5" />}</button></div></label></div>
    </div>
    {error && <p role="alert" className="rounded-lg border border-rose-300 bg-rose-50 p-3 font-semibold text-rose-800">{error}</p>}
    <button type="submit" disabled={locked} className="inline-flex min-h-14 w-full items-center justify-center gap-3 rounded-xl bg-[#079c6b] px-5 py-3 text-lg font-extrabold text-white shadow-lg shadow-emerald-950/15 hover:bg-[#057a55] disabled:cursor-not-allowed disabled:opacity-60"><LogIn className="h-6 w-6" aria-hidden="true" />{text.loginButton}</button>
  </form></div>;
}

function CardPaymentStep({ amount, customerName, systemError, text, onBack, onValidationError, onSubmit }: { amount: string; customerName: string; systemError: boolean; text: BillPaymentText; onBack: () => void; onValidationError: (message: string) => void; onSubmit: () => void }) {
  const { language } = useTranslation();
  const practiceText = practiceCardTranslations[language];
  const expectedCard = useMemo(() => createPracticeCardDetails(customerName), [customerName]);
  const [details, setDetails] = useState<CardPreviewDetails>({ cardNumber: "", expiry: "", cardholderName: "", cvv: "" });
  const [submitted, setSubmitted] = useState(false);
  const [activeField, setActiveField] = useState<ActiveCardField | null>(null);
  const expiryFormatValid = /^(0[1-9]|1[0-2])\/\d{2}$/.test(details.expiry);
  const cardExpired = expiryFormatValid && !isValidCardExpiry(details.expiry);
  const cardholderValid = isValidBillAccountName(details.cardholderName)
    && details.cardholderName.trim().toUpperCase() === expectedCard.cardholderName;
  const cardMatches = matchesPracticeCard(details, expectedCard);
  const update = (field: keyof typeof details, value: string) => setDetails((current) => ({ ...current, [field]: value }));
  const submitPayment = () => {
    setSubmitted(true);
    if (cardExpired) {
      onValidationError(text.expiredError);
      return;
    }
    if (!cardholderValid) {
      onValidationError(text.cardError);
      return;
    }
    if (!cardMatches) {
      onValidationError(practiceText.mismatchError);
      return;
    }
    onSubmit();
    if (!systemError) {
      setDetails({ cardNumber: "", expiry: "", cardholderName: "", cvv: "" });
      setSubmitted(false);
    }
  };
  return <div className="overflow-hidden rounded-3xl border-2 border-indigo-100 bg-gradient-to-br from-white via-indigo-50/35 to-cyan-50/60 p-4 shadow-[0_24px_55px_-38px_rgba(48,41,146,0.7)] sm:p-6">
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-gradient-to-r from-[#211c72] via-[#302992] to-[#087f8c] px-5 py-4 text-white shadow-lg">
      <div className="flex items-center gap-3"><span className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/25"><CreditCard className="h-7 w-7" aria-hidden="true" /></span><strong className="text-xl sm:text-2xl">{text.cardTitle}</strong></div>
      <div className="rounded-xl bg-white px-4 py-2 text-right text-[#1d1a5e]"><span className="block text-xs font-bold uppercase tracking-wide text-slate-500">{text.paymentAmount}</span><strong className="text-2xl">{amount}</strong></div>
    </div>
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(340px,0.95fr)]">
    <div role="group" aria-label={text.cardTitle} data-form-type="other" className="rounded-2xl border border-white bg-white/85 p-4 shadow-sm sm:p-5">
      <div className="rounded-xl border-l-4 border-cyan-500 bg-cyan-50 px-4 py-3"><strong className="text-lg text-[#1d1a5e]">{practiceText.instructionTitle}</strong></div>
      {systemError && <div role="alert" className="mt-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-amber-950"><strong className="text-sm">{text.systemErrorTitle}</strong><p className="text-xs leading-5">{text.systemErrorBody}</p></div>}
      <div className="mt-3 space-y-3">
        <ScenarioInput compact label={text.cardholder} value={details.cardholderName} onChange={(value) => update("cardholderName", sanitizeBillAccountName(value))} onFocus={() => setActiveField("cardholderName")} name="scenario-copy-holder" autoComplete="new-password" />
        <ScenarioInput compact label={text.cardNumber} value={details.cardNumber.replace(/(\d{4})(?=\d)/g, "$1 ")} onChange={(value) => update("cardNumber", value.replace(/\D/g, "").slice(0, 16))} onFocus={() => setActiveField("cardNumber")} name="scenario-copy-number" inputMode="numeric" placeholder="0000 0000 0000 0000" autoComplete="one-time-code" />
        <div className="grid grid-cols-2 gap-3">
          <ScenarioInput compact label={text.expiry} value={details.expiry} onChange={(value) => { const digits = value.replace(/\D/g, "").slice(0, 4); update("expiry", digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits); }} onFocus={() => setActiveField("expiry")} name="scenario-copy-date" inputMode="numeric" placeholder="MM/YY" autoComplete="one-time-code" />
          <ScenarioInput compact label="CVV" value={details.cvv} onChange={(value) => update("cvv", value.replace(/\D/g, "").slice(0, 3))} onFocus={() => setActiveField("cvv")} name="scenario-copy-code" inputMode="numeric" placeholder={text.digits3} autoComplete="one-time-code" />
        </div>
      </div>
      {submitted && cardExpired && <p role="alert" className="mt-2 rounded-lg border border-rose-300 bg-rose-50 p-2 text-xs font-semibold text-rose-800">{text.expiredError}</p>}
      {submitted && !cardholderValid && <p role="alert" className="mt-2 rounded-lg border border-rose-300 bg-rose-50 p-2 text-xs font-semibold text-rose-800">{text.cardError}</p>}
      {submitted && cardholderValid && !cardExpired && !cardMatches && <p role="alert" className="mt-2 rounded-lg border border-rose-300 bg-rose-50 p-2 text-xs font-semibold text-rose-800">{practiceText.mismatchError}</p>}
      <div className="mt-4 grid gap-3 sm:grid-cols-2"><button type="button" onClick={onBack} className="min-h-11 rounded-xl border-2 border-[#302992] bg-white px-4 py-2 text-sm font-bold text-[#302992] hover:bg-indigo-50">{text.cancel}</button><button type="button" onClick={submitPayment} className="min-h-11 rounded-xl bg-[#079c6b] px-4 py-2 text-sm font-extrabold text-white shadow-md shadow-emerald-950/15 hover:bg-[#057a55]">{text.confirmPayment}</button></div>
    </div>
    <aside className="rounded-2xl border border-indigo-100 bg-white/70 p-3 shadow-sm lg:sticky lg:top-8">
      <BillCardPreview details={expectedCard} activeField={activeField} />
    </aside>
    </div>
  </div>;
}

function ScenarioInput({ label, value, onChange, onFocus, name, inputMode, placeholder, autoComplete = "off", password = false, compact = false }: { label: string; value: string; onChange: (value: string) => void; onFocus?: () => void; name: string; inputMode?: "numeric"; placeholder?: string; autoComplete?: "off" | "new-password" | "one-time-code"; password?: boolean; compact?: boolean }) {
  return <label className="block text-sm font-bold text-slate-800">{label}<input value={value} onChange={(event) => onChange(event.currentTarget.value)} onFocus={onFocus} type={password ? "password" : "text"} name={name} inputMode={inputMode} placeholder={placeholder} autoComplete={autoComplete} aria-autocomplete="none" spellCheck={false} data-form-type="other" data-lpignore="true" data-1p-ignore="true" data-bwignore="true" data-protonpass-ignore="true" className={`${compact ? "mt-1.5 min-h-11 rounded-xl px-3 text-sm" : "mt-2 min-h-12 rounded-xl px-4"} w-full border border-slate-300 bg-white text-slate-950 outline-none focus:border-[#302992] focus:ring-2 focus:ring-cyan-300`} /></label>;
}
