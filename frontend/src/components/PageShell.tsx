import { useEffect, useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import { languages, useTranslation } from "../i18n";
import {
  getSttUsage,
  STT_USAGE_UPDATED_EVENT,
  type SttUsage,
} from "../services/sttUsageService";
import {
  getTtsUsage,
  TTS_USAGE_UPDATED_EVENT,
  type TtsUsage,
} from "../services/ttsUsageService";
import atmWallBackground from "../assets/atm-wall-background.png";
import {
  fetchGlobalSpeechDashboard,
  SPEECH_PROVIDER_UPDATED_EVENT,
  SPEECH_PROVIDER_USED_EVENT,
  type GlobalSpeechDashboard,
  type GlobalSpeechProvider,
} from "../services/speechProviderService";

export function PageShell() {
  const location = useLocation();
  const { language, setLanguage, t } = useTranslation();
  const { user, isAuthenticated, isGuest, logout } = useAuth();
  const [ttsUsage, setTtsUsage] = useState<TtsUsage | null>(null);
  const [sttUsage, setSttUsage] = useState<SttUsage | null>(null);
  const [speechProviders, setSpeechProviders] = useState<GlobalSpeechDashboard | null>(null);
  const hasSession = isAuthenticated || isGuest;
  const isAdmin = isAuthenticated && user?.role === "admin";
  const isAtmScenario = location.pathname === "/scenario/atm-withdrawal";
  const homeTarget = isAuthenticated ? "/scenarios" : "/login";

  useEffect(() => {
    if (!isAuthenticated) {
      setTtsUsage(null);
      setSttUsage(null);
      return;
    }

    let isMounted = true;

    getTtsUsage()
      .then((usage) => {
        if (isMounted) {
          setTtsUsage(usage);
        }
      })
      .catch(() => {
        if (isMounted) {
          setTtsUsage(null);
        }
      });
    getSttUsage()
      .then((usage) => {
        if (isMounted) {
          setSttUsage(usage);
        }
      })
      .catch(() => {
        if (isMounted) {
          setSttUsage(null);
        }
      });

    const handleUsageUpdate = (event: Event) => {
      setTtsUsage((event as CustomEvent<TtsUsage>).detail);
    };
    const handleSttUsageUpdate = (event: Event) => {
      setSttUsage((event as CustomEvent<SttUsage>).detail);
    };

    window.addEventListener(TTS_USAGE_UPDATED_EVENT, handleUsageUpdate);
    window.addEventListener(STT_USAGE_UPDATED_EVENT, handleSttUsageUpdate);

    return () => {
      isMounted = false;
      window.removeEventListener(TTS_USAGE_UPDATED_EVENT, handleUsageUpdate);
      window.removeEventListener(STT_USAGE_UPDATED_EVENT, handleSttUsageUpdate);
    };
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAdmin) {
      setSpeechProviders(null);
      return;
    }
    let isMounted = true;
    fetchGlobalSpeechDashboard()
      .then((dashboard) => {
        if (isMounted) setSpeechProviders(dashboard);
      })
      .catch(() => {
        if (isMounted) setSpeechProviders(null);
      });
    const handleProviderUpdate = (event: Event) => {
      setSpeechProviders((event as CustomEvent<GlobalSpeechDashboard>).detail);
    };
    const handleProviderUsed = (event: Event) => {
      const detail = (event as CustomEvent<{ serviceType: "tts" | "stt"; provider: GlobalSpeechProvider }>).detail;
      setSpeechProviders((current) => current ? {
        ...current,
        ...(detail.serviceType === "tts"
          ? { active_tts_provider: detail.provider }
          : { active_stt_provider: detail.provider }),
      } : current);
    };
    window.addEventListener(SPEECH_PROVIDER_UPDATED_EVENT, handleProviderUpdate);
    window.addEventListener(SPEECH_PROVIDER_USED_EVENT, handleProviderUsed);
    return () => {
      isMounted = false;
      window.removeEventListener(SPEECH_PROVIDER_UPDATED_EVENT, handleProviderUpdate);
      window.removeEventListener(SPEECH_PROVIDER_USED_EVENT, handleProviderUsed);
    };
  }, [isAdmin]);

  return (
    <div
      className={`flex min-h-screen flex-col selection:bg-teal-100 selection:text-slate-900 ${
        isAtmScenario ? "bg-slate-950 text-slate-100" : "bg-slate-50 text-slate-800"
      }`}
      style={
        isAtmScenario
          ? {
              backgroundImage: `linear-gradient(rgba(15, 23, 42, 0.08), rgba(15, 23, 42, 0.22)), url(${atmWallBackground})`,
              backgroundPosition: "center top",
              backgroundRepeat: "no-repeat",
              backgroundSize: "cover",
            }
          : undefined
      }
    >
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur">
        <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
          <Link
            to={homeTarget}
            className="flex items-center gap-3 text-xl font-bold tracking-tight text-slate-900 transition-opacity hover:opacity-85"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-md bg-slate-900">
              <span className="h-4 w-4 rounded-full border-2 border-teal-400" />
            </span>
            <span>ASSIST-AI</span>
          </Link>
          <div className="flex items-center gap-3">
            {ttsUsage && !isAdmin && (
              <div
                className="hidden min-h-[44px] items-center rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-sm lg:inline-flex"
                aria-label={`${t("voiceCredits")}: ${ttsUsage.remaining} left from ${ttsUsage.limit}`}
                title={`${t("voiceCredits")}: ${ttsUsage.used} used, ${ttsUsage.remaining} left, ${ttsUsage.limit} weekly limit. Resets ${formatResetDate(ttsUsage.resetDate)}`}
              >
                <span className="mr-2 h-2 w-2 rounded-full bg-teal-400" aria-hidden="true" />
                {t("voiceCredits")}: {ttsUsage.remaining.toLocaleString()} /{" "}
                {ttsUsage.limit.toLocaleString()}
              </div>
            )}
            {sttUsage && !isAdmin && (
              <div
                className="hidden min-h-[44px] items-center rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-sm xl:inline-flex"
                aria-label={`${t("speechCredits")}: ${formatSeconds(sttUsage.remaining)} left from ${formatSeconds(sttUsage.limit)}`}
                title={`${t("speechCredits")}: ${formatSeconds(sttUsage.used)} used, ${formatSeconds(sttUsage.remaining)} left, ${formatSeconds(sttUsage.limit)} weekly limit. Resets ${formatResetDate(sttUsage.resetDate)}`}
              >
                <span className="mr-2 h-2 w-2 rounded-full bg-sky-400" aria-hidden="true" />
                {t("speechCredits")}: {formatSeconds(sttUsage.remaining)} /{" "}
                {formatSeconds(sttUsage.limit)}
              </div>
            )}
            <Link
              to="/scenarios"
              className="inline-flex min-h-[44px] items-center rounded-lg border border-teal-200 bg-teal-50 px-4 py-2 text-sm font-bold text-teal-800 transition hover:bg-teal-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              {t("scenarios")}
            </Link>
            {isAuthenticated && !isAdmin && (
              <Link to="/speech-usage" className="hidden min-h-[44px] items-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 xl:inline-flex">Speech usage</Link>
            )}
            <label className="sr-only" htmlFor="language-select">
              {t("language")}
            </label>
            <select
              id="language-select"
              value={language}
              onChange={(event) => setLanguage(event.target.value as typeof language)}
              className="min-h-[44px] rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 shadow-sm outline-none transition hover:border-teal-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-500"
            >
              {languages.map((item) => (
                <option key={item.code} value={item.code}>
                  {item.label}
                </option>
              ))}
            </select>
            {hasSession ? (
              <>
                <Link
                  to="/profile"
                  className="inline-flex min-h-[44px] items-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-bold text-white transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
                >
                  {t("profile")}
                </Link>
                <button
                  type="button"
                  onClick={logout}
                  className="hidden min-h-[44px] rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-teal-500 sm:inline-flex sm:items-center"
                >
                  {t("logout")}
                </button>
              </>
            ) : (
              <Link
                to="/login"
                className="inline-flex min-h-[52px] items-center rounded-lg bg-slate-900 px-6 py-3 text-base font-bold text-white shadow-soft transition hover:-translate-y-0.5 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
              >
                {t("login")}
              </Link>
            )}
          </div>
        </nav>
        {isAdmin && (
          <nav aria-label="Admin navigation" className="border-t border-slate-100 bg-slate-50/95">
            <div className="mx-auto flex min-h-[46px] max-w-6xl items-center justify-between gap-4 overflow-x-auto px-5">
              <div className="flex h-full items-center gap-1">
                <AdminNavLink to="/admin/users" label={adminMenuText(language).users} active={location.pathname === "/admin/users"} />
                <AdminNavLink to="/admin/scenario-analytics" label={adminMenuText(language).analytics} active={location.pathname.startsWith("/admin/scenario-analytics") || location.pathname.startsWith("/admin/analytics")} />
                <AdminNavLink to="/admin/speech-providers" label={adminMenuText(language).speech} active={location.pathname === "/admin/speech-providers"} />
                <AdminNavLink to="/admin/user-quotas" label={adminMenuText(language).quotas} active={location.pathname === "/admin/user-quotas"} />
              </div>
              {speechProviders && (
                <Link to="/admin/speech-providers" className="hidden shrink-0 items-center gap-2 text-xs font-bold text-slate-600 lg:flex">
                  <span className="h-2 w-2 rounded-full bg-teal-400" />
                  TTS {providerLabel(speechProviders.active_tts_provider)} / STT {providerLabel(speechProviders.active_stt_provider)}
                </Link>
              )}
            </div>
          </nav>
        )}
      </header>
      <main
        className={`mx-auto flex w-full max-w-7xl flex-1 flex-col px-5 ${
          isAtmScenario
            ? "py-5 sm:py-7"
            : "py-8 sm:py-10"
        }`}
      >
        <Outlet />
      </main>
    </div>
  );
}

