import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";

import { useAuth } from "../../context/AuthContext";
import {
  fetchActorAtmSessions,
  fetchAtmAnalyticsSessions,
  fetchAtmAnalyticsSummary,
  type AtmAnalyticsFilters,
  type AtmAnalyticsSession,
  type AtmAnalyticsSummary,
} from "../../services/adminAnalyticsService";

const emptySummary: AtmAnalyticsSummary = {
  total_sessions: 0,
  successful_sessions: 0,
  abandoned_sessions: 0,
  in_progress_sessions: 0,
  success_rate: 0,
  average_completion_seconds: 0,
  average_incorrect_pin_attempts: 0,
  average_retries: 0,
  registered_user_sessions: 0,
  consenting_guest_sessions: 0,
};

const initialFilters: AtmAnalyticsFilters = {
  actorType: "all",
  completionStatus: "all",
};

export function AdminAtmAnalyticsPage() {
  const { user, isAuthenticated } = useAuth();
  const [draftFilters, setDraftFilters] = useState(initialFilters);
  const [filters, setFilters] = useState(initialFilters);
  const [summary, setSummary] = useState(emptySummary);
  const [sessions, setSessions] = useState<AtmAnalyticsSession[]>([]);
  const [selectedActorSessions, setSelectedActorSessions] = useState<AtmAnalyticsSession[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const isAdmin = isAuthenticated && user?.role === "admin";

  useEffect(() => {
    if (!isAdmin) return;
    setIsLoading(true);
    setErrorMessage("");
    Promise.all([fetchAtmAnalyticsSummary(filters), fetchAtmAnalyticsSessions(filters)])
      .then(([nextSummary, nextSessions]) => {
        setSummary(nextSummary);
        setSessions(nextSessions);
      })
      .catch(() => setErrorMessage("ATM analytics could not be loaded."))
      .finally(() => setIsLoading(false));
  }, [filters, isAdmin]);

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!isAdmin) {
    return <section className="rounded-lg border border-amber-300 bg-amber-50 p-6 font-semibold text-amber-900">Access denied.</section>;
  }

  const openActorHistory = async (session: AtmAnalyticsSession) => {
    setErrorMessage("");
    try {
      setSelectedActorSessions(
        await fetchActorAtmSessions(session.actor_type, session.actor_reference),
      );
    } catch {
      setErrorMessage("This session history could not be loaded.");
    }
  };

  return (
    <section className="flex flex-1 flex-col text-slate-900">
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-bold uppercase text-teal-700">Admin dashboard</p>
          <h1 className="mt-1 text-3xl font-bold">ATM Analytics</h1>
          <p className="mt-2 text-slate-600">Session history for registered users and consenting guests.</p>
        </div>
        <Link to="/admin/users" className="inline-flex min-h-[44px] items-center justify-center rounded-lg border border-slate-300 bg-white px-4 font-bold text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-teal-500">
          Manage users
        </Link>
      </div>

      <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Total sessions" value={summary.total_sessions} />
        <Metric label="Successful" value={summary.successful_sessions} detail={`${summary.success_rate}% success rate`} />
        <Metric label="Abandoned" value={summary.abandoned_sessions} detail={`${summary.in_progress_sessions} still in progress`} />
        <Metric label="Average duration" value={`${summary.average_completion_seconds}s`} />
        <Metric label="Average incorrect PINs" value={summary.average_incorrect_pin_attempts} />
        <Metric label="Average retries" value={summary.average_retries} />
        <Metric label="Registered sessions" value={summary.registered_user_sessions} />
        <Metric label="Guest sessions" value={summary.consenting_guest_sessions} />
      </div>

      <form
        className="mt-7 grid gap-3 border-y border-slate-200 py-5 md:grid-cols-4"
        onSubmit={(event) => {
          event.preventDefault();
          setSelectedActorSessions(null);
          setFilters({ ...draftFilters });
        }}
      >
        <FilterInput label="From" type="date" value={draftFilters.dateFrom ?? ""} onChange={(dateFrom) => setDraftFilters((current) => ({ ...current, dateFrom }))} />
        <FilterInput label="To" type="date" value={draftFilters.dateTo ?? ""} onChange={(dateTo) => setDraftFilters((current) => ({ ...current, dateTo }))} />
        <FilterInput label="User name" value={draftFilters.userName ?? ""} onChange={(userName) => setDraftFilters((current) => ({ ...current, userName }))} />
        <FilterSelect label="User type" value={draftFilters.actorType ?? "all"} options={["all", "registered", "guest"]} onChange={(actorType) => setDraftFilters((current) => ({ ...current, actorType: actorType as AtmAnalyticsFilters["actorType"] }))} />
        <FilterSelect label="Status" value={draftFilters.completionStatus ?? "all"} options={["all", "completed", "abandoned", "in_progress"]} onChange={(completionStatus) => setDraftFilters((current) => ({ ...current, completionStatus: completionStatus as AtmAnalyticsFilters["completionStatus"] }))} />
        <FilterSelect label="Language" value={draftFilters.language ?? ""} options={["", "en", "es", "de", "tr", "pt", "fr"]} onChange={(language) => setDraftFilters((current) => ({ ...current, language }))} />
        <FilterSelect label="STT provider" value={draftFilters.sttProvider ?? ""} options={["", "azure"]} onChange={(sttProvider) => setDraftFilters((current) => ({ ...current, sttProvider }))} />
        <div className="flex items-end gap-2">
          <button type="submit" className="min-h-[44px] flex-1 rounded-lg bg-slate-900 px-4 font-bold text-white hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500">Apply filters</button>
          <button type="button" aria-label="Clear filters" onClick={() => { setDraftFilters(initialFilters); setFilters(initialFilters); setSelectedActorSessions(null); }} className="min-h-[44px] rounded-lg border border-slate-300 bg-white px-4 font-bold text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-teal-500">Clear</button>
        </div>
      </form>

      {errorMessage && <div className="mt-5 rounded-lg border border-amber-300 bg-amber-50 p-4 font-semibold text-amber-900">{errorMessage}</div>}
      {isLoading ? (
        <p className="py-10 text-center font-semibold text-slate-600">Loading ATM analytics...</p>
      ) : (
        <SessionTable sessions={sessions} onActorClick={(session) => void openActorHistory(session)} />
      )}

      {selectedActorSessions && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/55 p-5">
          <section role="dialog" aria-modal="true" aria-labelledby="actor-history-title" className="max-h-[90vh] w-full max-w-6xl overflow-auto rounded-lg bg-white p-5 shadow-xl">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 id="actor-history-title" className="text-2xl font-bold">Session history</h2>
                <p className="text-slate-600">{selectedActorSessions[0]?.display_name ?? "No sessions"}</p>
              </div>
              <button type="button" onClick={() => setSelectedActorSessions(null)} className="min-h-[44px] rounded-lg border border-slate-300 px-4 font-bold hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-teal-500">Close</button>
            </div>
            <SessionTable sessions={selectedActorSessions} />
          </section>
        </div>
      )}
    </section>
  );
}

