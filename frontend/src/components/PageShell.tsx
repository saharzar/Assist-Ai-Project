import { useEffect, useRef, useState } from "react";
import { ChevronDown, Globe2 } from "lucide-react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import { languages, useTranslation, type LanguageCode } from "../i18n";
import { speechUsageTranslations } from "../lib/speechUsageTranslations";
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
import assistAiLogo from "../assets/assist-ai-logo.png";
import {
  fetchGlobalSpeechDashboard,
  SPEECH_PROVIDER_UPDATED_EVENT,
  SPEECH_PROVIDER_USED_EVENT,
  type GlobalSpeechDashboard,
  type GlobalSpeechProvider,
} from "../services/speechProviderService";

export function PageShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const { language, setLanguage, t } = useTranslation();
  const { user, isAuthenticated, isGuest, logout } = useAuth();
  const [ttsUsage, setTtsUsage] = useState<TtsUsage | null>(null);
  const [sttUsage, setSttUsage] = useState<SttUsage | null>(null);
  const [speechProviders, setSpeechProviders] = useState<GlobalSpeechDashboard | null>(null);
  const [isAtmNavigationVisible, setIsAtmNavigationVisible] = useState(false);
  const hasSession = isAuthenticated || isGuest;
  const isAdmin = isAuthenticated && user?.role === "admin";
  const isAtmScenario = location.pathname === "/scenario/atm-withdrawal/practice";
  const isLandingPage = location.pathname === "/";
  const isAuthPage =
    location.pathname === "/login" ||
    location.pathname === "/register" ||
    location.pathname === "/guest";
  const isBrandedPublicPage = isLandingPage || isAuthPage;
  const isFullBleedContent =
    location.pathname === "/scenarios" ||
    location.pathname === "/speech-usage" ||
    location.pathname === "/profile";
  const homeTarget = isAuthenticated ? "/scenarios" : "/";
  const showHeader = !isAtmScenario || isAtmNavigationVisible;

  const handleLogout = () => {
    logout();
    navigate("/", { replace: true });
  };

  useEffect(() => {
    setIsAtmNavigationVisible(false);
  }, [isAtmScenario]);

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
        isAtmScenario
          ? "bg-slate-950 text-slate-100"
          : isBrandedPublicPage
            ? "brand-atmosphere text-indigo-950"
            : "brand-atmosphere text-slate-800"
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
      {isAtmScenario && (
        <button
          type="button"
          aria-controls="primary-navigation"
          aria-expanded={isAtmNavigationVisible}
          onClick={() => setIsAtmNavigationVisible((current) => !current)}
          className="fixed bottom-4 right-4 z-30 min-h-[44px] rounded-lg border border-slate-500 bg-slate-950/95 px-4 py-2 text-sm font-bold text-white shadow-xl transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:ring-offset-2 focus:ring-offset-slate-950"
        >
          {isAtmNavigationVisible
            ? navigationToggleText(language).hide
            : navigationToggleText(language).show}
        </button>
      )}
      {isBrandedPublicPage && (
        <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
          <div className="absolute inset-x-0 top-[16%] h-[52%] bg-cyan-100/30 [clip-path:polygon(0_18%,38%_0,100%_24%,100%_86%,55%_100%,0_72%)]" />
          <div className="absolute right-0 top-0 h-[60vh] max-h-[540px] min-h-[360px] w-[36vw] min-w-[410px] rounded-bl-[100%] bg-cyan-200/70 sm:min-w-[500px]" />
          <div className="absolute bottom-0 left-0 h-[40vh] max-h-[350px] min-h-[220px] w-[23vw] min-w-[270px] rounded-tr-[100%] bg-indigo-200/40 sm:min-w-[350px]" />
          <div className="absolute bottom-[4%] right-[12%] h-[25%] w-[34%] bg-indigo-100/35 [clip-path:polygon(20%_0,100%_35%,76%_100%,0_70%)]" />
        </div>
      )}
      {showHeader && (
      <header
        id="primary-navigation"
        className={`sticky top-0 z-20 ${
          isBrandedPublicPage
            ? "border-b border-transparent bg-transparent"
            : "border-b border-indigo-950/10 bg-white/95 backdrop-blur"
        }`}
      >
        <nav className={`mx-auto flex items-center justify-between ${
          isBrandedPublicPage ? "mt-4 min-h-[72px] w-[calc(100%-2rem)] max-w-7xl rounded-[28px] border border-white/80 bg-white/85 px-5 shadow-[0_16px_45px_-28px_rgba(29,26,94,0.4)] backdrop-blur-xl sm:w-[calc(100%-3rem)] lg:px-8" : "h-[70px] max-w-7xl px-5 lg:px-10"
        }`}>
          <Link
            to={homeTarget}
            className="flex items-center transition-opacity hover:opacity-85 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
          >
            <span className="block w-11 overflow-hidden sm:w-auto">
              <img src={assistAiLogo} alt="Assist-AI" className="h-11 w-auto max-w-none sm:h-12" />
            </span>
          </Link>
          <div className="flex items-center gap-3">
            {ttsUsage && !isAdmin && (
              <div
                className="hidden min-h-[42px] items-center rounded-full border border-indigo-950/10 bg-white px-3 py-2 text-xs font-semibold text-[#5b5a78] lg:inline-flex"
                aria-label={`${t("voiceCredits")}: ${ttsUsage.remaining} left from ${ttsUsage.limit}`}
                title={`${t("voiceCredits")}: ${ttsUsage.used} used, ${ttsUsage.remaining} left, ${ttsUsage.limit} weekly limit. Resets ${formatResetDate(ttsUsage.resetDate)}`}
              >
                <span className="mr-2 h-2 w-2 rounded-full bg-cyan-400" aria-hidden="true" />
                {t("voiceCredits")}: {ttsUsage.remaining.toLocaleString()} /{" "}
                {ttsUsage.limit.toLocaleString()}
              </div>
            )}
            {sttUsage && !isAdmin && (
              <div
                className="hidden min-h-[42px] items-center rounded-full border border-indigo-950/10 bg-white px-3 py-2 text-xs font-semibold text-[#5b5a78] xl:inline-flex"
                aria-label={`${t("speechCredits")}: ${formatSeconds(sttUsage.remaining)} left from ${formatSeconds(sttUsage.limit)}`}
                title={`${t("speechCredits")}: ${formatSeconds(sttUsage.used)} used, ${formatSeconds(sttUsage.remaining)} left, ${formatSeconds(sttUsage.limit)} weekly limit. Resets ${formatResetDate(sttUsage.resetDate)}`}
              >
                <span className="mr-2 h-2 w-2 rounded-full bg-indigo-400" aria-hidden="true" />
                {t("speechCredits")}: {formatSeconds(sttUsage.remaining)} /{" "}
                {formatSeconds(sttUsage.limit)}
              </div>
            )}
            {isAuthenticated && (
              <Link
                to="/scenarios"
                className={`inline-flex min-h-[42px] items-center rounded-full border px-5 py-2 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-cyan-400 ${
                  location.pathname.startsWith("/scenario") || location.pathname === "/scenarios"
                    ? "border-cyan-400 bg-cyan-100/80 text-indigo-700 shadow-[0_5px_14px_rgba(45,216,216,0.12)]"
                    : "border-cyan-200 bg-cyan-50/70 text-indigo-700 hover:border-cyan-400 hover:bg-cyan-100/80"
                }`}
              >
                {t("scenarios")}
              </Link>
            )}
            {isAuthenticated && !isAdmin && (
              <Link to="/speech-usage" className="hidden min-h-[42px] items-center rounded-full border border-indigo-950/10 bg-white px-4 py-2 text-sm font-semibold text-[#5b5a78] transition hover:border-cyan-300 hover:text-indigo-800 focus:outline-none focus:ring-2 focus:ring-cyan-400 xl:inline-flex">{speechUsageTranslations[language].title}</Link>
            )}
            <LanguageMenu language={language} onChange={setLanguage} label={t("language")} compact={isBrandedPublicPage} />
            {hasSession ? (
              <>
                <Link
                  to="/profile"
                  className="inline-flex min-h-[42px] items-center rounded-full bg-[#2a2586] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[#1d1a5e] focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2"
                >
                  {t("profile")}
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="hidden min-h-[42px] rounded-full border border-indigo-950/10 bg-white px-5 py-2 text-sm font-semibold text-[#5b5a78] transition hover:border-indigo-300 hover:text-indigo-900 focus:outline-none focus:ring-2 focus:ring-cyan-400 sm:inline-flex sm:items-center"
                >
                  {t("logout")}
                </button>
              </>
            ) : null}
          </div>
        </nav>
        {isAdmin && (
          <nav aria-label="Admin navigation" className="border-t border-indigo-950/10 bg-[#f3f3fb]/95">
            <div className="mx-auto flex min-h-[46px] max-w-6xl items-center justify-between gap-4 overflow-x-auto px-5">
              <div className="flex h-full items-center gap-1">
                <AdminNavLink to="/admin/users" label={adminMenuText(language).users} active={location.pathname === "/admin/users"} />
                <AdminNavLink to="/admin/scenario-analytics" label={adminMenuText(language).analytics} active={location.pathname.startsWith("/admin/scenario-analytics") || location.pathname.startsWith("/admin/analytics")} />
                <AdminNavLink to="/admin/speech-providers" label={adminMenuText(language).speech} active={location.pathname === "/admin/speech-providers"} />
                <AdminNavLink to="/admin/user-quotas" label={adminMenuText(language).quotas} active={location.pathname === "/admin/user-quotas"} />
              </div>
              {speechProviders && (
                <Link to="/admin/speech-providers" className="hidden shrink-0 items-center gap-2 text-xs font-semibold text-[#5b5a78] lg:flex">
                  <span className="h-2 w-2 rounded-full bg-cyan-400" />
                  TTS {providerLabel(speechProviders.active_tts_provider)} / STT {providerLabel(speechProviders.active_stt_provider)}
                </Link>
              )}
            </div>
          </nav>
        )}
      </header>
      )}
      <main
        className={`mx-auto flex w-full flex-1 flex-col ${isAdmin && !isAtmScenario ? "admin-dashboard-main" : ""} ${
          isAtmScenario
            ? "max-w-[1600px] px-2 py-2 sm:px-4 sm:py-4"
            : isFullBleedContent
              ? "max-w-none px-0 py-0"
              : `max-w-7xl px-5 ${isBrandedPublicPage ? "py-0" : "py-8 sm:py-10"}`
        }`}
      >
        <Outlet />
      </main>
    </div>
  );
}

