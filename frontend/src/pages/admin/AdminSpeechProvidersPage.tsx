import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";

import { useAuth } from "../../context/AuthContext";
import { useTranslation, type LanguageCode } from "../../i18n";
import { speechProviderTranslations } from "../../lib/speechProviderTranslations";
import {
  fetchGlobalSpeechDashboard,
  notifySpeechProviderUpdated,
  updateGlobalSpeechRouting,
  testSpeechProvider,
  type GlobalSpeechDashboard,
  type GlobalSpeechProvider,
  type SpeechCapability,
} from "../../services/speechProviderService";

const managementText: Record<LanguageCode, Record<string, string>> = {
  en: { automatic: "Automatic routing", forced: "Forced provider", priority: "Priority", enabled: "Enabled", configured: "Configured", unlimited: "Unlimited", limit: "Quota limit", warning: "Warning %", switching: "Switch %", period: "Billing period", resetDay: "Reset day", health: "Health", lastSuccess: "Last success", lastFailure: "Last failure", up: "Move up", down: "Move down", calendar_month: "Calendar month", custom_monthly: "Custom monthly", no_reset: "No reset", manual: "Manual period", active: "Globally active", save: "Save global routing", saved: "Global speech routing saved.", unsupported: "Not configured", confirmDisable: "This provider is currently active. Disable it anyway?" },
  es: { automatic: "Enrutamiento automático", forced: "Proveedor forzado", priority: "Prioridad", enabled: "Activo", configured: "Configurado", unlimited: "Ilimitado", limit: "Límite de cuota", warning: "Aviso %", switching: "Cambio %", period: "Período de facturación", resetDay: "Día de reinicio", health: "Estado", lastSuccess: "Último éxito", lastFailure: "Último fallo", up: "Subir", down: "Bajar", calendar_month: "Mes natural", custom_monthly: "Mes personalizado", no_reset: "Sin reinicio", manual: "Período manual", active: "Activo global", save: "Guardar enrutamiento global", saved: "Enrutamiento global guardado.", unsupported: "No configurado", confirmDisable: "Este proveedor está activo. ¿Desactivarlo igualmente?" },
  de: { automatic: "Automatisches Routing", forced: "Erzwungener Anbieter", priority: "Priorität", enabled: "Aktiviert", configured: "Konfiguriert", unlimited: "Unbegrenzt", limit: "Kontingent", warning: "Warnung %", switching: "Wechsel %", period: "Abrechnungszeitraum", resetDay: "Rücksetztag", health: "Zustand", lastSuccess: "Letzter Erfolg", lastFailure: "Letzter Fehler", up: "Nach oben", down: "Nach unten", calendar_month: "Kalendermonat", custom_monthly: "Eigener Monat", no_reset: "Keine Rücksetzung", manual: "Manueller Zeitraum", active: "Global aktiv", save: "Globales Routing speichern", saved: "Globales Sprachrouting gespeichert.", unsupported: "Nicht konfiguriert", confirmDisable: "Dieser Anbieter ist aktiv. Trotzdem deaktivieren?" },
  tr: { automatic: "Otomatik yönlendirme", forced: "Zorunlu sağlayıcı", priority: "Öncelik", enabled: "Etkin", configured: "Yapılandırıldı", unlimited: "Sınırsız", limit: "Kota sınırı", warning: "Uyarı %", switching: "Geçiş %", period: "Fatura dönemi", resetDay: "Sıfırlama günü", health: "Sağlık", lastSuccess: "Son başarı", lastFailure: "Son hata", up: "Yukarı taşı", down: "Aşağı taşı", calendar_month: "Takvim ayı", custom_monthly: "Özel aylık", no_reset: "Sıfırlama yok", manual: "Manuel dönem", active: "Genel etkin", save: "Genel yönlendirmeyi kaydet", saved: "Genel konuşma yönlendirmesi kaydedildi.", unsupported: "Yapılandırılmadı", confirmDisable: "Bu sağlayıcı şu anda etkin. Yine de devre dışı bırakılsın mı?" },
  pt: { automatic: "Roteamento automático", forced: "Provedor forçado", priority: "Prioridade", enabled: "Ativo", configured: "Configurado", unlimited: "Ilimitado", limit: "Limite de cota", warning: "Aviso %", switching: "Troca %", period: "Período de faturamento", resetDay: "Dia de reinício", health: "Saúde", lastSuccess: "Último sucesso", lastFailure: "Última falha", up: "Mover para cima", down: "Mover para baixo", calendar_month: "Mês civil", custom_monthly: "Mês personalizado", no_reset: "Sem reinício", manual: "Período manual", active: "Ativo global", save: "Salvar roteamento global", saved: "Roteamento global salvo.", unsupported: "Não configurado", confirmDisable: "Este provedor está ativo. Desativar mesmo assim?" },
  fr: { automatic: "Routage automatique", forced: "Fournisseur forcé", priority: "Priorité", enabled: "Activé", configured: "Configuré", unlimited: "Illimité", limit: "Limite du quota", warning: "Alerte %", switching: "Bascule %", period: "Période de facturation", resetDay: "Jour de réinitialisation", health: "État", lastSuccess: "Dernier succès", lastFailure: "Dernier échec", up: "Monter", down: "Descendre", calendar_month: "Mois civil", custom_monthly: "Mois personnalisé", no_reset: "Sans réinitialisation", manual: "Période manuelle", active: "Actif global", save: "Enregistrer le routage global", saved: "Routage vocal global enregistré.", unsupported: "Non configuré", confirmDisable: "Ce fournisseur est actif. Le désactiver quand même ?" },
};

