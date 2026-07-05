export function AtmLetterCheckScreen({
  letterInput,
  errorMessage,
  firstName,
  lastName,
  labels,
}: {
  letterInput: string;
  errorMessage: string;
  firstName: string;
  lastName: string;
  labels: {
    title: string;
    hint: string;
    firstName: string;
    lastName: string;
    lettersEntered: string;
    lettersAria: string;
  };
}) {
  return (
    <div className="space-y-3">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-950">
          {labels.title}
        </h1>
        <p className="mt-1 text-sm font-semibold leading-5 text-slate-700">
          {labels.hint}
        </p>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-white p-2">
          <p className="text-xs font-bold text-slate-600">{labels.firstName}</p>
          <p className="truncate text-base font-bold text-slate-950">{firstName}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-2">
          <p className="text-xs font-bold text-slate-600">{labels.lastName}</p>
          <p className="truncate text-base font-bold text-slate-950">{lastName}</p>
        </div>
      </div>

      <div>
        <p className="text-xs font-bold text-slate-700">{labels.lettersEntered}</p>
        <div
          aria-label={labels.lettersAria}
          className="mt-1 flex min-h-[44px] items-center rounded-lg border border-slate-300 bg-white px-3 text-xl font-bold uppercase tracking-widest text-slate-950"
        >
          {letterInput ? letterInput.toUpperCase() : "--"}
        </div>
      </div>

      {errorMessage && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-2 text-xs font-semibold text-amber-900">
          {errorMessage}
        </div>
      )}
    </div>
  );
}
