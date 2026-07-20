import { Link, Navigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import { useTranslation } from "../i18n";

export function LandingPage() {
  const { isAuthenticated } = useAuth();
  const { t } = useTranslation();

  if (isAuthenticated) {
    return <Navigate to="/scenarios" replace />;
  }

  return (
    <section className="flex min-h-[70vh] flex-1 flex-col items-center justify-center py-10 text-center">
      <div className="max-w-3xl">
        <p className="text-sm font-bold uppercase tracking-[0.24em] text-teal-700">ASSIST-AI</p>
        <h1 className="mt-5 text-4xl font-bold leading-tight tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
          {t("heroTitle")}
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-slate-600 sm:text-xl">
          {t("heroSubtitle")}
        </p>
        <div className="mx-auto mt-10 flex w-full max-w-md flex-col gap-4">
          <Link
            to="/register"
            className="flex min-h-[60px] items-center justify-center rounded-lg bg-slate-900 px-6 py-4 text-lg font-bold text-white shadow-soft transition hover:-translate-y-0.5 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
          >
            {t("createAccount")}
          </Link>
          <Link
            to="/login"
            className="flex min-h-[60px] items-center justify-center rounded-lg border-2 border-slate-200 bg-white px-6 py-4 text-lg font-bold text-slate-900 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            {t("login")}
          </Link>
          <Link
            to="/guest"
            className="flex min-h-[54px] items-center justify-center rounded-lg px-6 py-3 text-base font-bold text-teal-700 transition hover:bg-teal-50 focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            {t("continueAsGuest")}
          </Link>
          <Link
            to="/scenarios"
            className="flex min-h-[54px] items-center justify-center rounded-lg border border-teal-200 bg-teal-50 px-6 py-3 text-base font-bold text-teal-800 transition hover:bg-teal-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            {t("viewScenarios")}
          </Link>
        </div>
      </div>
    </section>
  );
}
