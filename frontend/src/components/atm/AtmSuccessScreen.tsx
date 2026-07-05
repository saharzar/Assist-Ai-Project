export function AtmSuccessScreen({
  labels,
  onFinish,
  onTryAgain,
}: {
  labels: {
    title: string;
    body: string;
    finish: string;
    finishAria: string;
    tryAgain: string;
    tryAgainAria: string;
  };
  onFinish: () => void;
  onTryAgain: () => void;
}) {
  return (
    <div className="flex h-full flex-col justify-center space-y-3">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-950">
          {labels.title}
        </h1>
        <p className="mt-2 text-base font-semibold leading-7 text-slate-700">
          {labels.body}
        </p>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          aria-label={labels.finishAria}
          onClick={onFinish}
          className="min-h-[42px] rounded-lg bg-teal-600 px-5 py-2 text-sm font-bold text-white hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
        >
          {labels.finish}
        </button>
        <button
          type="button"
          aria-label={labels.tryAgainAria}
          onClick={onTryAgain}
          className="min-h-[42px] rounded-lg border border-slate-300 bg-white px-5 py-2 text-sm font-bold text-slate-800 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-teal-500"
        >
          {labels.tryAgain}
        </button>
      </div>
    </div>
  );
}
