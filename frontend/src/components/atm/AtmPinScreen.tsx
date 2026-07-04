import { NumericKeypad } from "./NumericKeypad";

export function AtmPinScreen({
  pinInput,
  errorMessage,
  speechError,
  isListening,
  isVoiceSupported,
  onDigit,
  onClear,
  onBackspace,
  onSubmit,
}: {
  pinInput: string;
  errorMessage: string;
  speechError: string;
  isListening: boolean;
  isVoiceSupported: boolean;
  onDigit: (digit: string) => void;
  onClear: () => void;
  onBackspace: () => void;
  onSubmit: () => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-950">
          Please enter the ATM password.
        </h1>
        <p className="mt-3 text-lg leading-8 text-slate-700">
          Read the assistant message, then enter the password with the keypad or hold Space and say the numbers.
        </p>
        <p className="mt-2 text-base font-semibold leading-7 text-slate-600">
          In this practice, the first try may show a system problem. Stay calm and try again.
        </p>
      </div>

      <div>
        <p className="text-sm font-bold text-slate-700">Password input</p>
        <div
          aria-label="Masked PIN input"
          className="mt-2 flex min-h-[64px] items-center rounded-lg border border-slate-300 bg-white px-4 text-3xl font-bold tracking-widest text-slate-950"
        >
          {pinInput || "----"}
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <p className="text-sm font-bold uppercase tracking-wide text-slate-600">Voice input</p>
        <p className="mt-2 text-sm font-semibold text-slate-600">
          Hold Space to say the four numbers. Release Space to stop.
        </p>
        {!isVoiceSupported && (
          <div className="mt-3 rounded-lg border border-amber-300 bg-amber-50 p-3 font-semibold text-amber-900">
            Voice input is not supported in this browser. Please use the keypad.
          </div>
        )}
        {isListening && (
          <p className="mt-3 font-semibold text-sky-800">Listening for numbers...</p>
        )}
        {speechError && (
          <div className="mt-3 rounded-lg border border-amber-300 bg-amber-50 p-3 font-semibold text-amber-900">
            {speechError}
          </div>
        )}
      </div>

      {errorMessage && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 font-semibold text-amber-900">
          {errorMessage}
        </div>
      )}

      <NumericKeypad
        onDigit={onDigit}
        onClear={onClear}
        onBackspace={onBackspace}
        onEnter={onSubmit}
      />
    </div>
  );
}
