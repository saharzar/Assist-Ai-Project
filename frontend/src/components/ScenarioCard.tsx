import { Link } from "react-router-dom";

import { useTranslation } from "../i18n";
import type { Scenario } from "../types/scenario";

type ScenarioCardProps = {
  scenario: Scenario;
};

export function ScenarioCard({ scenario }: ScenarioCardProps) {
  const { t } = useTranslation();
  const formattedId = Number(scenario.id).toString().padStart(2, "0");

  return (
    <article className="group flex min-h-72 flex-col justify-between rounded-lg border-2 border-transparent bg-white p-5 shadow-soft transition hover:-translate-y-0.5 hover:border-teal-400 hover:shadow-soft-hover">
      <div>
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-sm font-bold text-teal-700 transition group-hover:bg-teal-500 group-hover:text-white">
            {formattedId}
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900">{scenario.title}</h2>
          </div>
        </div>
        <p className="mt-5 text-base leading-7 text-slate-600">{scenario.description}</p>
      </div>
      <Link
        to={`/scenario/${scenario.slug}`}
        className="mt-6 inline-flex min-h-[48px] items-center justify-center rounded-lg bg-slate-900 px-5 py-3 text-base font-bold text-white transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
      >
        {t("openScenario")}
      </Link>
    </article>
  );
}
