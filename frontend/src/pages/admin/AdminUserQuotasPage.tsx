import { FormEvent, useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";

import { useAuth } from "../../context/AuthContext";
import { useTranslation } from "../../i18n";
import { adminQuotaTranslations, type AdminQuotaText } from "../../lib/adminQuotaTranslations";
import {
  getAdminQuotas,
  getQuotaRequests,
  reviewQuotaRequest,
  updateUserQuota,
  type QuotaRequest,
  type UserQuota,
} from "../../services/userQuotaService";

const USER_PAGE_SIZE = 10;
const HISTORY_PAGE_SIZE = 8;

export function AdminUserQuotasPage() {
  const { isAuthenticated, user } = useAuth();
  const { language } = useTranslation();
  const text = adminQuotaTranslations[language];
  const [rows, setRows] = useState<UserQuota[]>([]);
  const [requests, setRequests] = useState<QuotaRequest[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [historyPage, setHistoryPage] = useState(1);
  const [editing, setEditing] = useState<UserQuota | null>(null);
  const [message, setMessage] = useState("");

  const load = async () => {
    const [quotaResult, requestResult] = await Promise.allSettled([getAdminQuotas(), getQuotaRequests()]);
    if (quotaResult.status === "fulfilled") setRows(quotaResult.value);
    else {
      console.error("Admin quota request failed", quotaResult.reason);
      setMessage(text.loadError);
    }
    if (requestResult.status === "fulfilled") setRequests(requestResult.value);
    else console.error("Optional quota request history could not be loaded", requestResult.reason);
  };

  useEffect(() => {
    if (isAuthenticated && user?.role === "admin") void load();
  }, [isAuthenticated, user, text.loadError]);

  const filtered = useMemo(
    () => rows.filter((row) =>
      (filter === "all" || row.status === filter)
      && `${row.full_name} ${row.email}`.toLowerCase().includes(search.toLowerCase()),
    ),
    [filter, rows, search],
  );
  const userPages = Math.max(1, Math.ceil(filtered.length / USER_PAGE_SIZE));
  const visibleUsers = filtered.slice((page - 1) * USER_PAGE_SIZE, page * USER_PAGE_SIZE);
  const pendingRequests = requests.filter((request) => request.status === "pending");
  const reviewedRequests = requests.filter((request) => request.status !== "pending");
  const historyPages = Math.max(1, Math.ceil(reviewedRequests.length / HISTORY_PAGE_SIZE));
  const visibleHistory = reviewedRequests.slice(
    (historyPage - 1) * HISTORY_PAGE_SIZE,
    historyPage * HISTORY_PAGE_SIZE,
  );
  const usersById = useMemo(() => new Map(rows.map((row) => [row.user_id, row])), [rows]);

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user?.role !== "admin") return <Navigate to="/scenarios" replace />;

  const review = async (request: QuotaRequest, approve: boolean) => {
    await reviewQuotaRequest(request.id, {
      action: approve ? "approve" : "reject",
      approved_tts_characters: approve ? request.requested_tts_characters ?? 0 : 0,
      approved_stt_seconds: approve ? request.requested_stt_seconds ?? 0 : 0,
      permanent: false,
      admin_response: approve ? text.approvedPeriod : text.declined,
    });
    setMessage(text.reviewedMessage);
    setHistoryPage(1);
    await load();
  };

  return (
    <section className="standard-page text-[#1d1a3d]">
      <div className="catalogue-style-heading">
        <h1 className="font-display text-3xl font-bold text-[#1d1a5e]">{text.title}</h1>
        <p className="mt-2 text-[15px] leading-6 text-[#5b5a78]">{text.intro}</p>
      </div>
      {message && <p className="mt-4 rounded-lg border bg-white p-4 font-semibold">{message}</p>}

      <HistorySummary requests={reviewedRequests} text={text} />

      <section className="mt-8">
        <div className="flex items-end justify-between gap-4"><div><h2 className="text-2xl font-bold text-[#1d1a5e]">{text.pendingTitle}</h2><p className="mt-1 text-sm text-slate-600">{text.pendingIntro}</p></div><span className="rounded-full bg-amber-50 px-4 py-1.5 text-sm font-bold text-amber-700">{pendingRequests.length} {text.pending.toLowerCase()}</span></div>
        <div className="mt-3 grid gap-3">
          {pendingRequests.length ? pendingRequests.map((request) => {
            const requestUser = usersById.get(request.user_id);
            return <article key={request.id} className="rounded-xl border border-amber-200 bg-white p-6 shadow-[0_0_0_4px_rgba(251,191,36,0.10)]"><div className="flex flex-wrap items-center justify-between gap-5"><div><div className="flex flex-wrap items-center gap-2"><strong className="text-lg text-[#1d1a5e]">{requestUser?.full_name ?? `${text.user} #${request.user_id}`}</strong><span className="rounded-md bg-cyan-50 px-2 py-0.5 text-xs font-bold text-[#3730a3]">{serviceTypeLabel(request.service_type, text)}</span></div>{requestUser && <p className="text-sm text-slate-400">{requestUser.email}</p>}<p className="mt-3 text-sm font-medium text-slate-700">“{request.reason}”</p><p className="mt-1 text-sm text-slate-600">{text.requested}: <strong>{(request.requested_tts_characters ?? 0).toLocaleString(text.locale)} {text.chars}</strong> · <strong>{formatSttMinutes(request.requested_stt_seconds, text)}</strong></p><p className="mt-1 text-xs text-slate-400">{text.submitted} {formatDate(request.created_at, text.locale)}</p></div><div className="flex gap-3"><button onClick={() => void review(request, true)} className="min-h-[48px] rounded-lg bg-teal-600 px-6 font-bold text-white hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-cyan-400">{text.approve}</button><button onClick={() => void review(request, false)} className="min-h-[48px] rounded-lg border border-rose-500 px-6 font-bold text-rose-700 hover:bg-rose-50 focus:outline-none focus:ring-2 focus:ring-rose-300">{text.reject}</button></div></div></article>;
          }) : <p className="rounded-lg border border-dashed bg-white py-10 text-center font-semibold text-slate-500">{text.noPending}</p>}
        </div>
      </section>

      <div className="mt-8 flex flex-wrap gap-3">
        <input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder={text.search} className="min-h-[52px] min-w-64 flex-1 rounded-xl border border-indigo-950/10 bg-white px-4 outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-200" />
        <select value={filter} onChange={(event) => { setFilter(event.target.value); setPage(1); }} className="min-h-[52px] rounded-xl border border-indigo-950/10 bg-white px-4 outline-none focus:border-cyan-400">
          <option value="all">{text.allStatuses}</option><option value="warning">{text.warning}</option><option value="critical">{text.critical}</option><option value="exhausted">{text.exhausted}</option><option value="normal">{text.normal}</option>
        </select>
      </div>

      <div className="mt-4 flex gap-5 text-sm text-slate-600"><span className="flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-full bg-[#3730a3]" />{text.permanent}</span><span className="flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-full bg-cyan-400" />{text.temporary}</span></div>
      <div className="mt-5 grid gap-5 lg:grid-cols-2">{visibleUsers.map((row) => <QuotaCard key={row.user_id} row={row} text={text} edit={() => setEditing(row)} />)}</div>
      {!visibleUsers.length && <p className="mt-5 rounded-xl border border-dashed border-indigo-950/10 bg-white py-12 text-center font-semibold text-slate-500">{text.loadError}</p>}
      <Pagination page={page} pages={userPages} onPage={setPage} text={text} />

      <section className="mt-10">
        <div><h2 className="text-2xl font-bold text-[#1d1a5e]">{text.history}</h2><p className="mt-1 text-sm text-slate-600">{text.historyIntro}</p></div>
        <div className="mt-4 grid gap-4 xl:grid-cols-2">
          {visibleHistory.map((request) => {
              const requestUser = usersById.get(request.user_id);
              return <HistoryItem key={request.id} request={request} name={requestUser?.full_name ?? `${text.user} #${request.user_id}`} email={requestUser?.email} text={text} />;
            })}
          {!visibleHistory.length && <p className="py-10 text-center font-semibold text-slate-500">{text.noHistory}</p>}
        </div>
        <Pagination page={historyPage} pages={historyPages} onPage={setHistoryPage} text={text} />
      </section>

      {editing && <Edit quota={editing} text={text} close={() => setEditing(null)} saved={async () => { setEditing(null); await load(); }} />}
    </section>
  );
}

function QuotaCard({ row, text, edit }: { row: UserQuota; text: AdminQuotaText; edit: () => void }) {
  const status = row.pending_request ? "pending" : row.enabled ? row.status : "disabled";
  const statusStyle = status === "pending"
    ? "bg-amber-50 text-amber-700"
    : status === "normal"
      ? "bg-cyan-50 text-teal-700"
      : "bg-rose-50 text-rose-700";

  return <article className="rounded-xl border border-indigo-950/10 bg-white p-6 transition-shadow hover:shadow-sm">
    <div className="flex items-start justify-between gap-4">
      <div><h2 className="text-lg font-bold text-[#1d1a5e]">{row.full_name}</h2><p className="text-sm text-slate-400">{row.email}</p></div>
      <span className={`rounded-full px-3 py-1 text-xs font-bold ${statusStyle}`}>{translateStatus(status, text)}</span>
    </div>
    <div className="mt-6 grid gap-5 sm:grid-cols-2">
      <QuotaRing label="TTS" total={row.tts_limit + row.tts_extra} permanent={row.tts_limit} temporary={row.tts_extra} remaining={row.tts_remaining} unit={text.chars} text={text} />
      <QuotaRing label="STT" total={(row.stt_limit + row.stt_extra) / 60} permanent={row.stt_limit / 60} temporary={row.stt_extra / 60} remaining={row.stt_remaining / 60} unit={text.min} text={text} />
    </div>
    <div className="mt-6 flex flex-wrap items-end justify-between gap-4 border-t border-indigo-950/10 pt-4">
      <div><p className="font-semibold text-[#1d1a3d]">{translateStatus(row.period_type, text)}</p><p className="text-sm text-slate-400">{row.tts_extra > 0 || row.stt_extra > 0 ? text.extrasExpire : text.resets} {formatShortDate(row.reset_date, text.locale)}</p></div>
      <button type="button" onClick={edit} className="min-h-[42px] rounded-lg border border-indigo-950/10 px-5 font-bold text-[#2a2586] hover:bg-[#f3f3fb] focus:outline-none focus:ring-2 focus:ring-cyan-400">{text.edit}</button>
    </div>
  </article>;
}

function QuotaRing({ label, total, permanent, temporary, remaining, unit, text }: { label: string; total: number; permanent: number; temporary: number; remaining: number; unit: string; text: AdminQuotaText }) {
  const temporaryShare = total > 0 ? Math.min(100, Math.max(0, temporary / total * 100)) : 0;
  const ring = `conic-gradient(#2dd8d8 0 ${temporaryShare}%, #3730a3 ${temporaryShare}% 100%)`;
  const format = (value: number) => Number(value.toFixed(2)).toLocaleString(text.locale);
  return <div className="flex items-center gap-4">
    <div className="relative h-[76px] w-[76px] shrink-0 rounded-full" style={{ background: ring }} aria-label={`${label}: ${format(permanent)} ${text.permanent}, ${format(temporary)} ${text.temporary}`} role="img"><span className="absolute inset-[9px] rounded-full bg-white" /></div>
    <div className="min-w-0"><p className="text-xs font-bold uppercase tracking-wider text-slate-400">{label}</p><p className="text-xl font-extrabold text-[#1d1a5e]">{format(total)} <span className="text-xs font-semibold text-slate-400">{unit}</span></p><p className="text-xs text-slate-500">{format(permanent)} {text.permanent}</p>{temporary > 0 && <p className="text-xs font-semibold text-teal-600">+ {format(temporary)} {text.temporary}</p>}<p className="mt-1 text-xs text-slate-400">{format(remaining)} {text.remaining}</p></div>
  </div>;
}

function HistoryItem({ request, name, email, text }: { request: QuotaRequest; name: string; email?: string; text: AdminQuotaText }) {
  const approved = request.status === "approved" || request.status === "partially_approved";
  const requestedTts = request.requested_tts_characters ?? 0;
  const approvedTts = request.approved_tts_characters ?? 0;
  return <article className={`overflow-hidden rounded-lg border bg-white shadow-[0_8px_22px_rgba(29,26,94,0.04)] ${approved ? "border-emerald-200" : "border-rose-200"}`}>
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-indigo-950/10 px-5 py-4">
      <div className="flex items-center gap-3"><span className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-extrabold ${approved ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>{initials(name)}</span><div><div className="flex flex-wrap items-center gap-2"><strong className="text-[#1d1a5e]">{name}</strong><span className="rounded-md bg-cyan-50 px-2 py-0.5 text-xs font-bold text-[#3730a3]">{serviceTypeLabel(request.service_type, text)}</span></div>{email && <p className="text-xs text-slate-400">{email}</p>}</div></div>
      <div className="text-right"><StatusBadge status={request.status} text={text} /><time className="mt-2 block text-xs text-slate-400">{formatDate(request.reviewed_at ?? request.created_at, text.locale)}</time></div>
    </div>
    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 px-5 py-4 text-sm">
      <p><span className="mr-2 text-xs font-bold text-slate-400">TTS</span><strong className="text-lg text-[#1d1a5e]">{(approved ? approvedTts : requestedTts).toLocaleString(text.locale)}</strong><span className="ml-1 text-xs text-slate-400">{text.chars}</span></p><p><span className="mr-2 text-xs font-bold text-slate-400">STT</span><strong className="text-lg text-[#1d1a5e]">{formatSttMinutes(approved ? request.approved_stt_seconds : request.requested_stt_seconds, text)}</strong></p>
    </div>
    <div className="border-t border-indigo-950/10 bg-[#fafbff] px-5 py-4">
      <p className="text-xs font-bold uppercase tracking-wider text-slate-400">{text.reason}</p>
      <blockquote className="mt-2 line-clamp-2 border-l-4 border-cyan-400 pl-3 text-sm font-medium italic leading-6 text-slate-700" title={request.reason || undefined}>
        {request.reason ? `“${request.reason}”` : "-"}
      </blockquote>
    </div>
  </article>;
}

function HistorySummary({ requests, text }: { requests: QuotaRequest[]; text: AdminQuotaText }) {
  const now = new Date();
  const monthlyRequests = requests.filter((request) => {
    const reviewedAt = new Date(request.reviewed_at ?? request.created_at);
    return reviewedAt.getFullYear() === now.getFullYear() && reviewedAt.getMonth() === now.getMonth();
  });
  const approved = monthlyRequests.filter((request) => request.status === "approved" || request.status === "partially_approved").length;
  const rejected = monthlyRequests.filter((request) => request.status === "rejected").length;
  const grantedCharacters = monthlyRequests.reduce((sum, request) => sum + (request.approved_tts_characters ?? 0), 0);
  const grantedMinutes = monthlyRequests.reduce((sum, request) => sum + (request.approved_stt_seconds ?? 0), 0) / 60;
  const total = monthlyRequests.length;
  const approvalPercent = total ? approved / total * 100 : 0;
  const ring = total
    ? `conic-gradient(#2dd8d8 0 ${approvalPercent}%, #f3f3fb ${approvalPercent}% 100%)`
    : "#f3f3fb";
  const stats = [
    { label: text.reviewed, value: total.toLocaleString(text.locale) },
    { label: text.approved, value: approved.toLocaleString(text.locale), color: "text-teal-600" },
    { label: text.rejected, value: rejected.toLocaleString(text.locale), color: "text-rose-600" },
    { label: `TTS · ${text.chars}`, value: grantedCharacters.toLocaleString(text.locale) },
    { label: `STT · ${text.min}`, value: Number(grantedMinutes.toFixed(2)).toLocaleString(text.locale) },
  ];

  return <section className="mt-5 grid gap-4 rounded-xl border border-indigo-950/10 bg-white p-5 lg:grid-cols-[250px_minmax(0,1fr)]">
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-indigo-950/10 pb-4 lg:col-span-2"><div><p className="text-sm font-bold text-[#1d1a5e]">{monthlySummaryTitle(text.locale)}</p><p className="mt-1 text-xs text-slate-400">{monthlyResetNote(text.locale)}</p></div><span className="rounded-full bg-cyan-50 px-3 py-1 text-xs font-bold text-teal-700">{now.toLocaleDateString(text.locale, { month: "long", year: "numeric" })}</span></div>
    <div className="flex items-center justify-center gap-4 lg:border-r lg:border-indigo-950/10 lg:pr-5">
      <div className="relative h-20 w-20 shrink-0 rounded-full" style={{ background: ring }} role="img" aria-label={`${text.approved}: ${approvalPercent.toFixed(0)}%`}><span className="absolute inset-2.5 flex items-center justify-center rounded-full bg-white text-sm font-extrabold text-[#1d1a5e]">{approvalPercent.toFixed(0)}%</span></div>
      <div className="min-w-0"><p className="whitespace-nowrap text-xs font-bold uppercase tracking-wider text-slate-400">{text.decision}</p><p className="mt-1 whitespace-nowrap text-sm font-semibold text-[#1d1a5e]">{text.approved}</p></div>
    </div>
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-5">{stats.map((stat) => <div key={stat.label} className="rounded-lg bg-[#fafbff] p-4"><p className="text-xs font-bold uppercase tracking-wider text-slate-400">{stat.label}</p><p className={`mt-2 text-2xl font-extrabold ${stat.color ?? "text-[#1d1a5e]"}`}>{stat.value}</p></div>)}</div>
  </section>;
}

function StatusBadge({ status, text }: { status: string; text: AdminQuotaText }) {
  const normalizedStatus = status === "partially_approved" ? "approved" : status;
  const style = normalizedStatus === "approved" ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800";
  return <span className={`inline-flex rounded-md px-2 py-1 text-xs font-bold ${style}`}>{translateStatus(normalizedStatus, text)}</span>;
}

function Pagination({ page, pages, onPage, text }: { page: number; pages: number; onPage: (page: number) => void; text: AdminQuotaText }) {
  return <div className="mt-4 flex items-center justify-between"><span className="text-sm text-slate-500">{text.page} {page} / {pages}</span><div className="flex gap-2"><button disabled={page === 1} onClick={() => onPage(page - 1)} className="rounded-md border px-3 py-2 disabled:opacity-40">{text.previous}</button><button disabled={page === pages} onClick={() => onPage(page + 1)} className="rounded-md border px-3 py-2 disabled:opacity-40">{text.next}</button></div></div>;
}

function formatDate(value: string, locale: string) {
  return new Date(value).toLocaleString(locale);
}

function formatShortDate(value: string | null, locale: string) {
  if (!value) return "-";
  return new Date(`${value}T00:00:00`).toLocaleDateString(locale);
}

function formatSttMinutes(seconds: number | null, text: AdminQuotaText) {
  const minutes = (seconds ?? 0) / 60;
  return `${Number(minutes.toFixed(2)).toLocaleString(text.locale)} ${text.min}`;
}

function Edit({ quota, text, close, saved }: { quota: UserQuota; text: AdminQuotaText; close: () => void; saved: () => Promise<void> }) {
  const [tts, setTts] = useState(quota.tts_limit);
  const [sttMinutes, setSttMinutes] = useState(quota.stt_limit / 60);
  const [extraTts, setExtraTts] = useState(0);
  const [extraSttMinutes, setExtraSttMinutes] = useState(0);
  const [reason, setReason] = useState("");
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    await updateUserQuota(quota.user_id, { tts_limit_characters: tts, stt_limit_seconds: Math.round(sttMinutes * 60), add_tts_characters: extraTts, add_stt_seconds: Math.round(extraSttMinutes * 60), enabled: quota.enabled, reason: reason.trim() || undefined });
    await saved();
  };
  return <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/55 p-3 backdrop-blur-sm sm:p-6">
    <form onSubmit={submit} role="dialog" aria-modal="true" aria-labelledby="quota-editor-title" className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-lg border border-indigo-950/10 bg-white shadow-[0_28px_80px_rgba(29,26,94,0.28)]">
      <header className="flex items-center gap-4 border-b border-indigo-950/10 bg-[#f8f8ff] px-6 py-5 sm:px-8">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#2a2586] font-extrabold text-white ring-4 ring-cyan-100">{initials(quota.full_name)}</span>
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-wider text-teal-700">{text.editTitle}</p>
          <h2 id="quota-editor-title" className="truncate font-display text-2xl font-bold text-[#1d1a5e]">{quota.full_name}</h2>
          <p className="truncate text-sm text-slate-500">{quota.email}</p>
        </div>
      </header>

      <div className="overflow-y-auto px-6 py-6 sm:px-8">
        <section className="grid gap-5 border-b border-indigo-950/10 pb-6 sm:grid-cols-2 sm:divide-x sm:divide-indigo-950/10">
          <AllowanceSummary label={text.currentTts} permanent={quota.tts_limit} temporary={quota.tts_extra} unit={text.characters} resetDate={quota.reset_date} text={text} />
          <AllowanceSummary label={text.currentStt} permanent={quota.stt_limit / 60} temporary={quota.stt_extra / 60} unit={text.minutes} resetDate={quota.reset_date} text={text} />
        </section>

        <section className="mt-6 grid gap-5 sm:grid-cols-2">
          <Num label={text.setTts} value={tts} set={setTts} />
          <Num label={text.setStt} value={sttMinutes} set={setSttMinutes} step={0.5} />
          <Num label={text.addTts} value={extraTts} set={setExtraTts} temporary />
          <Num label={text.addStt} value={extraSttMinutes} set={setExtraSttMinutes} step={0.5} temporary />
        </section>

        <p className="mt-5 border-l-4 border-cyan-400 bg-cyan-50/60 px-4 py-3 text-sm leading-6 text-slate-600">{text.temporaryHelp.replace("{date}", formatShortDate(quota.reset_date, text.locale))}</p>

        <label className="mt-6 block text-sm font-bold text-[#1d1a5e]">{text.reason} <span className="font-normal text-slate-400">({text.optional})</span>
          <textarea maxLength={500} value={reason} onChange={(event) => setReason(event.target.value)} className="mt-2 min-h-24 w-full resize-y rounded-lg border border-indigo-950/15 bg-white p-4 font-normal text-slate-700 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-200" />
        </label>
      </div>

      <footer className="flex flex-col-reverse gap-3 border-t border-indigo-950/10 bg-[#fafbff] px-6 py-5 sm:flex-row sm:justify-end sm:px-8">
        <button type="button" onClick={close} className="min-h-[50px] rounded-lg border border-indigo-950/15 bg-white px-6 font-bold text-[#2a2586] transition hover:bg-[#f3f3fb] focus:outline-none focus:ring-2 focus:ring-cyan-300">{text.cancel}</button>
        <button className="min-h-[50px] rounded-lg bg-[#2a2586] px-7 font-bold text-white shadow-[0_10px_24px_-10px_rgba(42,37,134,0.6)] transition hover:bg-[#1d1a5e] focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2">{text.save}</button>
      </footer>
    </form>
  </div>;
}

function AllowanceSummary({ label, permanent, temporary, unit, resetDate, text }: { label: string; permanent: number; temporary: number; unit: string; resetDate: string | null; text: AdminQuotaText }) {
  return <div className="sm:px-5 sm:first:pl-0"><p className="text-xs font-bold uppercase tracking-wider text-slate-400">{label}</p><p className="mt-2 text-2xl font-extrabold text-[#1d1a5e]">{(permanent + temporary).toLocaleString(text.locale)} <span className="text-sm font-bold text-slate-500">{unit} {text.total}</span></p><p className="mt-1 text-sm text-slate-600"><strong>{permanent.toLocaleString(text.locale)}</strong> {text.permanent} <span className="mx-1 text-slate-300">+</span> <strong className="text-teal-700">{temporary.toLocaleString(text.locale)}</strong> {text.temporary}</p>{temporary > 0 && <p className="mt-2 text-xs font-semibold text-teal-700">{text.temporaryExpires} {formatShortDate(resetDate, text.locale)}</p>}</div>;
}

function Num({ label, value, set, step = 1, temporary = false }: { label: string; value: number; set: (value: number) => void; step?: number; temporary?: boolean }) {
  return <label className="text-sm font-bold text-[#1d1a5e]">{label}<input type="number" min={0} step={step} value={value} onChange={(event) => set(Number(event.target.value))} className={`mt-2 min-h-[54px] w-full rounded-lg border px-4 text-base font-semibold outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-200 ${temporary ? "border-cyan-200 bg-cyan-50/40" : "border-indigo-950/15 bg-white"}`} /></label>;
}

function translateStatus(value: string, text: AdminQuotaText) {
  return text[value] ?? value.replace(/_/g, " ");
}

function serviceTypeLabel(serviceType: QuotaRequest["service_type"], text: AdminQuotaText) {
  if (serviceType === "both") return `${text.tts} + ${text.stt}`;
  return serviceType === "tts" ? text.tts : text.stt;
}

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "U";
}

function monthlySummaryTitle(locale: string) {
  if (locale.startsWith("es")) return "Resumen mensual";
  if (locale.startsWith("de")) return "Monatliche Übersicht";
  if (locale.startsWith("tr")) return "Aylık özet";
  if (locale.startsWith("pt")) return "Resumo mensal";
  if (locale.startsWith("fr")) return "Résumé mensuel";
  return "Monthly summary";
}

function monthlyResetNote(locale: string) {
  if (locale.startsWith("es")) return "Estas estadísticas se reinician al comienzo de cada mes.";
  if (locale.startsWith("de")) return "Diese Statistiken werden zu Beginn jedes Monats zurückgesetzt.";
  if (locale.startsWith("tr")) return "Bu istatistikler her ayın başında sıfırlanır.";
  if (locale.startsWith("pt")) return "Estas estatísticas são reiniciadas no início de cada mês.";
  if (locale.startsWith("fr")) return "Ces statistiques sont réinitialisées au début de chaque mois.";
  return "These statistics restart at the beginning of each month.";
}