function LanguageMenu({ language, onChange, label, compact }: { language: LanguageCode; onChange: (language: LanguageCode) => void; label: string; compact: boolean }) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const closeMenu = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setIsOpen(false);
    };
    document.addEventListener("mousedown", closeMenu);
    return () => document.removeEventListener("mousedown", closeMenu);
  }, []);

  return (
    <div ref={menuRef} className="relative shrink-0">
      <button
        type="button"
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((current) => !current)}
        className={`group inline-flex h-10 items-center justify-center gap-1.5 rounded-full px-3.5 text-sm font-bold uppercase transition duration-200 ease-out hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 ${
          compact
            ? "bg-[#302992] text-white shadow-[0_8px_20px_-10px_rgba(48,41,146,0.8)] hover:bg-[#28cbd1] hover:text-[#211c72] hover:shadow-[0_12px_24px_-12px_rgba(40,203,209,0.9)]"
            : "border border-indigo-950/10 bg-white text-[#5b5a78] hover:border-cyan-300 hover:bg-cyan-50 hover:text-[#302992] hover:shadow-[0_10px_24px_-16px_rgba(48,41,146,0.65)]"
        }`}
      >
        <Globe2 className="h-4 w-4 transition-transform duration-200 group-hover:rotate-12" aria-hidden="true" />
        {language.toUpperCase()}
        <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} aria-hidden="true" />
      </button>
      {isOpen && (
        <div role="listbox" aria-label={label} className="absolute right-0 top-[calc(100%+0.4rem)] z-50 w-[4.75rem] overflow-hidden rounded-xl border border-indigo-950/10 bg-white py-1 shadow-[0_18px_38px_-18px_rgba(29,26,94,0.55)]">
          {languages.map((item) => (
            <button
              key={item.code}
              type="button"
              role="option"
              aria-selected={language === item.code}
              title={item.label}
              onClick={() => { onChange(item.code); setIsOpen(false); }}
              className={`relative flex h-9 w-full items-center justify-center overflow-hidden px-2 text-sm font-bold transition duration-200 ease-out focus:outline-none focus:ring-2 focus:ring-inset focus:ring-cyan-400 ${
                language === item.code
                  ? "bg-[#302992] text-white"
                  : "text-[#302992] hover:scale-[1.04] hover:bg-[#dffbfc] hover:text-[#079aa3]"
              }`}
            >
              {item.code.toUpperCase()}
            </button>
          ))}
        </div>
      )}
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
      className={`inline-flex min-h-[45px] shrink-0 items-center border-b-2 px-3 font-display text-sm font-bold tracking-normal transition-colors ${active ? "border-cyan-400 text-indigo-800" : "border-transparent text-[#5b5a78] hover:border-indigo-200 hover:text-indigo-900"}`}
    >
      {label}
    </Link>
  );
}

