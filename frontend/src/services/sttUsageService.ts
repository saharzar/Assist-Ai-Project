import { apiRequest } from "./api";

export type SttUsage = {
  limit: number;
  used: number;
  remaining: number;
  resetDate: string;
  unlimited?: boolean;
};

export const STT_USAGE_UPDATED_EVENT = "assist-ai:stt-usage-updated";

type SttUsageResponse = {
  stt_limit_seconds: number;
  stt_used_seconds: number;
  stt_remaining_seconds: number;
  stt_reset_date: string;
  unlimited?: boolean;
};

function mapSttUsage(usage: SttUsageResponse): SttUsage {
  return {
    limit: usage.stt_limit_seconds,
    used: usage.stt_used_seconds,
    remaining: usage.unlimited ? Number.POSITIVE_INFINITY : usage.stt_remaining_seconds,
    resetDate: usage.stt_reset_date,
    unlimited: usage.unlimited,
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
