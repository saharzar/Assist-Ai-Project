import { FormEvent, useState } from "react";

import { VoiceInputButton } from "./VoiceInputButton";

export function AtmNameScreen({
  errorMessage,
  transcript,
  speechError,
  isListening,
  isVoiceSupported,
  onStartListening,
  onStopListening,
  onSubmit,
}: {
  errorMessage: string;
  transcript: string;
  speechError: string;
  isListening: boolean;
  isVoiceSupported: boolean;
  onStartListening: () => void;
  onStopListening: () => void;
  onSubmit: (fullName: string) => void;
}) {
  const [fullName, setFullName] = useState("");

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    onSubmit(fullName);
  };

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-950">
          Hello. What is your full name?
        </h1>
        <p className="mt-3 text-lg leading-8 text-slate-700">
          Please say your full name, or type it below.
        </p>
      </div>

      <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
        <p className="text-sm font-bold uppercase tracking-wide text-slate-600">Voice input</p>
        <VoiceInputButton
          isSupported={isVoiceSupported}
          isListening={isListening}
          onStart={onStartListening}
          onStop={onStopListening}
        />
        {isListening && (
          <p className="font-semibold text-sky-800">Listening...</p>
        )}
        {transcript && (
          <div className="rounded-lg bg-slate-50 p-3">
            <p className="text-sm font-bold text-slate-600">I heard:</p>
            <p className="mt-1 text-lg font-bold text-slate-950">{transcript}</p>
            <button
              type="button"
              aria-label="Use spoken name"
              onClick={() => setFullName(transcript)}
              className="mt-3 min-h-[44px] rounded-lg bg-teal-600 px-4 py-2 font-bold text-white hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              Use this name
            </button>
          </div>
        )}
        {speechError && (
          <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 font-semibold text-amber-900">
            {speechError}
          </div>
        )}
      </div>

      <label className="block">
        <span className="text-sm font-bold text-slate-700">Or type your full name</span>
        <input
          value={fullName}
          onChange={(event) => setFullName(event.target.value)}
          placeholder="Write your full name"
          className="mt-2 min-h-[56px] w-full rounded-lg border border-slate-300 px-4 text-lg outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500"
        />
      </label>

      {errorMessage && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 font-semibold text-amber-900">
          {errorMessage}
        </div>
      )}

      <button
        type="submit"
        aria-label="Continue with full name"
        className="min-h-[56px] rounded-lg bg-teal-600 px-7 py-3 text-lg font-bold text-white hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
      >
        Continue
      </button>
    </form>
  );
}
