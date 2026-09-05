import { CreditCard, Eye, EyeOff, ShieldCheck, UserPlus } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { BillScenarioShell } from "../../components/bill/BillScenarioShell";
import { BillVoiceAssistant } from "../../components/bill/BillVoiceAssistant";
import { useTranslation } from "../../i18n";
import {
  isValidBillAccountName,
  isValidBillAccountUsername,
  sanitizeBillAccountName,
  sanitizeBillAccountUsername,
} from "../../lib/billAccountValidation";
import { BILL_SETUP_STORAGE_KEY, type BillSetupDetails } from "../../lib/billPaymentState";
import { billAssistantTranslations } from "../../lib/billAssistantTranslations";
import { billPaymentTranslations } from "../../lib/billPaymentTranslations";
import { preloadAssistantMessage, unlockAssistantAudioPlayback } from "../../services/speechSynthesisService";

export function BillPaymentSetupPage() {
  const navigate = useNavigate();
  const { language } = useTranslation();
  const text = billPaymentTranslations[language];
  const [details, setDetails] = useState<BillSetupDetails>({ firstName: "", lastName: "", username: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [validationSpeechMessage, setValidationSpeechMessage] = useState("");
  const [assistantSpeechRequestId, setAssistantSpeechRequestId] = useState(0);
  const fieldErrors = {
    firstName: !details.firstName.trim() ? text.firstNameRequired : !isValidBillAccountName(details.firstName) ? text.firstNameInvalid : "",
    lastName: !details.lastName.trim() ? text.lastNameRequired : !isValidBillAccountName(details.lastName) ? text.lastNameInvalid : "",
    username: !details.username ? text.usernameRequired : !isValidBillAccountUsername(details.username) ? text.usernameInvalid : "",
    password: !details.password ? text.passwordRequired : details.password.length < 6 ? text.passwordTooShort : "",
  };
  const validationErrors = Object.values(fieldErrors).filter(Boolean);
  const hasEmptyFields = !details.firstName.trim() || !details.lastName.trim() || !details.username || !details.password;
  const valid = validationErrors.length === 0;
  const update = (field: keyof BillSetupDetails, value: string) => setDetails((current) => ({ ...current, [field]: value }));

  useEffect(() => {
    // Prepare the message spoken on this page through the configured backend
    // provider (Soniox first for authenticated users, browser only as fallback).
    void preloadAssistantMessage(text.setupAssistantMessage, language);
    // Prepare the next screen as well so navigation after submitting the form
    // can start the Soniox login guidance without waiting for generation.
    void preloadAssistantMessage(billAssistantTranslations[language].messages.login, language);
    setValidationSpeechMessage("");
    setSubmitted(false);
  }, [language, text.setupAssistantMessage]);

  return (
    <BillScenarioShell
      currentStep={1}
      title={text.setupTitle}
      subtitle={text.setupSubtitle}
      assistant={<BillVoiceAssistant message={validationSpeechMessage || text.setupAssistantMessage} speechRequestId={assistantSpeechRequestId} />}
    >
      <div className="overflow-hidden rounded-3xl border-2 border-indigo-100 bg-gradient-to-br from-white via-indigo-50/40 to-cyan-50/70 shadow-[0_24px_55px_-40px_rgba(48,41,146,0.7)]">
        <div className="relative overflow-hidden bg-gradient-to-r from-[#211c72] via-[#302992] to-[#087f8c] px-6 py-5 text-white sm:px-7">
          <div className="absolute -right-8 -top-12 h-36 w-36 rounded-full border-[18px] border-white/10" aria-hidden="true" />
          <div className="relative flex items-center gap-4">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/25"><UserPlus className="h-8 w-8" aria-hidden="true" /></span>
            <div><h2 className="text-xl font-extrabold sm:text-2xl">{text.setupTitle}</h2><p className="mt-1 text-sm font-medium text-cyan-50 sm:text-base">{text.setupSubtitle}</p></div>
          </div>
        </div>
      <form className="p-5 sm:p-7" autoComplete="off" onSubmit={(event) => {
        event.preventDefault();
        setSubmitted(true);
        if (!valid) {
          setValidationSpeechMessage(hasEmptyFields ? text.setupError : validationErrors.join(" "));
          setAssistantSpeechRequestId((current) => current + 1);
          return;
        }
        void unlockAssistantAudioPlayback();
        sessionStorage.setItem(BILL_SETUP_STORAGE_KEY, JSON.stringify({ ...details, firstName: details.firstName.trim(), lastName: details.lastName.trim() }));
        navigate("/scenario/online-bill-payment/run");
      }}>
        <div className="grid gap-5 rounded-2xl border border-indigo-100 bg-white/90 p-5 shadow-sm sm:grid-cols-2 sm:p-6">
          <Field label={text.firstName} fieldName="first-name" value={details.firstName} onChange={(value) => update("firstName", sanitizeBillAccountName(value))} error={submitted && details.firstName.trim() ? fieldErrors.firstName : ""} />
          <Field label={text.lastName} fieldName="last-name" value={details.lastName} onChange={(value) => update("lastName", sanitizeBillAccountName(value))} error={submitted && details.lastName.trim() ? fieldErrors.lastName : ""} />
          <Field label={text.username} fieldName="username" value={details.username} onChange={(value) => update("username", sanitizeBillAccountUsername(value))} hint={text.usernameHint} error={submitted && details.username ? fieldErrors.username : ""} />
          <label className="text-sm font-bold text-slate-800">{text.password}
            <div className="relative mt-2">
              <input value={details.password} onChange={(event) => update("password", event.target.value)} type={showPassword ? "text" : "password"} name="bill-scenario-new-password" autoComplete="new-password" data-lpignore="true" data-1p-ignore="true" className="min-h-12 w-full rounded-xl border border-slate-300 px-4 pr-12 outline-none focus:border-[#302992] focus:ring-2 focus:ring-cyan-300" />
              <button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? text.hidePassword : text.showPassword} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-600 hover:bg-slate-100">{showPassword ? <Eye className="h-5 w-5" /> : <EyeOff className="h-5 w-5" />}</button>
            </div>
            <span className="mt-2 block text-xs font-medium text-slate-500">{text.passwordHint}</span>
            {submitted && details.password && fieldErrors.password && <span role="alert" className="mt-2 block text-sm font-semibold text-rose-700">{fieldErrors.password}</span>}
          </label>
        </div>
        {submitted && hasEmptyFields && <p role="alert" className="mt-5 rounded-xl border border-rose-300 bg-rose-50 px-4 py-3 font-semibold text-rose-800">{text.setupError}</p>}
        <button type="submit" className="mt-6 inline-flex min-h-14 w-full items-center justify-center gap-3 rounded-xl bg-[#079c6b] px-5 py-3 text-lg font-extrabold text-white shadow-lg shadow-emerald-950/15 hover:bg-[#057a55] focus:outline-none focus:ring-2 focus:ring-cyan-400"><ShieldCheck className="h-6 w-6" aria-hidden="true" />{text.continueLogin}</button>
      </form>
      <div className="flex items-center justify-between gap-4 border-t border-indigo-100 bg-white/70 px-5 py-4 sm:px-7"><Link to="/scenario/online-bill-payment" className="font-bold text-[#302992] hover:underline">{text.backIntroduction}</Link><CreditCard className="h-7 w-7 text-cyan-700" aria-hidden="true" /></div>
      </div>
    </BillScenarioShell>
  );
}

function Field({ label, fieldName, value, onChange, hint, error }: { label: string; fieldName: string; value: string; onChange: (value: string) => void; hint?: string; error?: string }) {
  return <label className="text-sm font-extrabold text-slate-800">{label}<input value={value} onChange={(event) => onChange(event.target.value)} name={`bill-scenario-${fieldName}`} autoComplete="new-password" data-lpignore="true" data-1p-ignore="true" aria-invalid={Boolean(error)} className="mt-2 min-h-12 w-full rounded-xl border-2 border-slate-200 bg-white px-4 shadow-sm outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200" />{hint && <span className="mt-2 block text-xs font-medium text-slate-500">{hint}</span>}{error && <span role="alert" className="mt-2 block text-sm font-semibold text-rose-700">{error}</span>}</label>;
}
