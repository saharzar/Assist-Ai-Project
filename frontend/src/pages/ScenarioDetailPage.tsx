import { Link, useParams } from "react-router-dom";

import { scenarios } from "../data/scenarios";
import { useTranslation } from "../i18n";
import { AtmScenarioPage } from "./scenarios/AtmScenarioPage";

export function ScenarioDetailPage() {
  const { t, translateScenario } = useTranslation();
  const { slug } = useParams();
  const scenario = scenarios.find((item) => item.slug === slug);
  const translatedScenario = scenario ? translateScenario(scenario) : null;

  if (slug === "atm-withdrawal") {
    return <AtmScenarioPage />;
  }

  if (!translatedScenario) {
    return (
      <section className="mx-auto max-w-3xl rounded-lg border border-slate-200 bg-white p-7 shadow-soft">
        <h1 className="text-4xl font-bold tracking-tight text-slate-950">{t("scenarioNotFound")}</h1>
        <p className="mt-4 text-lg text-slate-600">
          {t("scenarioNotFoundBody")}
        </p>
        <Link
          to="/scenarios"
          className="mt-6 inline-flex min-h-[48px] items-center rounded-lg bg-slate-900 px-5 py-3 text-base font-bold text-white hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
        >
          {t("backToScenarios")}
        </Link>
      </section>
    );
  }

  return (
    <section className="mx-auto w-full max-w-3xl rounded-lg border border-slate-200 bg-white p-7 shadow-soft">
      <div className="flex items-start gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-base font-bold text-teal-700">
          {Number(translatedScenario.id).toString().padStart(2, "0")}
        </div>
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-slate-950">
            {translatedScenario.title}
          </h1>
        </div>
      </div>
      <p className="mt-7 text-xl leading-9 text-slate-600">{translatedScenario.description}</p>
      <p className="mt-8 rounded-lg border border-teal-200 bg-teal-50 p-5 text-lg font-bold text-slate-800">
        {t("scenarioNextStep")}
      </p>
      <Link
        to="/scenarios"
        className="mt-8 inline-flex min-h-[48px] items-center rounded-lg bg-slate-900 px-5 py-3 text-base font-bold text-white hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
      >
        {t("backToScenarios")}
      </Link>
    </section>
  );
}
