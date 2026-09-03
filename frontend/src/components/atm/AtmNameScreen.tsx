import { useEffect, useRef, useState } from "react";

export type AtmNameInputEvent =
  | { id: number; type: "letter"; value: string }
  | { id: number; type: "clear" }
  | { id: number; type: "backspace" }
  | { id: number; type: "submit" };

export type AtmNameInputEventPayload =
  | { type: "letter"; value: string }
  | { type: "clear" }
  | { type: "backspace" }
  | { type: "submit" };

export function AtmNameScreen({
  errorMessage,
  transcript,
  speechError,
  isListening,
  isPreparingVoice,
  isVoiceSupported,
  inputEvent,
  labels,
  onSubmit,
  onKeyboardInput,
  onVoiceStart,
  onVoiceStop,
}: {
  errorMessage: string;
  transcript: string;
  speechError: string;
  isListening: boolean;
  isPreparingVoice: boolean;
  isVoiceSupported: boolean;
  inputEvent: AtmNameInputEvent | null;
  labels: {
    title: string;
    voiceUnsupported: string;
    listening: string;
    preparing: string;
    voiceButton: string;
    heard: string;
    fullName: string;
    placeholder: string;
    pressEnter: string;
  };
  onSubmit: (fullName: string) => void;
  onKeyboardInput: () => void;
  onVoiceStart: () => void;
  onVoiceStop: () => void;
}) {
  const [fullName, setFullName] = useState("");
  const fullNameRef = useRef("");
  const handledInputEventIdRef = useRef<number | null>(null);

  useEffect(() => {
    fullNameRef.current = fullName;
  }, [fullName]);

  useEffect(() => {
    if (transcript) {
      setFullName(transcript);
      fullNameRef.current = transcript;
    }
  }, [transcript]);

  useEffect(() => {
    if (!inputEvent) {
      return;
    }
    if (handledInputEventIdRef.current === inputEvent.id) {
      return;
    }
    handledInputEventIdRef.current = inputEvent.id;

    if (inputEvent.type === "letter") {
      setFullName((current) => {
        const nextValue = `${current}${inputEvent.value}`;
        fullNameRef.current = nextValue;
        return nextValue;
      });
    }
    if (inputEvent.type === "clear") {
      setFullName("");
      fullNameRef.current = "";
    }
    if (inputEvent.type === "backspace") {
      setFullName((current) => {
        const nextValue = current.slice(0, -1);
        fullNameRef.current = nextValue;
        return nextValue;
      });
    }
    if (inputEvent.type === "submit") {
      onSubmit(fullNameRef.current);
    }
  }, [inputEvent, onSubmit]);

  return (
    <div className="space-y-3">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-950">
          {labels.title}
        </h1>
      </div>

      <label className="block">
        <span className="sr-only">{labels.fullName}</span>
        <input
          value={fullName}
          onChange={(event) => {
            onKeyboardInput();
            setFullName(event.target.value);
          }}
          placeholder={labels.placeholder}
          className="min-h-14 w-full rounded-xl border border-indigo-200 px-4 text-lg font-semibold outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-200"
        />
      </label>

      <div>
        {!isVoiceSupported && (
          <div className="rounded-lg border border-amber-300 bg-amber-50 p-2 text-xs font-semibold text-amber-900">
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
        {transcript && (
          <div className="rounded-lg bg-slate-50 p-2">
            <p className="text-xs font-bold text-slate-600">{labels.heard}</p>
            <p className="text-sm font-bold text-slate-950">{transcript}</p>
          </div>
        )}
      </div>
      <div className="min-h-10" aria-live="polite">{(speechError || errorMessage) && <div className="rounded-lg border border-amber-300 bg-amber-50 p-2.5 text-xs font-semibold text-amber-900">{speechError || errorMessage}</div>}</div>
    </div>
  );
}
import { Mic, Square } from "lucide-react";
