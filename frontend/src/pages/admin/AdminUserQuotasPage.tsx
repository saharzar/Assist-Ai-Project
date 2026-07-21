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
    else setMessage(quotaResult.reason instanceof Error ? quotaResult.reason.message : text.loadError);
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
    const response = window.prompt(
      text.responsePrompt,
      approve ? text.approvedPeriod : text.declined,
    );
    if (!response) return;
    await reviewQuotaRequest(request.id, {
      action: approve ? "approve" : "reject",
      approved_tts_characters: approve ? request.requested_tts_characters ?? 0 : 0,
      approved_stt_seconds: approve ? request.requested_stt_seconds ?? 0 : 0,
      permanent: false,
      admin_response: response,
    });
    setMessage(text.reviewedMessage);
    setHistoryPage(1);
    await load();
  };

  return (
    <section>
      <p className="text-sm font-bold uppercase text-teal-700">{text.dashboard}</p>
      <h1 className="mt-1 text-3xl font-bold">{text.title}</h1>
      <p className="mt-2 text-slate-600">{text.intro}</p>
      {message && <p className="mt-4 rounded-lg border bg-white p-4 font-semibold">{message}</p>}

      <section className="mt-8">
        <div className="flex items-end justify-between gap-4"><div><h2 className="text-2xl font-bold">{text.pendingTitle}</h2><p className="mt-1 text-sm text-slate-600">{text.pendingIntro}</p></div><span className="rounded-md bg-amber-100 px-3 py-1 text-sm font-bold text-amber-900">{pendingRequests.length} {text.pending.toLowerCase()}</span></div>
        <div className="mt-3 grid gap-3">
          {pendingRequests.length ? pendingRequests.map((request) => {
            const requestUser = usersById.get(request.user_id);
            return <article key={request.id} className="rounded-lg border bg-white p-4"><div className="flex flex-wrap justify-between gap-3"><div><strong>{requestUser?.full_name ?? `${text.user} #${request.user_id}`} · {request.service_type.toUpperCase()}</strong>{requestUser && <p className="text-xs text-slate-500">{requestUser.email}</p>}<p className="mt-2 text-sm text-slate-600">{request.reason}</p><p className="mt-1 text-xs">{text.requested}: {(request.requested_tts_characters ?? 0).toLocaleString(text.locale)} {text.characters} · {formatSttMinutes(request.requested_stt_seconds, text)}</p><p className="mt-1 text-xs text-slate-500">{text.submitted} {formatDate(request.created_at, text.locale)}</p></div><div className="flex gap-2"><button onClick={() => void review(request, true)} className="rounded-lg bg-teal-700 px-4 font-bold text-white">{text.approve}</button><button onClick={() => void review(request, false)} className="rounded-lg border border-rose-300 px-4 font-bold text-rose-700">{text.reject}</button></div></div></article>;
          }) : <p className="rounded-lg border border-dashed bg-white py-10 text-center font-semibold text-slate-500">{text.noPending}</p>}
        </div>
      </section>

      <div className="mt-6 flex flex-wrap gap-3">
        <input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder={text.search} className="min-h-11 min-w-64 flex-1 rounded-lg border px-3" />
        <select value={filter} onChange={(event) => { setFilter(event.target.value); setPage(1); }} className="min-h-11 rounded-lg border px-3">
          <option value="all">{text.allStatuses}</option><option value="warning">{text.warning}</option><option value="critical">{text.critical}</option><option value="exhausted">{text.exhausted}</option><option value="normal">{text.normal}</option>
        </select>
      </div>

      <div className="mt-5 overflow-x-auto rounded-lg border bg-white">
        <table className="w-full min-w-[980px] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-3">{text.user}</th><th>TTS</th><th>STT</th><th>{text.period}</th><th>{text.status}</th><th>{text.request}</th><th>{text.action}</th></tr></thead>
          <tbody>{visibleUsers.map((row) => <tr key={row.user_id} className="border-t align-top"><td className="p-3"><strong>{row.full_name}</strong><br /><span className="text-xs text-slate-500">{row.email}</span></td><td className="py-3"><strong>{(row.tts_limit + row.tts_extra).toLocaleString(text.locale)} {text.total}</strong><br /><small className="text-slate-600">{row.tts_limit.toLocaleString(text.locale)} {text.permanent}</small><br /><small className={row.tts_extra ? "font-semibold text-teal-700" : "text-slate-500"}>+ {row.tts_extra.toLocaleString(text.locale)} {text.temporary}</small><br /><small>{row.tts_remaining.toLocaleString(text.locale)} {text.remaining}</small></td><td className="py-3"><strong>{formatSttMinutes(row.stt_limit + row.stt_extra, text)} {text.total}</strong><br /><small className="text-slate-600">{formatSttMinutes(row.stt_limit, text)} {text.permanent}</small><br /><small className={row.stt_extra ? "font-semibold text-teal-700" : "text-slate-500"}>+ {formatSttMinutes(row.stt_extra, text)} {text.temporary}</small><br /><small>{formatSttMinutes(row.stt_remaining, text)} {text.remaining}</small></td><td className="py-3">{translateStatus(row.period_type, text)}<br /><small>{text.resets} {formatShortDate(row.reset_date, text.locale)}</small>{(row.tts_extra > 0 || row.stt_extra > 0) && <><br /><small className="font-semibold text-teal-700">{text.extrasExpire}</small></>}</td><td className="py-3"><span className="font-bold">{translateStatus(row.enabled ? row.status : "disabled", text)}</span></td><td className="py-3">{row.pending_request ? <span className="font-bold text-amber-700">{text.pending}</span> : "-"}</td><td className="py-3"><button onClick={() => setEditing(row)} className="rounded-md border px-3 py-2 font-bold">{text.edit}</button></td></tr>)}</tbody>
        </table>
      </div>
      <Pagination page={page} pages={userPages} onPage={setPage} text={text} />

      <section className="mt-10">
        <div><h2 className="text-2xl font-bold">{text.history}</h2><p className="mt-1 text-sm text-slate-600">{text.historyIntro}</p></div>
        <div className="mt-4 overflow-x-auto rounded-lg border bg-white">
          <table className="w-full min-w-[1050px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-3">{text.user}</th><th>{text.service}</th><th>{text.requested}</th><th>{text.reason}</th><th>{text.decision}</th><th>{text.approved}</th><th>{text.adminResponse}</th><th>{text.reviewed}</th></tr></thead>
            <tbody>{visibleHistory.map((request) => {
              const requestUser = usersById.get(request.user_id);
              return <tr key={request.id} className="border-t align-top"><td className="p-3"><strong>{requestUser?.full_name ?? `${text.user} #${request.user_id}`}</strong>{requestUser && <><br /><span className="text-xs text-slate-500">{requestUser.email}</span></>}</td><td className="p-3 font-bold uppercase">{request.service_type}</td><td className="p-3">{(request.requested_tts_characters ?? 0).toLocaleString(text.locale)} {text.chars}<br />{formatSttMinutes(request.requested_stt_seconds, text)}</td><td className="max-w-64 p-3 text-slate-600">{request.reason}</td><td className="p-3"><StatusBadge status={request.status} text={text} /></td><td className="p-3">{(request.approved_tts_characters ?? 0).toLocaleString(text.locale)} {text.chars}<br />{formatSttMinutes(request.approved_stt_seconds, text)}</td><td className="max-w-64 p-3 text-slate-600">{request.admin_response ?? "-"}</td><td className="whitespace-nowrap p-3">{formatDate(request.reviewed_at ?? request.created_at, text.locale)}</td></tr>;
            })}</tbody>
          </table>
          {!visibleHistory.length && <p className="py-10 text-center font-semibold text-slate-500">{text.noHistory}</p>}
        </div>
        <Pagination page={historyPage} pages={historyPages} onPage={setHistoryPage} text={text} />
      </section>

      {editing && <Edit quota={editing} text={text} close={() => setEditing(null)} saved={async () => { setEditing(null); await load(); }} />}
    </section>
  );
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
  return <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/50 p-5"><form onSubmit={submit} className="w-full max-w-xl rounded-lg bg-white p-6"><h2 className="text-2xl font-bold">{text.editTitle} {quota.full_name}</h2><div className="mt-4 grid gap-3 rounded-lg bg-slate-50 p-4 sm:grid-cols-2"><AllowanceSummary label={text.currentTts} permanent={quota.tts_limit} temporary={quota.tts_extra} unit={text.characters} resetDate={quota.reset_date} text={text} /><AllowanceSummary label={text.currentStt} permanent={quota.stt_limit / 60} temporary={quota.stt_extra / 60} unit={text.minutes} resetDate={quota.reset_date} text={text} /></div><div className="mt-4 grid gap-3 sm:grid-cols-2"><Num label={text.setTts} value={tts} set={setTts} /><Num label={text.setStt} value={sttMinutes} set={setSttMinutes} step={0.5} /><Num label={text.addTts} value={extraTts} set={setExtraTts} /><Num label={text.addStt} value={extraSttMinutes} set={setExtraSttMinutes} step={0.5} /></div><p className="mt-3 text-sm text-slate-600">{text.temporaryHelp.replace("{date}", formatShortDate(quota.reset_date, text.locale))}</p><label className="mt-3 block text-sm font-bold">{text.reason} <span className="font-normal text-slate-500">({text.optional})</span><textarea maxLength={500} value={reason} onChange={(event) => setReason(event.target.value)} className="mt-1 min-h-20 w-full rounded-lg border p-3" /></label><div className="mt-5 flex justify-end gap-2"><button type="button" onClick={close} className="rounded-lg border px-4 py-2 font-bold">{text.cancel}</button><button className="rounded-lg bg-teal-700 px-4 py-2 font-bold text-white">{text.save}</button></div></form></div>;
}

function AllowanceSummary({ label, permanent, temporary, unit, resetDate, text }: { label: string; permanent: number; temporary: number; unit: string; resetDate: string | null; text: AdminQuotaText }) {
  return <div><p className="text-xs font-bold uppercase text-slate-500">{label}</p><p className="mt-1 font-bold">{(permanent + temporary).toLocaleString(text.locale)} {unit} {text.total}</p><p className="text-xs text-slate-600">{permanent.toLocaleString(text.locale)} {text.permanent} + {temporary.toLocaleString(text.locale)} {text.temporary}</p>{temporary > 0 && <p className="mt-1 text-xs font-semibold text-teal-700">{text.temporaryExpires} {formatShortDate(resetDate, text.locale)}</p>}</div>;
}

function Num({ label, value, set, step = 1 }: { label: string; value: number; set: (value: number) => void; step?: number }) {
  return <label className="text-sm font-bold">{label}<input type="number" min={0} step={step} value={value} onChange={(event) => set(Number(event.target.value))} className="mt-1 min-h-11 w-full rounded-lg border px-3" /></label>;
}

function translateStatus(value: string, text: AdminQuotaText) {
  return text[value] ?? value.replace(/_/g, " ");
}
