export function AtmSuccessScreen({
  onFinish,
  onTryAgain,
}: {
  onFinish: () => void;
  onTryAgain: () => void;
}) {
  return (
    <div className="flex min-h-[380px] flex-col justify-center space-y-6">
      <div>
        <h1 className="text-4xl font-bold tracking-tight text-slate-950">
          Well done!
        </h1>
        <p className="mt-4 text-xl leading-9 text-slate-700">
          You entered the correct password.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          aria-label="Finish ATM scenario"
          onClick={onFinish}
          className="min-h-[56px] rounded-lg bg-teal-600 px-7 py-3 text-lg font-bold text-white hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
        >
          Finish scenario
        </button>
        <button
          type="button"
          aria-label="Try ATM scenario again"
          onClick={onTryAgain}
          className="min-h-[56px] rounded-lg border border-slate-300 bg-white px-7 py-3 text-lg font-bold text-slate-800 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-teal-500"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
