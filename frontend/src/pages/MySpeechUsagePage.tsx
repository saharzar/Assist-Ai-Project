import { FormEvent, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import { useTranslation } from "../i18n";
import { speechUsageTranslations, type SpeechUsageText } from "../lib/speechUsageTranslations";
import { getMyQuota, getMyQuotaNotifications, getMyRequests, submitQuotaRequest, type QuotaNotification, type QuotaRequest, type UserQuota } from "../services/userQuotaService";

export function MySpeechUsagePage() {
  const { isAuthenticated, user } = useAuth();
  const { language } = useTranslation();
  const text = speechUsageTranslations[language];
  const [quota, setQuota] = useState<UserQuota | null>(null);
  const [requests, setRequests] = useState<QuotaRequest[]>([]);
  const [notifications, setNotifications] = useState<QuotaNotification[]>([]);
  const [service, setService] = useState("both");
  const [tts, setTts] = useState(1000);
  const [sttMinutes, setSttMinutes] = useState(1);
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!isAuthenticated || user?.role === "admin") return;
    Promise.all([getMyQuota(), getMyRequests(), getMyQuotaNotifications()])
      .then(([nextQuota, nextRequests, nextNotifications]) => { setQuota(nextQuota); setRequests(nextRequests); setNotifications(nextNotifications); })
      .catch(() => setMessage(text.loadError));
  }, [isAuthenticated, user, text.loadError]);

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user?.role === "admin") return <Navigate to="/admin/user-quotas" replace />;

  const submit = async (event: FormEvent) => {
    event.preventDefault(); setMessage("");
    try {
      await submitQuotaRequest({ service_type: service, requested_tts_characters: service !== "stt" ? tts : undefined, requested_stt_seconds: service !== "tts" ? sttMinutes * 60 : undefined, reason });
      setRequests(await getMyRequests()); setQuota(await getMyQuota()); setNotifications(await getMyQuotaNotifications()); setReason(""); setMessage(text.submitted);
    } catch (error) { setMessage(error instanceof Error ? error.message : text.requestFailed); }
  };

  return <section>
    <p className="text-sm font-bold uppercase text-teal-700">{text.eyebrow}</p><h1 className="mt-1 text-3xl font-bold">{text.title}</h1><p className="mt-2 text-slate-600">{text.intro}</p>
    {message && <p className="mt-5 rounded-lg border border-slate-200 bg-white p-4 font-semibold">{message}</p>}
    {quota && <><div className="mt-7 grid gap-5 lg:grid-cols-2"><Usage title={text.ttsTitle} used={quota.tts_used} permanent={quota.tts_limit} temporary={quota.tts_extra} remaining={quota.tts_remaining} resetDate={quota.reset_date} text={text} /><Usage title={text.sttTitle} used={quota.stt_used} permanent={quota.stt_limit} temporary={quota.stt_extra} remaining={quota.stt_remaining} resetDate={quota.reset_date} text={text} seconds /></div><p className="mt-4 text-sm font-semibold text-slate-500">{text.currentPeriod}: {translateValue(quota.period_type, text)} · {text.nextReset}: {formatDate(quota.reset_date, text.locale)} · {text.status}: <span>{translateValue(quota.status, text)}</span></p></>}
    {notifications.length > 0 && <section className="mt-7 rounded-lg border border-slate-200 bg-white p-5"><h2 className="text-xl font-bold">{text.notifications}</h2><div className="mt-3 divide-y divide-slate-100">{notifications.slice(0, 5).map((notification) => <article key={notification.id} className="py-3"><div className="flex flex-wrap items-start justify-between gap-2"><strong>{notification.title}</strong><time className="text-xs text-slate-500">{new Date(notification.created_at).toLocaleString(text.locale)}</time></div><p className="mt-1 text-sm leading-6 text-slate-700">{notification.message}</p></article>)}</div></section>}
    <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_1.2fr]"><form onSubmit={submit} className="rounded-lg border border-slate-200 bg-white p-5"><h2 className="text-xl font-bold">{text.requestTitle}</h2><label className="mt-4 block text-sm font-bold">{text.service}<select value={service} onChange={(event) => setService(event.target.value)} className="mt-1 min-h-11 w-full rounded-lg border px-3"><option value="both">{text.both}</option><option value="tts">TTS</option><option value="stt">STT</option></select></label>{service !== "stt" && <Field label={text.ttsCharacters} value={tts} set={setTts} />}{service !== "tts" && <Field label={text.sttMinutes} value={sttMinutes} set={setSttMinutes} />}<label className="mt-3 block text-sm font-bold">{text.reason}<textarea required minLength={10} maxLength={500} value={reason} onChange={(event) => setReason(event.target.value)} className="mt-1 min-h-24 w-full rounded-lg border p-3" /></label><button disabled={Boolean(quota?.pending_request)} className="mt-4 min-h-11 rounded-lg bg-slate-900 px-5 font-bold text-white disabled:opacity-40">{text.submit}</button></form>
      <section className="rounded-lg border border-slate-200 bg-white p-5"><h2 className="text-xl font-bold">{text.history}</h2><div className="mt-3 space-y-3">{requests.length ? requests.map((request) => <article key={request.id} className="border-b py-3 last:border-0"><div className="flex justify-between"><strong className="uppercase">{request.service_type}</strong><span className="font-bold text-teal-700">{translateValue(request.status === "partially_approved" ? "approved" : request.status, text)}</span></div><p className="mt-1 text-sm text-slate-600">{request.reason}</p>{request.admin_response && <p className="mt-2 text-sm font-semibold">{text.admin}: {request.admin_response}</p>}</article>) : <p className="py-8 text-center text-slate-500">{text.empty}</p>}</div></section></div>
  </section>;
}

