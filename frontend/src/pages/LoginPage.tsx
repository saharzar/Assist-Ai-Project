import { FormEvent, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";

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
          setErrorMessage(error.message);
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
    <section className="relative z-10 flex min-h-[calc(100vh-5rem)] flex-1 items-center justify-center py-8 sm:py-12">
      <div className="w-full max-w-[550px] rounded-lg border border-indigo-950/10 bg-white p-6 shadow-[0_24px_60px_rgba(42,37,134,0.12)] sm:p-11">
      <h1 className="font-display text-3xl font-bold text-[#1d1a5e]">{t("loginTitle")}</h1>
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
            className="mt-2 min-h-[58px] w-full rounded-lg border border-indigo-950/15 px-5 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-200"
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
            className="mt-2 min-h-[58px] w-full rounded-lg border border-indigo-950/15 px-5 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-200"
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
          className="min-h-[62px] w-full rounded-lg bg-[#2a2586] px-6 py-3 text-base font-semibold text-white shadow-[0_10px_24px_-10px_rgba(42,37,134,0.6)] transition hover:bg-[#1d1a5e] focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {t("login")}
        </button>

        <Link
          to="/register"
          className="flex min-h-[62px] items-center justify-center rounded-lg border border-cyan-300 bg-cyan-50 px-4 py-3 font-semibold text-[#2a2586] transition hover:bg-cyan-100 focus:outline-none focus:ring-2 focus:ring-cyan-400"
        >
          {t("createAccount")}
        </Link>
      </form>
      </div>
    </section>
  );
}
