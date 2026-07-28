export function AtmConfirmNameScreen({
  fullName,
  secondsRemaining,
  isListening,
  isPreparingVoice,
  isVoiceSupported,
  isDecisionPending,
  speechError,
  labels,
  onVoiceStart,
  onVoiceStop,
}: {
  fullName: string;
  secondsRemaining: number;
  isListening: boolean;
  isPreparingVoice: boolean;
  isVoiceSupported: boolean;
  isDecisionPending: boolean;
  speechError: string;
  labels: {
    heard: string;
    hint: string;
    voice: string;
    wait: string;
    voiceHint: string;
    listening: string;
    preparing: string;
  };
  onVoiceStart: () => void;
  onVoiceStop: () => void;
}) {
  const isLocked = secondsRemaining > 0 || isDecisionPending;

  return (
    <div className="space-y-2">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-950">
          {labels.heard}
        </h1>
        <p className="mt-2 rounded-lg border border-slate-200 bg-white p-3 text-lg font-bold text-slate-950">
          {fullName}
        </p>
      </div>

      <p className="rounded-lg bg-teal-50 p-3 text-sm font-bold text-teal-900">
        {secondsRemaining > 0 ? labels.wait : labels.hint}
      </p>

      <div>
        <button
          type="button"
          aria-label={labels.voice}
          disabled={isLocked || !isVoiceSupported}
          onPointerDown={(event) => {
            event.preventDefault();
            event.currentTarget.setPointerCapture(event.pointerId);
            onVoiceStart();
          }}
          onPointerUp={onVoiceStop}
          onPointerCancel={onVoiceStop}
          onKeyDown={(event) => {
            if ((event.key === "Enter" || event.key === " ") && !event.repeat) onVoiceStart();
          }}
          onKeyUp={(event) => {
            if (event.key === "Enter" || event.key === " ") onVoiceStop();
          }}
          className="min-h-12 w-full rounded-lg bg-sky-700 px-4 text-sm font-bold text-white outline-none hover:bg-sky-800 focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 active:bg-sky-900 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500"
        >
          {isPreparingVoice ? labels.preparing : isListening ? labels.listening : labels.voice}
        </button>
      </div>

      <p className="text-xs font-semibold text-slate-600">{labels.voiceHint}</p>
      {speechError && (
        <p className="rounded-lg border border-amber-300 bg-amber-50 p-2 text-xs font-semibold text-amber-900">
          {speechError}
        </p>
      )}
    </div>
  );
}
