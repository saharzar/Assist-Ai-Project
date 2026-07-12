import type { Scenario } from "../types/scenario";

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8010";

export async function fetchScenarios(): Promise<Scenario[]> {
  const response = await fetch(`${apiBaseUrl}/api/scenarios`);

  if (!response.ok) {
    throw new Error("The scenario list could not be loaded.");
  }

  return response.json() as Promise<Scenario[]>;
}
