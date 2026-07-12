import { FormEvent, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import { useTranslation } from "../i18n";
import { ApiError } from "../services/api";

export function LoginPage() {
  const navigate = useNavigate();
  const { isAuthenticated, login, user } = useAuth();
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setErrorMessage("");
    setIsSubmitting(true);

    try {
      const loggedInUser = await login({ email, password });
      navigate(loggedInUser.role === "admin" ? "/admin/users" : "/scenarios");
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
    <section className="mx-auto w-full max-w-xl rounded-lg border border-slate-200 bg-white p-6 shadow-soft">
      <h1 className="text-3xl font-bold tracking-tight text-slate-950">{t("loginTitle")}</h1>
      <p className="mt-3 text-base leading-7 text-slate-600">{t("loginSubtitle")}</p>

      <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
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
            required
            className="mt-2 min-h-[52px] w-full rounded-lg border border-slate-300 px-4 text-base outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500"
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
          className="min-h-[56px] w-full rounded-lg bg-slate-900 px-6 py-3 text-lg font-bold text-white shadow-soft hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {t("login")}
        </button>

        <Link
          to="/register"
          className="flex min-h-[48px] items-center justify-center rounded-lg border border-teal-200 bg-teal-50 px-4 py-3 font-bold text-teal-800 hover:bg-teal-100"
        >
          {t("createAccount")}
        </Link>
      </form>
    </section>
  );
}
