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
  if (!cardInserted) {
    return (
      <div className="flex h-full flex-col items-center justify-center text-center">
        <div aria-hidden="true" className="flex h-36 w-40 items-center justify-center rounded-2xl bg-gradient-to-br from-[#197dab] via-[#249aca] to-[#56c7e3] shadow-lg ring-1 ring-cyan-700/15">
          <svg viewBox="0 0 160 144" className="h-full w-full" fill="none">
            <rect x="28" y="17" width="104" height="13" rx="4" fill="#103652" opacity="0.9" />
            <rect x="39" y="38" width="82" height="44" rx="7" fill="white" />
            <rect x="45" y="44" width="70" height="9" rx="2" fill="#197dab" />
            <rect x="45" y="59" width="23" height="14" rx="2" fill="#b8e7f5" />
            <path transform="translate(27 25) scale(.65 .78)" d="M80 129c-19 0-31-9-39-22L28 88c-3-5-1-11 4-14 5-3 10-1 13 3l7 10V65c0-6 4-10 10-10s10 4 10 10v18-25c0-6 4-10 10-10s10 4 10 10v25-19c0-6 4-10 10-10s10 4 10 10v22-13c0-6 4-10 10-10s10 4 10 10v24c0 20-15 32-32 32H80Z" fill="#197dab" stroke="white" strokeWidth="6" strokeLinejoin="round" />
            <path d="M139 91V54m0 0-10 11m10-11 10 11" stroke="white" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h1 className="mt-5 max-w-xl text-2xl font-bold leading-9 text-slate-950">{labels.cardPrompt}</h1>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col justify-center">
      <p className="text-xs font-bold uppercase tracking-wide text-[#3730a3]">{labels.eyebrow}</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
        {labels.title}
      </h1>
      <p className="mt-2 max-w-xl text-base font-semibold leading-7 text-slate-700">
        {labels.body}
      </p>
      <button
        type="button"
        aria-label={labels.startAria}
        onClick={onStart}
        className="mt-5 min-h-[44px] w-fit rounded-lg bg-[#302992] px-6 py-2 text-base font-bold text-white hover:bg-[#211c72] focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2"
      >
        {labels.start}
      </button>
    </div>
  );
}
