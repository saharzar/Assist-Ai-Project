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
  isVoiceSupported,
  inputEvent,
  onSubmit,
}: {
  errorMessage: string;
  transcript: string;
  speechError: string;
  isListening: boolean;
  isVoiceSupported: boolean;
  inputEvent: AtmNameInputEvent | null;
  onSubmit: (fullName: string) => void;
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
    <div className="space-y-2">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-950">
          Enter your full name
        </h1>
        <p className="mt-1 text-sm font-semibold leading-5 text-slate-700">
          Hold Space to speak, type, or use the ATM keyboard.
        </p>
      </div>

      <div className="space-y-1 rounded-lg border border-slate-200 bg-white p-2">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-600">Voice input</p>
        {!isVoiceSupported && (
          <div className="rounded-lg border border-amber-300 bg-amber-50 p-2 text-xs font-semibold text-amber-900">
            Voice is not supported. Please type your name.
          </div>
        )}
        {isListening && (
          <p className="text-sm font-semibold text-sky-800">Listening...</p>
        )}
        {transcript && (
          <div className="rounded-lg bg-slate-50 p-2">
            <p className="text-xs font-bold text-slate-600">I heard:</p>
            <p className="text-sm font-bold text-slate-950">{transcript}</p>
          </div>
        )}
        {speechError && (
          <div className="rounded-lg border border-amber-300 bg-amber-50 p-2 text-xs font-semibold text-amber-900">
            {speechError}
          </div>
        )}
      </div>

      <label className="block">
        <span className="text-xs font-bold text-slate-700">Full name</span>
        <input
          value={fullName}
          onChange={(event) => setFullName(event.target.value)}
          placeholder="Write your full name"
          className="mt-1 min-h-[40px] w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500"
        />
      </label>

      {errorMessage && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-2 text-xs font-semibold text-amber-900">
          {errorMessage}
        </div>
      )}

      <p className="rounded-lg bg-teal-50 p-2 text-xs font-bold text-teal-900">
        Press ENTER on the ATM keypad to continue.
      </p>
    </div>
  );
}