function Usage({ title, used, permanent, temporary, remaining, resetDate, text, seconds = false }: { title: string; used: number; permanent: number; temporary: number; remaining: number; resetDate: string | null; text: SpeechUsageText; seconds?: boolean }) {
  const limit = permanent + temporary; const percentage = limit ? Math.min(100, Math.round((used / limit) * 100)) : 100;
  const format = (value: number) => seconds ? `${Math.floor(value / 60)}m ${value % 60}s` : value.toLocaleString(text.locale);
  return <article className="rounded-lg border border-slate-200 bg-white p-5"><div className="flex justify-between"><h2 className="text-lg font-bold">{title}</h2><strong>{percentage}%</strong></div><div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100"><div className={`h-full ${percentage >= 95 ? "bg-rose-600" : percentage >= 80 ? "bg-amber-500" : "bg-teal-500"}`} style={{ width: `${percentage}%` }} /></div><div className="mt-4 grid grid-cols-3 gap-3 text-sm"><span>{text.used}<br /><strong>{format(used)}</strong></span><span>{text.remaining}<br /><strong>{format(remaining)}</strong></span><span>{text.total}<br /><strong>{format(limit)}</strong></span></div><div className="mt-4 border-t border-slate-100 pt-3 text-sm"><p><span className="text-slate-500">{text.permanent}:</span> <strong>{format(permanent)}</strong></p><p className={temporary > 0 ? "mt-1 text-teal-800" : "mt-1 text-slate-500"}><span>{text.temporary}:</span> <strong>+{format(temporary)}</strong>{temporary > 0 && <> · {text.expires} {resetDate ? formatDate(resetDate, text.locale) : text.atReset}</>}</p></div></article>;
}

function Field({ label, value, set }: { label: string; value: number; set: (value: number) => void }) { return <label className="mt-3 block text-sm font-bold">{label}<input type="number" min={1} required value={value} onChange={(event) => set(Number(event.target.value))} className="mt-1 min-h-11 w-full rounded-lg border px-3" /></label>; }
function translateValue(value: string, text: SpeechUsageText) { return (text as unknown as Record<string, string>)[value] ?? value.replace(/_/g, " "); }
function formatDate(value: string | null, locale: string) { return value ? new Date(`${value}T00:00:00`).toLocaleDateString(locale) : "-"; }
