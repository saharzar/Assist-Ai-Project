export function AtmLockoutScreen({
  secondsRemaining,
  labels,
  onTryAgain,
}: {
  secondsRemaining: number;
  labels: {
    title: string;
    hint: string;
    waitTime: string;
    seconds: string;
    tryAgain: string;
    tryAgainAria: string;
  };
  onTryAgain: () => void;
}) {
  const canTryAgain = secondsRemaining === 0;

  return (
    <div className="flex h-full flex-col justify-center space-y-3">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-950">
          {labels.title}
        </h1>
        <p className="mt-1 text-sm font-semibold leading-5 text-slate-700">
          {labels.hint}
        </p>
      </div>

      <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
        <p className="text-xs font-bold uppercase tracking-wide text-amber-900">{labels.waitTime}</p>
        <p className="text-4xl font-bold text-amber-950">{secondsRemaining}</p>
        <p className="text-sm font-semibold text-amber-900">{labels.seconds}</p>
      </div>

      {canTryAgain && (
        <button
          type="button"
          aria-label={labels.tryAgainAria}
          onClick={onTryAgain}
          className="min-h-[42px] w-fit rounded-lg bg-teal-600 px-5 py-2 text-sm font-bold text-white hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
        >
          {labels.tryAgain}
        </button>
      )}
    </div>
  );
}
