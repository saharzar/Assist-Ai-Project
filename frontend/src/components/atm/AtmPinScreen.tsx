import { NumericKeypad } from "./NumericKeypad";

export function AtmPinScreen({
  demoPin,
  pinInput,
  errorMessage,
  onDigit,
  onClear,
  onBackspace,
  onSubmit,
}: {
  demoPin: string;
  pinInput: string;
  errorMessage: string;
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
          Read the practice password, then enter it with the keypad.
        </p>
        <p className="mt-2 text-base font-semibold leading-7 text-slate-600">
          In this practice, the first try may show a system problem. Stay calm and try again.
        </p>
      </div>

      <div className="rounded-lg border border-teal-200 bg-teal-50 p-4">
        <p className="text-sm font-bold uppercase tracking-wide text-teal-900">
          Practice password
        </p>
        <p className="mt-2 text-4xl font-bold tracking-[0.25em] text-slate-950">
          {demoPin}
        </p>
      </div>

      <div>
        <p className="text-sm font-bold text-slate-700">Password input</p>
        <div
          aria-label="Masked PIN input"
          className="mt-2 flex min-h-[64px] items-center rounded-lg border border-slate-300 bg-white px-4 text-3xl font-bold tracking-widest text-slate-950"
        >
          {pinInput ? "*".repeat(pinInput.length) : "----"}
        </div>
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
