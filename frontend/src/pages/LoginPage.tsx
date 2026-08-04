import { FormEvent, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";

import { useAuth } from "../context/AuthContext";
import { useTranslation } from "../i18n";
import { ApiError } from "../services/api";

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, login, user } = useAuth();
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const redirectPath =
    typeof location.state === "object" &&
    location.state !== null &&
    "from" in location.state &&
    typeof location.state.from === "string" &&
    location.state.from.startsWith("/")
      ? location.state.from
      : null;

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setErrorMessage("");
    setIsSubmitting(true);

    try {
      const loggedInUser = await login({ email, password });
      navigate(redirectPath ?? (loggedInUser.role === "admin" ? "/admin/users" : "/scenarios"));
    } catch (error) {
      if (error instanceof ApiError && error.status === 403) {
        if (error.message.includes("waiting")) {
          setErrorMessage(t("pendingApprovalMessage"));
        } else if (error.message.includes("not approved")) {
          setErrorMessage(t("deniedAccountMessage"));
        } else if (error.message.includes("suspended")) {
          setErrorMessage(t("suspendedAccountMessage"));
        } else {
          setErrorMessage(t("authFormError"));
        }
      } else {
        setErrorMessage(t("authFormError"));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isAuthenticated && user) {
    return <Navigate to={user.role === "admin" ? "/admin/users" : "/scenarios"} replace />;
  }

  return (
    <section className="relative z-10 flex min-h-[calc(100vh-5rem)] flex-1 items-center justify-center px-5 py-8 sm:py-12">
      <div className="auth-surface w-full max-w-[550px] border border-white bg-white p-6 shadow-[0_28px_70px_-24px_rgba(42,37,134,0.32)] sm:p-11">
      <div className="flex h-1.5 w-24 overflow-hidden rounded-full" aria-hidden="true">
        <span className="w-2/3 bg-[#3730a3]" />
        <span className="w-1/3 bg-cyan-400" />
      </div>
      <h1 className="mt-6 font-display text-3xl font-extrabold text-[#1d1a5e] sm:text-4xl">{t("loginTitle")}</h1>
      <p className="mt-3 text-base leading-7 text-[#5b5a78]">{t("loginSubtitle")}</p>

      <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
        <label className="block">
          <span className="text-sm font-semibold text-[#1d1a5e]">{t("email")}</span>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            placeholder="name@example.com"
            className="mt-2 min-h-[58px] w-full rounded-xl border border-indigo-950/10 bg-[#f8faff] px-5 text-base text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-indigo-200 focus:border-cyan-400 focus:bg-white focus:ring-2 focus:ring-cyan-200"
          />
        </label>

        <label className="block">
          <span className="text-sm font-semibold text-[#1d1a5e]">{t("password")}</span>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            placeholder={t("password")}
            className="mt-2 min-h-[58px] w-full rounded-xl border border-indigo-950/10 bg-[#f8faff] px-5 text-base text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-indigo-200 focus:border-cyan-400 focus:bg-white focus:ring-2 focus:ring-cyan-200"
          />
        </label>

        {errorMessage && (
          <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 font-semibold text-amber-900">
            {errorMessage}
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="landing-primary-action min-h-[62px] w-full rounded-full px-6 py-3 text-base font-bold text-white shadow-[0_14px_30px_-13px_rgba(45,100,190,0.72)] transition hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {t("login")}
        </button>

        <Link
          to="/register"
          className="group flex min-h-[62px] items-center justify-center gap-3 rounded-full border border-white/90 bg-white px-4 py-3 font-bold text-[#302992] shadow-[0_12px_28px_-18px_rgba(29,26,94,0.45)] transition hover:-translate-y-0.5 hover:border-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-400"
        >
          {t("createAccount")} <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" aria-hidden="true" />
        </Link>
      </form>
      </div>
    </section>
  );
}
