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

const providerPageText: Record<LanguageCode, Record<string, string>> = {
  en: { adminDashboard: "Admin dashboard", activeStt: "Active STT provider", activeTts: "Active TTS provider", ttsUsage: "TTS characters (30 days)", across: "Across all providers", routing: "Routing", activity: "Activity", failover: "Failover order", configure: "Configure provider", healthy: "Healthy", unavailable: "Unavailable", normal: "Normal", warning: "Warning", critical: "Critical", reached: "Quota reached", usageStt: "STT usage in minutes this period", usageTts: "TTS usage in characters this period", previous: "Previous page", next: "Next page", browser: "Browser", settingsChanged: "Settings changed", automaticSwitch: "Automatic provider switch", quotaWarning: "Quota warning", quotaReached: "Quota reached", providerFailure: "Provider failure", providerRecovered: "Provider recovered", settingsReason: "The global routing settings were updated.", switchReason: "The next available provider was selected automatically.", warningReason: "The configured warning level was reached.", reachedReason: "The configured quota limit was reached.", failureReason: "The provider could not complete the request.", recoveredReason: "The provider is available again." },
  es: { adminDashboard: "Panel de administración", activeStt: "Proveedor STT activo", activeTts: "Proveedor TTS activo", ttsUsage: "Caracteres TTS (30 días)", across: "En todos los proveedores", routing: "Enrutamiento", activity: "Actividad", failover: "Orden de conmutación", configure: "Configurar proveedor", healthy: "Saludable", unavailable: "No disponible", normal: "Normal", warning: "Advertencia", critical: "Crítico", reached: "Cuota agotada", usageStt: "Uso de STT en minutos durante este período", usageTts: "Uso de TTS en caracteres durante este período", previous: "Página anterior", next: "Página siguiente", browser: "Navegador", settingsChanged: "Configuración modificada", automaticSwitch: "Cambio automático de proveedor", quotaWarning: "Advertencia de cuota", quotaReached: "Cuota agotada", providerFailure: "Fallo del proveedor", providerRecovered: "Proveedor recuperado", settingsReason: "Se actualizó la configuración global de enrutamiento.", switchReason: "Se seleccionó automáticamente el siguiente proveedor disponible.", warningReason: "Se alcanzó el nivel de advertencia configurado.", reachedReason: "Se alcanzó el límite de cuota configurado.", failureReason: "El proveedor no pudo completar la solicitud.", recoveredReason: "El proveedor vuelve a estar disponible." },
  de: { adminDashboard: "Admin-Dashboard", activeStt: "Aktiver STT-Anbieter", activeTts: "Aktiver TTS-Anbieter", ttsUsage: "TTS-Zeichen (30 Tage)", across: "Über alle Anbieter", routing: "Routing", activity: "Aktivität", failover: "Ausweichreihenfolge", configure: "Anbieter konfigurieren", healthy: "Verfügbar", unavailable: "Nicht verfügbar", normal: "Normal", warning: "Warnung", critical: "Kritisch", reached: "Kontingent erreicht", usageStt: "STT-Nutzung in Minuten in diesem Zeitraum", usageTts: "TTS-Nutzung in Zeichen in diesem Zeitraum", previous: "Vorherige Seite", next: "Nächste Seite", browser: "Browser", settingsChanged: "Einstellungen geändert", automaticSwitch: "Automatischer Anbieterwechsel", quotaWarning: "Kontingentwarnung", quotaReached: "Kontingent erreicht", providerFailure: "Anbieterfehler", providerRecovered: "Anbieter wiederhergestellt", settingsReason: "Die globalen Routing-Einstellungen wurden aktualisiert.", switchReason: "Der nächste verfügbare Anbieter wurde automatisch ausgewählt.", warningReason: "Die konfigurierte Warnstufe wurde erreicht.", reachedReason: "Das konfigurierte Kontingent wurde erreicht.", failureReason: "Der Anbieter konnte die Anfrage nicht abschließen.", recoveredReason: "Der Anbieter ist wieder verfügbar." },
  tr: { adminDashboard: "Yönetici paneli", activeStt: "Etkin STT sağlayıcısı", activeTts: "Etkin TTS sağlayıcısı", ttsUsage: "TTS karakterleri (30 gün)", across: "Tüm sağlayıcılarda", routing: "Yönlendirme", activity: "Etkinlik", failover: "Yedek sağlayıcı sırası", configure: "Sağlayıcıyı yapılandır", healthy: "Sağlıklı", unavailable: "Kullanılamıyor", normal: "Normal", warning: "Uyarı", critical: "Kritik", reached: "Kota doldu", usageStt: "Bu dönemde dakika cinsinden STT kullanımı", usageTts: "Bu dönemde karakter cinsinden TTS kullanımı", previous: "Önceki sayfa", next: "Sonraki sayfa", browser: "Tarayıcı", settingsChanged: "Ayarlar değiştirildi", automaticSwitch: "Otomatik sağlayıcı geçişi", quotaWarning: "Kota uyarısı", quotaReached: "Kota doldu", providerFailure: "Sağlayıcı hatası", providerRecovered: "Sağlayıcı yeniden kullanılabilir", settingsReason: "Genel yönlendirme ayarları güncellendi.", switchReason: "Sıradaki uygun sağlayıcı otomatik olarak seçildi.", warningReason: "Yapılandırılan uyarı seviyesine ulaşıldı.", reachedReason: "Yapılandırılan kota sınırına ulaşıldı.", failureReason: "Sağlayıcı isteği tamamlayamadı.", recoveredReason: "Sağlayıcı yeniden kullanılabilir durumda." },
  pt: { adminDashboard: "Painel administrativo", activeStt: "Provedor STT ativo", activeTts: "Provedor TTS ativo", ttsUsage: "Caracteres TTS (30 dias)", across: "Em todos os provedores", routing: "Roteamento", activity: "Atividade", failover: "Ordem de contingência", configure: "Configurar provedor", healthy: "Saudável", unavailable: "Indisponível", normal: "Normal", warning: "Aviso", critical: "Crítico", reached: "Cota atingida", usageStt: "Uso de STT em minutos neste período", usageTts: "Uso de TTS em caracteres neste período", previous: "Página anterior", next: "Próxima página", browser: "Navegador", settingsChanged: "Configurações alteradas", automaticSwitch: "Troca automática de provedor", quotaWarning: "Aviso de cota", quotaReached: "Cota atingida", providerFailure: "Falha do provedor", providerRecovered: "Provedor recuperado", settingsReason: "As configurações globais de roteamento foram atualizadas.", switchReason: "O próximo provedor disponível foi selecionado automaticamente.", warningReason: "O nível de aviso configurado foi atingido.", reachedReason: "O limite de cota configurado foi atingido.", failureReason: "O provedor não conseguiu concluir a solicitação.", recoveredReason: "O provedor está disponível novamente." },
  fr: { adminDashboard: "Tableau d’administration", activeStt: "Fournisseur STT actif", activeTts: "Fournisseur TTS actif", ttsUsage: "Caractères TTS (30 jours)", across: "Tous fournisseurs confondus", routing: "Routage", activity: "Activité", failover: "Ordre de basculement", configure: "Configurer le fournisseur", healthy: "Opérationnel", unavailable: "Indisponible", normal: "Normal", warning: "Avertissement", critical: "Critique", reached: "Quota atteint", usageStt: "Utilisation STT en minutes sur cette période", usageTts: "Utilisation TTS en caractères sur cette période", previous: "Page précédente", next: "Page suivante", browser: "Navigateur", settingsChanged: "Paramètres modifiés", automaticSwitch: "Basculement automatique du fournisseur", quotaWarning: "Avertissement de quota", quotaReached: "Quota atteint", providerFailure: "Échec du fournisseur", providerRecovered: "Fournisseur rétabli", settingsReason: "Les paramètres globaux de routage ont été mis à jour.", switchReason: "Le fournisseur disponible suivant a été sélectionné automatiquement.", warningReason: "Le niveau d’avertissement configuré a été atteint.", reachedReason: "La limite de quota configurée a été atteinte.", failureReason: "Le fournisseur n’a pas pu terminer la requête.", recoveredReason: "Le fournisseur est de nouveau disponible." },
};

