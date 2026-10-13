export const COMPUTER_VISION_CONSENT_STORAGE_KEY = "assist_ai_computer_vision_session_consent";
const LEGACY_PREFIX = "assist_ai_computer_vision_consent:";
type SessionConsent = { token: string; allowed: boolean };
let memoryConsent: SessionConsent | null = null;

export function saveComputerVisionConsent(allowed: boolean, token: string) {
  memoryConsent = { token, allowed };
  try {
    sessionStorage.setItem(COMPUTER_VISION_CONSENT_STORAGE_KEY, JSON.stringify(memoryConsent));
  } catch {
    // When browser storage is unavailable, keep the choice for this page's login only.
  }
}

// Keep the existing scenario call signature: every scenario now reads the same login choice.
export function readComputerVisionConsent(_scenario?: string): boolean | null {
  try {
    const token = localStorage.getItem("assist_ai_token");
    if (!token) return null;
    if (memoryConsent?.token === token) return memoryConsent.allowed;
    const stored = sessionStorage.getItem(COMPUTER_VISION_CONSENT_STORAGE_KEY);
    if (!stored) return null;
    const consent: unknown = JSON.parse(stored);
    if (typeof consent !== "object" || consent === null || !("token" in consent) || !("allowed" in consent)) return null;
    return consent.token === token && typeof consent.allowed === "boolean" ? consent.allowed : null;
  } catch {
    return null;
  }
}

export function clearComputerVisionConsent() {
  memoryConsent = null;
  try {
    sessionStorage.removeItem(COMPUTER_VISION_CONSENT_STORAGE_KEY);
    // Old per-scenario choices must never authorize a new login or guest session.
    for (let index = sessionStorage.length - 1; index >= 0; index -= 1) {
      const key = sessionStorage.key(index);
      if (key?.startsWith(LEGACY_PREFIX)) sessionStorage.removeItem(key);
    }
  } catch {
    // Clearing authentication still prevents a stored choice from being reused.
  }
}
