import { FormEvent, useEffect, useState } from "react";

export function AtmNameScreen({
  errorMessage,
  transcript,
  speechError,
  isListening,
  isVoiceSupported,
  onSubmit,
}: {
  errorMessage: string;
  transcript: string;
  speechError: string;
  isListening: boolean;
  isVoiceSupported: boolean;
  onSubmit: (fullName: string) => void;
}) {
  const [fullName, setFullName] = useState("");

  useEffect(() => {
    if (transcript) {
      setFullName(transcript);
    }
  }, [transcript]);

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
          Hold Space and say your full name, or type it below.
        </p>
      </div>

      <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
        <p className="text-sm font-bold uppercase tracking-wide text-slate-600">Voice input</p>
        <p className="text-sm font-semibold text-slate-600">
          Hold Space to speak. Release Space to stop. Voice input listens in English.
        </p>
        {!isVoiceSupported && (
          <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 font-semibold text-amber-900">
            Voice input is not supported in this browser. Please type your name.
          </div>
        )}
        {isListening && (
          <p className="font-semibold text-sky-800">Listening...</p>
        )}
        {transcript && (
          <div className="rounded-lg bg-slate-50 p-3">
            <p className="text-sm font-bold text-slate-600">I heard:</p>
            <p className="mt-1 text-lg font-bold text-slate-950">{transcript}</p>
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
