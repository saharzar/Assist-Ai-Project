import { FormEvent, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import {
  getMyQuota,
  getMyQuotaNotifications,
  getMyRequests,
  submitQuotaRequest,
  type QuotaNotification,
  type QuotaRequest,
  type UserQuota,
} from "../services/userQuotaService";

export function MySpeechUsagePage() {
  const { isAuthenticated, user } = useAuth();
  const [quota, setQuota] = useState<UserQuota | null>(null);
  const [requests, setRequests] = useState<QuotaRequest[]>([]);
  const [notifications, setNotifications] = useState<QuotaNotification[]>([]);
  const [service, setService] = useState("both");
  const [tts, setTts] = useState(1000);
  const [stt, setStt] = useState(60);
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!isAuthenticated || user?.role === "admin") return;
    Promise.all([getMyQuota(), getMyRequests(), getMyQuotaNotifications()])
      .then(([nextQuota, nextRequests, nextNotifications]) => {
        setQuota(nextQuota);
        setRequests(nextRequests);
        setNotifications(nextNotifications);
      })
      .catch(() => setMessage("Speech usage could not be loaded."));
  }, [isAuthenticated, user]);

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user?.role === "admin") return <Navigate to="/admin/user-quotas" replace />;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setMessage("");
    try {
      await submitQuotaRequest({
        service_type: service,
        requested_tts_characters: service !== "stt" ? tts : undefined,
        requested_stt_seconds: service !== "tts" ? stt : undefined,
        reason,
      });
      setRequests(await getMyRequests());
      setQuota(await getMyQuota());
      setNotifications(await getMyQuotaNotifications());
      setReason("");
      setMessage("Your request was submitted.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Request failed.");
    }
  };

  return (
    <section>
      <p className="text-sm font-bold uppercase text-teal-700">Personal allowance</p>
      <h1 className="mt-1 text-3xl font-bold">My Speech Usage</h1>
      <p className="mt-2 text-slate-600">Review your current allowance and request additional access when needed.</p>
      {message && <p className="mt-5 rounded-lg border border-slate-200 bg-white p-4 font-semibold">{message}</p>}

      {quota && (
        <>
          <div className="mt-7 grid gap-5 lg:grid-cols-2">
            <Usage title="TTS characters" used={quota.tts_used} limit={quota.tts_limit + quota.tts_extra} remaining={quota.tts_remaining} />
            <Usage title="STT speech time" used={quota.stt_used} limit={quota.stt_limit + quota.stt_extra} remaining={quota.stt_remaining} seconds />
          </div>
          <p className="mt-4 text-sm font-semibold text-slate-500">
            Current period: {quota.period_type} · Next reset: {quota.reset_date ?? "-"} · Status: <span className="capitalize">{quota.status}</span>
          </p>
        </>
      )}

      {notifications.length > 0 && (
        <section className="mt-7 rounded-lg border border-slate-200 bg-white p-5">
          <h2 className="text-xl font-bold">Quota notifications</h2>
          <div className="mt-3 divide-y divide-slate-100">
            {notifications.slice(0, 5).map((notification) => (
              <article key={notification.id} className="py-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <strong>{notification.title}</strong>
                  <time className="text-xs text-slate-500">{new Date(notification.created_at).toLocaleString()}</time>
                </div>
                <p className="mt-1 text-sm leading-6 text-slate-700">{notification.message}</p>
              </article>
            ))}
          </div>
        </section>
      )}

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <form onSubmit={submit} className="rounded-lg border border-slate-200 bg-white p-5">
          <h2 className="text-xl font-bold">Request additional quota</h2>
          <label className="mt-4 block text-sm font-bold">Service
            <select value={service} onChange={(event) => setService(event.target.value)} className="mt-1 min-h-11 w-full rounded-lg border px-3">
              <option value="both">TTS and STT</option><option value="tts">TTS</option><option value="stt">STT</option>
            </select>
          </label>
          {service !== "stt" && <Field label="TTS characters" value={tts} set={setTts} />}
          {service !== "tts" && <Field label="STT seconds" value={stt} set={setStt} />}
          <label className="mt-3 block text-sm font-bold">Reason
            <textarea required minLength={10} maxLength={500} value={reason} onChange={(event) => setReason(event.target.value)} className="mt-1 min-h-24 w-full rounded-lg border p-3" />
          </label>
          <button disabled={Boolean(quota?.pending_request)} className="mt-4 min-h-11 rounded-lg bg-slate-900 px-5 font-bold text-white disabled:opacity-40">Submit request</button>
        </form>
        <section className="rounded-lg border border-slate-200 bg-white p-5">
          <h2 className="text-xl font-bold">Request history</h2>
          <div className="mt-3 space-y-3">
            {requests.length ? requests.map((request) => (
              <article key={request.id} className="border-b py-3 last:border-0">
                <div className="flex justify-between"><strong className="uppercase">{request.service_type}</strong><span className="capitalize font-bold text-teal-700">{request.status.replace("_", " ")}</span></div>
                <p className="mt-1 text-sm text-slate-600">{request.reason}</p>
                {request.admin_response && <p className="mt-2 text-sm font-semibold">Admin: {request.admin_response}</p>}
              </article>
            )) : <p className="py-8 text-center text-slate-500">No requests yet.</p>}
          </div>
        </section>
      </div>
    </section>
  );
}

function Usage({ title, used, limit, remaining, seconds = false }: { title: string; used: number; limit: number; remaining: number; seconds?: boolean }) {
  const percentage = limit ? Math.min(100, Math.round((used / limit) * 100)) : 100;
  const format = (value: number) => seconds ? `${Math.floor(value / 60)}m ${value % 60}s` : value.toLocaleString();
  return <article className="rounded-lg border border-slate-200 bg-white p-5"><div className="flex justify-between"><h2 className="text-lg font-bold">{title}</h2><strong>{percentage}%</strong></div><div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100"><div className={`h-full ${percentage >= 95 ? "bg-rose-600" : percentage >= 80 ? "bg-amber-500" : "bg-teal-500"}`} style={{ width: `${percentage}%` }} /></div><div className="mt-4 grid grid-cols-3 gap-3 text-sm"><span>Used<br /><strong>{format(used)}</strong></span><span>Remaining<br /><strong>{format(remaining)}</strong></span><span>Limit<br /><strong>{format(limit)}</strong></span></div></article>;
}

function Field({ label, value, set }: { label: string; value: number; set: (value: number) => void }) {
  return <label className="mt-3 block text-sm font-bold">{label}<input type="number" min={1} required value={value} onChange={(event) => set(Number(event.target.value))} className="mt-1 min-h-11 w-full rounded-lg border px-3" /></label>;
}
