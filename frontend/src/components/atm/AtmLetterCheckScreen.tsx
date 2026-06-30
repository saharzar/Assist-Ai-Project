import { AlphabetKeypad } from "./AlphabetKeypad";

export function AtmLetterCheckScreen({
  letterInput,
  errorMessage,
  firstName,
  lastName,
  onLetter,
  onClear,
  onBackspace,
  onSubmit,
}: {
  letterInput: string;
  errorMessage: string;
  firstName: string;
  lastName: string;
  onLetter: (letter: string) => void;
  onClear: () => void;
  onBackspace: () => void;
  onSubmit: () => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-950">
          Let's check your name before trying again.
        </h1>
        <p className="mt-3 text-lg leading-8 text-slate-700">
          Write the second letter of your first name. Then write the last letter of your last name.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-sm font-bold text-slate-600">First name</p>
          <p className="mt-1 text-xl font-bold text-slate-950">{firstName}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-sm font-bold text-slate-600">Last name</p>
          <p className="mt-1 text-xl font-bold text-slate-950">{lastName}</p>
        </div>
      </div>

      <div>
        <p className="text-sm font-bold text-slate-700">Letters entered</p>
        <div
          aria-label="Letter verification input"
          className="mt-2 flex min-h-[58px] items-center rounded-lg border border-slate-300 bg-white px-4 text-2xl font-bold uppercase tracking-widest text-slate-950"
        >
          {letterInput ? letterInput.toUpperCase() : "--"}
        </div>
      </div>

      {errorMessage && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 font-semibold text-amber-900">
          {errorMessage}
        </div>
      )}

      <AlphabetKeypad
        onLetter={onLetter}
        onClear={onClear}
        onBackspace={onBackspace}
        onEnter={onSubmit}
      />
    </div>
  );
}
