import { useState } from "react";
import { Save, UserRound } from "lucide-react";
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
    <section className="relative z-10 flex min-h-[calc(100vh-5rem)] flex-1 items-center justify-center px-5 py-8 sm:py-12">
      <div className="auth-surface w-full max-w-[620px] border border-white bg-white p-6 text-center shadow-[0_28px_70px_-24px_rgba(42,37,134,0.32)] sm:p-11">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-indigo-100 to-cyan-100 text-[#302992] ring-4 ring-white" aria-hidden="true">
          <UserRound className="h-8 w-8" strokeWidth={2.25} />
        </div>
        <div className="mx-auto mt-6 flex h-1.5 w-24 overflow-hidden rounded-full" aria-hidden="true">
          <span className="w-2/3 bg-[#3730a3]" />
          <span className="w-1/3 bg-cyan-400" />
        </div>
        <h1 className="mt-5 font-display text-3xl font-bold text-[#1d1a5e] sm:text-4xl">{t("guestTitle")}</h1>
        <p className="mx-auto mt-3 max-w-md text-base leading-7 text-[#5b5a78] sm:text-lg">{t("guestQuestion")}</p>

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
            className="landing-primary-action flex min-h-[60px] items-center justify-center gap-3 rounded-full px-6 py-3 text-base font-bold text-white shadow-[0_14px_30px_-13px_rgba(45,100,190,0.72)] transition hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Save className="h-5 w-5 shrink-0" aria-hidden="true" />
            <span>{t("saveProgress")}</span>
          </button>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => void handleContinue(false)}
            className="min-h-[60px] rounded-full border border-white/90 bg-white px-6 py-3 text-base font-bold text-[#302992] shadow-[0_12px_28px_-18px_rgba(29,26,94,0.45)] transition hover:-translate-y-0.5 hover:border-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {t("continueWithoutSaving")}
          </button>
        </div>
      </div>
    </section>
  );
}
