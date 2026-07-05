export function AtmWelcomeScreen({ onStart }: { onStart: () => void }) {
  return (
    <div className="flex h-full flex-col justify-center">
      <p className="text-xs font-bold uppercase tracking-wide text-teal-700">ATM practice</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
        Welcome.
      </h1>
      <p className="mt-2 max-w-xl text-base font-semibold leading-7 text-slate-700">
        This is a calm practice screen. Press start when you are ready.
      </p>
      <button
        type="button"
        aria-label="Start ATM practice"
        onClick={onStart}
        className="mt-5 min-h-[44px] w-fit rounded-lg bg-teal-600 px-6 py-2 text-base font-bold text-white hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
      >
        Start
      </button>
    </div>
  );
}
