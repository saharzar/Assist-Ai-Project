import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";

import { useAuth } from "../../context/AuthContext";
import { useTranslation } from "../../i18n";
import {
  speechProviderTranslations,
  type SpeechProviderText,
} from "../../lib/speechProviderTranslations";
import {
  fetchSpeechProviderDashboard,
  notifySpeechProviderUpdated,
  updateSpeechProviderSettings,
  type SpeechMode,
  type SpeechProviderDashboard,
  type SpeechProviderSettings,
  type SpeechServiceSnapshot,
} from "../../services/speechProviderService";

export function AdminSpeechProvidersPage() {
  const { user, isAuthenticated } = useAuth();
  const { language } = useTranslation();
  const text = speechProviderTranslations[language];
  const [dashboard, setDashboard] = useState<SpeechProviderDashboard | null>(null);
  const [draft, setDraft] = useState<SpeechProviderSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const isAdmin = isAuthenticated && user?.role === "admin";

  const loadDashboard = async () => {
    const nextDashboard = await fetchSpeechProviderDashboard();
    setDashboard(nextDashboard);
    setDraft(nextDashboard.settings);
    notifySpeechProviderUpdated(nextDashboard);
  };

  useEffect(() => {
    if (!isAdmin) return;
    setIsLoading(true);
    setErrorMessage("");
    loadDashboard()
      .catch(() => setErrorMessage(text.loadError))
      .finally(() => setIsLoading(false));
  }, [isAdmin, text.loadError]);

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/scenarios" replace />;

  const saveSettings = async () => {
    if (!draft) return;
    setIsSaving(true);
    setErrorMessage("");
    setSuccessMessage("");
    try {
      await updateSpeechProviderSettings(draft);
      await loadDashboard();
      setSuccessMessage(text.settingsSaved);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : text.saveError);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="flex flex-1 flex-col text-slate-900">
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div className="max-w-3xl">
          <p className="text-sm font-bold uppercase text-teal-700">{text.title}</p>
          <h1 className="mt-1 text-3xl font-bold">{text.title}</h1>
          <p className="mt-2 text-slate-600">{text.description}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link to="/admin/scenario-analytics" className="inline-flex min-h-[44px] items-center rounded-lg border border-slate-300 bg-white px-4 font-bold hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-teal-500">{text.scenarioAnalytics}</Link>
          <Link to="/admin/users" className="inline-flex min-h-[44px] items-center rounded-lg border border-slate-300 bg-white px-4 font-bold hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-teal-500">{text.manageUsers}</Link>
        </div>
      </div>

      <div className="mt-6 rounded-lg border border-sky-200 bg-sky-50 px-4 py-3 font-semibold text-sky-900">
        {text.estimatedNotice}
      </div>

      {errorMessage && <div className="mt-5 rounded-lg border border-amber-300 bg-amber-50 p-4 font-semibold text-amber-900">{errorMessage}</div>}
      {successMessage && <div className="mt-5 rounded-lg border border-teal-200 bg-teal-50 p-4 font-semibold text-teal-900">{successMessage}</div>}

      {isLoading || !dashboard || !draft ? (
        <p className="py-12 text-center font-semibold text-slate-600">{text.loading}</p>
      ) : (
        <>
          <div className="mt-6 grid gap-5 lg:grid-cols-2">
            <ProviderCard snapshot={dashboard.tts} title={text.tts} text={text} />
            <ProviderCard snapshot={dashboard.stt} title={text.stt} text={text} />
          </div>

          <section className="mt-7 border-y border-slate-200 py-6">
            <h2 className="text-xl font-bold">{text.settings}</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <ModeSelect label={text.ttsMode} value={draft.tts_mode} text={text} onChange={(tts_mode) => setDraft((current) => current ? { ...current, tts_mode } : current)} />
              <ModeSelect label={text.sttMode} value={draft.stt_mode} text={text} onChange={(stt_mode) => setDraft((current) => current ? { ...current, stt_mode } : current)} />
              <NumberSetting label={text.ttsLimit} value={draft.azure_tts_monthly_limit} min={1} onChange={(azure_tts_monthly_limit) => setDraft((current) => current ? { ...current, azure_tts_monthly_limit } : current)} />
              <NumberSetting label={text.sttLimit} value={draft.azure_stt_monthly_limit_seconds} min={1} onChange={(azure_stt_monthly_limit_seconds) => setDraft((current) => current ? { ...current, azure_stt_monthly_limit_seconds } : current)} />
              <NumberSetting label={text.warningThreshold} value={draft.warning_threshold_percent} min={1} max={99} onChange={(warning_threshold_percent) => setDraft((current) => current ? { ...current, warning_threshold_percent } : current)} />
              <NumberSetting label={text.switchThreshold} value={draft.switch_threshold_percent} min={2} max={100} onChange={(switch_threshold_percent) => setDraft((current) => current ? { ...current, switch_threshold_percent } : current)} />
            </div>
            <button type="button" disabled={isSaving} onClick={() => void saveSettings()} className="mt-5 min-h-[46px] rounded-lg bg-slate-900 px-6 font-bold text-white hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:opacity-60">{text.saveSettings}</button>
          </section>

          <UsageHistory dashboard={dashboard} text={text} />
          <EventHistory dashboard={dashboard} text={text} />
        </>
      )}
    </section>
  );
}

