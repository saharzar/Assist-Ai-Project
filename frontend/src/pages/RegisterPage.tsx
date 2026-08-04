import { FormEvent, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTranslation } from "../i18n";
import type { UserCategory } from "../services/authService";

const categoryOptions: Array<{ value: UserCategory; labelKey: "personalUser" | "familyCaregiver" | "institution" | "professional" }> = [
  { value: "personal", labelKey: "personalUser" },
  { value: "family_caregiver", labelKey: "familyCaregiver" },
  { value: "institution", labelKey: "institution" },
  { value: "professional", labelKey: "professional" },
];

export function RegisterPage() {
  const { isAuthenticated, register } = useAuth();
  const { language, t } = useTranslation();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [userCategory, setUserCategory] = useState<UserCategory>("personal");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (isAuthenticated) {
    return <Navigate to="/scenarios" replace />;
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    if (password !== confirmPassword) {
      setErrorMessage(t("passwordMismatch"));
      return;
    }

    setIsSubmitting(true);

    try {
      await register({
        full_name: fullName,
        email,
        password,
        user_category: userCategory,
        preferred_language: language,
      });
      setSuccessMessage(t("accountRequestSent"));
      setFullName("");
      setEmail("");
      setPassword("");
      setConfirmPassword("");
    } catch {
      setErrorMessage(t("authFormError"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="relative z-10 flex min-h-[calc(100vh-5rem)] flex-1 items-center justify-center px-5 py-8 sm:py-12">
      <div className="auth-surface w-full max-w-[620px] border border-white/80 bg-white/88 p-6 shadow-[0_28px_70px_-24px_rgba(42,37,134,0.32)] backdrop-blur-xl sm:p-10">
      <div className="flex h-1.5 w-24 overflow-hidden rounded-full" aria-hidden="true">
        <span className="w-2/3 bg-[#3730a3]" />
        <span className="w-1/3 bg-cyan-400" />
      </div>
      <h1 className="mt-6 font-display text-3xl font-extrabold text-[#1d1a5e] sm:text-4xl">{t("registerTitle")}</h1>
      <p className="mt-3 text-base leading-7 text-[#5b5a78]">{t("registerSubtitle")}</p>

      <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
        <label className="block">
          <span className="text-sm font-semibold text-[#1d1a5e]">{t("fullName")}</span>
          <input
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            required
            className="mt-2 min-h-[56px] w-full rounded-xl border border-indigo-950/10 bg-[#f8faff] px-5 text-base outline-none transition hover:border-indigo-200 focus:border-cyan-400 focus:bg-white focus:ring-2 focus:ring-cyan-200"
          />
        </label>

        <label className="block">
          <span className="text-sm font-semibold text-[#1d1a5e]">{t("email")}</span>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            placeholder="name@example.com"
            className="mt-2 min-h-[56px] w-full rounded-xl border border-indigo-950/10 bg-[#f8faff] px-5 text-base outline-none transition placeholder:text-slate-400 hover:border-indigo-200 focus:border-cyan-400 focus:bg-white focus:ring-2 focus:ring-cyan-200"
          />
        </label>

        <PasswordField
          label={t("password")}
          value={password}
          onChange={setPassword}
          isVisible={showPassword}
          onToggle={() => setShowPassword((current) => !current)}
          showLabel={t("showPassword")}
          hideLabel={t("hidePassword")}
          minLength={8}
        />
        <span className="-mt-3 block text-sm text-slate-500">{t("passwordHelp")}</span>

        <PasswordField
          label={t("confirmPassword")}
          value={confirmPassword}
          onChange={setConfirmPassword}
          isVisible={showConfirmPassword}
          onToggle={() => setShowConfirmPassword((current) => !current)}
          showLabel={t("showPassword")}
          hideLabel={t("hidePassword")}
          minLength={8}
        />

        <label className="block">
          <span className="text-sm font-semibold text-[#1d1a5e]">{t("userCategory")}</span>
          <select
            value={userCategory}
            onChange={(event) => setUserCategory(event.target.value as UserCategory)}
            className="mt-2 min-h-[56px] w-full rounded-xl border border-indigo-950/10 bg-[#f8faff] px-5 text-base outline-none transition hover:border-indigo-200 focus:border-cyan-400 focus:bg-white focus:ring-2 focus:ring-cyan-200"
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

        {successMessage && (
          <div className="rounded-lg border border-teal-300 bg-teal-50 p-4 font-semibold text-teal-900">
            {successMessage}
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="landing-primary-action min-h-[62px] w-full rounded-full px-6 py-3 text-base font-bold text-white shadow-[0_14px_30px_-13px_rgba(45,100,190,0.72)] transition hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {t("createAccount")}
        </button>
      </form>
      </div>
    </section>
  );
}

function PasswordField({
  label,
  value,
  onChange,
  isVisible,
  onToggle,
  showLabel,
  hideLabel,
  minLength,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  isVisible: boolean;
  onToggle: () => void;
  showLabel: string;
  hideLabel: string;
  minLength: number;
}) {
  const toggleLabel = isVisible ? hideLabel : showLabel;

  return (
    <label className="block">
      <span className="text-sm font-semibold text-[#1d1a5e]">{label}</span>
      <span className="relative mt-2 block">
        <input
          type={isVisible ? "text" : "password"}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          minLength={minLength}
          required
          className="min-h-[56px] w-full rounded-xl border border-indigo-950/10 bg-[#f8faff] px-5 pr-14 text-base outline-none transition hover:border-indigo-200 focus:border-cyan-400 focus:bg-white focus:ring-2 focus:ring-cyan-200"
        />
        <button
          type="button"
          onClick={onToggle}
          aria-label={toggleLabel}
          title={toggleLabel}
          className="absolute right-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-md text-indigo-500 hover:bg-cyan-50 hover:text-indigo-900 focus:outline-none focus:ring-2 focus:ring-cyan-400"
        >
          <EyeIcon isOff={isVisible} />
        </button>
      </span>
    </label>
  );
}

function EyeIcon({ isOff }: { isOff: boolean }) {
  return (
    <svg
      aria-hidden="true"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
      {isOff && <path d="M4 4l16 16" />}
    </svg>
  );
}
