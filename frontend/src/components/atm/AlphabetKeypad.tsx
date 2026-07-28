const rows = [
  ["A", "B", "C", "D", "E", "F", "G"],
  ["H", "I", "J", "K", "L", "M", "N"],
  ["O", "P", "Q", "R", "S", "T", "U"],
  ["V", "W", "X", "Y", "Z"],
];

export function AlphabetKeypad({
  onLetter,
  onClear,
  onBackspace,
  onEnter,
}: {
  onLetter: (letter: string) => void;
  onClear: () => void;
  onBackspace: () => void;
  onEnter: () => void;
}) {
  return (
    <div className="space-y-3">
      {rows.map((row) => (
        <div key={row.join("")} className="grid grid-cols-7 gap-2">
          {row.map((letter) => (
            <button
              key={letter}
              type="button"
              aria-label={`Letter ${letter}`}
              onClick={() => onLetter(letter)}
              className="min-h-[46px] rounded-lg bg-slate-900 text-base font-bold text-white hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-cyan-400"
            >
              {letter}
            </button>
          ))}
        </div>
      ))}
      <div className="grid grid-cols-3 gap-3 pt-2">
        <button
          type="button"
          aria-label="Clear letters"
          onClick={onClear}
          className="min-h-[52px] rounded-lg border border-slate-300 bg-white px-3 font-bold text-slate-800 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-cyan-400"
        >
          Clear
        </button>
        <button
          type="button"
          aria-label="Backspace letters"
          onClick={onBackspace}
          className="min-h-[52px] rounded-lg border border-slate-300 bg-white px-3 font-bold text-slate-800 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-cyan-400"
        >
          Back
        </button>
        <button
          type="button"
          aria-label="Submit letters"
          onClick={onEnter}
          className="min-h-[52px] rounded-lg bg-[#302992] px-3 font-bold text-white hover:bg-[#211c72] focus:outline-none focus:ring-2 focus:ring-cyan-400"
        >
          Enter
        </button>
      </div>
    </div>
  );
}
