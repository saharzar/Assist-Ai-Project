import { Link, Navigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";

import { useAuth } from "../context/AuthContext";
import { useTranslation, type LanguageCode } from "../i18n";

const landingContent: Record<LanguageCode, {
  eyebrow: string;
  title: string;
  accent: string;
}> = {
  en: { eyebrow: "AI practice partner", title: "Build confidence for", accent: "everyday situations" },
  es: { eyebrow: "Compañero de práctica con IA", title: "Desarrolla confianza para", accent: "situaciones cotidianas" },
  de: { eyebrow: "KI-Übungspartner", title: "Mehr Sicherheit für", accent: "Alltagssituationen" },
  tr: { eyebrow: "Yapay zekâ pratik arkadaşın", title: "Günlük durumlar için", accent: "özgüven kazan" },
  pt: { eyebrow: "Parceiro de prática com IA", title: "Ganha confiança para", accent: "situações do dia a dia" },
  fr: { eyebrow: "Partenaire d'entraînement IA", title: "Gagne en confiance dans", accent: "les situations du quotidien" },
};

export function LandingPage() {
  const { isAuthenticated, user } = useAuth();
  const { language, t } = useTranslation();
  const content = landingContent[language];

  if (isAuthenticated) {
    return <Navigate to={user?.role === "admin" ? "/admin/users" : "/scenarios"} replace />;
  }

  return (
    <section className="relative z-10 flex min-h-[calc(100vh-7rem)] flex-1 items-center py-10 sm:py-14">
      <div className="mx-auto w-full max-w-[820px] px-6 text-center lg:px-10">
        <div className="inline-flex min-h-8 items-center gap-2 rounded-full border border-cyan-300 bg-white/75 px-4 py-1.5 text-xs font-semibold uppercase text-indigo-700 shadow-sm backdrop-blur">
          <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" aria-hidden="true" />
          {content.eyebrow}
        </div>

        <h1 className="mt-7 font-display text-[2.15rem] font-extrabold leading-[1.14] text-[#1d1a5e] sm:text-5xl lg:text-[3.65rem]">
          <span className="block">{content.title}</span>
          <span className="landing-title-accent mt-1 block pb-2">{content.accent}</span>
        </h1>

        <div className="mx-auto mt-10 flex w-full max-w-[520px] flex-col gap-3 sm:flex-row">
          <Link
            to="/register"
            className="landing-primary-action group inline-flex min-h-[60px] flex-1 items-center justify-center gap-3 rounded-full px-7 py-4 text-[15px] font-bold text-white shadow-[0_14px_30px_-13px_rgba(45,100,190,0.72)] transition hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2"
          >
            {t("createAccount")} <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" aria-hidden="true" />
          </Link>
          <Link
            to="/login"
            className="inline-flex min-h-[60px] flex-1 items-center justify-center rounded-full border border-white/90 bg-white/75 px-7 py-4 text-[15px] font-bold text-[#302992] shadow-[0_12px_28px_-18px_rgba(29,26,94,0.45)] backdrop-blur-md transition hover:border-cyan-300 hover:bg-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
          >
            {t("login")}
          </Link>
        </div>

        <Link
          to="/guest"
          className="font-display group mt-5 inline-flex min-h-[44px] items-center text-[15px] font-bold text-indigo-700 transition hover:text-indigo-950 focus:outline-none focus:ring-2 focus:ring-cyan-400"
        >
          <span className="border-b-2 border-cyan-400 pb-0.5 transition-colors group-hover:border-indigo-700">
            {t("continueAsGuest")}
          </span>
        </Link>
      </div>
    </section>
  );
}
