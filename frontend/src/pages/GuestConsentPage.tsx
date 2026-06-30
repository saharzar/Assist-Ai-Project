import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import { useTranslation } from "../i18n";

export function GuestConsentPage() {
  const navigate = useNavigate();
  const { continueAsGuest } = useAuth();
  const { language, t } = useTranslation();
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleContinue = async (saveProgress: boolean) => {
    setErrorMessage("");
    setIsSubmitting(true);

    try {
      await continueAsGuest(saveProgress, language);
      navigate("/scenarios");
    } catch {
      setErrorMessage(t("authFormError"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="mx-auto w-full max-w-xl rounded-lg border border-slate-200 bg-white p-6 text-center shadow-soft">
      <h1 className="text-3xl font-bold tracking-tight text-slate-950">{t("guestTitle")}</h1>
      <p className="mt-4 text-lg leading-8 text-slate-600">{t("guestQuestion")}</p>

      {errorMessage && (
        <div className="mt-6 rounded-lg border border-amber-300 bg-amber-50 p-4 font-semibold text-amber-900">
          {errorMessage}
        </div>
      )}

      <div className="mt-8 flex flex-col gap-4">
        <button
          type="button"
          disabled={isSubmitting}
          onClick={() => void handleContinue(true)}
          className="min-h-[56px] rounded-lg bg-slate-900 px-6 py-3 text-lg font-bold text-white shadow-soft hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {t("saveProgress")}
        </button>
        <button
          type="button"
          disabled={isSubmitting}
          onClick={() => void handleContinue(false)}
          className="min-h-[56px] rounded-lg border-2 border-slate-200 bg-white px-6 py-3 text-lg font-bold text-slate-900 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {t("continueWithoutSaving")}
        </button>
      </div>
    </section>
  );
}
