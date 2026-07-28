import { Link, Navigate } from "react-router-dom";

import { useAuth } from "../../context/AuthContext";
import { scenarios } from "../../data/scenarios";
import { useTranslation } from "../../i18n";
import { adminAnalyticsTranslations } from "../../lib/adminAnalyticsTranslations";

const ACTIVE_ANALYTICS_SCENARIO = "atm-withdrawal";

export function AdminScenarioAnalyticsPage() {
  const { user, isAuthenticated } = useAuth();
  const { language, translateScenario } = useTranslation();
  const text = adminAnalyticsTranslations[language];
  const isAdmin = isAuthenticated && user?.role === "admin";

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!isAdmin) {
    return (
      <section className="rounded-lg border border-amber-300 bg-amber-50 p-6 font-semibold text-amber-900">
        {text.accessDenied}
      </section>
    );
  }

  return (
    <section className="flex flex-1 flex-col text-[#1d1a3d]">
      <div className="border-b border-indigo-950/10 pb-7">
        <div className="max-w-3xl">
          <p className="text-xs font-bold uppercase tracking-wider text-teal-700">{text.adminDashboard}</p>
          <h1 className="mt-2 text-3xl font-extrabold text-[#1d1a5e]">{text.scenarioAnalytics}</h1>
          <p className="mt-2 text-slate-600">
            {text.selectorDescription}
          </p>
        </div>
      </div>

      <div className="mt-7 overflow-hidden rounded-xl border border-indigo-950/10 bg-white">
        {scenarios.map((scenario) => {
          const translatedScenario = translateScenario(scenario);
          const isAvailable = scenario.slug === ACTIVE_ANALYTICS_SCENARIO;
          const scenarioNumber = Number(scenario.id).toString().padStart(2, "0");

          return (
            <article
              key={scenario.id}
              className={`grid items-center gap-4 border-b border-indigo-950/10 px-5 py-4 last:border-b-0 sm:grid-cols-[48px_1fr_auto] ${isAvailable ? "bg-white" : "bg-slate-50/60"}`}
            >
              <span className={`flex h-10 w-10 items-center justify-center rounded-lg text-sm font-extrabold ${isAvailable ? "bg-[#2a2586] text-white" : "bg-[#f3f3fb] text-slate-400"}`}>{scenarioNumber}</span>
              <div>
                <h2 className={`font-bold ${isAvailable ? "text-[#1d1a3d]" : "text-slate-500"}`}>{translatedScenario.title}</h2>
                <p className="mt-1 text-xs font-semibold text-slate-400">{isAvailable ? text.available : text.comingSoon}</p>
              </div>

              {isAvailable ? (
                <Link
                  to="/admin/atm-analytics"
                  className="inline-flex min-h-[40px] items-center justify-center rounded-lg border border-cyan-300 bg-cyan-50 px-4 text-sm font-bold text-[#2a2586] hover:bg-cyan-100 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                  aria-label={`${text.viewAnalytics}: ${translatedScenario.title}`}
                >
                  {text.viewAnalytics}
                </Link>
              ) : (
                <button
                  type="button"
                  disabled
                  aria-label={`${text.analyticsUnavailable}: ${translatedScenario.title}`}
                  className="min-h-[40px] cursor-not-allowed rounded-lg bg-[#f3f3fb] px-4 text-sm font-bold text-slate-400"
                >
                  {text.analyticsUnavailable}
                </button>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
