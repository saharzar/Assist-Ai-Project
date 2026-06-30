export function SoundToggle({
  isEnabled,
  onToggle,
}: {
  isEnabled: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={isEnabled ? "Turn sound off" : "Turn sound on"}
      onClick={onToggle}
      className={`min-h-[44px] rounded-lg px-4 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-teal-500 ${
        isEnabled
          ? "bg-teal-100 text-teal-900 hover:bg-teal-200"
          : "bg-slate-100 text-slate-700 hover:bg-slate-200"
      }`}
    >
      {isEnabled ? "Sound On" : "Sound Off"}
    </button>
  );
}
