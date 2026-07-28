import { Link } from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import { useTranslation } from "../i18n";
import type { Scenario } from "../types/scenario";

type ScenarioCardProps = {
  scenario: Scenario;
  isAvailable: boolean;
};

export function ScenarioCard({ scenario, isAvailable }: ScenarioCardProps) {
  const { isAuthenticated, isGuest } = useAuth();
  const { t } = useTranslation();
  const formattedId = Number(scenario.id).toString().padStart(2, "0");

  return (
    <article
      className={`group flex min-h-[290px] flex-col rounded-lg border bg-white p-6 transition ${
        isAvailable
          ? "border-cyan-400 shadow-[0_16px_34px_-22px_rgba(45,216,216,0.5)] hover:-translate-y-0.5 hover:shadow-[0_18px_38px_-20px_rgba(45,216,216,0.6)]"
          : "border-indigo-950/10"
      }`}
    >
      <div>
        <div className="mb-4 flex items-start justify-between gap-4">
          <div
            className={`flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-lg font-display text-xs font-bold ${
              isAvailable
                ? "bg-cyan-50 text-indigo-700"
                : "bg-[#f3f3fb] text-[#9997ac]"
            }`}
          >
            {formattedId}
          </div>
          {isAvailable && (
            <span className="rounded-full bg-cyan-50 px-3 py-1 text-[11px] font-semibold uppercase text-teal-700">
              {t("available")}
            </span>
          )}
        </div>
        <h2 className={`font-display text-[17px] font-semibold leading-[1.35] ${isAvailable ? "text-[#1d1a5e]" : "text-[#9997ac]"}`}>
          {scenario.title}
        </h2>
        <p className={`mt-2.5 text-sm leading-[1.6] ${isAvailable ? "text-[#5b5a78]" : "text-[#9997ac]"}`}>
          {scenario.description}
        </p>
      </div>
      {isAvailable ? (
        <Link
          to={isAuthenticated || isGuest ? `/scenario/${scenario.slug}` : "/login"}
          state={isAuthenticated || isGuest ? undefined : { from: `/scenario/${scenario.slug}` }}
          className="mt-auto inline-flex min-h-[48px] items-center justify-center rounded-lg bg-[#2a2586] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#1d1a5e] focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2"
        >
          {t("openScenario")}
        </Link>
      ) : (
        <button
          type="button"
          disabled
          className="mt-auto inline-flex min-h-[48px] cursor-not-allowed items-center justify-center rounded-lg border border-indigo-950/10 bg-[#f3f3fb] px-5 py-3 text-sm font-semibold text-[#9997ac]"
        >
          {t("comingSoon")}
        </button>
      )}
    </article>
  );
}