function formatSeconds(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
}

function formatResetDate(resetDate: string) {
  if (!resetDate) {
    return "weekly";
  }
  return resetDate;
}

function providerLabel(provider: GlobalSpeechProvider) {
  return provider === "azure" ? "Azure" : provider === "soniox" ? "Soniox" : "Browser";
}

function AdminNavLink({ to, label, active }: { to: string; label: string; active: boolean }) {
  return (
    <Link
      to={to}
      className={`inline-flex min-h-[45px] shrink-0 items-center border-b-2 px-3 text-sm font-bold transition-colors ${active ? "border-teal-600 text-teal-800" : "border-transparent text-slate-600 hover:border-slate-300 hover:text-slate-900"}`}
    >
      {label}
    </Link>
  );
}

function adminMenuText(language: string) {
  const copy: Record<string, { users: string; analytics: string; speech: string; quotas: string }> = {
    en: { users: "Users", analytics: "Scenario analytics", speech: "Speech providers", quotas: "User quotas" },
    es: { users: "Usuarios", analytics: "Analitica de escenarios", speech: "Proveedores de voz", quotas: "Cuotas" },
    de: { users: "Benutzer", analytics: "Szenarioanalysen", speech: "Sprachanbieter", quotas: "Kontingente" },
    tr: { users: "Kullanicilar", analytics: "Senaryo analizleri", speech: "Konusma saglayicilari", quotas: "Kullanici kotalari" },
    pt: { users: "Utilizadores", analytics: "Analise de cenarios", speech: "Provedores de voz", quotas: "Cotas" },
    fr: { users: "Utilisateurs", analytics: "Analyse des scenarios", speech: "Fournisseurs vocaux", quotas: "Quotas" },
  };
  return copy[language] ?? copy.en;
}
