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
    <div className="space-y-3">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-950">
          {labels.heard}
        </h1>
        <p className="mt-3 rounded-xl border border-slate-200 bg-white p-4 text-2xl font-bold text-slate-950">
          {fullName}
        </p>
      </div>

      {secondsRemaining > 0 && <p className="rounded-lg border border-cyan-200 bg-cyan-50 p-3 text-sm font-bold text-[#302992]">{labels.wait}</p>}

      <div>
        <button
          type="button"
          aria-label={labels.voice}
          title={isPreparingVoice ? labels.preparing : isListening ? labels.listening : labels.voice}
          disabled={isLocked || !isVoiceSupported}
          onClick={() => { if (isListening || isPreparingVoice) onVoiceStop(); else onVoiceStart(); }}
          className={`flex h-12 w-14 items-center justify-center rounded-xl text-white outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 ${isListening || isPreparingVoice ? "animate-pulse bg-rose-600 ring-2 ring-rose-300 hover:bg-rose-700 focus:ring-rose-400" : "bg-[#302992] hover:bg-[#211c72] focus:ring-cyan-400 active:bg-[#171452]"}`}
        >
          {isListening || isPreparingVoice ? <Square className="h-4 w-4 shrink-0 fill-current" aria-hidden="true" /> : <Mic className="h-4 w-4 shrink-0" aria-hidden="true" />}
          <span className="sr-only">{isPreparingVoice ? labels.preparing : isListening ? labels.listening : labels.voice}</span>
        </button>
      </div>

      <div className="min-h-10" aria-live="polite">{speechError && <p className="rounded-lg border border-amber-300 bg-amber-50 p-2.5 text-xs font-semibold text-amber-900">{speechError}</p>}</div>
    </div>
  );
}
import { Mic, Square } from "lucide-react";
