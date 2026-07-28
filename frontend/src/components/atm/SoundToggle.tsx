export function SoundToggle({
  isEnabled,
  labels,
  onToggle,
}: {
  isEnabled: boolean;
  labels: {
    soundOn: string;
    soundOff: string;
    turnSoundOn: string;
    turnSoundOff: string;
  };
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={isEnabled ? labels.turnSoundOff : labels.turnSoundOn}
      onClick={onToggle}
      className={`min-h-[44px] rounded-lg border px-4 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-cyan-400 ${
        isEnabled
          ? "border-cyan-200 bg-cyan-50 text-[#302992] hover:bg-cyan-100"
          : "border-indigo-200 bg-[#f4f3ff] text-[#302992] hover:bg-indigo-100"
      }`}
    >
      {isEnabled ? labels.soundOn : labels.soundOff}
    </button>
  );
}
