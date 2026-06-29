import { useEffect, useState } from "react";

import { fetchScenarios } from "../api/scenarios";
import { ScenarioCard } from "../components/ScenarioCard";
import { useTranslation } from "../i18n";
import type { Scenario } from "../types/scenario";

export function ScenarioCataloguePage() {
  const { t, translateScenario } = useTranslation();
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    fetchScenarios()
      .then((items) => {
        if (isMounted) {
          setScenarios(items);
          setErrorMessage("");
        }
      })
      .catch(() => {
        if (isMounted) {
          setErrorMessage(t("backendError"));
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [t]);

  const translatedScenarios = scenarios.map(translateScenario);

  return (
    <section className="flex flex-1 flex-col">
      <div className="max-w-3xl">
        <h1 className="text-4xl font-bold tracking-tight text-slate-950">
          {t("scenarioCatalogueTitle")}
        </h1>
        <p className="mt-4 text-lg leading-8 text-slate-600">
          {t("scenarioCatalogueSubtitle")}
        </p>
      </div>

      {isLoading && (
        <div className="mt-8 rounded-lg border border-slate-200 bg-white p-6 text-lg font-semibold text-slate-600 shadow-soft">
          {t("loadingScenarios")}
        </div>
      )}

      {errorMessage && (
        <div className="mt-8 rounded-lg border border-amber-300 bg-amber-50 p-5 font-semibold text-amber-900">
          {errorMessage}
        </div>
      )}

      {!isLoading && !errorMessage && (
        <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {translatedScenarios.map((scenario) => (
            <ScenarioCard key={scenario.id} scenario={scenario} />
          ))}
        </div>
      )}
    </section>
  );
}
