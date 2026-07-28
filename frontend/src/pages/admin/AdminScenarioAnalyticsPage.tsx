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
          <span className="mb-4 flex h-1.5 w-24 overflow-hidden rounded-full" aria-hidden="true"><i className="w-2/3 bg-[#3730a3]" /><i className="w-1/3 bg-[#2dd8d8]" /></span>
          <h1 className="font-display text-3xl font-bold text-[#1d1a5e]">{text.scenarioAnalytics}</h1>
          <p className="mt-2 text-[15px] leading-6 text-[#5b5a78]">
            {text.selectorDescription}
          </p>
        </div>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {scenarios.map((scenario) => {
          const translatedScenario = translateScenario(scenario);
          const scenarioNumber = Number(scenario.id).toString().padStart(2, "0");
          const isAvailable = scenario.slug === ACTIVE_ANALYTICS_SCENARIO;

          return (
            <article
              key={scenario.id}
              className={`flex min-h-[168px] flex-col rounded-lg border p-5 transition ${isAvailable ? "border-cyan-300 bg-cyan-50/35 shadow-[0_10px_26px_rgba(29,26,94,0.06)]" : "border-indigo-950/10 bg-white/70 hover:border-indigo-200 hover:bg-white"}`}
            >
              <div className="flex items-start gap-4">
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-sm font-extrabold ${isAvailable ? "bg-[#2a2586] text-white" : "bg-[#f1f0fa] text-[#777493]"}`}>{scenarioNumber}</span>
                <div className="min-w-0">
                  <h2 className={`font-bold leading-5 ${isAvailable ? "text-[#1d1a5e]" : "text-slate-500"}`}>{translatedScenario.title}</h2>
                  <p className={`mt-2 text-xs font-semibold uppercase tracking-wide ${isAvailable ? "text-teal-700" : "text-slate-400"}`}>{isAvailable ? "ATM" : text.comingSoon}</p>
                </div>
              </div>
              {isAvailable ? <Link to="/admin/atm-analytics" className="mt-auto inline-flex min-h-[42px] items-center justify-center rounded-lg bg-[#2a2586] px-4 text-sm font-bold text-white hover:bg-[#1d1a5e] focus:outline-none focus:ring-2 focus:ring-cyan-400" aria-label={`${text.viewAnalytics}: ${translatedScenario.title}`}>{text.viewAnalytics}</Link> : <span className="mt-auto min-h-[42px]" aria-hidden="true" />}
            </article>
          );
        })}
      </div>
    </section>
  );
}
