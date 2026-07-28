import { Link, Navigate } from "react-router-dom";

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
    <section className="relative z-10 flex min-h-[calc(100vh-7rem)] flex-1 items-center justify-center py-12 text-center sm:py-16">
      <div className="mx-auto w-full max-w-[720px]">
        <div className="inline-flex min-h-8 items-center gap-2 rounded-full border border-cyan-300 bg-cyan-50 px-4 py-1.5 text-xs font-semibold uppercase text-indigo-700">
          <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" aria-hidden="true" />
          {content.eyebrow}
        </div>

        <h1 className="mt-7 font-sans text-[2.15rem] font-bold leading-[1.14] text-[#1d1a5e] sm:text-5xl lg:text-[3.5rem]">
          <span className="block">{content.title}</span>
          <span className="landing-title-accent mt-1 block pb-2">{content.accent}</span>
        </h1>

        <div className="mx-auto mt-11 flex w-full max-w-[340px] flex-col gap-3.5">
          <Link
            to="/register"
            className="inline-flex min-h-[64px] items-center justify-center rounded-lg bg-[#2a2586] px-7 py-4 text-[15px] font-semibold text-white shadow-[0_8px_20px_-8px_rgba(42,37,134,0.5)] transition hover:bg-[#1d1a5e] focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2"
          >
            {t("createAccount")}
          </Link>
          <Link
            to="/login"
            className="inline-flex min-h-[64px] items-center justify-center rounded-lg border-2 border-indigo-950/10 bg-white px-7 py-4 text-[15px] font-semibold text-[#2a2586] transition hover:border-indigo-300 hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-cyan-400"
          >
            {t("login")}
          </Link>
        </div>

        <Link
          to="/guest"
          className="group mt-5 inline-flex min-h-[44px] items-center text-sm font-semibold text-indigo-700 transition hover:text-indigo-950 focus:outline-none focus:ring-2 focus:ring-cyan-400"
        >
          <span className="border-b-2 border-cyan-400 pb-0.5 transition-colors group-hover:border-indigo-700">
            {t("continueAsGuest")}
          </span>
        </Link>
      </div>
    </section>
  );
}