function ProviderCard({ snapshot, title, text }: { snapshot: SpeechServiceSnapshot; title: string; text: SpeechProviderText }) {
  const isTts = snapshot.service_type === "tts";
  const statusLabel = text[snapshot.status === "quota_reached" ? "quotaReached" : snapshot.status];
  const providerLabel = snapshot.current_provider === "azure" ? text.azure : text.browser;
  const modeLabel = snapshot.mode === "automatic" ? text.automatic : snapshot.mode === "azure" ? text.azure : text.browser;
  const formatValue = (value: number) => isTts ? `${value.toLocaleString(text.locale)} ${text.characters}` : formatDuration(value, text);
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div><p className="text-xs font-bold uppercase text-slate-500">{isTts ? "TTS" : "STT"}</p><h2 className="mt-1 text-xl font-bold">{title}</h2></div>
        <span className={`rounded-full px-3 py-1 text-xs font-bold ${statusClasses(snapshot.status)}`}>{statusLabel}</span>
      </div>
      <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-200"><div className="h-full bg-teal-500" style={{ width: `${Math.min(100, snapshot.usage_percent)}%` }} /></div>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <Value label={text.currentProvider} value={providerLabel} />
        <Value label={text.mode} value={modeLabel} />
        <Value label={text.used} value={formatValue(snapshot.used)} />
        <Value label={text.configuredLimit} value={formatValue(snapshot.limit)} />
        <Value label={text.remaining} value={formatValue(snapshot.remaining)} />
        <Value label={text.usage} value={`${snapshot.usage_percent.toFixed(2)}%`} />
        <Value label={text.successfulRequests} value={snapshot.successful_requests.toLocaleString(text.locale)} />
        <Value label={text.failedRequests} value={snapshot.failed_requests.toLocaleString(text.locale)} />
        {isTts && <Value label={text.cachedRequests} value={snapshot.cached_requests.toLocaleString(text.locale)} />}
        <Value label={text.billingPeriod} value={formatMonth(snapshot.billing_period, text.locale)} />
        <Value label={text.estimatedReset} value={new Date(`${snapshot.reset_date}T00:00:00`).toLocaleDateString(text.locale)} />
      </div>
    </article>
  );
}

