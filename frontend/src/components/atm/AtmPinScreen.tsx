export function AtmPinScreen({
  pinInput,
  errorMessage,
  speechError,
  isListening,
  isVoiceSupported,
  labels,
}: {
  pinInput: string;
  errorMessage: string;
  speechError: string;
  isListening: boolean;
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
  };
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
        {isListening && (
          <p className="mt-1 text-sm font-semibold text-sky-800">{labels.listening}</p>
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
