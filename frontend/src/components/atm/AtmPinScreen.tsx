export function AtmPinScreen({
  pinInput,
  errorMessage,
  speechError,
  isListening,
  isPreparingVoice,
  isVoiceSupported,
  labels,
  onVoiceStart,
  onVoiceStop,
}: {
  pinInput: string;
  errorMessage: string;
  speechError: string;
  isListening: boolean;
  isPreparingVoice: boolean;
  isVoiceSupported: boolean;
  labels: {
    title: string;
    hint: string;
    practiceHint: string;
    passwordInput: string;
    pinAria: string;
    voiceInput: string;
    voiceUnsupported: string;
    listening: string;
    preparing: string;
    voiceButton: string;
    voiceHint: string;
  };
  onVoiceStart: () => void;
  onVoiceStop: () => void;
}) {
  return (
    <div className="space-y-3">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-950">
          {labels.title}
        </h1>
        <p className="mt-1 text-sm font-semibold leading-5 text-slate-700">
          {labels.hint}
        </p>
        <p className="mt-1 text-xs font-semibold leading-5 text-slate-600">
          {labels.practiceHint}
        </p>
      </div>

      <div>
        <p className="text-xs font-bold text-slate-700">{labels.passwordInput}</p>
        <div
          aria-label={labels.pinAria}
          className="mt-1 flex min-h-[48px] items-center rounded-lg border border-slate-300 bg-white px-3 text-2xl font-bold tracking-widest text-slate-950"
        >
          {pinInput || "----"}
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-2">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-600">{labels.voiceInput}</p>
        {!isVoiceSupported && (
          <div className="mt-1 rounded-lg border border-amber-300 bg-amber-50 p-2 text-xs font-semibold text-amber-900">
            {labels.voiceUnsupported}
          </div>
        )}
        {isVoiceSupported && (
          <>
            <button
              type="button"
              aria-label={labels.voiceButton}
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
              className="mt-2 min-h-11 w-full rounded-lg bg-sky-700 px-3 text-sm font-bold text-white outline-none hover:bg-sky-800 focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 active:bg-sky-900"
            >
              {isPreparingVoice ? labels.preparing : isListening ? labels.listening : labels.voiceButton}
            </button>
            <p className="mt-1 text-xs font-semibold text-slate-600">{labels.voiceHint}</p>
          </>
        )}
        {speechError && (
          <div className="mt-1 rounded-lg border border-amber-300 bg-amber-50 p-2 text-xs font-semibold text-amber-900">
            {speechError}
          </div>
        )}
      </div>

      {errorMessage && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-2 text-xs font-semibold text-amber-900">
          {errorMessage}
        </div>
      )}
    </div>
  );
}
