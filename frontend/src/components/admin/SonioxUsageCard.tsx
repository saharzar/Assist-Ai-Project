import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useTranslation } from "../../i18n";
import { speechProviderTranslations } from "../../lib/speechProviderTranslations";
import { sonioxUsageTranslations } from "../../lib/sonioxUsageTranslations";
import { fetchSonioxUsage, type SonioxUsageSummary } from "../../services/speechProviderService";

export function SonioxUsageCard() {
  const { isAuthenticated, user } = useAuth();
  // Do not mount the fetching component for non-admin accounts.
  return isAuthenticated && user?.role === "admin" ? <AdminSonioxUsage /> : null;
}

function AdminSonioxUsage() {
  const [usage, setUsage] = useState<SonioxUsageSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError(false); setUsage(null);
    void fetchSonioxUsage(controller.signal)
      .then((value) => { if (!controller.signal.aborted) setUsage(value); })
      .catch(() => { if (!controller.signal.aborted) setError(true); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [refresh]);
  return <SonioxUsageContent usage={usage} loading={loading} error={error} onRefresh={() => setRefresh((value) => value + 1)} />;
}

export function SonioxUsageContent({ usage, loading, error, onRefresh }: {
  usage: SonioxUsageSummary | null; loading: boolean; error: boolean; onRefresh: () => void;
}) {
  const { language } = useTranslation();
  const text = sonioxUsageTranslations[language];
  const locale = speechProviderTranslations[language].locale;
  const cost = (value: string) => Number(value).toLocaleString(locale, { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 6 });
  const number = (value: number) => value.toLocaleString(locale);
  return <section className="mt-6 rounded-xl border border-teal-200 bg-white p-6 shadow-sm" aria-labelledby="soniox-usage-title">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><h2 id="soniox-usage-title" className="text-xl font-bold text-[#1d1a5e]">{text.title}</h2><p className="mt-1 text-sm text-slate-500">{text.source}</p></div>
      <button type="button" disabled={loading} onClick={onRefresh} className="rounded-lg border border-indigo-950/10 px-4 py-2 text-sm font-bold text-[#2a2586] disabled:opacity-50">{text.refresh}</button>
    </div>
    {loading && <p role="status" className="mt-4 text-sm text-slate-600">{text.loading}</p>}
    {error && <p role="alert" className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">{text.error}</p>}
    {!loading && !error && usage && <>
      <dl className="mt-5 grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg bg-[#f7f7fc] p-4"><dt className="text-sm text-slate-600">{text.month}</dt><dd className="mt-2 text-xl font-bold text-[#2a2586]">{new Date(usage.period_start).toLocaleDateString(locale, { month: "long", year: "numeric", timeZone: "UTC" })}</dd></div>
        <div className="rounded-lg bg-teal-50 p-4"><dt className="text-sm text-slate-600">{text.totalCost}</dt><dd className="mt-2 text-xl font-bold text-[#2a2586]">{cost(usage.total_cost_usd)}</dd><dd className="mt-1 text-sm text-slate-500">{text.requests}: {number(usage.total_requests)}</dd></div>
      </dl>
      {usage.models.length > 0 ? <div className="mt-5 overflow-x-auto"><table className="w-full text-left text-sm">
        <thead className="text-slate-500"><tr>{[text.model, text.cost, text.requests].map((label) => <th key={label} scope="col" className="px-3 py-2 font-semibold">{label}</th>)}</tr></thead>
        <tbody className="divide-y divide-indigo-950/10">{usage.models.map((model) => <tr key={model.model}><td className="px-3 py-3 font-semibold">{model.model}</td><td className="px-3 py-3">{cost(model.cost_usd)}</td><td className="px-3 py-3">{number(model.requests)}</td></tr>)}</tbody>
      </table></div> : <p className="mt-4 text-sm text-slate-500">{text.empty}</p>}
      {usage.daily.length > 0 && <details className="mt-4 border-t border-indigo-950/10 pt-4">
        <summary className="cursor-pointer text-sm font-semibold text-[#2a2586]">{text.daily}</summary>
        <div className="mt-3 max-h-64 overflow-auto"><table className="w-full text-left text-sm"><thead className="text-slate-500"><tr>{[text.date, text.cost, text.requests].map((label) => <th key={label} scope="col" className="px-3 py-2 font-semibold">{label}</th>)}</tr></thead>
          <tbody className="divide-y divide-indigo-950/10">{usage.daily.map((day) => <tr key={day.date}><td className="px-3 py-2">{new Date(`${day.date}T00:00:00Z`).toLocaleDateString(locale, { timeZone: "UTC" })}</td><td className="px-3 py-2">{cost(day.cost_usd)}</td><td className="px-3 py-2">{number(day.requests)}</td></tr>)}</tbody>
        </table></div>
      </details>}
      <p className="mt-5 text-xs text-slate-500">{text.updated}: <time dateTime={usage.updated_at}>{new Date(usage.updated_at).toLocaleString(locale, { timeZone: "UTC" })} UTC</time></p>
    </>}
  </section>;
}
