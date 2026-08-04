import { Link } from "react-router-dom";
import {
  ArrowRight,
  BriefcaseBusiness,
  Bus,
  Clock3,
  HeartHandshake,
  Landmark,
  MessagesSquare,
  ReceiptText,
  ShoppingBag,
  Ticket,
  UsersRound,
  Utensils,
  WalletCards,
} from "lucide-react";

import { useAuth } from "../context/AuthContext";
import { useTranslation } from "../i18n";
import type { Scenario } from "../types/scenario";

type ScenarioCardProps = {
  scenario: Scenario;
  isAvailable: boolean;
};

const scenarioIcons = {
  shopping: ShoppingBag,
  "cinema-theatre-tickets": Ticket,
  "restaurant-ordering": Utensils,
  "public-transport": Bus,
  "atm-withdrawal": Landmark,
  "time-off-overwhelmed": BriefcaseBusiness,
  "online-bill-payment": ReceiptText,
  "weekly-spending-plan": WalletCards,
  "consoling-a-friend": HeartHandshake,
  "managing-delay-calmly": Clock3,
  "conflict-perspective-taking": MessagesSquare,
  "short-team-discussion": UsersRound,
};

const cardThemes = [
  "border-cyan-200 bg-cyan-50/75",
  "border-indigo-100 bg-indigo-50/65",
  "border-violet-100 bg-violet-50/65",
  "border-sky-200 bg-sky-50/70",
  "border-cyan-200 bg-cyan-50/75",
  "border-indigo-100 bg-indigo-50/65",
];

export function ScenarioCard({ scenario, isAvailable }: ScenarioCardProps) {
  const { isAuthenticated, isGuest } = useAuth();
  const { t } = useTranslation();
  const formattedId = Number(scenario.id).toString().padStart(2, "0");
  const Icon = scenarioIcons[scenario.slug as keyof typeof scenarioIcons] ?? MessagesSquare;
  const theme = cardThemes[(Number(scenario.id) - 1) % cardThemes.length];

  return (
    <article
      className={`group relative flex min-h-[300px] flex-col overflow-hidden rounded-[22px] border p-6 transition duration-300 motion-reduce:transform-none motion-reduce:transition-none ${theme} ${
        isAvailable
          ? "border-cyan-400 bg-cyan-50/95 shadow-[0_18px_38px_-22px_rgba(45,216,216,0.55)] hover:-translate-y-1 hover:border-indigo-300 hover:bg-indigo-50/90 hover:shadow-[0_26px_52px_-22px_rgba(48,41,146,0.38)]"
          : "opacity-[0.88] hover:-translate-y-1 hover:border-indigo-200 hover:bg-white/95 hover:opacity-100 hover:shadow-[0_24px_48px_-22px_rgba(48,41,146,0.3)]"
      }`}
    >
      <span className={`pointer-events-none absolute right-5 top-1 font-display text-[5.6rem] font-extrabold leading-none transition-colors duration-300 ${isAvailable ? "text-cyan-200/65 group-hover:text-indigo-200/80" : "text-white/80 group-hover:text-cyan-100/90"}`} aria-hidden="true">
        {formattedId}
      </span>
      <div className="relative z-10">
        <div className="mb-4 flex items-start gap-4">
          <div
            className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border font-display ${
              isAvailable
                ? "border-white/90 bg-white text-[#302992] shadow-md transition duration-300 group-hover:-rotate-3 group-hover:border-[#302992] group-hover:bg-[#302992] group-hover:text-white group-hover:shadow-lg motion-reduce:transform-none"
                : "border-white/80 bg-white/65 text-[#302992] transition duration-300 group-hover:-rotate-3 group-hover:border-[#302992] group-hover:bg-[#302992] group-hover:text-white group-hover:shadow-md motion-reduce:transform-none"
            }`}
          >
            <Icon className="h-7 w-7" aria-hidden="true" />
          </div>
        </div>
        <h2 className={`max-w-[85%] font-display text-lg font-bold leading-[1.35] transition-colors duration-300 ${isAvailable ? "text-[#1d1a5e] group-hover:text-[#3730a3]" : "text-[#555478]"}`}>
          {scenario.title}
        </h2>
        <p className={`mt-3 text-sm leading-[1.65] ${isAvailable ? "text-[#4f4e70]" : "text-[#77758f]"}`}>
          {scenario.description}
        </p>
      </div>
      {isAvailable ? (
        <Link
          to={isAuthenticated || isGuest ? `/scenario/${scenario.slug}` : "/login"}
          state={isAuthenticated || isGuest ? undefined : { from: `/scenario/${scenario.slug}` }}
          className="landing-primary-action group/action mt-auto inline-flex min-h-[50px] items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-bold text-white shadow-md transition hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2"
        >
          {t("openScenario")} <ArrowRight className="h-4 w-4 transition-transform group-hover/action:translate-x-1" aria-hidden="true" />
        </Link>
      ) : (
        <button
          type="button"
          disabled
          className="mt-auto inline-flex min-h-[50px] cursor-not-allowed items-center justify-center rounded-full border border-white/90 bg-white/55 px-5 py-3 text-sm font-bold text-[#85839c]"
        >
          {t("comingSoon")}
        </button>
      )}
    </article>
  );
}
