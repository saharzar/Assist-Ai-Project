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
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-950">
          {labels.title}
        </h1>
      </div>

      <div>
        <div
          aria-label={labels.pinAria}
          className="flex min-h-16 items-center rounded-xl border border-slate-300 bg-white px-5 text-3xl font-bold tracking-[0.45em] text-slate-950"
        >
          {pinInput || "----"}
        </div>
      </div>

      <div>
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
              title={isPreparingVoice ? labels.preparing : isListening ? labels.listening : labels.voiceButton}
              onClick={() => { if (isListening || isPreparingVoice) onVoiceStop(); else onVoiceStart(); }}
              className={`flex h-12 w-14 items-center justify-center rounded-xl text-white outline-none focus:ring-2 focus:ring-offset-2 ${isListening || isPreparingVoice ? "animate-pulse bg-rose-600 ring-2 ring-rose-300 hover:bg-rose-700 focus:ring-rose-400" : "bg-[#302992] hover:bg-[#211c72] focus:ring-cyan-400 active:bg-[#171452]"}`}
            >
              {isListening || isPreparingVoice ? <Square className="h-4 w-4 shrink-0 fill-current" aria-hidden="true" /> : <Mic className="h-4 w-4 shrink-0" aria-hidden="true" />}
              <span className="sr-only">{isPreparingVoice ? labels.preparing : isListening ? labels.listening : labels.voiceButton}</span>
            </button>
          </>
        )}
      </div>
      <div className="min-h-10" aria-live="polite">{(speechError || errorMessage) && <div className="rounded-lg border border-amber-300 bg-amber-50 p-2.5 text-xs font-semibold text-amber-900">{speechError || errorMessage}</div>}</div>
    </div>
  );
}
import { Mic, Square } from "lucide-react";
