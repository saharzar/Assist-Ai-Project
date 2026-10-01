export const COMPUTER_VISION_CONSENT_STORAGE_PREFIX = "assist_ai_computer_vision_consent:";

export function saveComputerVisionConsent(scenario: string, allowed: boolean) {
  sessionStorage.setItem(`${COMPUTER_VISION_CONSENT_STORAGE_PREFIX}${scenario}`, allowed ? "allowed" : "denied");
}

export function readComputerVisionConsent(scenario: string): boolean | null {
  const value = sessionStorage.getItem(`${COMPUTER_VISION_CONSENT_STORAGE_PREFIX}${scenario}`);
  if (value === "allowed") return true;
  if (value === "denied") return false;
  return null;
}
