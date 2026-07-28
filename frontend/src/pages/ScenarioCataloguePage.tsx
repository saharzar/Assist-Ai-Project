import { useEffect, useState } from "react";

import { fetchScenarios } from "../api/scenarios";
import { ScenarioCard } from "../components/ScenarioCard";
import { useTranslation } from "../i18n";
import { atmTranslations } from "../lib/atmTranslations";
import { preloadAssistantMessage } from "../services/speechSynthesisService";
import type { Scenario } from "../types/scenario";

const ACTIVE_SCENARIO_SLUG = "atm-withdrawal";

export function ScenarioCataloguePage() {
  const { language, t, translateScenario } = useTranslation();
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

  useEffect(() => {
    void preloadAssistantMessage(atmTranslations[language].welcomeAssistant, language);
  }, [language]);

  const translatedScenarios = scenarios.map(translateScenario);

  return (
    <section className="catalogue-page relative isolate flex w-full flex-1 flex-col overflow-hidden">
      <div className="catalogue-grid pointer-events-none absolute inset-0 -z-10" aria-hidden="true" />
      <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-5 pb-12 pt-9 sm:px-8 lg:px-10">
      <div className="relative max-w-3xl pt-1">
        <span className="mb-4 flex h-1.5 w-24 overflow-hidden rounded-full" aria-hidden="true"><i className="w-2/3 bg-[#3730a3]" /><i className="w-1/3 bg-[#2dd8d8]" /></span>
        <h1 className="font-display text-3xl font-bold text-[#1d1a5e]">
          {t("scenarioCatalogueTitle")}
        </h1>
        <p className="mt-2 text-[15px] leading-6 text-[#5b5a78]">
          {t("scenarioCatalogueSubtitle")}
        </p>
      </div>

      {isLoading && (
        <div className="mt-6 rounded-lg border border-indigo-950/10 bg-white p-6 text-base font-semibold text-[#5b5a78] shadow-soft">
          {t("loadingScenarios")}
        </div>
      )}

      {errorMessage && (
        <div className="mt-6 rounded-lg border border-amber-300 bg-amber-50 p-5 font-semibold text-amber-900">
          {errorMessage}
        </div>
      )}

      {!isLoading && !errorMessage && (
        <div className="relative mt-8 grid gap-[22px] md:grid-cols-2 xl:grid-cols-3">
          {translatedScenarios.map((scenario) => (
            <ScenarioCard
              key={scenario.id}
              scenario={scenario}
              isAvailable={scenario.slug === ACTIVE_SCENARIO_SLUG}
            />
          ))}
        </div>
      )}
      </div>
    </section>
  );
}