function UsageHistory({ dashboard, text }: { dashboard: SpeechProviderDashboard; text: SpeechProviderText }) {
  return <section className="mt-7"><h2 className="text-xl font-bold">{text.monthlyHistory}</h2>{dashboard.usage_history.length === 0 ? <p className="mt-4 text-slate-500">{text.noHistory}</p> : <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200 bg-white"><table className="min-w-full text-left text-sm"><thead className="bg-slate-100 text-xs uppercase text-slate-600"><tr>{[text.billingPeriod, text.service, text.provider, text.requests, text.failedRequests, text.cachedRequests, text.amountUsed].map((label) => <th key={label} className="px-4 py-3">{label}</th>)}</tr></thead><tbody className="divide-y divide-slate-200">{dashboard.usage_history.map((item) => <tr key={`${item.billing_period}-${item.service_type}`}><td className="px-4 py-3">{formatMonth(item.billing_period, text.locale)}</td><td className="px-4 py-3 uppercase">{item.service_type}</td><td className="px-4 py-3">{text.azure}</td><td className="px-4 py-3">{item.successful_requests}</td><td className="px-4 py-3">{item.failed_requests}</td><td className="px-4 py-3">{item.cached_requests}</td><td className="px-4 py-3">{item.service_type === "tts" ? `${item.characters_used.toLocaleString(text.locale)} ${text.characters}` : formatDuration(item.audio_seconds_used, text)}</td></tr>)}</tbody></table></div>}</section>;
}

function EventHistory({ dashboard, text }: { dashboard: SpeechProviderDashboard; text: SpeechProviderText }) {
  return <section className="mt-7"><h2 className="text-xl font-bold">{text.eventHistory}</h2>{dashboard.events.length === 0 ? <p className="mt-4 text-slate-500">{text.noEvents}</p> : <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200 bg-white"><table className="min-w-full text-left text-sm"><thead className="bg-slate-100 text-xs uppercase text-slate-600"><tr>{[text.date, text.service, text.event, text.change, text.reason, text.administrator].map((label) => <th key={label} className="px-4 py-3">{label}</th>)}</tr></thead><tbody className="divide-y divide-slate-200">{dashboard.events.map((item) => { const eventLabel = text.eventNames[item.event_type] ?? item.event_type; return <tr key={item.id}><td className="whitespace-nowrap px-4 py-3">{new Date(item.created_at).toLocaleString(text.locale)}</td><td className="px-4 py-3 uppercase">{item.service_type}</td><td className="px-4 py-3 font-semibold">{eventLabel}</td><td className="whitespace-nowrap px-4 py-3">{providerName(item.previous_provider, text)} -&gt; {providerName(item.new_provider, text)}</td><td className="px-4 py-3">{item.reason}</td><td className="px-4 py-3">{item.administrator_name ?? "-"}</td></tr>; })}</tbody></table></div>}</section>;
}

function ModeSelect({ label, value, text, onChange }: { label: string; value: SpeechMode; text: SpeechProviderText; onChange: (value: SpeechMode) => void }) { return <label className="text-sm font-bold text-slate-700">{label}<select value={value} onChange={(event) => onChange(event.target.value as SpeechMode)} className="mt-1 min-h-[44px] w-full rounded-lg border border-slate-300 bg-white px-3 font-normal outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500"><option value="automatic">{text.automatic}</option><option value="azure">{text.azure}</option><option value="browser">{text.browser}</option></select></label>; }
function NumberSetting({ label, value, min, max, onChange }: { label: string; value: number; min: number; max?: number; onChange: (value: number) => void }) { return <label className="text-sm font-bold text-slate-700">{label}<input type="number" value={value} min={min} max={max} onChange={(event) => onChange(Number(event.target.value))} className="mt-1 min-h-[44px] w-full rounded-lg border border-slate-300 px-3 font-normal outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500" /></label>; }
function Value({ label, value }: { label: string; value: string }) { return <div><p className="text-xs font-bold uppercase text-slate-500">{label}</p><p className="mt-1 font-semibold text-slate-950">{value}</p></div>; }
function formatDuration(totalSeconds: number, text: SpeechProviderText) { const hours = Math.floor(totalSeconds / 3600); const minutes = Math.floor((totalSeconds % 3600) / 60); const seconds = totalSeconds % 60; return [hours && `${hours}${text.hours}`, minutes && `${minutes}${text.minutes}`, !hours && !minutes && `${seconds}${text.seconds}`].filter(Boolean).join(" "); }
function formatMonth(value: string, locale: string) { return new Date(`${value}T00:00:00`).toLocaleDateString(locale, { month: "long", year: "numeric" }); }
function providerName(value: string | null, text: SpeechProviderText) { return value === "azure" ? text.azure : value === "browser" ? text.browser : "-"; }
function statusClasses(status: SpeechServiceSnapshot["status"]) { if (status === "normal") return "bg-teal-100 text-teal-800"; if (status === "warning") return "bg-amber-100 text-amber-900"; return "bg-rose-100 text-rose-800"; }
