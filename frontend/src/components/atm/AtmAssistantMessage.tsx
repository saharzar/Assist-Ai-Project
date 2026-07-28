export function AtmAssistantMessage({
  message,
  soundEnabled,
  isSpeaking,
  repeatLabel,
  stopLabel,
  ttsError,
  onRepeat,
  onStop,
}: {
  message: string;
  soundEnabled: boolean;
  isSpeaking: boolean;
  repeatLabel: string;
  stopLabel: string;
  ttsError: string;
  onRepeat: () => void;
  onStop: () => void;
}) {
  return (
    <div className="rounded-lg border border-cyan-200/70 bg-white p-4 text-[#1d1a5e] shadow-[0_8px_24px_rgba(3,7,18,0.12)]">
      <p className="text-base font-semibold leading-7">{message}</p>
      {ttsError && (
        <p className="mt-3 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-950">
          {ttsError}
        </p>
      )}
      <div className="mt-4 grid gap-2">
        <button
          type="button"
          aria-label={repeatLabel}
          onClick={onRepeat}
          disabled={!soundEnabled}
          className="min-h-[44px] rounded-lg bg-[#302992] px-4 py-2 text-sm font-bold text-white hover:bg-[#211c72] focus:outline-none focus:ring-2 focus:ring-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {repeatLabel}
        </button>
        {isSpeaking && (
          <button
            type="button"
            aria-label={stopLabel}
            onClick={onStop}
            className="min-h-[44px] rounded-lg border border-indigo-200 bg-[#f4f3ff] px-4 py-2 text-sm font-bold text-[#302992] hover:bg-indigo-100 focus:outline-none focus:ring-2 focus:ring-cyan-400"
          >
            {stopLabel}
          </button>
        )}
      </div>
    </div>
  );
}
