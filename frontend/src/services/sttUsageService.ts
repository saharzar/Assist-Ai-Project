import { apiRequest } from "./api";

export type SttUsage = {
  limit: number;
  used: number;
  remaining: number;
  resetDate: string;
};

export const STT_USAGE_UPDATED_EVENT = "assist-ai:stt-usage-updated";

type SttUsageResponse = {
  stt_limit_seconds: number;
  stt_used_seconds: number;
  stt_remaining_seconds: number;
  stt_reset_date: string;
};

function mapSttUsage(usage: SttUsageResponse): SttUsage {
  return {
    limit: usage.stt_limit_seconds,
    used: usage.stt_used_seconds,
    remaining: usage.stt_remaining_seconds,
    resetDate: usage.stt_reset_date,
  };
}

export async function getSttUsage() {
  return mapSttUsage(await apiRequest<SttUsageResponse>("/api/stt/usage"));
}

export async function recordSttUsage(seconds: number) {
  const usage = mapSttUsage(
    await apiRequest<SttUsageResponse>("/api/stt/usage", {
      method: "POST",
      body: JSON.stringify({ seconds }),
    }),
  );
  notifySttUsageUpdated(usage);
  return usage;
}

export function notifySttUsageUpdated(usage: SttUsage) {
  window.dispatchEvent(
    new CustomEvent<SttUsage>(STT_USAGE_UPDATED_EVENT, {
      detail: usage,
    }),
  );
}