function Metric({ label, value, detail }: { label: string; value: number | string; detail?: string }) {
  return <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"><p className="text-xs font-bold uppercase text-slate-500">{label}</p><p className="mt-1 text-2xl font-bold">{value}</p>{detail && <p className="mt-1 text-xs text-slate-500">{detail}</p>}</article>;
}

function FilterInput({ label, value, type = "text", onChange }: { label: string; value: string; type?: string; onChange: (value: string) => void }) {
  return <label className="text-sm font-bold text-slate-700">{label}<input type={type} value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 min-h-[44px] w-full rounded-lg border border-slate-300 bg-white px-3 font-normal outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500" /></label>;
}

function FilterSelect({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return <label className="text-sm font-bold text-slate-700">{label}<select value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 min-h-[44px] w-full rounded-lg border border-slate-300 bg-white px-3 font-normal capitalize outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500">{options.map((option) => <option key={option || "any"} value={option}>{option ? option.replace("_", " ") : "Any"}</option>)}</select></label>;
}

function SessionTable({ sessions, onActorClick }: { sessions: AtmAnalyticsSession[]; onActorClick?: (session: AtmAnalyticsSession) => void }) {
  if (!sessions.length) return <p className="py-10 text-center font-semibold text-slate-500">No ATM sessions match these filters.</p>;
  return <div className="mt-6 overflow-x-auto rounded-lg border border-slate-200 bg-white"><table className="min-w-full text-left text-sm"><thead className="bg-slate-100 text-xs uppercase text-slate-600"><tr>{["User", "Started", "Duration", "PIN errors", "Submissions", "Retries", "Status", "Language", "STT", "Input", "Final step"].map((heading) => <th key={heading} className="whitespace-nowrap px-4 py-3">{heading}</th>)}</tr></thead><tbody className="divide-y divide-slate-200">{sessions.map((session) => <tr key={session.session_id} className="hover:bg-slate-50"><td className="whitespace-nowrap px-4 py-3 font-bold">{onActorClick ? <button type="button" onClick={() => onActorClick(session)} className="text-teal-700 underline-offset-2 hover:underline focus:outline-none focus:ring-2 focus:ring-teal-500">{session.display_name}</button> : session.display_name}<span className="block text-xs font-normal text-slate-500">{session.actor_type === "guest" ? session.actor_reference.slice(0, 8) : "Registered"}</span></td><td className="whitespace-nowrap px-4 py-3">{new Date(session.started_at).toLocaleString()}</td><td className="px-4 py-3">{session.duration_seconds === null ? "-" : `${session.duration_seconds}s`}</td><td className="px-4 py-3">{session.incorrect_user_pin_count}</td><td className="px-4 py-3">{session.total_pin_submission_count}</td><td className="px-4 py-3">{session.retry_count}</td><td className="px-4 py-3 capitalize">{session.completion_status.replace("_", " ")}</td><td className="px-4 py-3 uppercase">{session.selected_language ?? "-"}</td><td className="px-4 py-3 capitalize">{session.stt_provider ?? "-"}</td><td className="px-4 py-3">{[session.used_voice_input && "Voice", session.used_keyboard_input && "Keyboard"].filter(Boolean).join(" + ") || "-"}</td><td className="whitespace-nowrap px-4 py-3 capitalize">{session.final_step_reached.replace("_", " ")}</td></tr>)}</tbody></table></div>;
}
