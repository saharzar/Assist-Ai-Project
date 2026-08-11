import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { BillScenarioShell } from "../../components/bill/BillScenarioShell";
import { useTranslation } from "../../i18n";
import { BILL_SETUP_STORAGE_KEY, type BillSetupDetails } from "../../lib/billPaymentState";
import { billPaymentTranslations } from "../../lib/billPaymentTranslations";

const namePattern = /^[A-Za-z]+(?:[ '-][A-Za-z]+)*$/;
const usernamePattern = /^[A-Za-z0-9._-]{3,24}$/;

export function BillPaymentSetupPage() {
  const navigate = useNavigate();
  const { language } = useTranslation();
  const text = billPaymentTranslations[language];
  const [details, setDetails] = useState<BillSetupDetails>({ firstName: "", lastName: "", username: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const valid = namePattern.test(details.firstName.trim()) && namePattern.test(details.lastName.trim()) && usernamePattern.test(details.username) && details.password.length >= 6;
  const update = (field: keyof BillSetupDetails, value: string) => setDetails((current) => ({ ...current, [field]: value }));

  return (
    <BillScenarioShell currentStep={1} title={text.setupTitle} subtitle={text.setupSubtitle}>
      <form autoComplete="off" onSubmit={(event) => {
        event.preventDefault(); setSubmitted(true); if (!valid) return;
        sessionStorage.setItem(BILL_SETUP_STORAGE_KEY, JSON.stringify({ ...details, firstName: details.firstName.trim(), lastName: details.lastName.trim() }));
        navigate("/scenario/online-bill-payment/run");
      }}>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label={text.firstName} fieldName="first-name" value={details.firstName} onChange={(value) => update("firstName", value.replace(/[^A-Za-z '-]/g, ""))} />
          <Field label={text.lastName} fieldName="last-name" value={details.lastName} onChange={(value) => update("lastName", value.replace(/[^A-Za-z '-]/g, ""))} />
          <Field label={text.username} fieldName="username" value={details.username} onChange={(value) => update("username", value.replace(/[^A-Za-z0-9._-]/g, ""))} hint={text.usernameHint} />
          <label className="text-sm font-bold text-slate-800">{text.password}
            <div className="relative mt-2">
              <input value={details.password} onChange={(event) => update("password", event.target.value)} type={showPassword ? "text" : "password"} name="bill-scenario-new-password" autoComplete="new-password" data-lpignore="true" data-1p-ignore="true" className="min-h-12 w-full rounded-xl border border-slate-300 px-4 pr-12 outline-none focus:border-[#302992] focus:ring-2 focus:ring-cyan-300" />
              <button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? text.hidePassword : text.showPassword} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-600 hover:bg-slate-100">{showPassword ? <Eye className="h-5 w-5" /> : <EyeOff className="h-5 w-5" />}</button>
            </div>
            <span className="mt-2 block text-xs font-medium text-slate-500">{text.passwordHint}</span>
          </label>
        </div>
        {submitted && !valid && <p role="alert" className="mt-5 rounded-lg border border-rose-300 bg-rose-50 p-3 font-semibold text-rose-800">{text.setupError}</p>}
        <button type="submit" className="mt-7 min-h-12 w-full rounded-xl bg-[#302992] px-5 py-3 font-bold text-white hover:bg-[#211c72] focus:outline-none focus:ring-2 focus:ring-cyan-400">{text.continueLogin}</button>
      </form>
      <Link to="/scenario/online-bill-payment" className="mt-5 inline-flex font-bold text-[#302992] hover:underline">{text.backIntroduction}</Link>
    </BillScenarioShell>
  );
}

function Field({ label, fieldName, value, onChange, hint }: { label: string; fieldName: string; value: string; onChange: (value: string) => void; hint?: string }) {
  return <label className="text-sm font-bold text-slate-800">{label}<input value={value} onChange={(event) => onChange(event.target.value)} name={`bill-scenario-${fieldName}`} autoComplete="new-password" data-lpignore="true" data-1p-ignore="true" className="mt-2 min-h-12 w-full rounded-xl border border-slate-300 px-4 outline-none focus:border-[#302992] focus:ring-2 focus:ring-cyan-300" />{hint && <span className="mt-2 block text-xs font-medium text-slate-500">{hint}</span>}</label>;
}
