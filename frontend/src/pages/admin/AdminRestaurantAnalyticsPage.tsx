import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useTranslation } from "../../i18n";
import { adminAnalyticsTranslations } from "../../lib/adminAnalyticsTranslations";
import { adminComputerVisionTranslations } from "../../lib/adminComputerVisionTranslations";
import { restaurantTranslations } from "../../lib/restaurantTranslations";
import { formatComputerVisionDuration } from "../../lib/computerVisionDuration";
import type { Meal, RestaurantStep } from "../../lib/restaurantState";
import { apiRequest } from "../../services/api";
type Session = { session_id: string; display_name: string | null; actor_type: "guest" | "registered";
  started_at: string; duration_seconds: number | null; completion_status: "in_progress" | "completed" | "abandoned";
  final_step_reached: RestaurantStep; selected_meal: Meal | null };
type Result = { items: Session[]; total: number; page: number; page_size: number };

export function AdminRestaurantAnalyticsPage() {
  const { user, isAuthenticated, token } = useAuth(); const { language } = useTranslation();
  const common = adminAnalyticsTranslations[language]; const text = restaurantTranslations[language];
  const labels = adminComputerVisionTranslations[language];
  const [page, setPage] = useState(1); const [data, setData] = useState<Result | null>(null);
  const [error, setError] = useState(false); const [loading, setLoading] = useState(true);
  const admin = isAuthenticated && user?.role === "admin";
  useEffect(() => {
    if (!admin) return;
    let active = true; setLoading(true); setError(false);
    apiRequest<Result>(`/api/admin/restaurant-analytics/sessions?page=${page}`).then((result) => { if (active) setData(result); })
      .catch(() => { if (active) setError(true); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [admin, token, page]);
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!admin) return <p role="alert">{common.accessDenied}</p>;
  return <section className="standard-page text-[#1d1a5e]">
    <h1 className="font-display text-3xl font-extrabold">{text.title} · {common.scenarioAnalytics}</h1>
    <Link to="/admin/scenario-analytics" className="my-5 inline-block rounded-lg py-3 font-bold underline">{common.allScenarioAnalytics}</Link>
    {loading ? <p role="status">{common.loading}</p> : error ? <p role="alert">{common.loadError}</p> : !data?.items.length ? <p>{common.noSessions}</p> : <>
      <div className="overflow-x-auto rounded-2xl border border-indigo-100 bg-white"><table className="w-full text-left text-sm"><thead className="bg-indigo-50"><tr>
        {[common.user, common.started, common.duration, common.status, common.finalStep, text.orderFor].map((label) => <th key={label} scope="col" className="p-4">{label}</th>)}
      </tr></thead><tbody>{data.items.map((session) => <tr key={session.session_id} className="border-t border-indigo-100">
        <td className="p-4 font-bold">{session.display_name || common.guest}</td><td className="p-4">{new Date(session.started_at).toLocaleString(common.locale)}</td>
        <td className="p-4">{session.duration_seconds === null ? "—" : formatComputerVisionDuration(session.duration_seconds * 1000, language)}</td>
        <td className="p-4">{session.completion_status === "completed" ? common.successful : session.completion_status === "abandoned" ? common.abandoned : common.inProgress}</td>
        <td className="p-4">{text.steps[session.final_step_reached]}</td><td className="p-4">{session.selected_meal ? text.foods[session.selected_meal] : "—"}</td>
      </tr>)}</tbody></table></div>
      <div className="mt-5 flex items-center justify-end gap-4"><button type="button" aria-label={labels.previous} disabled={page <= 1} onClick={() => setPage(page - 1)} className="min-h-12 rounded-lg border px-4 font-bold disabled:opacity-40">{labels.previous}</button>
        <span>{page} / {Math.max(1, Math.ceil(data.total / data.page_size))}</span><button type="button" aria-label={labels.next} disabled={page * data.page_size >= data.total} onClick={() => setPage(page + 1)} className="min-h-12 rounded-lg border px-4 font-bold disabled:opacity-40">{labels.next}</button></div>
    </>}
  </section>;
}