export function AdminSpeechProvidersPage() {
  const { user, isAuthenticated } = useAuth();
  const { language } = useTranslation();
  const text = speechProviderTranslations[language];
  const labels = managementText[language];
  const ui = providerPageText[language];
  const [dashboard, setDashboard] = useState<GlobalSpeechDashboard | null>(null);
  const [draft, setDraft] = useState<GlobalSpeechDashboard | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);
  const [activeView, setActiveView] = useState<"routing" | "activity">("routing");
  const [activeService, setActiveService] = useState<"stt" | "tts">("stt");
  const isAdmin = isAuthenticated && user?.role === "admin";

  useEffect(() => {
    if (!isAdmin) { setIsLoading(false); return; }
    let isMounted = true;
    setIsLoading(true);
    setError("");
    fetchGlobalSpeechDashboard()
      .then((value) => {
        if (!isMounted) return;
        setDashboard(value); setDraft(value); notifySpeechProviderUpdated(value);
      })
      .catch((reason) => {
        if (isMounted) setError(reason instanceof Error ? reason.message : text.loadError);
      })
      .finally(() => { if (isMounted) setIsLoading(false); });
    return () => { isMounted = false; };
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

  return <section className="standard-page flex flex-1 flex-col text-[#1d1a3d]">
    <div className="catalogue-style-heading"><h1 className="font-display text-3xl font-bold text-[#1d1a5e]">{text.title}</h1></div>
    {error && <p className="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-4 font-semibold text-rose-800">{error}</p>}
    {success && <p className="mt-4 rounded-lg border border-teal-200 bg-teal-50 p-4 font-semibold text-teal-800">{success}</p>}
    {isLoading ? <p className="py-12 text-center font-semibold">{text.loading}</p> : draft && dashboard ? <>
      <ProviderOverview dashboard={dashboard} text={text} labels={labels} language={language} />
      <div className="mt-6 flex flex-wrap items-end justify-between gap-4 border-b border-indigo-950/10">
        <div className="flex gap-1" role="tablist" aria-label="Speech provider views">
          {(["routing", "activity"] as const).map((view) => <button key={view} type="button" role="tab" aria-selected={activeView === view} onClick={() => setActiveView(view)} className={`border-b-2 px-4 py-3 text-sm font-bold ${activeView === view ? "border-[#2a2586] text-[#2a2586]" : "border-transparent text-slate-400 hover:text-[#2a2586]"}`}>{ui[view]}</button>)}
        </div>
          <div className="mb-2 inline-flex rounded-lg bg-[#f3f3fb] p-1" role="tablist" aria-label="Speech service">
            {(["stt", "tts"] as const).map((service) => (
              <button
                key={service}
                type="button"
                role="tab"
                aria-selected={activeService === service}
                onClick={() => setActiveService(service)}
                className={`min-h-[40px] rounded-md px-7 text-sm font-bold uppercase transition ${activeService === service ? "bg-white text-[#2a2586] shadow-sm" : "text-slate-500 hover:text-[#2a2586]"}`}
              >
                {service}
              </button>
            ))}
          </div>
      </div>
      {activeView === "routing" ? <>
        <CompactProviderSection service={activeService} draft={draft} labels={labels} text={text} language={language} updateCapability={updateCapability} move={move} />
        <button type="button" disabled={saving} onClick={() => void save()} className="mt-5 min-h-[46px] self-start rounded-lg bg-[#2a2586] px-6 text-sm font-bold text-white shadow-sm transition hover:bg-[#1d1a5e] focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 disabled:opacity-60">{labels.save}</button>
      </> : <CompactHistory dashboard={dashboard} eventTitle={text.eventHistory} emptyText={text.noEvents} locale={text.locale} language={language} />}
    </> : !error ? <p className="py-12 text-center font-semibold">{text.loadError}</p> : null}
  </section>;
}

function ProviderOverview({ dashboard, text, labels, language }: { dashboard: GlobalSpeechDashboard; text: ReturnType<typeof getText>; labels: Record<string, string>; language: LanguageCode }) {
  const ui = providerPageText[language];
  const activeStt = dashboard.capabilities.find((item) => item.service_type === "stt" && item.provider_key === dashboard.active_stt_provider);
  const activeTts = dashboard.capabilities.find((item) => item.service_type === "tts" && item.provider_key === dashboard.active_tts_provider);
  const sttSeconds = dashboard.usage_history.reduce((total, item) => item.service_type === "stt" ? total + item.audio_seconds_used : total, 0);
  const sttMinutes = sttSeconds / 60;
  const ttsCharacters = dashboard.usage_history.reduce((total, item) => item.service_type === "tts" ? total + item.characters_used : total, 0);
  const cards = [
    { label: ui.activeStt, value: localizedProviderName(dashboard.active_stt_provider, language), detail: `${labels.priority} ${activeStt?.priority ?? "-"} · ${localizedStatus(activeStt?.health_status, language)}` },
    { label: ui.activeTts, value: localizedProviderName(dashboard.active_tts_provider, language), detail: `${labels.priority} ${activeTts?.priority ?? "-"} · ${localizedStatus(activeTts?.health_status, language)}` },
    { label: sttUsageLabel(language), value: `${sttMinutes.toLocaleString(text.locale, { maximumFractionDigits: 2 })} ${fullMinuteLabel(language)}`, detail: ui.across },
    { label: ui.ttsUsage, value: `${ttsCharacters.toLocaleString(text.locale)} ${text.characters}`, detail: ui.across },
  ];
  const cardStyles = [
    { surface: "border-indigo-200 bg-indigo-50/45", accent: "bg-[#3932a8]", badge: "bg-indigo-100 text-[#302992]", service: "STT" },
    { surface: "border-cyan-200 bg-cyan-50/45", accent: "bg-cyan-400", badge: "bg-cyan-100 text-teal-800", service: "TTS" },
    { surface: "border-violet-200 bg-violet-50/40", accent: "bg-violet-500", badge: "bg-violet-100 text-violet-800", service: "STT" },
    { surface: "border-teal-200 bg-teal-50/45", accent: "bg-teal-500", badge: "bg-teal-100 text-teal-800", service: "TTS" },
  ];
  return <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards.map((card, index) => { const style = cardStyles[index]; return <article key={card.label} className={`relative overflow-hidden rounded-lg border p-5 shadow-[0_10px_24px_rgba(29,26,94,0.04)] ${style.surface}`}><span className={`absolute inset-x-0 top-0 h-1 ${style.accent}`} aria-hidden="true" /><div className="flex items-start justify-between gap-3"><p className="text-sm font-semibold text-slate-500">{card.label}</p><span className={`rounded-full px-2.5 py-1 text-[11px] font-extrabold ${style.badge}`}>{style.service}</span></div><p className="mt-3 text-2xl font-extrabold text-[#1d1a5e]">{card.value}</p><p className="mt-1 text-sm font-medium text-slate-500">{card.detail}</p></article>; })}</div>;
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
  const ui = providerPageText[language];
  const [testResults, setTestResults] = useState<Record<string, string>>({});
  const items = useMemo(
    () => draft.capabilities.filter((item) => item.service_type === service).sort((a, b) => a.priority - b.priority),
    [draft.capabilities, service],
  );
  const active = service === "tts" ? draft.active_tts_provider : draft.active_stt_provider;
  const minuteUnit = fullMinuteLabel(language);

  return <section className="mt-5">
    <div className="rounded-xl border border-indigo-950/10 bg-white px-6 py-5">
      <p className="text-xs font-bold uppercase tracking-wider text-slate-400">{ui.failover} · {service.toUpperCase()}</p>
      <div className="mt-4 flex flex-wrap items-center gap-3">{items.map((item, index) => <div key={item.provider_key} className="contents"><span className={`rounded-lg px-4 py-3 text-sm font-bold ${item.provider_key === active ? "border border-cyan-300 bg-cyan-50 text-[#2a2586]" : "bg-[#f3f3fb] text-slate-600"}`}><i className={`mr-2 inline-block h-2 w-2 rounded-full ${item.provider_key === active ? "bg-cyan-400" : "bg-slate-400"}`} />{localizedProviderName(item.provider_key, language)}{item.quota_type === "unlimited" ? ` (${labels.unlimited})` : ""}</span>{index < items.length - 1 && <span className="text-slate-400">→</span>}</div>)}</div>
    </div>
    <div className="mt-4 overflow-hidden rounded-xl border border-indigo-950/10 bg-white">{items.map((item, index) => <article key={item.provider_key} className={`border-b border-indigo-950/10 last:border-b-0 ${providerRowStyle(item.provider_key, item.provider_key === active)}`}>
      <div className="grid items-center gap-4 px-5 py-5 md:grid-cols-[44px_minmax(190px,1.5fr)_minmax(150px,1fr)_110px_auto]">
        <span className={`flex h-8 w-8 items-center justify-center rounded-lg text-sm font-extrabold ${providerNumberStyle(item.provider_key)}`}>{index + 1}</span>
        <div><div className="flex items-center gap-2"><span className={`h-2.5 w-2.5 rounded-full ${item.provider_key === active ? "bg-teal-500" : item.enabled ? "bg-slate-300" : "bg-slate-200"}`} /><h3 className="font-bold">{localizedProviderName(item.provider_key, language)} {service.toUpperCase()}</h3></div><p className="mt-1 text-xs text-slate-500">{labels.priority} {item.priority} · {item.configured ? localizedStatus(item.health_status, language) : labels.unsupported}</p></div>
        <div><Metric label={text.used} value={item.quota_type === "unlimited" ? `${item.used} ${text.requests}` : `${formatCapabilityAmount(item.used, service, text.locale)} / ${formatCapabilityAmount(item.quota_limit ?? 0, service, text.locale)} ${service === "stt" ? minuteUnit : text.characters} · ${(item.usage_percent ?? 0).toFixed(1)}%`} /><div className="mt-2 h-2 overflow-hidden rounded-full bg-white/80 ring-1 ring-indigo-950/5"><div className={`h-full rounded-full ${providerBarStyle(item.provider_key)}`} style={{ width: `${item.quota_type === "unlimited" ? 0 : Math.max(1, Math.min(100, item.usage_percent ?? 0))}%` }} /></div></div>
        <div><p className="text-xs font-bold uppercase text-slate-500">{text.status}</p><span className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs font-bold ${providerStatusStyle(item.quota_status, item.quota_type)}`}>{item.quota_type === "unlimited" ? labels.unlimited : localizedStatus(item.quota_status, language)}</span></div>
        <div className="flex gap-1"><button type="button" aria-label={labels.up} disabled={index === 0} onClick={() => move(service, item.provider_key, -1)} className="h-9 w-9 rounded-lg border border-indigo-950/10 font-bold text-[#2a2586] hover:bg-[#f3f3fb] disabled:opacity-30">↑</button><button type="button" aria-label={labels.down} disabled={index === items.length - 1} onClick={() => move(service, item.provider_key, 1)} className="h-9 w-9 rounded-lg border border-indigo-950/10 font-bold text-[#2a2586] hover:bg-[#f3f3fb] disabled:opacity-30">↓</button></div>
      </div>
      <details className="border-t border-indigo-950/5 bg-white/70">
        <summary className="cursor-pointer px-5 py-3 text-sm font-bold text-[#3730a3] hover:bg-cyan-50/60">{ui.configure} ›</summary>
        <div className="border-t border-indigo-950/10 bg-[#fafbff] p-5">
          <div className="mb-5 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-indigo-950/10 bg-white p-4"><label className="flex items-center justify-between gap-3 font-bold text-[#1d1a5e]"><span>{labels.enabled}</span><input type="checkbox" checked={item.enabled} disabled={!item.configured} onChange={(event) => { if (!event.target.checked && active === item.provider_key && !window.confirm(labels.confirmDisable)) return; updateCapability(item.provider_key, service, { enabled: event.target.checked }); }} className="h-5 w-5 accent-[#2a2586]" /></label><p className="mt-2 text-xs text-slate-400">{item.configured ? labels.configured : labels.unsupported}</p></div>
            <div className="rounded-xl border border-indigo-950/10 bg-white p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wider text-slate-400">{labels.health}</p><p className="mt-1 font-bold text-[#1d1a5e]">{localizedStatus(item.health_status, language)}</p></div><button type="button" disabled={!item.configured} onClick={() => void testSpeechProvider(service, item.provider_key).then((result) => setTestResults((current) => ({ ...current, [item.provider_key]: localizedStatus(result.status, language) })))} className="min-h-[40px] rounded-lg border border-cyan-300 bg-cyan-50 px-4 text-sm font-bold text-[#2a2586] hover:bg-cyan-100 disabled:opacity-40">{testLabel(language)}</button></div>{testResults[item.provider_key] && <p className="mt-2 text-xs font-semibold text-teal-700">{testResults[item.provider_key]}</p>}</div>
          </div>
          <div className="grid gap-4 rounded-xl border border-indigo-950/10 bg-white p-5 sm:grid-cols-2 lg:grid-cols-4">
          <Metric label={text.remaining} value={item.remaining === null ? labels.unlimited : `${formatCapabilityAmount(item.remaining, service, text.locale)} ${service === "stt" ? minuteUnit : text.characters}`} />
          {item.quota_type === "limited" && <><NumberField label={`${labels.limit} (${service === "stt" ? minuteUnit : text.characters})`} value={toCapabilityDisplay(item.quota_limit ?? 1, service)} step={service === "stt" ? 0.5 : 1} onChange={(value) => updateCapability(item.provider_key, service, { quota_limit: fromCapabilityDisplay(value, service) })} /><NumberField label={`${labels.warning.replace(" %", "")} (${service === "stt" ? minuteUnit : text.characters})`} value={toCapabilityDisplay(item.warning_threshold_value, service)} max={toCapabilityDisplay(item.quota_limit ?? 1, service)} step={service === "stt" ? 0.5 : 1} onChange={(value) => updateCapability(item.provider_key, service, { warning_threshold_value: fromCapabilityDisplay(value, service) })} /><NumberField label={`${labels.switching.replace(" %", "")} (${service === "stt" ? minuteUnit : text.characters})`} value={toCapabilityDisplay(item.switch_threshold_value, service)} max={toCapabilityDisplay(item.quota_limit ?? 1, service)} step={service === "stt" ? 0.5 : 1} onChange={(value) => updateCapability(item.provider_key, service, { switch_threshold_value: fromCapabilityDisplay(value, service) })} /><label className="text-sm font-bold text-slate-600">{labels.period}<select value={item.billing_period_type} onChange={(event) => updateCapability(item.provider_key, service, { billing_period_type: event.target.value as SpeechCapability["billing_period_type"] })} className="mt-2 min-h-[44px] w-full rounded-lg border border-indigo-950/10 bg-white px-3 outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-200">{["calendar_month", "custom_monthly", "manual"].map((value) => <option key={value} value={value}>{labels[value]}</option>)}</select></label>{item.billing_period_type === "custom_monthly" && <NumberField label={labels.resetDay} value={item.reset_day ?? 1} max={28} onChange={(reset_day) => updateCapability(item.provider_key, service, { reset_day })} />}</>}
          <Metric label={labels.lastSuccess} value={formatDate(item.last_success_at, text.locale)} /><Metric label={labels.lastFailure} value={formatDate(item.last_failure_at, text.locale)} />
          </div>
        </div>
      </details>
    </article>)}</div>
  </section>;
}

function CompactHistory({ dashboard, eventTitle, emptyText, locale, language }: { dashboard: GlobalSpeechDashboard; eventTitle: string; emptyText: string; locale: string; language: LanguageCode }) {
  const pageSize = 6;
  const [eventPage, setEventPage] = useState(0);
  const eventItems = dashboard.events.slice(eventPage * pageSize, (eventPage + 1) * pageSize);
  return <div className="mt-6">
    <UsageComparison dashboard={dashboard} locale={locale} language={language} />
    <div className="mt-5">
      <ActivityList title={eventTitle} page={eventPage} total={dashboard.events.length} pageSize={pageSize} onPage={setEventPage} language={language}>
        {eventItems.length ? eventItems.map((item) => (
          <article key={item.id} className="grid gap-4 border-b border-indigo-950/10 py-5 last:border-0 md:grid-cols-[12px_minmax(180px,0.8fr)_minmax(280px,1.5fr)_auto] md:items-start">
            <span className={`mt-1.5 h-3 w-3 rounded-full ring-4 ${item.service_type === "tts" ? "bg-cyan-400 ring-cyan-50" : "bg-[#3730a3] ring-indigo-50"}`} />
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <strong className="text-[#1d1a5e]">{localizedEventType(item.event_type, language)}</strong>
                <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${item.service_type === "tts" ? "bg-cyan-50 text-teal-700" : "bg-indigo-50 text-[#3730a3]"}`}>{item.service_type.toUpperCase()}</span>
              </div>
              <p className="mt-1 text-xs text-slate-400">{formatDate(item.created_at, locale)}</p>
              {item.administrator_name && <p className="mt-1 text-xs font-semibold text-slate-500">{item.administrator_name}</p>}
            </div>
            <div>
              {(item.previous_provider || item.new_provider) && <p className="mb-2 inline-flex items-center gap-2 rounded-full bg-teal-50 px-3 py-1.5 text-xs font-bold text-teal-700"><span>{localizedProviderName((item.previous_provider ?? item.new_provider) as GlobalSpeechProvider, language)}</span><span aria-hidden="true">→</span><span>{localizedProviderName((item.new_provider ?? item.previous_provider) as GlobalSpeechProvider, language)}</span></p>}
              <p className="text-sm leading-6 text-slate-700">{localizedEventReason(item.event_type, language)}</p>
            </div>
            <span className={`hidden h-full w-1 rounded-full md:block ${item.service_type === "tts" ? "bg-cyan-400" : "bg-[#3730a3]"}`} aria-hidden="true" />
          </article>
        )) : <p className="py-12 text-center font-semibold text-slate-500">{emptyText}</p>}
      </ActivityList>
    </div>
  </div>;
}

