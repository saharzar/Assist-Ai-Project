import { Link } from "react-router-dom";

import { useTranslation } from "../i18n";
import type { Scenario } from "../types/scenario";

type ScenarioCardProps = {
  scenario: Scenario;
  isAvailable: boolean;
};

export function ScenarioCard({ scenario, isAvailable }: ScenarioCardProps) {
  const { t } = useTranslation();
  const formattedId = Number(scenario.id).toString().padStart(2, "0");

  return (
    <article
      className={`group flex min-h-72 flex-col justify-between rounded-lg border-2 p-5 shadow-soft transition ${
        isAvailable
          ? "border-transparent bg-white hover:-translate-y-0.5 hover:border-teal-400 hover:shadow-soft-hover"
          : "border-slate-200 bg-slate-100 opacity-65 grayscale"
      }`}
    >
      <div>
        <div className="flex items-start gap-4">
          <div
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg text-sm font-bold transition ${
              isAvailable
                ? "bg-slate-50 text-teal-700 group-hover:bg-teal-500 group-hover:text-white"
                : "bg-slate-200 text-slate-500"
            }`}
          >
            {formattedId}
          </div>
          <div>
            <h2 className={`text-xl font-bold tracking-tight ${isAvailable ? "text-slate-900" : "text-slate-500"}`}>
              {scenario.title}
            </h2>
          </div>
        </div>
        <p className={`mt-5 text-base leading-7 ${isAvailable ? "text-slate-600" : "text-slate-500"}`}>
          {scenario.description}
        </p>
      </div>
      {isAvailable ? (
        <Link
          to={`/scenario/${scenario.slug}`}
          className="mt-6 inline-flex min-h-[48px] items-center justify-center rounded-lg bg-slate-900 px-5 py-3 text-base font-bold text-white transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
        >
          {t("openScenario")}
        </Link>
      ) : (
        <button
          type="button"
          disabled
          className="mt-6 inline-flex min-h-[48px] cursor-not-allowed items-center justify-center rounded-lg bg-slate-300 px-5 py-3 text-base font-bold text-slate-600"
        >
          Coming soon
        </button>
      )}
    </article>
  );
}
