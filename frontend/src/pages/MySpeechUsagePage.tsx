import { FormEvent, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import { useTranslation } from "../i18n";
import { speechUsageTranslations, type SpeechUsageText } from "../lib/speechUsageTranslations";
import {
  getMyQuota,
  getMyRequests,
  submitQuotaRequest,
  type QuotaRequest,
  type UserQuota,
} from "../services/userQuotaService";

export function MySpeechUsagePage() {
  const { isAuthenticated, user } = useAuth();
  const { language } = useTranslation();
  const text = speechUsageTranslations[language];
  const [quota, setQuota] = useState<UserQuota | null>(null);
  const [requests, setRequests] = useState<QuotaRequest[]>([]);
  const [service, setService] = useState("both");
  const [tts, setTts] = useState(1000);
  const [sttMinutes, setSttMinutes] = useState(1);
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!isAuthenticated || user?.role === "admin") return;
    Promise.all([getMyQuota(), getMyRequests()])
      .then(([nextQuota, nextRequests]) => {
        setQuota(nextQuota);
        setRequests(nextRequests);
      })
      .catch(() => setMessage(text.loadError));
  }, [isAuthenticated, user, text.loadError]);

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user?.role === "admin") return <Navigate to="/admin/user-quotas" replace />;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setMessage("");
    try {
      await submitQuotaRequest({
        service_type: service,
        requested_tts_characters: service !== "stt" ? tts : undefined,
        requested_stt_seconds: service !== "tts" ? sttMinutes * 60 : undefined,
        reason,
      });
      setRequests(await getMyRequests());
      setQuota(await getMyQuota());
      setReason("");
      setMessage(text.submitted);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : text.requestFailed);
    }
  };

  const approved = requests.filter((request) => request.status === "approved" || request.status === "partially_approved").length;
  const pending = requests.filter((request) => request.status === "pending").length;

  return (
    <section className="speech-usage-page relative isolate flex w-full flex-1 flex-col overflow-hidden">
      <div className="speech-usage-grid pointer-events-none absolute inset-0 -z-10" aria-hidden="true" />
      <div className="mx-auto max-w-7xl px-5 pb-14 pt-9">
      <header className="border-b border-[#deddeb] pb-8">
        <span className="mb-4 flex h-1.5 w-24 overflow-hidden rounded-full" aria-hidden="true"><i className="w-2/3 bg-[#3730a3]" /><i className="w-1/3 bg-[#2dd8d8]" /></span>
        <h1 className="font-display text-3xl font-bold text-[#1d1a5e]">{text.title}</h1>
        <p className="mt-2 max-w-2xl text-[15px] leading-6 text-[#5b5a78]">{text.intro}</p>
      </header>

      {message && <p className="mt-5 rounded-lg border border-cyan-200 bg-cyan-50 p-4 font-semibold text-[#1d1a5e]">{message}</p>}

      {quota && (
        <>
          <div className="mt-8 grid gap-5 lg:grid-cols-2">
            <Usage title={text.ttsTitle} used={quota.tts_used} permanent={quota.tts_limit} temporary={quota.tts_extra} remaining={quota.tts_remaining} resetDate={quota.reset_date} text={text} accent="indigo" />
            <Usage title={text.sttTitle} used={quota.stt_used} permanent={quota.stt_limit} temporary={quota.stt_extra} remaining={quota.stt_remaining} resetDate={quota.reset_date} text={text} seconds accent="cyan" />
          </div>

          <div className="mt-5 grid gap-px overflow-hidden rounded-lg border border-[#deddeb] bg-[#deddeb] sm:grid-cols-2 lg:grid-cols-4">
            <Stat label={text.currentPeriod} value={translateValue(quota.period_type, text)} />
            <Stat label={text.nextReset} value={formatDate(quota.reset_date, text.locale)} />
            <Stat label={text.status} value={translateValue(quota.status, text)} tone={quota.status} />
            <Stat label={text.history} value={`${approved} ${text.approved} · ${pending} ${text.pending}`} />
          </div>
        </>
      )}

      <form onSubmit={submit} className="relative mt-10 overflow-hidden rounded-lg border border-cyan-200 bg-white shadow-[0_16px_40px_rgba(29,26,94,0.07)]">
        <span className="absolute inset-y-0 left-0 w-1.5 bg-cyan-400" aria-hidden="true" />
        <div className="grid gap-7 p-6 pl-8 xl:grid-cols-[0.65fr_1.35fr] xl:p-8 xl:pl-10">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[#3730a3]">{text.eyebrow}</p>
            <h2 className="mt-2 font-display text-2xl font-bold text-[#1d1a5e]">{text.requestTitle}</h2>
            <p className="mt-2 max-w-md leading-6 text-slate-600">{text.intro}</p>
            <div className="mt-5 grid grid-cols-3 gap-2 rounded-lg bg-[#f3f2fb] p-1.5" role="group" aria-label={text.service}>
              {(["both", "tts", "stt"] as const).map((option) => (
                <button key={option} type="button" onClick={() => setService(option)} aria-pressed={service === option} className={`min-h-11 rounded-md px-3 text-sm font-bold transition ${service === option ? "bg-[#302992] text-white shadow-sm" : "text-slate-600 hover:bg-white"}`}>{option === "both" ? text.both : option.toUpperCase()}</button>
              ))}
            </div>
            {quota?.pending_request && <p className="mt-4 rounded-lg bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">{text.pending}</p>}
          </div>

          <div className="grid content-start gap-4 sm:grid-cols-2">
            {service !== "stt" && <Field label={text.ttsCharacters} value={tts} set={setTts} />}
            {service !== "tts" && <Field label={text.sttMinutes} value={sttMinutes} set={setSttMinutes} />}
            <label className="block text-sm font-bold text-[#1d1a5e] sm:col-span-2">{text.reason}
              <textarea required minLength={10} maxLength={500} value={reason} onChange={(event) => setReason(event.target.value)} className="mt-2 min-h-24 w-full resize-y rounded-lg border border-[#d9d8e6] bg-[#fafbff] p-3 font-normal focus:border-cyan-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-cyan-100" />
            </label>
            <div className="flex justify-end sm:col-span-2">
              <button disabled={Boolean(quota?.pending_request)} className="min-h-12 w-full rounded-lg bg-[#302992] px-7 font-bold text-white shadow-[0_8px_18px_rgba(48,41,146,0.2)] transition hover:bg-[#211c72] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400 disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto">{text.submit}</button>
            </div>
          </div>
        </div>
      </form>

      <section className="mt-10">
          <div className="flex items-center justify-between border-b border-[#deddeb] pb-3">
            <h2 className="font-display text-2xl font-bold text-[#1d1a5e]">{text.history}</h2>
            <span className="text-sm font-semibold text-slate-500">{requests.length}</span>
          </div>
          <div className="mt-4 space-y-3">
            {requests.length ? requests.map((request) => <RequestItem key={request.id} request={request} text={text} />) : <p className="rounded-lg border border-dashed border-[#cbc9df] bg-white py-12 text-center text-slate-500">{text.empty}</p>}
          </div>
      </section>
      </div>
    </section>
  );
}