function UsageComparison({ dashboard, locale, language }: { dashboard: GlobalSpeechDashboard; locale: string; language: LanguageCode }) {
  const providers = (["azure", "soniox"] as GlobalSpeechProvider[]).map((provider) => ({
    provider,
    stt: dashboard.usage_history.filter((item) => item.provider === provider && item.service_type === "stt").reduce((sum, item) => sum + item.audio_seconds_used, 0) / 60,
    tts: dashboard.usage_history.filter((item) => item.provider === provider && item.service_type === "tts").reduce((sum, item) => sum + item.characters_used, 0),
  }));
  const maxStt = Math.max(1, ...providers.map((item) => item.stt));
  const maxTts = Math.max(1, ...providers.map((item) => item.tts));
  return <section className="grid gap-8 rounded-xl border border-indigo-950/10 bg-white p-7 md:grid-cols-2">
    <UsageBars title={providerPageText[language].usageStt} values={providers.map((item) => ({ name: localizedProviderName(item.provider, language), value: item.stt, percent: item.stt / maxStt * 100 }))} locale={locale} />
    <UsageBars title={providerPageText[language].usageTts} values={providers.map((item) => ({ name: localizedProviderName(item.provider, language), value: item.tts, percent: item.tts / maxTts * 100 }))} locale={locale} />
  </section>;
}

