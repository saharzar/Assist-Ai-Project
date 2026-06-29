import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import { languages, useTranslation } from "../i18n";
import type { UserCategory } from "../services/authService";

const categoryOptions: Array<{ value: UserCategory; labelKey: "personalUser" | "familyCaregiver" | "institution" | "professional" }> = [
  { value: "personal", labelKey: "personalUser" },
  { value: "family_caregiver", labelKey: "familyCaregiver" },
  { value: "institution", labelKey: "institution" },
  { value: "professional", labelKey: "professional" },
];

export function RegisterPage() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const { language, t } = useTranslation();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [preferredLanguage, setPreferredLanguage] = useState<string>(language);
  const [userCategory, setUserCategory] = useState<UserCategory>("personal");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setErrorMessage("");
    setIsSubmitting(true);

    try {
      await register({
        full_name: fullName,
        email,
        password,
        preferred_language: preferredLanguage,
        user_category: userCategory,
      });
      navigate("/scenarios");
    } catch {
      setErrorMessage(t("authFormError"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="mx-auto w-full max-w-xl rounded-lg border border-slate-200 bg-white p-6 shadow-soft">
      <h1 className="text-3xl font-bold tracking-tight text-slate-950">{t("registerTitle")}</h1>
      <p className="mt-3 text-base leading-7 text-slate-600">{t("registerSubtitle")}</p>

      <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
        <label className="block">
          <span className="text-sm font-bold text-slate-700">{t("fullName")}</span>
          <input
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            required
            className="mt-2 min-h-[52px] w-full rounded-lg border border-slate-300 px-4 text-base outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500"
          />
        </label>

        <label className="block">
          <span className="text-sm font-bold text-slate-700">{t("email")}</span>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            className="mt-2 min-h-[52px] w-full rounded-lg border border-slate-300 px-4 text-base outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500"
          />
        </label>

        <label className="block">
          <span className="text-sm font-bold text-slate-700">{t("password")}</span>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            minLength={8}
            required
            className="mt-2 min-h-[52px] w-full rounded-lg border border-slate-300 px-4 text-base outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500"
          />
          <span className="mt-2 block text-sm text-slate-500">{t("passwordHelp")}</span>
        </label>

        <label className="block">
          <span className="text-sm font-bold text-slate-700">{t("preferredLanguage")}</span>
          <select
            value={preferredLanguage}
            onChange={(event) => setPreferredLanguage(event.target.value)}
            className="mt-2 min-h-[52px] w-full rounded-lg border border-slate-300 px-4 text-base outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500"
          >
            {languages.map((item) => (
              <option key={item.code} value={item.code}>
                {item.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-sm font-bold text-slate-700">{t("userCategory")}</span>
          <select
            value={userCategory}
            onChange={(event) => setUserCategory(event.target.value as UserCategory)}
            className="mt-2 min-h-[52px] w-full rounded-lg border border-slate-300 px-4 text-base outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500"
          >
            {categoryOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {t(option.labelKey)}
              </option>
            ))}
          </select>
        </label>

        {errorMessage && (
          <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 font-semibold text-amber-900">
            {errorMessage}
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="min-h-[56px] w-full rounded-lg bg-slate-900 px-6 py-3 text-lg font-bold text-white shadow-soft hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {t("createAccount")}
        </button>
      </form>
    </section>
  );
}
