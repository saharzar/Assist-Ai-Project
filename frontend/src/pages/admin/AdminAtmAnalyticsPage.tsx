import { useEffect, useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";

import { useAuth } from "../../context/AuthContext";
import { useTranslation } from "../../i18n";
import {
  adminAnalyticsTranslations,
  type AdminAnalyticsText,
} from "../../lib/adminAnalyticsTranslations";
import {
  fetchActorAtmSessions,
  fetchAtmAnalyticsSessions,
  type AtmAnalyticsFilters,
  type AtmAnalyticsSession,
} from "../../services/adminAnalyticsService";

const initialFilters: AtmAnalyticsFilters = {
  actorType: "all",
  completionStatus: "all",
};

export function AdminAtmAnalyticsPage() {
  const { user, isAuthenticated } = useAuth();
  const { language } = useTranslation();
  const text = adminAnalyticsTranslations[language];
  const [draftFilters, setDraftFilters] = useState(initialFilters);
  const [filters, setFilters] = useState(initialFilters);
  const [sessions, setSessions] = useState<AtmAnalyticsSession[]>([]);
  const [selectedActorSessions, setSelectedActorSessions] = useState<AtmAnalyticsSession[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const isAdmin = isAuthenticated && user?.role === "admin";
  const finalizedStats = useMemo(() => {
    const finalized = sessions.filter((session) => session.completion_status !== "in_progress");
    const successful = finalized.filter((session) => session.success).length;
    const securityTerminated = finalized.filter((session) => session.security_terminated).length;
    const abandoned = finalized.filter((session) => session.completion_status === "abandoned").length;
    const registered = finalized.filter((session) => session.actor_type === "registered").length;
    const guests = finalized.filter((session) => session.actor_type === "guest").length;
    return { total: finalized.length, successful, securityTerminated, abandoned, registered, guests };
  }, [sessions]);

  useEffect(() => {
    if (!isAdmin) return;
    setIsLoading(true);
    setErrorMessage("");
    fetchAtmAnalyticsSessions(filters)
      .then(setSessions)
      .catch(() => setErrorMessage(text.loadError))
      .finally(() => setIsLoading(false));
  }, [filters, isAdmin, text.loadError]);

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!isAdmin) {
    return <section className="rounded-lg border border-amber-300 bg-amber-50 p-6 font-semibold text-amber-900">{text.accessDenied}</section>;
  }

  const openActorHistory = async (session: AtmAnalyticsSession) => {
    setErrorMessage("");
    try {
      setSelectedActorSessions(
        await fetchActorAtmSessions(session.actor_type, session.actor_reference),
      );
    } catch {
      setErrorMessage(text.historyLoadError);
    }
  };

  return (
    <section className="flex flex-1 flex-col text-[#1d1a3d]">
      <div className="relative flex flex-col justify-between gap-5 overflow-hidden border-b border-indigo-950/10 pb-7 sm:flex-row sm:items-end">
        <span className="absolute left-0 top-0 h-full w-1 rounded-full bg-cyan-400" aria-hidden="true" />
        <div className="pl-5">
          <p className="text-xs font-bold uppercase tracking-wider text-teal-700">{text.adminDashboard}</p>
          <h1 className="mt-2 text-3xl font-extrabold text-[#1d1a5e]">{text.atmAnalytics}</h1>
          <p className="mt-2 text-slate-600">{text.atmDescription}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link to="/admin/scenario-analytics" className="inline-flex min-h-[44px] items-center justify-center rounded-full border border-indigo-950/10 bg-white px-5 font-bold text-[#2a2586] hover:bg-[#f3f3fb] focus:outline-none focus:ring-2 focus:ring-cyan-400">
            {text.allScenarioAnalytics}
          </Link>
        </div>
      </div>

      <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        <Metric label={text.totalSessions} value={finalizedStats.total} tone="indigo" />
        <Metric label={text.successful} value={finalizedStats.successful} detail={`${finalizedStats.total ? (finalizedStats.successful / finalizedStats.total * 100).toFixed(1) : 0}% ${text.successRate}`} tone="cyan" />
        <Metric label={text.abandoned} value={finalizedStats.abandoned} tone="violet" />
        <Metric label={text.securityTerminated} value={finalizedStats.securityTerminated} tone="rose" />
        <Metric label={text.registeredSessions} value={finalizedStats.registered} tone="indigo" />
        <Metric label={text.guestSessions} value={finalizedStats.guests} tone="cyan" />
      </div>

      <AnalyticsCharts stats={finalizedStats} text={text} />

      <form
        className="mt-7 grid gap-4 rounded-xl border border-indigo-950/10 bg-white p-5 md:grid-cols-4"
        onSubmit={(event) => {
          event.preventDefault();
          setSelectedActorSessions(null);
          setFilters({ ...draftFilters });
        }}
      >
        <FilterInput label={text.from} type="date" value={draftFilters.dateFrom ?? ""} onChange={(dateFrom) => setDraftFilters((current) => ({ ...current, dateFrom }))} />
        <FilterInput label={text.to} type="date" value={draftFilters.dateTo ?? ""} onChange={(dateTo) => setDraftFilters((current) => ({ ...current, dateTo }))} />
        <FilterInput label={text.userName} value={draftFilters.userName ?? ""} onChange={(userName) => setDraftFilters((current) => ({ ...current, userName }))} />
        <FilterSelect label={text.userType} value={draftFilters.actorType ?? "all"} options={[{ value: "all", label: text.all }, { value: "registered", label: text.registered }, { value: "guest", label: text.guest }]} onChange={(actorType) => setDraftFilters((current) => ({ ...current, actorType: actorType as AtmAnalyticsFilters["actorType"] }))} />
        <FilterSelect label={text.status} value={draftFilters.completionStatus ?? "all"} options={[{ value: "all", label: text.all }, { value: "completed", label: text.completed }, { value: "abandoned", label: text.abandoned }]} onChange={(completionStatus) => setDraftFilters((current) => ({ ...current, completionStatus: completionStatus as AtmAnalyticsFilters["completionStatus"] }))} />
        <FilterSelect label={text.language} value={draftFilters.language ?? ""} options={[{ value: "", label: text.any }, ...["en", "es", "de", "tr", "pt", "fr"].map((value) => ({ value, label: value.toUpperCase() }))]} onChange={(selectedLanguage) => setDraftFilters((current) => ({ ...current, language: selectedLanguage }))} />
        <FilterSelect label={text.sttProvider} value={draftFilters.sttProvider ?? ""} options={[{ value: "", label: text.any }, { value: "azure", label: "Azure" }]} onChange={(sttProvider) => setDraftFilters((current) => ({ ...current, sttProvider }))} />
        <div className="flex items-end gap-2">
          <button type="submit" className="min-h-[44px] flex-1 rounded-lg bg-[#2a2586] px-4 font-bold text-white hover:bg-[#1d1a5e] focus:outline-none focus:ring-2 focus:ring-cyan-400">{text.applyFilters}</button>
          <button type="button" aria-label={text.clear} onClick={() => { setDraftFilters(initialFilters); setFilters(initialFilters); setSelectedActorSessions(null); }} className="min-h-[44px] rounded-lg border border-indigo-950/10 bg-white px-4 font-bold text-[#2a2586] hover:bg-[#f3f3fb] focus:outline-none focus:ring-2 focus:ring-cyan-400">{text.clear}</button>
        </div>
      </form>

      {errorMessage && <div className="mt-5 rounded-lg border border-amber-300 bg-amber-50 p-4 font-semibold text-amber-900">{errorMessage}</div>}
      {isLoading ? (
        <p className="py-10 text-center font-semibold text-slate-600">{text.loading}</p>
      ) : (
        <SessionTable sessions={sessions} text={text} onActorClick={(session) => void openActorHistory(session)} />
      )}

      {selectedActorSessions && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/55 p-5">
          <section role="dialog" aria-modal="true" aria-labelledby="actor-history-title" className="max-h-[90vh] w-full max-w-6xl overflow-auto rounded-xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 id="actor-history-title" className="text-2xl font-bold">{text.sessionHistory}</h2>
                <p className="text-slate-600">{selectedActorSessions[0]?.display_name ?? text.noSessions}</p>
              </div>
              <button type="button" onClick={() => setSelectedActorSessions(null)} className="min-h-[44px] rounded-lg border border-slate-300 px-4 font-bold hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-teal-500">{text.close}</button>
            </div>
            <SessionTable sessions={selectedActorSessions} text={text} />
          </section>
        </div>
      )}
    </section>
  );
}

