export function AtmWelcomeScreen({
  labels,
  onStart,
  cardInserted,
}: {
  labels: {
    eyebrow: string;
    title: string;
    body: string;
    start: string;
    startAria: string;
    cardPrompt: string;
  };
  onStart: () => void;
  cardInserted: boolean;
}) {
  return (
    <div className="flex h-full flex-col justify-center">
      <p className="text-xs font-bold uppercase tracking-wide text-[#3730a3]">{labels.eyebrow}</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
        {labels.title}
      </h1>
      <p className="mt-2 max-w-xl text-base font-semibold leading-7 text-slate-700">
        {labels.body}
      </p>
      {!cardInserted && <p className="mt-5 rounded-lg border border-cyan-300 bg-cyan-50 px-4 py-3 text-sm font-bold text-cyan-900">{labels.cardPrompt}</p>}
      {cardInserted && <button
        type="button"
        aria-label={labels.startAria}
        onClick={onStart}
        className="mt-5 min-h-[44px] w-fit rounded-lg bg-[#302992] px-6 py-2 text-base font-bold text-white hover:bg-[#211c72] focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2"
      >
        {labels.start}
      </button>}
    </div>
  );
}
