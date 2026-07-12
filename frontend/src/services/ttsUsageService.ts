import { apiRequest } from "./api";

export type TtsUsage = {
  limit: number;
  used: number;
  remaining: number;
  resetDate: string;
};

export const TTS_USAGE_UPDATED_EVENT = "assist-ai:tts-usage-updated";

type TtsUsageResponse = {
  tts_limit_characters: number;
  tts_used_characters: number;
  tts_remaining_characters: number;
  tts_reset_date: string;
};

export async function getTtsUsage() {
  const usage = await apiRequest<TtsUsageResponse>("/api/tts/usage");

  return {
    limit: usage.tts_limit_characters,
    used: usage.tts_used_characters,
    remaining: usage.tts_remaining_characters,
    resetDate: usage.tts_reset_date,
  };
}

export function notifyTtsUsageUpdated(usage: TtsUsage) {
  window.dispatchEvent(
    new CustomEvent<TtsUsage>(TTS_USAGE_UPDATED_EVENT, {
      detail: usage,
    }),
  );
}
