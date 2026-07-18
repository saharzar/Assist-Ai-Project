import { Link, Navigate } from "react-router-dom";

import { useAuth } from "../../context/AuthContext";
import { scenarios } from "../../data/scenarios";
import { useTranslation } from "../../i18n";

const ACTIVE_ANALYTICS_SCENARIO = "atm-withdrawal";

export function AdminScenarioAnalyticsPage() {
  const { user, isAuthenticated } = useAuth();
  const { translateScenario } = useTranslation();
  const isAdmin = isAuthenticated && user?.role === "admin";

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!isAdmin) {
    return (
      <section className="rounded-lg border border-amber-300 bg-amber-50 p-6 font-semibold text-amber-900">
        Access denied.
      </section>
    );
  }

  return (
    <section className="flex flex-1 flex-col text-slate-900">
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div className="max-w-3xl">
          <p className="text-sm font-bold uppercase text-teal-700">Admin dashboard</p>
          <h1 className="mt-1 text-3xl font-bold">Scenario Analytics</h1>
          <p className="mt-2 text-slate-600">
            Select a scenario to review usage, completion, and performance data.
          </p>
        </div>
        <Link
          to="/admin/users"
          className="inline-flex min-h-[44px] items-center justify-center rounded-lg border border-slate-300 bg-white px-4 font-bold text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-teal-500"
        >
          Manage users
        </Link>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {scenarios.map((scenario) => {
          const translatedScenario = translateScenario(scenario);
          const isAvailable = scenario.slug === ACTIVE_ANALYTICS_SCENARIO;
          const scenarioNumber = Number(scenario.id).toString().padStart(2, "0");

          return (
            <article
              key={scenario.id}
              className={`flex min-h-48 flex-col justify-between rounded-lg border p-5 shadow-sm ${
                isAvailable
                  ? "border-teal-300 bg-white"
                  : "border-slate-200 bg-slate-100 text-slate-500 grayscale"
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <span
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-sm font-bold ${
                      isAvailable
                        ? "bg-slate-900 text-white"
                        : "bg-slate-200 text-slate-500"
                    }`}
                  >
                    {scenarioNumber}
                  </span>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-bold ${
                      isAvailable
                        ? "bg-teal-100 text-teal-800"
                        : "bg-slate-200 text-slate-500"
                    }`}
                  >
                    {isAvailable ? "Available" : "Coming soon"}
                  </span>
                </div>
                <h2
                  className={`mt-5 text-lg font-bold leading-6 ${
                    isAvailable ? "text-slate-950" : "text-slate-500"
                  }`}
                >
                  {translatedScenario.title}
                </h2>
              </div>

              {isAvailable ? (
                <Link
                  to="/admin/atm-analytics"
                  className="mt-5 inline-flex min-h-[46px] items-center justify-center rounded-lg bg-slate-900 px-4 font-bold text-white hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
                  aria-label={`View analytics for ${translatedScenario.title}`}
                >
                  View analytics
                </Link>
              ) : (
                <button
                  type="button"
                  disabled
                  aria-label={`Analytics unavailable for ${translatedScenario.title}`}
                  className="mt-5 min-h-[46px] cursor-not-allowed rounded-lg bg-slate-200 px-4 font-bold text-slate-500"
                >
                  Analytics unavailable
                </button>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
