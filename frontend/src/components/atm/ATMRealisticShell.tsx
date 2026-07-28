import type { ReactNode } from "react";

import atmImageUrl from "../../assets/atm-realistic.png";

type KeypadMode = "none" | "numeric" | "letters" | "confirm";

type ATMRealisticShellProps = {
  children: ReactNode;
  keypadMode: KeypadMode;
  onDigit?: (digit: string) => void;
  onLetter?: (letter: string) => void;
  onClear?: () => void;
  onBackspace?: () => void;
  onEnter?: () => void;
  onCancel?: () => void;
};

const numericKeys = [
  { label: "1", value: "1", x: 15.4, y: 73.3 },
  { label: "2", value: "2", x: 20.8, y: 73.3 },
  { label: "3", value: "3", x: 27.4, y: 73.4 },
  { label: "4", value: "4", x: 14.8, y: 78 },
  { label: "5", value: "5", x: 20.2, y: 78 },
  { label: "6", value: "6", x: 26.9, y: 78.1 },
  { label: "7", value: "7", x: 14.2, y: 82.8 },
  { label: "8", value: "8", x: 19.6, y: 82.8 },
  { label: "9", value: "9", x: 26.3, y: 82.9 },
  { label: "0", value: "0", x: 19, y: 87.7 },
];

const cancelKey = { label: "Cancel", x: 33.3, y: 73.3, width: 9.2, height: 4.1 };

const commandKeys = [
  { label: "Clear", x: 33.4, y: 78, action: "clear" },
  { label: "Back", x: 33.3, y: 82.7, action: "back" },
  { label: "Enter", x: 33.3, y: 87.4, action: "enter" },
] as const;

const spaceKey = { label: "Space", x: 51.5, y: 90.3, width: 32, height: 4.2 };
const letterBackKey = { label: "Back", x: 81.5, y: 84.5, width: 6, height: 4.3 };

const letterRows = [
  { letters: "QWERTYUIOP".split(""), startX: 47.2, y: 74.1, gap: 4.05, offsets: [] },
  {
    letters: "ASDFGHJKL".split(""),
    startX: 48.5,
    y: 79,
    gap: 4.05,
    offsets: [0, 0.4, 0.6, 0.8, 1.2, 1.5, 1.8, 2.1, 2.4],
  },
  {
    letters: "ZXCVBNM".split(""),
    startX: 51,
    y: 84,
    gap: 4.15,
    offsets: [-1.5, -1.2, -0.8, 0, 0, 0.5, 1.1],
  },
];

export function ATMRealisticShell({
  children,
  keypadMode,
  onDigit,
  onLetter,
  onClear,
  onBackspace,
  onEnter,
  onCancel,
}: ATMRealisticShellProps) {
  const commandOverlays = (
    <>
      <OverlayButton
        label={cancelKey.label}
        x={cancelKey.x}
        y={cancelKey.y}
        width={cancelKey.width}
        height={cancelKey.height}
        onClick={() => onCancel?.()}
      />
      {commandKeys.map((key) => (
        <OverlayButton
          key={key.label}
          label={key.label}
          x={key.x}
          y={key.y}
          width={9.2}
          height={4.1}
          onClick={() => {
            if (key.action === "back") {
              onBackspace?.();
            }
            if (key.action === "clear") {
              onClear?.();
            }
            if (key.action === "enter") {
              onEnter?.();
            }
          }}
        />
      ))}
    </>
  );

  return (
    <div className="rounded-2xl bg-slate-950 p-2 shadow-2xl">
      <div className="relative mx-auto aspect-[3/2] w-full">
        <img
          src={atmImageUrl}
          alt="Realistic ATM practice machine"
          className="h-full w-full select-none object-contain"
          draggable={false}
        />

        <div className="absolute left-[12.2%] top-[10.9%] h-[50.3%] w-[59%] overflow-hidden rounded-[0.7%] bg-[#f8f9ff]/95 p-[1.2%] text-[#171452] shadow-inner">
          {children}
        </div>

        {keypadMode === "numeric" && (
          <>
            {numericKeys.map((key) => (
              <OverlayButton
                key={key.value}
                label={`Number ${key.label}`}
                x={key.x}
                y={key.y}
                width={4.7}
                height={4}
                onClick={() => onDigit?.(key.value)}
              />
            ))}
            {commandOverlays}
          </>
        )}

        {(keypadMode === "letters" || keypadMode === "confirm") && (
          <>
            {keypadMode === "letters" && (
              <>
                {letterRows.flatMap((row) =>
                  row.letters.map((letter, index) => (
                    <OverlayButton
                      key={letter}
                      label={`Letter ${letter}`}
                      x={row.startX + index * row.gap + (row.offsets?.[index] ?? 0)}
                      y={row.y}
                      width={3.25}
                      height={4}
                      onClick={() => onLetter?.(letter)}
                    />
                  )),
                )}
                <OverlayButton
                  label="Space"
                  x={spaceKey.x}
                  y={spaceKey.y}
                  width={spaceKey.width}
                  height={spaceKey.height}
                  onClick={() => onLetter?.(" ")}
                />
                <OverlayButton
                  label="Back"
                  x={letterBackKey.x}
                  y={letterBackKey.y}
                  width={letterBackKey.width}
                  height={letterBackKey.height}
                  onClick={() => onBackspace?.()}
                />
              </>
            )}
            {commandOverlays}
          </>
        )}
      </div>
    </div>
  );
}

function OverlayButton({
  label,
  x,
  y,
  width,
  height,
  onClick,
}: {
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      style={{
        left: `${x}%`,
        top: `${y}%`,
        width: `${width}%`,
        height: `${height}%`,
      }}
      className="absolute rounded-md border border-white/0 bg-cyan-300/0 transition hover:bg-cyan-300/30 focus:bg-indigo-300/30 focus:outline-none focus:ring-2 focus:ring-cyan-300 focus:ring-offset-2 focus:ring-offset-slate-950 active:bg-indigo-300/35"
    >
      <span className="sr-only">{label}</span>
    </button>
  );
}
