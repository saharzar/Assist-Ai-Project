import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { AdminScenarioCardGrid } from "../../components/admin/AdminScenarioCardGrid";
import { scenarios } from "../../data/scenarios";
import { useTranslation } from "../../i18n";
import { adminAnalyticsTranslations } from "../../lib/adminAnalyticsTranslations";

const analyticsRoutes: Record<string, string> = { "atm-withdrawal": "/admin/atm-analytics", "online-bill-payment": "/admin/bill-analytics" };

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
    <section className="standard-page flex flex-1 flex-col text-[#1d1a3d]">
      <div className="catalogue-style-heading">
        <div>
          <h1 className="font-display text-3xl font-extrabold sm:text-4xl">{text.scenarioAnalytics}</h1>
          <p className="mt-2 text-[15px] leading-6 text-[#5b5a78]">
            {text.selectorDescription}
          </p>
        </div>
      </div>

      <AdminScenarioCardGrid scenarios={scenarios} routes={analyticsRoutes}
        labels={{ comingSoon: text.comingSoon, action: text.viewAnalytics }}
        translateScenario={translateScenario} />
    </section>
  );
}
