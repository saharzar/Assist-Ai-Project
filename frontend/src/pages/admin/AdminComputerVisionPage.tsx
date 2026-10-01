import { useEffect, useState, type ReactNode } from "react";
import { Link, Navigate, useParams } from "react-router-dom";

import { useAuth } from "../../context/AuthContext";
import { ComputerVisionSessionSummary } from "../../components/ComputerVisionSessionSummary";
import { SavedHeadPoseCharts } from "../../components/HeadPoseCharts";
import { scenarios } from "../../data/scenarios";
import { useTranslation } from "../../i18n";
import { adminAnalyticsTranslations } from "../../lib/adminAnalyticsTranslations";
import { adminComputerVisionTranslations } from "../../lib/adminComputerVisionTranslations";
import { fetchComputerVisionSession, fetchComputerVisionSessions,
  type ComputerVisionSessionDetail, type ComputerVisionSessionList,
} from "../../services/adminComputerVisionService";

export function AdminComputerVisionPage() {
  const { isAuthenticated, user } = useAuth();
  const { language } = useTranslation();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user?.role !== "admin") return <section role="alert">{adminAnalyticsTranslations[language].accessDenied}</section>;
  return <ComputerVisionRecordings />;
}

function ComputerVisionRecordings() {
  const { sessionId } = useParams();
  const { language, translateScenario } = useTranslation();
  const text = adminComputerVisionTranslations[language];
  const common = adminAnalyticsTranslations[language];
  const [page, setPage] = useState(1);
  const [list, setList] = useState<ComputerVisionSessionList | null>(null);
  const [detail, setDetail] = useState<ComputerVisionSessionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(false);
    setList(null);
    setDetail(null);
    const request = sessionId
      ? fetchComputerVisionSession(sessionId, page).then((value) => { if (active) setDetail(value); })
      : fetchComputerVisionSessions(page).then((value) => { if (active) setList(value); });
    void request.catch(() => { if (active) setError(true); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [sessionId, page]);

  const scenarioName = (key: string) => {
    const scenario = scenarios.find((item) => item.slug === key);
    return scenario ? translateScenario(scenario).title : key;
  };
  const date = (value: string) => new Date(value).toLocaleString(common.locale);
  const duration = (ms: number) => `${(ms / 1000).toLocaleString(common.locale)} s`;
  const total = detail?.session.sample_count ?? list?.total ?? 0;
  const pageSize = detail?.page_size ?? list?.page_size ?? 10;
  const pages = Math.max(1, Math.ceil(total / pageSize));

  return <section className="standard-page flex flex-1 flex-col text-[#1d1a3d]">
    <div className="catalogue-style-heading">
      <div><h1 className="font-display text-3xl font-extrabold">{text.title}</h1><p className="mt-2 text-slate-600">{text.description}</p></div>
      <Link className="mt-4 inline-flex rounded-full border border-indigo-950/10 bg-white px-5 py-3 font-bold text-[#2a2586]" to={sessionId ? "/admin/computer-vision" : "/admin/scenario-analytics"}>{sessionId ? text.back : common.allScenarioAnalytics}</Link>
    </div>
    {loading && <p role="status" className="py-10 text-center">{common.loading}</p>}
    {error && <p role="alert" className="mt-5 rounded-lg border border-amber-300 bg-amber-50 p-4">{common.loadError}</p>}
    {!loading && !error && list && <DataTable headings={[common.user, text.scenario, text.attempt, common.started, common.duration, text.samples, text.open]}>
      {list.items.map((session) => <tr key={session.session_id} className="hover:bg-[#fafbff]">
        <Cell>{session.display_name && <span className="block font-bold">{session.display_name}</span>}{session.actor_type === "guest" ? common.guest : common.registered} #{session.actor_reference}</Cell>
        <Cell>{scenarioName(session.scenario_key)}</Cell><Cell>{session.scenario_session_id ?? text.missing}</Cell>
        <Cell>{date(session.started_at)}</Cell><Cell>{duration(session.duration_ms)}</Cell><Cell>{session.sample_count}</Cell>
        <Cell><Link className="font-bold text-[#2a2586] hover:underline" to={`/admin/computer-vision/${session.session_id}`}>{text.open}</Link></Cell>
      </tr>)}
      {list.items.length === 0 && <tr><td colSpan={7} className="p-5 text-center">{common.noSessions}</td></tr>}
    </DataTable>}
    {!loading && !error && detail && <>
      <dl className="mt-6 grid gap-4 rounded-xl border border-indigo-950/10 bg-white p-5 sm:grid-cols-2 lg:grid-cols-3">
        {[
          [common.user, `${detail.session.display_name ?? ""} ${detail.session.actor_type === "guest" ? common.guest : common.registered} #${detail.session.actor_reference}`],
          [text.scenario, scenarioName(detail.session.scenario_key)], [text.attempt, detail.session.scenario_session_id ?? text.missing],
          [common.started, `${date(detail.session.started_at)} — ${date(detail.session.ended_at)}`],
          [common.duration, duration(detail.session.duration_ms)], [text.samples, detail.session.sample_count],
        ].map(([label, value]) => <div key={label}><dt className="text-sm font-semibold text-slate-500">{label}</dt><dd className="mt-1 break-words font-semibold">{value}</dd></div>)}
      </dl>
      <ComputerVisionSessionSummary summary={detail.summary} />
    </>}
    {sessionId && <SavedHeadPoseCharts key={sessionId} sessionId={sessionId} />}
    {!loading && !error && detail && <>
      <DataTable headings={[text.timestamp, text.yaw, text.pitch, text.roll, text.eyeDirection, text.interaction]}>
        {detail.samples.map((sample) => <tr key={sample.timestamp} className={sample.isUserInteracting ? "bg-amber-50" : "hover:bg-[#fafbff]"}>
          <Cell>{sample.timestamp}</Cell>{[sample.yaw, sample.pitch, sample.roll].map((value, index) => <Cell key={index}>{value === null ? text.missing : value.toLocaleString(common.locale, { maximumFractionDigits: 2 })}</Cell>)}
          <Cell>{sample.estimatedEyeDirection === null ? text.missing : text[sample.estimatedEyeDirection]}</Cell>
          <Cell><span className={sample.isUserInteracting ? "rounded-full bg-amber-200 px-3 py-1 font-bold text-amber-950" : "text-slate-600"}>{sample.isUserInteracting ? text.yes : text.no}</span></Cell>
        </tr>)}
      </DataTable>
    </>}
    {!loading && !error && (list || detail) && pages > 1 && <nav aria-label={text.samples} className="mt-4 flex items-center justify-end gap-3">
      <button className="rounded-lg border border-indigo-950/10 px-4 py-2 disabled:opacity-40" disabled={page <= 1} onClick={() => setPage(page - 1)}>{text.previous}</button>
      <span>{page} / {pages}</span>
      <button className="rounded-lg border border-indigo-950/10 px-4 py-2 disabled:opacity-40" disabled={page >= pages} onClick={() => setPage(page + 1)}>{text.next}</button>
    </nav>}
  </section>;
}

function Cell({ children }: { children: ReactNode }) {
  return <td className="px-5 py-4 text-slate-600">{children}</td>;
}

function DataTable({ headings, children }: { headings: string[]; children: ReactNode }) {
  return <div className="mt-6 overflow-x-auto rounded-xl border border-indigo-950/10 bg-white"><table className="min-w-full text-left text-sm">
    <thead className="bg-[#f3f3fb] text-xs uppercase tracking-wider text-slate-500"><tr>{headings.map((heading) => <th key={heading} scope="col" className="whitespace-nowrap px-5 py-4">{heading}</th>)}</tr></thead>
    <tbody className="divide-y divide-indigo-950/10">{children}</tbody>
  </table></div>;
}