function UsageBars({ title, values, locale }: { title: string; values: Array<{ name: string; value: number; percent: number }>; locale: string }) {
  return <div><h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">{title}</h2><div className="mt-5 flex h-36 items-end justify-around gap-6">{values.map((item, index) => <div key={item.name} className="flex h-full flex-1 flex-col items-center justify-end"><strong className="mb-2 text-sm text-[#1d1a5e]">{item.value.toLocaleString(locale, { maximumFractionDigits: 2 })}</strong><div className={`w-11 rounded-t-lg ${index === 0 ? "bg-[#3730a3]" : "bg-cyan-400"}`} style={{ height: `${Math.max(6, item.percent)}%` }} /><span className="mt-2 text-sm text-slate-400">{item.name}</span></div>)}</div></div>;
}

function ActivityList({ title, page, total, pageSize, onPage, language, children }: { title: string; page: number; total: number; pageSize: number; onPage: (page: number) => void; language: LanguageCode; children: React.ReactNode }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  return <section className="rounded-xl border border-indigo-950/10 bg-white p-5"><div className="flex items-center justify-between"><h2 className="text-lg font-bold text-[#1d1a5e]">{title}</h2><span className="text-xs font-bold text-slate-400">{page + 1} / {pages}</span></div><div className="mt-2 min-h-[240px]">{children}</div><div className="mt-3 flex justify-end gap-2"><button type="button" aria-label={providerPageText[language].previous} disabled={page === 0} onClick={() => onPage(page - 1)} className="h-9 w-9 rounded-lg border border-indigo-950/10 text-[#2a2586] disabled:opacity-30">←</button><button type="button" aria-label={providerPageText[language].next} disabled={page + 1 >= pages} onClick={() => onPage(page + 1)} className="h-9 w-9 rounded-lg border border-indigo-950/10 text-[#2a2586] disabled:opacity-30">→</button></div></section>;
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
function NumberField({ label, value, max, step = 1, onChange }: { label: string; value: number; max?: number; step?: number; onChange: (value: number) => void }) { return <label className="text-sm font-bold text-slate-600">{label}<input type="number" min={step} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} className="mt-2 min-h-[44px] w-full rounded-lg border border-indigo-950/10 bg-white px-3 outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-200" /></label>; }
function Metric({ label, value }: { label: string; value: string }) { return <div><p className="text-xs font-bold uppercase text-slate-500">{label}</p><p className="mt-1 font-semibold">{value}</p></div>; }
function providerName(value: GlobalSpeechProvider) { return value === "azure" ? "Microsoft Azure" : value === "soniox" ? "Soniox" : "Browser"; }
function localizedProviderName(value: GlobalSpeechProvider, language: LanguageCode) { return value === "browser" ? providerPageText[language].browser : providerName(value); }
function localizedStatus(value: string | null | undefined, language: LanguageCode) {
  if (!value) return "-";
  const ui = providerPageText[language];
  if (value === "client_check_required") return ({ en: "Browser check required", es: "Se requiere una comprobación del navegador", de: "Browserprüfung erforderlich", tr: "Tarayıcı kontrolü gerekli", pt: "É necessária uma verificação do navegador", fr: "Une vérification du navigateur est requise" })[language];
  return ({ healthy: ui.healthy, available: ui.healthy, success: ui.healthy, unavailable: ui.unavailable, normal: ui.normal, warning: ui.warning, critical: ui.critical, reached: ui.reached, quota_reached: ui.reached, unlimited: managementText[language].unlimited })[value] ?? value;
}
function localizedEventType(value: string, language: LanguageCode) {
  const ui = providerPageText[language];
  return ({ settings_changed: ui.settingsChanged, automatic_fallback: ui.automaticSwitch, switch_threshold_reached: ui.automaticSwitch, quota_warning: ui.quotaWarning, quota_reached: ui.quotaReached, quota_exceeded: ui.quotaReached, provider_failure: ui.providerFailure, provider_recovered: ui.providerRecovered })[value] ?? ui.activity;
}
function localizedEventReason(value: string, language: LanguageCode) {
  const ui = providerPageText[language];
  return ({ settings_changed: ui.settingsReason, automatic_fallback: ui.switchReason, switch_threshold_reached: ui.switchReason, quota_warning: ui.warningReason, quota_reached: ui.reachedReason, quota_exceeded: ui.reachedReason, provider_failure: ui.failureReason, provider_recovered: ui.recoveredReason })[value] ?? ui.failureReason;
}
function providerRowStyle(provider: GlobalSpeechProvider, active: boolean) {
  if (active) return "bg-cyan-50/70 shadow-[inset_4px_0_0_#2dd8d8]";
  if (provider === "azure") return "bg-indigo-50/35 shadow-[inset_4px_0_0_#6366f1]";
  if (provider === "soniox") return "bg-teal-50/30 shadow-[inset_4px_0_0_#14b8a6]";
  return "bg-amber-50/35 shadow-[inset_4px_0_0_#f59e0b]";
}
function providerNumberStyle(provider: GlobalSpeechProvider) {
  return provider === "azure" ? "bg-indigo-100 text-indigo-700" : provider === "soniox" ? "bg-teal-100 text-teal-700" : "bg-amber-100 text-amber-700";
}
function providerBarStyle(provider: GlobalSpeechProvider) {
  return provider === "azure" ? "bg-indigo-500" : provider === "soniox" ? "bg-teal-500" : "bg-amber-500";
}
function providerStatusStyle(status: string, quotaType: SpeechCapability["quota_type"]) {
  if (quotaType === "unlimited") return "bg-amber-100 text-amber-700";
  if (status === "normal") return "bg-emerald-100 text-emerald-700";
  if (status === "warning") return "bg-amber-100 text-amber-700";
  return "bg-rose-100 text-rose-700";
}
function toCapabilityDisplay(value: number, service: "tts" | "stt") { return service === "stt" ? Number((value / 60).toFixed(2)) : value; }
function fromCapabilityDisplay(value: number, service: "tts" | "stt") { return service === "stt" ? Math.round(value * 60) : value; }
function formatCapabilityAmount(value: number, service: "tts" | "stt", locale: string) { return toCapabilityDisplay(value, service).toLocaleString(locale, { maximumFractionDigits: 2 }); }
function formatMinutes(seconds: number, locale: string) { return (seconds / 60).toLocaleString(locale, { maximumFractionDigits: 2 }); }
function fullMinuteLabel(language: LanguageCode) { return ({ en: "minutes", es: "minutos", de: "Minuten", tr: "dakika", pt: "minutos", fr: "minutes" })[language]; }
function sttUsageLabel(language: LanguageCode) { return ({ en: "STT usage (30 days)", es: "Uso de STT (30 días)", de: "STT-Nutzung (30 Tage)", tr: "STT kullanımı (30 gün)", pt: "Uso de STT (30 dias)", fr: "Utilisation STT (30 jours)" })[language]; }
function acrossProvidersLabel(language: LanguageCode) { return ({ en: "Across all providers", es: "En todos los proveedores", de: "Über alle Anbieter", tr: "Tüm sağlayıcılarda", pt: "Em todos os provedores", fr: "Tous fournisseurs confondus" })[language]; }
function fullMinuteLabelFromLocale(locale: string) { return locale.startsWith("es") ? "minutos" : locale.startsWith("de") ? "Minuten" : locale.startsWith("tr") ? "dakika" : locale.startsWith("pt") ? "minutos" : "minutes"; }
function formatDate(value: string | null, locale: string) { return value ? new Date(value).toLocaleString(locale) : "-"; }
function getText() { return speechProviderTranslations.en; }
function testLabel(language: LanguageCode) { return ({ en: "Test provider", es: "Probar proveedor", de: "Anbieter testen", tr: "Sağlayıcıyı test et", pt: "Testar provedor", fr: "Tester le fournisseur" })[language]; }
