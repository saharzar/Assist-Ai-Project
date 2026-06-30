export function VoiceInputButton({
  isSupported,
  isListening,
  onStart,
  onStop,
}: {
  isSupported: boolean;
  isListening: boolean;
  onStart: () => void;
  onStop: () => void;
}) {
  if (!isSupported) {
    return (
      <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 font-semibold text-amber-900">
        Voice input is not supported in this browser. Please type your name.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      <button
        type="button"
        aria-label="Start speaking your full name"
        onClick={onStart}
        disabled={isListening}
        className="min-h-[52px] rounded-lg bg-sky-700 px-5 py-3 font-bold text-white hover:bg-sky-800 focus:outline-none focus:ring-2 focus:ring-sky-500 disabled:cursor-not-allowed disabled:opacity-60"
      >
        Start speaking
      </button>
      <button
        type="button"
        aria-label="Stop voice input"
        onClick={onStop}
        disabled={!isListening}
        className="min-h-[52px] rounded-lg border border-slate-300 bg-white px-5 py-3 font-bold text-slate-800 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:cursor-not-allowed disabled:opacity-60"
      >
        Stop
      </button>
    </div>
  );
}