function adminMenuText(language: string) {
  const copy: Record<string, { users: string; analytics: string; speech: string; quotas: string }> = {
    en: { users: "Users", analytics: "Scenario analytics", speech: "Speech providers", quotas: "User quotas" },
    es: { users: "Usuarios", analytics: "Analítica de escenarios", speech: "Proveedores de voz", quotas: "Cuotas" },
    de: { users: "Benutzer", analytics: "Szenarioanalysen", speech: "Sprachanbieter", quotas: "Kontingente" },
    tr: { users: "Kullanıcılar", analytics: "Senaryo analizleri", speech: "Konuşma sağlayıcıları", quotas: "Kullanıcı kotaları" },
    pt: { users: "Utilizadores", analytics: "Análise de cenários", speech: "Provedores de voz", quotas: "Cotas" },
    fr: { users: "Utilisateurs", analytics: "Analyse des scénarios", speech: "Fournisseurs vocaux", quotas: "Quotas" },
  };
  return copy[language] ?? copy.en;
}

function navigationToggleText(language: string) {
  const copy: Record<string, { show: string; hide: string }> = {
    en: { show: "Show navigation", hide: "Hide navigation" },
    es: { show: "Mostrar navegación", hide: "Ocultar navegación" },
    de: { show: "Navigation zeigen", hide: "Navigation ausblenden" },
    tr: { show: "Navigasyonu göster", hide: "Navigasyonu gizle" },
    pt: { show: "Mostrar navegação", hide: "Ocultar navegação" },
    fr: { show: "Afficher la navigation", hide: "Masquer la navigation" },
  };
  return copy[language] ?? copy.en;
}