function Metric({ label, value, detail, tone }: { label: string; value: number | string; detail?: string; tone: "indigo" | "cyan" | "violet" | "rose" }) {
  const styles = tone === "cyan" ? "border-cyan-100 bg-cyan-50/35" : tone === "violet" ? "border-violet-100 bg-violet-50/30" : tone === "rose" ? "border-rose-100 bg-rose-50/30" : "border-indigo-100 bg-indigo-50/30";
  const accent = tone === "cyan" ? "bg-cyan-400" : tone === "violet" ? "bg-violet-400" : tone === "rose" ? "bg-rose-400" : "bg-[#3932a8]";
  return <article className={`relative overflow-hidden rounded-lg border p-5 ${styles}`}><span className={`absolute inset-x-0 top-0 h-1 ${accent}`} aria-hidden="true" /><p className="text-sm font-semibold text-slate-500">{label}</p><p className="mt-2 text-3xl font-extrabold text-[#1d1a5e]">{value}</p>{detail && <p className="mt-1 text-xs font-semibold text-teal-600">{detail}</p>}</article>;
}

type FinalizedStats = { total: number; successful: number; securityTerminated: number; abandoned: number; registered: number; guests: number };

function AnalyticsCharts({ stats, text }: { stats: FinalizedStats; text: AdminAnalyticsText }) {
  const outcomes = [
    { label: text.successful, value: stats.successful, color: "#2dd8d8" },
    { label: text.abandoned, value: stats.abandoned, color: "#3730a3" },
    { label: text.securityTerminated, value: stats.securityTerminated, color: "#f59e0b" },
  ];
  const outcomeCount = outcomes.reduce((sum, item) => sum + item.value, 0);
  const outcomeTotal = Math.max(1, outcomeCount);
  let cursor = 0;
  const segments = outcomes.map((item) => {
    const start = cursor;
    cursor += item.value / outcomeTotal * 100;
    return `${item.color} ${start}% ${cursor}%`;
  });
  const audienceTotal = Math.max(1, stats.registered + stats.guests);
  const audiences = [
    { label: text.registeredSessions, value: stats.registered, color: "bg-[#3730a3]" },
    { label: text.guestSessions, value: stats.guests, color: "bg-cyan-400" },
  ];

  return <div className="mt-5 grid gap-5 lg:grid-cols-2">
    <section className="rounded-xl border border-indigo-950/10 bg-white p-6"><h2 className="text-lg font-bold text-[#1d1a5e]">{text.status}</h2><div className="mt-5 flex flex-wrap items-center gap-8"><div className="relative h-36 w-36 shrink-0 rounded-full" style={{ background: outcomeCount ? `conic-gradient(${segments.join(", ")})` : "#f3f3fb" }} role="img" aria-label={outcomes.map((item) => `${item.label}: ${item.value}`).join(", ")}><span className="absolute inset-5 flex items-center justify-center rounded-full bg-white text-2xl font-extrabold text-[#1d1a5e]">{outcomeCount}</span></div><div className="min-w-[180px] flex-1 space-y-3">{outcomes.map((item) => <div key={item.label} className="flex items-center justify-between gap-4"><span className="flex items-center gap-2 text-sm text-slate-600"><i className="h-2.5 w-2.5 rounded-full" style={{ background: item.color }} />{item.label}</span><strong>{item.value}</strong></div>)}</div></div></section>
    <section className="rounded-xl border border-indigo-950/10 bg-white p-6"><h2 className="text-lg font-bold text-[#1d1a5e]">{text.userType}</h2><div className="mt-8 space-y-6">{audiences.map((item) => { const percent = item.value / audienceTotal * 100; return <div key={item.label}><div className="mb-2 flex items-center justify-between text-sm"><span className="font-semibold text-slate-600">{item.label}</span><strong className="text-[#1d1a5e]">{item.value} · {percent.toFixed(0)}%</strong></div><div className="h-3 overflow-hidden rounded-full bg-[#f3f3fb]"><div className={`h-full rounded-full ${item.color}`} style={{ width: `${percent}%` }} /></div></div>; })}</div></section>
  </div>;
}

