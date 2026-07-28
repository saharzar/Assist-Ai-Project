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

      <p className="rounded-lg border border-cyan-200 bg-cyan-50 p-3 text-sm font-bold text-[#302992]">
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
          className="flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#302992] px-4 text-sm font-bold text-white outline-none hover:bg-[#211c72] focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 active:bg-[#171452] disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500"
        >
          <Mic className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{isPreparingVoice ? labels.preparing : isListening ? labels.listening : labels.voice}</span>
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
import { Mic } from "lucide-react";
