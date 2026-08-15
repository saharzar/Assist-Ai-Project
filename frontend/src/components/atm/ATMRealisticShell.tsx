import { useEffect, type ReactNode } from "react";

import atmImageUrl from "../../assets/atm-realistic.png";
import atmButtonBeepUrl from "../../assets/atm-button-beep.mp3";
import atmCreditCardUrl from "../../assets/atm-credit-card.png";
import atmEuroNotesUrl from "../../assets/atm-euro-notes.png";
import atmTurkishLiraUrl from "../../assets/atm-turkish-lira.png";
import { useTranslation } from "../../i18n";

const SOUND_STORAGE_KEY = "assist_ai_sound_enabled";
const AudioContextConstructor =
  window.AudioContext || window.webkitAudioContext;
const atmButtonAudioContext = AudioContextConstructor
  ? new AudioContextConstructor()
  : null;
let activeButtonBeep: AudioBufferSourceNode | null = null;
const atmButtonBeepBuffer = atmButtonAudioContext
  ? fetch(atmButtonBeepUrl)
      .then((response) => response.arrayBuffer())
      .then((data) => atmButtonAudioContext.decodeAudioData(data))
  : Promise.resolve(null);

function findFirstAudibleSecond(buffer: AudioBuffer) {
  const threshold = 0.008;
  for (let sample = 0; sample < buffer.length; sample += 1) {
    for (let channel = 0; channel < buffer.numberOfChannels; channel += 1) {
      if (Math.abs(buffer.getChannelData(channel)[sample]) >= threshold) {
        return sample / buffer.sampleRate;
      }
    }
  }
  return 0;
}

function playAtmButtonBeep() {
  if (
    localStorage.getItem(SOUND_STORAGE_KEY) === "false" ||
    !atmButtonAudioContext
  )
    return;
  void Promise.all([atmButtonAudioContext.resume(), atmButtonBeepBuffer])
    .then(([, buffer]) => {
      if (!buffer) return;
      activeButtonBeep?.stop();
      const source = atmButtonAudioContext.createBufferSource();
      const gain = atmButtonAudioContext.createGain();
      source.buffer = buffer;
      gain.gain.value = 0.45;
      source.connect(gain);
      gain.connect(atmButtonAudioContext.destination);
      source.start(0, findFirstAudibleSecond(buffer), 0.35);
      activeButtonBeep = source;
      source.addEventListener(
        "ended",
        () => {
          if (activeButtonBeep === source) activeButtonBeep = null;
        },
        { once: true },
      );
    })
    .catch(() => undefined);
}

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
  cardInserted: boolean;
  cardAnimating: boolean;
  receiptAnimating: boolean;
  receiptAnimationDurationMs: number;
  cashAnimating: boolean;
  cashAnimationDurationMs: number;
  cashCollectible: boolean;
  onCashCollect: () => void;
  cardEjecting: boolean;
  cardCollectible: boolean;
  onCardCollect: () => void;
  onCardInsert: () => void;
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

const cancelKey = {
  label: "Cancel",
  x: 33.3,
  y: 73.3,
  width: 9.2,
  height: 4.1,
};

const commandKeys = [
  { label: "Clear", x: 33.4, y: 78, action: "clear" },
  { label: "Back", x: 33.3, y: 82.7, action: "back" },
  { label: "Enter", x: 33.3, y: 87.4, action: "enter" },
] as const;

const spaceKey = { label: "Space", x: 51.5, y: 90.3, width: 32, height: 4.2 };
const letterBackKey = {
  label: "Back",
  x: 81.5,
  y: 84.5,
  width: 6,
  height: 4.3,
};

