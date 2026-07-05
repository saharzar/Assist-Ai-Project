export function AtmConfirmNameScreen({
  fullName,
  onConfirm,
  onRetry,
}: {
  fullName: string;
  onConfirm: () => void;
  onRetry: () => void;
}) {
  return (
    <div className="space-y-3">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-950">
          I heard:
        </h1>
        <p className="mt-2 rounded-lg border border-slate-200 bg-white p-3 text-lg font-bold text-slate-950">
          {fullName}
        </p>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          aria-label="Yes, continue"
          onClick={onConfirm}
          className="min-h-[42px] rounded-lg bg-teal-600 px-5 py-2 text-sm font-bold text-white hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
        >
          Yes, continue
        </button>
        <button
          type="button"
          aria-label="No, write again"
          onClick={onRetry}
          className="min-h-[42px] rounded-lg border border-slate-300 bg-white px-5 py-2 text-sm font-bold text-slate-800 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-teal-500"
        >
          No, write again
        </button>
      </div>
    </div>
  );
}
