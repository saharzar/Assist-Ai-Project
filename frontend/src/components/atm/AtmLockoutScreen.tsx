export function AtmLockoutScreen({
  secondsRemaining,
  onTryAgain,
}: {
  secondsRemaining: number;
  onTryAgain: () => void;
}) {
  const canTryAgain = secondsRemaining === 0;

  return (
    <div className="flex min-h-[380px] flex-col justify-center space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-950">
          The ATM has a temporary problem.
        </h1>
        <p className="mt-3 text-xl leading-9 text-slate-700">
          Please wait before trying again.
        </p>
      </div>

      <div className="rounded-lg border border-amber-200 bg-amber-50 p-5">
        <p className="text-sm font-bold uppercase tracking-wide text-amber-900">Wait time</p>
        <p className="mt-2 text-5xl font-bold text-amber-950">{secondsRemaining}</p>
        <p className="mt-1 font-semibold text-amber-900">seconds</p>
      </div>

      {canTryAgain && (
        <button
          type="button"
          aria-label="Try ATM password again"
          onClick={onTryAgain}
          className="min-h-[56px] w-fit rounded-lg bg-teal-600 px-7 py-3 text-lg font-bold text-white hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
        >
          Try again
        </button>
      )}
    </div>
  );
}