function Usage({ title, used, permanent, temporary, remaining, resetDate, text, seconds = false, accent }: { title: string; used: number; permanent: number; temporary: number; remaining: number; resetDate: string | null; text: SpeechUsageText; seconds?: boolean; accent: "indigo" | "cyan" }) {
  const limit = permanent + temporary;
  const percentage = limit ? Math.min(100, Math.round((used / limit) * 100)) : 100;
  const format = (value: number) => seconds ? formatMinutes(value, text.locale) : value.toLocaleString(text.locale);
  const ringColor = percentage >= 95 ? "#e11d48" : percentage >= 80 ? "#f59e0b" : accent === "cyan" ? "#2bcbd0" : "#3932a8";
  return (
    <article className="grid gap-6 rounded-lg border border-[#deddeb] bg-white p-6 shadow-[0_14px_35px_rgba(29,26,94,0.05)] sm:grid-cols-[150px_1fr] sm:items-center">
      <div className="relative mx-auto grid h-36 w-36 place-items-center rounded-full" style={{ background: `conic-gradient(${ringColor} ${percentage}%, #eeedf7 ${percentage}% 100%)` }}>
        <div className="grid h-28 w-28 place-items-center rounded-full bg-white text-center"><div><strong className="block font-display text-3xl font-bold text-[#1d1a5e]">{percentage}%</strong><span className="text-xs font-bold uppercase text-slate-400">{text.used}</span></div></div>
      </div>
      <div>
        <div className="flex flex-wrap items-start justify-between gap-2"><div><p className="font-display text-sm font-bold uppercase text-[#3730a3]">{title}</p><p className="mt-1 font-display text-3xl font-bold text-[#1d1a5e]">{format(remaining)}</p><p className="text-sm text-slate-500">{text.remaining}</p></div><span className="rounded-full border border-cyan-200 bg-cyan-50/70 px-3 py-1 text-xs font-bold text-[#302992]">{format(limit)} {text.total.toLowerCase()}</span></div>
        <div className="mt-5 grid grid-cols-2 gap-3 border-t border-[#ecebf3] pt-4 text-sm"><p><span className="block text-slate-400">{text.used}</span><strong className="text-[#1d1a5e]">{format(used)}</strong></p><p><span className="block text-slate-400">{text.permanent}</span><strong className="text-[#1d1a5e]">{format(permanent)}</strong></p></div>
        {temporary > 0 && <p className="mt-3 rounded-lg border border-cyan-200 bg-[#f4f3ff] px-3 py-2 text-sm font-semibold text-[#302992]">+{format(temporary)} {text.temporary.toLowerCase()} · {text.expires} {resetDate ? formatDate(resetDate, text.locale) : text.atReset}</p>}
      </div>
    </article>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  const toneClass = tone === "critical" ? "text-rose-600" : tone === "warning" ? "text-amber-600" : "text-[#1d1a5e]";
  return <div className="bg-white p-5"><span className="text-xs font-bold uppercase text-slate-400">{label}</span><strong className={`mt-1 block font-display text-lg font-bold ${toneClass}`}>{value}</strong></div>;
}

function RequestItem({ request, text }: { request: QuotaRequest; text: SpeechUsageText }) {
  const status = request.status === "partially_approved" ? "approved" : request.status;
  const statusClass = status === "approved" ? "border border-cyan-200 bg-cyan-50 text-[#302992]" : status === "rejected" ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-800";
  const ttsValue = request.approved_tts_characters ?? request.requested_tts_characters ?? 0;
  const sttValue = request.approved_stt_seconds ?? request.requested_stt_seconds ?? 0;
  return (
    <article className="rounded-lg border border-[#deddeb] bg-white px-5 py-4 transition hover:border-cyan-300">
      <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-3"><span className="rounded-full bg-[#f0effa] px-3 py-1 text-xs font-extrabold uppercase text-[#302992]">{request.service_type === "both" ? text.both : request.service_type.toUpperCase()}</span><time className="text-xs text-slate-400">{formatDayMonthYear(request.created_at)}</time></div><span className={`rounded-full px-3 py-1 text-xs font-bold ${statusClass}`}>{translateValue(status, text)}</span></div>
      <div className="mt-4 flex flex-wrap gap-x-7 gap-y-2 text-sm"><p><span className="text-slate-400">TTS</span> <strong className="ml-1 text-[#1d1a5e]">{ttsValue.toLocaleString(text.locale)}</strong></p><p><span className="text-slate-400">STT</span> <strong className="ml-1 text-[#1d1a5e]">{formatMinutes(sttValue, text.locale)}</strong></p></div>
      <p className="mt-3 border-l-2 border-cyan-300 pl-3 text-sm italic leading-6 text-slate-600">{request.reason}</p>
    </article>
  );
}

function Field({ label, value, set }: { label: string; value: number; set: (value: number) => void }) {
  return <label className="mt-4 block text-sm font-bold text-[#1d1a5e]">{label}<input type="number" min={1} required value={value} onChange={(event) => set(Number(event.target.value))} className="mt-2 min-h-12 w-full rounded-lg border border-[#d9d8e6] px-3 focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-100" /></label>;
}

function translateValue(value: string, text: SpeechUsageText) { return (text as unknown as Record<string, string>)[value] ?? value.replace(/_/g, " "); }
function formatDate(value: string | null, _locale: string) { return value ? formatDayMonthYear(`${value}T00:00:00`) : "-"; }
function formatDayMonthYear(value: string) {
  const date = new Date(value);
  return `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}/${date.getFullYear()}`;
}
function formatMinutes(seconds: number, locale: string) { return `${(seconds / 60).toLocaleString(locale, { maximumFractionDigits: 1 })} min`; }