const letterRows = [
  {
    letters: "QWERTYUIOP".split(""),
    startX: 47.2,
    y: 74.1,
    gap: 4.05,
    offsets: [],
  },
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
  cardInserted,
  cardAnimating,
  receiptAnimating,
  receiptAnimationDurationMs,
  cashAnimating,
  cashAnimationDurationMs,
  cashCollectible,
  onCashCollect,
  cardEjecting,
  cardCollectible,
  onCardCollect,
  onCardInsert,
}: ATMRealisticShellProps) {
  const { language } = useTranslation();
  const cashImageUrl = language === "tr" ? atmTurkishLiraUrl : atmEuroNotesUrl;

  useEffect(() => {
    if (!onEnter || (keypadMode === "none" && !cashCollectible)) return;

    const handlePhysicalEnter = (event: KeyboardEvent) => {
      if (event.key !== "Enter" || event.repeat) return;

      const target = event.target as HTMLElement | null;
      if (target?.closest('button[aria-label="Enter"]')) return;

      event.preventDefault();
      event.stopPropagation();
      playAtmButtonBeep();
      onEnter();
    };

    window.addEventListener("keydown", handlePhysicalEnter, true);
    return () => window.removeEventListener("keydown", handlePhysicalEnter, true);
  }, [cashCollectible, keypadMode, onEnter]);

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

        {keypadMode === "none" && (
          <div className="absolute left-[76%] top-[16%] h-[24%] w-[16%]">
            {!cardInserted && (
              <button
                type="button"
                aria-label="Insert credit card"
                onClick={onCardInsert}
                className="absolute inset-0 rounded-lg border-2 border-cyan-300/0 bg-cyan-300/0 transition hover:border-cyan-300/70 hover:bg-cyan-300/20 focus:border-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-300"
              >
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute left-[19%] top-[30%] h-[62%] w-[52%] animate-pulse overflow-hidden rounded-md border border-blue-400/60 bg-[#061a4a] shadow-xl"
                >
                  <img src={atmCreditCardUrl} alt="" draggable={false} className="absolute left-[-9%] top-[-18%] h-[139%] w-[118%] max-w-none select-none" />
                </span>
                <span className="sr-only">Insert credit card</span>
              </button>
            )}
            {cardAnimating && (
              <div
                className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden"
                aria-hidden="true"
              >
                <div className="relative right-[5%] top-[30%] h-[82%] w-[52%] overflow-hidden rounded-md border border-blue-400/60 bg-[#061a4a] shadow-xl animate-[card-in-out_1400ms_ease-in-out_forwards]">
                  <img src={atmCreditCardUrl} alt="" draggable={false} className="absolute left-[-9%] top-[-18%] h-[139%] w-[118%] max-w-none select-none" />
                </div>
              </div>
            )}
            {cardEjecting && (
              <button
                type="button"
                aria-label="Collect credit card"
                disabled={!cardCollectible}
                onClick={onCardCollect}
                className={`absolute left-[19%] top-[30%] h-[62%] w-[52%] animate-[card-out_1400ms_ease-out_forwards] overflow-hidden rounded-md border border-blue-400/60 bg-[#061a4a] shadow-xl ${cardCollectible ? "pointer-events-auto cursor-pointer focus:outline-none focus:ring-4 focus:ring-cyan-400" : "pointer-events-none"}`}
              >
                <img src={atmCreditCardUrl} alt="" aria-hidden="true" draggable={false} className="pointer-events-none absolute left-[-9%] top-[-18%] h-[139%] w-[118%] max-w-none select-none" />
                <span className="sr-only">Collect credit card</span>
              </button>
            )}
          </div>
        )}

        {receiptAnimating && (
          <div className="pointer-events-none absolute left-[76%] top-[65%] h-[18%] w-[16%] overflow-hidden" aria-hidden="true">
            <div
              className="absolute left-[20%] top-[24%] h-[62%] w-[58%] rounded-b-sm border border-slate-300 bg-gradient-to-b from-white to-slate-100 shadow-lg animate-[receipt-out_ease-out_forwards]"
              style={{ animationDuration: `${receiptAnimationDurationMs}ms` }}
            >
              <div className="mx-auto mt-[15%] h-px w-2/3 bg-slate-300" />
              <div className="mx-auto mt-[10%] h-px w-1/2 bg-slate-300" />
            </div>
          </div>
        )}

        {cashAnimating && (
          <div className={`absolute left-[13%] top-[69%] h-[18%] w-[43%] overflow-hidden ${cashCollectible ? "pointer-events-auto" : "pointer-events-none"}`}>
            <button
              type="button"
              aria-label="Collect cash"
              disabled={!cashCollectible}
              onClick={onCashCollect}
              className={`absolute left-[10%] top-0 h-[82%] w-[80%] animate-[cash-out_ease-out_forwards] border-0 bg-transparent p-0 ${cashCollectible ? "cursor-pointer focus:outline-none focus:ring-4 focus:ring-cyan-400" : "cursor-default"}`}
              style={{ animationDuration: `${cashAnimationDurationMs}ms` }}
            >
              <img
                src={cashImageUrl}
                alt=""
                aria-hidden="true"
                draggable={false}
                className="pointer-events-none absolute inset-0 h-full w-full select-none object-fill drop-shadow-xl"
              />
            </button>
          </div>
        )}

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
                      x={
                        row.startX +
                        index * row.gap +
                        (row.offsets?.[index] ?? 0)
                      }
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
      onPointerDown={() => {
        playAtmButtonBeep();
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") playAtmButtonBeep();
      }}
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
