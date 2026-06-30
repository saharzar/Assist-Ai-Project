export function AtmWelcomeScreen({ onStart }: { onStart: () => void }) {
  return (
    <div className="flex min-h-[380px] flex-col justify-center">
      <p className="text-sm font-bold uppercase tracking-wide text-teal-700">ATM practice</p>
      <h1 className="mt-3 text-4xl font-bold tracking-tight text-slate-950">
        Welcome.
      </h1>
      <p className="mt-4 max-w-xl text-xl leading-9 text-slate-700">
        This is a calm practice screen. Press start when you are ready.
      </p>
      <button
        type="button"
        aria-label="Start ATM practice"
        onClick={onStart}
        className="mt-8 min-h-[56px] w-fit rounded-lg bg-teal-600 px-7 py-3 text-lg font-bold text-white hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
      >
        Start
      </button>
    </div>
  );
}