export function AdminSpeechProvidersPage() {
  const { user, isAuthenticated } = useAuth();
  const { language } = useTranslation();
  const text = speechProviderTranslations[language];
  const labels = managementText[language];
  const [dashboard, setDashboard] = useState<GlobalSpeechDashboard | null>(null);
  const [draft, setDraft] = useState<GlobalSpeechDashboard | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);
  const [activeView, setActiveView] = useState<"routing" | "activity">("routing");
  const [activeService, setActiveService] = useState<"stt" | "tts">("stt");
  const isAdmin = isAuthenticated && user?.role === "admin";

  useEffect(() => {
    if (!isAdmin) return;
    fetchGlobalSpeechDashboard().then((value) => { setDashboard(value); setDraft(value); notifySpeechProviderUpdated(value); }).catch(() => setError(text.loadError));
  }, [isAdmin, text.loadError]);

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/scenarios" replace />;

  const updateCapability = (key: GlobalSpeechProvider, service: "tts" | "stt", changes: Partial<SpeechCapability>) => {
    setDraft((current) => current ? { ...current, capabilities: current.capabilities.map((item) => item.provider_key === key && item.service_type === service ? { ...item, ...changes } : item) } : current);
  };

  const move = (service: "tts" | "stt", key: GlobalSpeechProvider, direction: -1 | 1) => {
    setDraft((current) => {
      if (!current) return current;
      const ordered = current.capabilities.filter((item) => item.service_type === service).sort((a, b) => a.priority - b.priority);
      const index = ordered.findIndex((item) => item.provider_key === key);
      const target = index + direction;
      if (target < 0 || target >= ordered.length) return current;
      [ordered[index], ordered[target]] = [ordered[target], ordered[index]];
      const priorities = new Map(ordered.map((item, itemIndex) => [item.provider_key, itemIndex + 1]));
      return { ...current, capabilities: current.capabilities.map((item) => item.service_type === service ? { ...item, priority: priorities.get(item.provider_key) ?? item.priority } : item) };
    });
  };

  const save = async () => {
    if (!draft) return;
    setSaving(true); setError(""); setSuccess("");
    try {
      const updated = await updateGlobalSpeechRouting({
        capabilities: draft.capabilities.map(({ provider_key, service_type, enabled, priority, quota_limit, warning_threshold_value, switch_threshold_value, billing_period_type, reset_day }) => ({ provider_key, service_type, enabled, priority, quota_limit, warning_threshold_value, switch_threshold_value, billing_period_type, reset_day })),
      });
      setDashboard(updated); setDraft(updated); setSuccess(labels.saved); notifySpeechProviderUpdated(updated);
    } catch (reason) { setError(reason instanceof Error ? reason.message : text.saveError); }
    finally { setSaving(false); }
  };

  return <section className="flex flex-1 flex-col text-slate-900">
    <div><p className="text-sm font-bold uppercase text-teal-700">Admin dashboard</p><h1 className="mt-1 text-3xl font-bold">{text.title}</h1></div>
    {error && <p className="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-4 font-semibold text-rose-800">{error}</p>}
    {success && <p className="mt-4 rounded-lg border border-teal-200 bg-teal-50 p-4 font-semibold text-teal-800">{success}</p>}
    {!draft || !dashboard ? <p className="py-12 text-center font-semibold">{text.loading}</p> : <>
      <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-b border-slate-200">
        <div className="flex gap-1" role="tablist" aria-label="Speech provider views">
          {(["routing", "activity"] as const).map((view) => <button key={view} type="button" role="tab" aria-selected={activeView === view} onClick={() => setActiveView(view)} className={`border-b-2 px-4 py-3 text-sm font-bold capitalize ${activeView === view ? "border-teal-600 text-teal-800" : "border-transparent text-slate-500 hover:text-slate-800"}`}>{view}</button>)}
        </div>
        {activeView === "routing" && (
          <div className="mb-2 inline-flex rounded-lg bg-slate-100 p-1" role="tablist" aria-label="Speech service">
            {(["stt", "tts"] as const).map((service) => (
              <button
                key={service}
                type="button"
                role="tab"
                aria-selected={activeService === service}
                onClick={() => setActiveService(service)}
                className={`min-h-[40px] rounded-md px-6 text-sm font-bold uppercase transition ${activeService === service ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
              >
                {service}
              </button>
            ))}
          </div>
        )}
      </div>
      {activeView === "routing" ? <>
        <CompactProviderSection service={activeService} draft={draft} labels={labels} text={text} language={language} updateCapability={updateCapability} move={move} />
        <button type="button" disabled={saving} onClick={() => void save()} className="mt-5 min-h-[44px] self-start rounded-lg bg-teal-700 px-5 text-sm font-bold text-white disabled:opacity-60">{labels.save}</button>
      </> : <CompactHistory dashboard={dashboard} title={text.monthlyHistory} eventTitle={text.eventHistory} locale={text.locale} />}
    </>}
  </section>;
}

type ProviderSectionProps = {
  service: "tts" | "stt";
  draft: GlobalSpeechDashboard;
  labels: Record<string, string>;
  text: ReturnType<typeof getText>;
  language: LanguageCode;
  updateCapability: (key: GlobalSpeechProvider, service: "tts" | "stt", changes: Partial<SpeechCapability>) => void;
  move: (service: "tts" | "stt", key: GlobalSpeechProvider, direction: -1 | 1) => void;
};

function CompactProviderSection({ service, draft, labels, text, language, updateCapability, move }: ProviderSectionProps) {
  const [testResults, setTestResults] = useState<Record<string, string>>({});
  const items = useMemo(
    () => draft.capabilities.filter((item) => item.service_type === service).sort((a, b) => a.priority - b.priority),
    [draft.capabilities, service],
  );
  const active = service === "tts" ? draft.active_tts_provider : draft.active_stt_provider;

  return <section className="mt-5">
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-slate-200 bg-white px-4 py-3">
      <div><p className="text-xs font-bold uppercase text-slate-500">{service}</p><p className="font-bold text-teal-800">{labels.active}: {providerName(active)}</p></div>
      <p className="max-w-xl text-sm font-semibold text-slate-600">Requests use the first available provider in the priority order below.</p>
    </div>
    <div className="mt-3 space-y-3">{items.map((item, index) => <article key={item.provider_key} className="rounded-lg border border-slate-200 bg-white">
      <div className="grid items-center gap-3 px-4 py-3 sm:grid-cols-[minmax(180px,1.5fr)_1fr_1fr_auto]">
        <div><div className="flex items-center gap-2"><span className={`h-2.5 w-2.5 rounded-full ${item.provider_key === active ? "bg-teal-500" : item.enabled ? "bg-slate-300" : "bg-slate-200"}`} /><h3 className="font-bold">{item.display_name}</h3></div><p className="mt-1 text-xs text-slate-500">{labels.priority} {item.priority} · {item.configured ? item.health_status : labels.unsupported}</p></div>
        <Metric label={text.used} value={item.quota_type === "unlimited" ? `${item.used} ${text.requests}` : `${item.used.toLocaleString(text.locale)} / ${item.quota_limit?.toLocaleString(text.locale)}`} />
        <Metric label={text.status} value={item.quota_status} />
        <div className="flex gap-1"><button type="button" aria-label={labels.up} disabled={index === 0} onClick={() => move(service, item.provider_key, -1)} className="h-9 w-9 rounded-md border border-slate-300 font-bold disabled:opacity-30">↑</button><button type="button" aria-label={labels.down} disabled={index === items.length - 1} onClick={() => move(service, item.provider_key, 1)} className="h-9 w-9 rounded-md border border-slate-300 font-bold disabled:opacity-30">↓</button></div>
      </div>
      <details className="border-t border-slate-100">
        <summary className="cursor-pointer px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50">Configure provider</summary>
        <div className="grid gap-4 border-t border-slate-100 bg-slate-50/60 p-4 sm:grid-cols-2 lg:grid-cols-4">
          <div><label className="flex items-center gap-2 font-bold"><input type="checkbox" checked={item.enabled} disabled={!item.configured} onChange={(event) => { if (!event.target.checked && active === item.provider_key && !window.confirm(labels.confirmDisable)) return; updateCapability(item.provider_key, service, { enabled: event.target.checked }); }} />{labels.enabled}</label><button type="button" disabled={!item.configured} onClick={() => void testSpeechProvider(service, item.provider_key).then((result) => setTestResults((current) => ({ ...current, [item.provider_key]: result.status })))} className="mt-3 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-bold disabled:opacity-40">{testLabel(language)}</button>{testResults[item.provider_key] && <p className="mt-1 text-xs font-semibold">{testResults[item.provider_key]}</p>}</div>
          <Metric label={text.remaining} value={item.remaining === null ? labels.unlimited : item.remaining.toLocaleString(text.locale)} />
          {item.quota_type === "limited" && <><NumberField label={`${labels.limit} (${item.usage_unit})`} value={item.quota_limit ?? 1} onChange={(quota_limit) => updateCapability(item.provider_key, service, { quota_limit })} /><NumberField label={`${labels.warning.replace(" %", "")} (${item.usage_unit})`} value={item.warning_threshold_value} max={item.quota_limit ?? undefined} onChange={(warning_threshold_value) => updateCapability(item.provider_key, service, { warning_threshold_value })} /><NumberField label={`${labels.switching.replace(" %", "")} (${item.usage_unit})`} value={item.switch_threshold_value} max={item.quota_limit ?? undefined} onChange={(switch_threshold_value) => updateCapability(item.provider_key, service, { switch_threshold_value })} /><label className="text-sm font-bold">{labels.period}<select value={item.billing_period_type} onChange={(event) => updateCapability(item.provider_key, service, { billing_period_type: event.target.value as SpeechCapability["billing_period_type"] })} className="mt-1 min-h-[44px] w-full rounded-lg border border-slate-300 bg-white px-3">{["calendar_month", "custom_monthly", "manual"].map((value) => <option key={value} value={value}>{labels[value]}</option>)}</select></label>{item.billing_period_type === "custom_monthly" && <NumberField label={labels.resetDay} value={item.reset_day ?? 1} max={28} onChange={(reset_day) => updateCapability(item.provider_key, service, { reset_day })} />}</>}
          <Metric label={labels.lastSuccess} value={formatDate(item.last_success_at, text.locale)} /><Metric label={labels.lastFailure} value={formatDate(item.last_failure_at, text.locale)} />
        </div>
      </details>
    </article>)}</div>
  </section>;
}

function CompactHistory({ dashboard, title, eventTitle, locale }: { dashboard: GlobalSpeechDashboard; title: string; eventTitle: string; locale: string }) {
  const pageSize = 4;
  const [usagePage, setUsagePage] = useState(0);
  const [eventPage, setEventPage] = useState(0);
  const usageItems = dashboard.usage_history.slice(usagePage * pageSize, (usagePage + 1) * pageSize);
  const eventItems = dashboard.events.slice(eventPage * pageSize, (eventPage + 1) * pageSize);
  return <div className="mt-6 grid gap-6 lg:grid-cols-2">
    <ActivityList title={title} page={usagePage} total={dashboard.usage_history.length} pageSize={pageSize} onPage={setUsagePage}>{usageItems.map((item) => <div key={`${item.billing_period}-${item.provider}-${item.service_type}`} className="flex items-center justify-between border-b border-slate-100 py-3 text-sm last:border-0"><div><strong>{item.provider.toUpperCase()}</strong><span className="ml-2 text-xs font-bold text-slate-500">{item.service_type.toUpperCase()}</span><p className="text-xs text-slate-500">{new Date(`${item.billing_period}T00:00:00`).toLocaleDateString(locale)}</p></div><strong>{item.service_type === "tts" ? item.characters_used.toLocaleString(locale) : `${item.audio_seconds_used}s`}</strong></div>)}</ActivityList>
    <ActivityList title={eventTitle} page={eventPage} total={dashboard.events.length} pageSize={pageSize} onPage={setEventPage}>{eventItems.map((item) => <div key={item.id} className="border-b border-slate-100 py-3 text-sm last:border-0"><div className="flex items-start justify-between gap-3"><div><strong className="capitalize">{item.event_type.replace(/_/g, " ")}</strong><p className="mt-0.5 text-xs text-slate-500">{formatDate(item.created_at, locale)}{item.administrator_name ? ` · ${item.administrator_name}` : ""}</p></div><span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-bold text-slate-600">{item.service_type.toUpperCase()}</span></div>{(item.previous_provider || item.new_provider) && <p className="mt-2 text-xs font-bold text-teal-800">{providerName((item.previous_provider ?? item.new_provider) as GlobalSpeechProvider)} → {providerName((item.new_provider ?? item.previous_provider) as GlobalSpeechProvider)}</p>}<p className="mt-2 text-sm leading-5 text-slate-700">{item.reason}</p></div>)}</ActivityList>
  </div>;
}

function ActivityList({ title, page, total, pageSize, onPage, children }: { title: string; page: number; total: number; pageSize: number; onPage: (page: number) => void; children: React.ReactNode }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  return <section className="rounded-lg border border-slate-200 bg-white p-4"><div className="flex items-center justify-between"><h2 className="text-lg font-bold">{title}</h2><span className="text-xs font-bold text-slate-500">{page + 1} / {pages}</span></div><div className="mt-2 min-h-[240px]">{children}</div><div className="mt-3 flex justify-end gap-2"><button type="button" aria-label="Previous page" disabled={page === 0} onClick={() => onPage(page - 1)} className="h-9 w-9 rounded-md border border-slate-300 disabled:opacity-30">←</button><button type="button" aria-label="Next page" disabled={page + 1 >= pages} onClick={() => onPage(page + 1)} className="h-9 w-9 rounded-md border border-slate-300 disabled:opacity-30">→</button></div></section>;
}

function ProviderSection({ service, draft, labels, text, language, updateDashboard, updateCapability, move }: { service: "tts" | "stt"; draft: GlobalSpeechDashboard; labels: Record<string, string>; text: ReturnType<typeof getText>; language: LanguageCode; updateDashboard: React.Dispatch<React.SetStateAction<GlobalSpeechDashboard | null>>; updateCapability: (key: GlobalSpeechProvider, service: "tts" | "stt", changes: Partial<SpeechCapability>) => void; move: (service: "tts" | "stt", key: GlobalSpeechProvider, direction: -1 | 1) => void }) {
  const [testResults, setTestResults] = useState<Record<string, string>>({});
  const items = useMemo(() => draft.capabilities.filter((item) => item.service_type === service).sort((a, b) => a.priority - b.priority), [draft.capabilities, service]);
  const automaticKey = service === "tts" ? "automatic_tts_routing_enabled" : "automatic_stt_routing_enabled";
  const forcedKey = service === "tts" ? "forced_tts_provider_key" : "forced_stt_provider_key";
  const active = service === "tts" ? draft.active_tts_provider : draft.active_stt_provider;
  return <section className="mt-8 border-t border-slate-200 pt-6"><div className="flex flex-wrap items-center justify-between gap-4"><div><h2 className="text-2xl font-bold">{service.toUpperCase()}</h2><p className="mt-1 font-semibold text-teal-800">{labels.active}: {providerName(active)}</p></div><div className="flex flex-wrap items-center gap-4"><label className="flex items-center gap-2 font-bold"><input type="checkbox" checked={Boolean(draft[automaticKey])} onChange={(event) => updateDashboard((current) => current ? { ...current, [automaticKey]: event.target.checked, ...(!event.target.checked && !current[forcedKey] ? { [forcedKey]: active } : {}) } : current)} />{labels.automatic}</label>{!draft[automaticKey] && <label className="font-bold">{labels.forced}<select value={draft[forcedKey] ?? active} onChange={(event) => updateDashboard((current) => current ? { ...current, [forcedKey]: event.target.value as GlobalSpeechProvider } : current)} className="ml-2 rounded-lg border border-slate-300 px-3 py-2">{items.filter((item) => item.enabled && item.configured).map((item) => <option key={item.provider_key} value={item.provider_key}>{item.display_name}</option>)}</select></label>}</div></div>
    <div className="mt-5 grid gap-4">{items.map((item, index) => <article key={item.provider_key} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase text-slate-500">{labels.priority} {item.priority}</p><h3 className="text-lg font-bold">{item.display_name}</h3><p className="mt-1 text-sm text-slate-600">{labels.health}: {item.health_status} · {item.configured ? labels.configured : labels.unsupported}</p></div><div className="flex gap-2"><button type="button" aria-label={labels.up} disabled={index === 0} onClick={() => move(service, item.provider_key, -1)} className="h-11 w-11 rounded-lg border border-slate-300 font-bold disabled:opacity-30">↑</button><button type="button" aria-label={labels.down} disabled={index === items.length - 1} onClick={() => move(service, item.provider_key, 1)} className="h-11 w-11 rounded-lg border border-slate-300 font-bold disabled:opacity-30">↓</button></div></div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><div><label className="flex items-center gap-2 font-bold"><input type="checkbox" checked={item.enabled} disabled={!item.configured} onChange={(event) => { if (!event.target.checked && active === item.provider_key && !window.confirm(labels.confirmDisable)) return; updateCapability(item.provider_key, service, { enabled: event.target.checked }); }} />{labels.enabled}</label><button type="button" disabled={!item.configured} onClick={() => void testSpeechProvider(service, item.provider_key).then((result) => setTestResults((current) => ({ ...current, [item.provider_key]: result.status })))} className="mt-3 rounded-lg border border-slate-300 px-3 py-2 text-sm font-bold disabled:opacity-40">{testLabel(language)}</button>{testResults[item.provider_key] && <p className="mt-1 text-xs font-semibold">{testResults[item.provider_key]}</p>}</div><Metric label={text.used} value={item.quota_type === "unlimited" ? `${item.used} ${text.requests}` : `${item.used.toLocaleString(text.locale)} / ${item.quota_limit?.toLocaleString(text.locale)}`} /><Metric label={text.remaining} value={item.remaining === null ? labels.unlimited : item.remaining.toLocaleString(text.locale)} /><Metric label={text.status} value={item.quota_status} />
      {item.quota_type === "limited" && <><NumberField label={`${labels.limit} (${item.usage_unit})`} value={item.quota_limit ?? 1} onChange={(quota_limit) => updateCapability(item.provider_key, service, { quota_limit })} /><NumberField label={`${labels.warning.replace(" %", "")} (${item.usage_unit})`} value={item.warning_threshold_value} max={item.quota_limit ?? undefined} onChange={(warning_threshold_value) => updateCapability(item.provider_key, service, { warning_threshold_value })} /><NumberField label={`${labels.switching.replace(" %", "")} (${item.usage_unit})`} value={item.switch_threshold_value} max={item.quota_limit ?? undefined} onChange={(switch_threshold_value) => updateCapability(item.provider_key, service, { switch_threshold_value })} /><label className="text-sm font-bold">{labels.period}<select value={item.billing_period_type} onChange={(event) => updateCapability(item.provider_key, service, { billing_period_type: event.target.value as SpeechCapability["billing_period_type"] })} className="mt-1 min-h-[44px] w-full rounded-lg border border-slate-300 px-3">{["calendar_month", "custom_monthly", "manual"].map((value) => <option key={value} value={value}>{labels[value]}</option>)}</select></label>{item.billing_period_type === "custom_monthly" && <NumberField label={labels.resetDay} value={item.reset_day ?? 1} max={28} onChange={(reset_day) => updateCapability(item.provider_key, service, { reset_day })} />}</>}
      <Metric label={labels.lastSuccess} value={formatDate(item.last_success_at, text.locale)} /><Metric label={labels.lastFailure} value={formatDate(item.last_failure_at, text.locale)} /></div></article>)}</div>
  </section>;
}

function History({ dashboard, title, eventTitle, locale }: { dashboard: GlobalSpeechDashboard; title: string; eventTitle: string; locale: string }) { return <div className="mt-9 grid gap-8 lg:grid-cols-2"><section><h2 className="text-xl font-bold">{title}</h2><div className="mt-3 space-y-2">{dashboard.usage_history.slice(0, 12).map((item) => <p key={`${item.billing_period}-${item.provider}-${item.service_type}`} className="rounded-lg border border-slate-200 bg-white p-3 text-sm"><strong>{item.provider.toUpperCase()} {item.service_type.toUpperCase()}</strong> · {new Date(`${item.billing_period}T00:00:00`).toLocaleDateString(locale)} · {item.service_type === "tts" ? item.characters_used : item.audio_seconds_used}</p>)}</div></section><section><h2 className="text-xl font-bold">{eventTitle}</h2><div className="mt-3 space-y-2">{dashboard.events.slice(0, 12).map((item) => <p key={item.id} className="rounded-lg border border-slate-200 bg-white p-3 text-sm"><strong>{item.event_type.replace(/_/g, " ")}</strong> · {item.service_type.toUpperCase()}<br />{item.reason}</p>)}</div></section></div>; }
function NumberField({ label, value, max, onChange }: { label: string; value: number; max?: number; onChange: (value: number) => void }) { return <label className="text-sm font-bold">{label}<input type="number" min={1} max={max} value={value} onChange={(event) => onChange(Number(event.target.value))} className="mt-1 min-h-[44px] w-full rounded-lg border border-slate-300 px-3" /></label>; }
function Metric({ label, value }: { label: string; value: string }) { return <div><p className="text-xs font-bold uppercase text-slate-500">{label}</p><p className="mt-1 font-semibold">{value}</p></div>; }
function providerName(value: GlobalSpeechProvider) { return value === "azure" ? "Microsoft Azure" : value === "soniox" ? "Soniox" : "Browser"; }
function formatDate(value: string | null, locale: string) { return value ? new Date(value).toLocaleString(locale) : "-"; }
function getText() { return speechProviderTranslations.en; }
function testLabel(language: LanguageCode) { return ({ en: "Test provider", es: "Probar proveedor", de: "Anbieter testen", tr: "Sağlayıcıyı test et", pt: "Testar provedor", fr: "Tester le fournisseur" })[language]; }
