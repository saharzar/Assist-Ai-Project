const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];

export function NumericKeypad({
  onDigit,
  onClear,
  onBackspace,
  onEnter,
}: {
  onDigit: (digit: string) => void;
  onClear: () => void;
  onBackspace: () => void;
  onEnter: () => void;
}) {
  return (
    <div className="grid grid-cols-3 gap-3">
      {keys.map((key) => (
        <button
          key={key}
          type="button"
          aria-label={`Number ${key}`}
          onClick={() => onDigit(key)}
          className="min-h-[58px] rounded-lg bg-slate-900 text-xl font-bold text-white hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-cyan-400"
        >
          {key}
        </button>
      ))}
      <button
        type="button"
        aria-label="Clear PIN"
        onClick={onClear}
        className="min-h-[58px] rounded-lg border border-slate-300 bg-white px-2 font-bold text-slate-800 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-cyan-400"
      >
        Clear
      </button>
      <button
        type="button"
        aria-label="Number 0"
        onClick={() => onDigit("0")}
        className="min-h-[58px] rounded-lg bg-slate-900 text-xl font-bold text-white hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-cyan-400"
      >
        0
      </button>
      <button
        type="button"
        aria-label="Backspace PIN"
        onClick={onBackspace}
        className="min-h-[58px] rounded-lg border border-slate-300 bg-white px-2 font-bold text-slate-800 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-cyan-400"
      >
        Back
      </button>
      <button
        type="button"
        aria-label="Submit PIN"
        onClick={onEnter}
        className="col-span-3 min-h-[58px] rounded-lg bg-[#302992] px-5 py-3 text-lg font-bold text-white hover:bg-[#211c72] focus:outline-none focus:ring-2 focus:ring-cyan-400"
      >
        Enter
      </button>
    </div>
  );
}
