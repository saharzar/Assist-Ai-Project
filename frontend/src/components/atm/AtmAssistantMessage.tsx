export function AtmAssistantMessage({
  message,
  soundEnabled,
  isSpeaking,
  onRepeat,
  onStop,
}: {
  message: string;
  soundEnabled: boolean;
  isSpeaking: boolean;
  onRepeat: () => void;
  onStop: () => void;
}) {
  return (
    <div className="rounded-lg border border-sky-200 bg-sky-50 p-4 text-slate-900">
      <p className="text-base font-semibold leading-7">{message}</p>
      <div className="mt-4 grid gap-2">
        <button
          type="button"
          aria-label="Repeat assistant message"
          onClick={onRepeat}
          disabled={!soundEnabled}
          className="min-h-[44px] rounded-lg bg-sky-700 px-4 py-2 text-sm font-bold text-white hover:bg-sky-800 focus:outline-none focus:ring-2 focus:ring-sky-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Repeat assistant message
        </button>
        {isSpeaking && (
          <button
            type="button"
            aria-label="Stop assistant voice"
            onClick={onStop}
            className="min-h-[44px] rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-800 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            Stop voice
          </button>
        )}
      </div>
    </div>
  );
}