function FilterInput({ label, value, type = "text", onChange }: { label: string; value: string; type?: string; onChange: (value: string) => void }) {
  return <label className="text-sm font-bold text-slate-600">{label}<input type={type} value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 min-h-[44px] w-full rounded-lg border border-indigo-950/10 bg-white px-3 font-normal outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-200" /></label>;
}

function FilterSelect({ label, value, options, onChange }: { label: string; value: string; options: Array<{ value: string; label: string }>; onChange: (value: string) => void }) {
  return <label className="text-sm font-bold text-slate-600">{label}<select value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 min-h-[44px] w-full rounded-lg border border-indigo-950/10 bg-white px-3 font-normal outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-200">{options.map((option) => <option key={option.value || "any"} value={option.value}>{option.label}</option>)}</select></label>;
}

function SessionTable({ sessions, text, onActorClick }: { sessions: AtmAnalyticsSession[]; text: AdminAnalyticsText; onActorClick?: (session: AtmAnalyticsSession) => void }) {
  const finalizedSessions = sessions.filter((session) => session.completion_status !== "in_progress");
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const pages = Math.max(1, Math.ceil(finalizedSessions.length / pageSize));
  const visible = finalizedSessions.slice((page - 1) * pageSize, page * pageSize);
  if (!finalizedSessions.length) return <p className="py-10 text-center font-semibold text-slate-500">{text.noSessions}</p>;
  const result = (session: AtmAnalyticsSession) => session.success ? text.successful : session.security_terminated ? text.securityTerminated : text.abandoned;
  const resultStyle = (session: AtmAnalyticsSession) => session.success ? "bg-cyan-50 text-teal-700" : session.security_terminated ? "bg-amber-50 text-amber-700" : "bg-[#f3f3fb] text-[#3730a3]";
  const finalStepLabel = (session: AtmAnalyticsSession) => session.termination_reason
    ? text.terminationReasons[session.termination_reason] ?? session.termination_reason
    : text.stepNames[session.final_step_reached] ?? session.final_step_reached;
  return <div className="mt-6"><div className="overflow-x-auto rounded-xl border border-indigo-950/10 bg-white"><table className="min-w-full text-left text-sm"><thead className="bg-[#f3f3fb] text-xs uppercase tracking-wider text-slate-500"><tr>{[text.user, text.started, text.duration, text.status, text.submissions, text.finalStep].map((heading) => <th key={heading} className="whitespace-nowrap px-5 py-4">{heading}</th>)}</tr></thead><tbody className="divide-y divide-indigo-950/10">{visible.map((session) => <tr key={session.session_id} className="hover:bg-[#fafbff]"><td className="whitespace-nowrap px-5 py-4 font-bold">{onActorClick ? <button type="button" onClick={() => onActorClick(session)} className="text-[#2a2586] hover:underline">{session.display_name}</button> : session.display_name}</td><td className="whitespace-nowrap px-5 py-4 text-slate-600">{new Date(session.started_at).toLocaleString(text.locale)}</td><td className="px-5 py-4 text-slate-600">{session.duration_seconds === null ? "-" : `${session.duration_seconds}s`}</td><td className="px-5 py-4"><span className={`rounded-full px-3 py-1 text-xs font-bold ${resultStyle(session)}`}>{result(session)}</span></td><td className="px-5 py-4 font-semibold">{session.total_pin_submission_count}</td><td className="px-5 py-4 text-slate-600">{finalStepLabel(session)}</td></tr>)}</tbody></table></div>{pages > 1 && <div className="mt-4 flex justify-end gap-2"><button disabled={page === 1} onClick={() => setPage(page - 1)} className="rounded-lg border border-indigo-950/10 px-3 py-2 text-[#2a2586] disabled:opacity-40">Previous</button><span className="px-2 py-2 text-sm">{page} / {pages}</span><button disabled={page === pages} onClick={() => setPage(page + 1)} className="rounded-lg border border-indigo-950/10 px-3 py-2 text-[#2a2586] disabled:opacity-40">Next</button></div>}</div>;
}
