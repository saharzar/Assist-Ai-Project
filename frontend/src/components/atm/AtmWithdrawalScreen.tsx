import { useState } from "react";

const PRESET_AMOUNTS = [100, 200, 300, 500, 750, 1000];

export function AtmWithdrawalScreen({
  balance,
  amountInput,
  errorMessage,
  speechError,
  isListening,
  isPreparingVoice,
  isVoiceSupported,
  labels,
  onAmountChange,
  onPresetSelect,
  onVoiceStart,
  onVoiceStop,
  onBackToMenu,
  formatAmount,
}: {
  balance: number;
  amountInput: string;
  errorMessage: string;
  speechError: string;
  isListening: boolean;
  isPreparingVoice: boolean;
  isVoiceSupported: boolean;
  labels: {
    title: string;
    availableBalance: string;
    chooseAmount: string;
    customAmount: string;
    amountPlaceholder: string;
    pressEnter: string;
    voiceButton: string;
    voiceHint: string;
    listening: string;
    preparing: string;
    backToMenu: string;
  };
  onAmountChange: (value: string) => void;
  onPresetSelect: (amount: number) => void;
  onVoiceStart: () => void;
  onVoiceStop: () => void;
  onBackToMenu: () => void;
  formatAmount: (amount: number) => string;
}) {
  const [amountInputUnlocked, setAmountInputUnlocked] = useState(false);

  return (
    <div className="space-y-1.5">
      <div className="flex items-end justify-between gap-3 border-b border-indigo-100 pb-1">
        <div>
          <h1 className="text-lg font-bold leading-tight text-[#171452]">{labels.title}</h1>
          <p className="text-[11px] font-semibold leading-tight text-slate-600">{labels.availableBalance}</p>
        </div>
        <strong className="text-xl leading-none text-[#302992]">{formatAmount(balance)}</strong>
      </div>

      <div>
        <p className="text-[11px] font-bold uppercase leading-tight text-slate-600">{labels.chooseAmount}</p>
        <div className="mt-1 grid grid-cols-3 gap-1.5">
          {PRESET_AMOUNTS.map((amount) => (
            <button
              key={amount}
              type="button"
              aria-label={`${labels.chooseAmount}: ${formatAmount(amount)}`}
              onClick={() => onPresetSelect(amount)}
              className="min-h-8 rounded-md border border-indigo-200 bg-[#f4f3ff] px-2 text-xs font-bold text-[#302992] hover:border-cyan-400 hover:bg-cyan-50 focus:outline-none focus:ring-2 focus:ring-cyan-400"
            >
              {formatAmount(amount)}
            </button>
          ))}
        </div>
      </div>

      <label className="block text-[11px] font-bold leading-tight text-slate-700">
        {labels.customAmount}
        <input
          name="atm-withdrawal-amount-not-password"
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={amountInput}
          onChange={(event) => onAmountChange(event.target.value)}
          onFocus={() => setAmountInputUnlocked(true)}
          onPointerDown={() => setAmountInputUnlocked(true)}
          autoComplete="new-password"
          readOnly={!amountInputUnlocked}
          data-lpignore="true"
          data-1p-ignore="true"
          placeholder={labels.amountPlaceholder}
          className="mt-0.5 min-h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-base font-bold text-slate-950 outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-200"
        />
      </label>

      <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-2">
        <button
          type="button"
          disabled={!isVoiceSupported}
          onPointerDown={(event) => {
            event.preventDefault();
            event.currentTarget.setPointerCapture(event.pointerId);
            onVoiceStart();
          }}
          onPointerUp={onVoiceStop}
          onPointerCancel={onVoiceStop}
          className="flex min-h-9 items-center justify-center gap-1.5 rounded-md bg-[#302992] px-2 text-xs font-bold leading-tight text-white outline-none hover:bg-[#211c72] focus:ring-2 focus:ring-cyan-400 disabled:bg-slate-300"
        >
          <Mic className="h-4 w-4" aria-hidden="true" />
          {isPreparingVoice ? labels.preparing : isListening ? labels.listening : labels.voiceButton}
        </button>
        <button
          type="button"
          onClick={onBackToMenu}
          className="min-h-9 rounded-md border-2 border-[#302992] bg-white px-2 text-xs font-bold leading-tight text-[#302992] hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-cyan-400"
        >
          {labels.backToMenu}
        </button>
      </div>
      <p className="text-[10px] font-semibold leading-tight text-slate-600">{labels.voiceHint}</p>
      {speechError && <div role="alert" className="rounded-md border border-amber-300 bg-amber-50 p-1.5 text-[10px] font-semibold leading-tight text-amber-900">{speechError}</div>}

      {errorMessage && (
        <div role="alert" className="rounded-md border border-rose-300 bg-rose-50 p-1.5 text-[10px] font-semibold leading-tight text-rose-900">
          {errorMessage}
        </div>
      )}
      <p className="text-[10px] font-semibold leading-tight text-[#302992]">{labels.pressEnter}</p>
    </div>
  );
}

export function AtmWithdrawalConfirmScreen({
  amount,
  speechError,
  isListening,
  isPreparingVoice,
  isVoiceSupported,
  labels,
  onVoiceStart,
  onVoiceStop,
  formatAmount,
}: {
  amount: number;
  speechError: string;
  isListening: boolean;
  isPreparingVoice: boolean;
  isVoiceSupported: boolean;
  labels: {
    title: string;
    question: string;
    hint: string;
    voiceButton: string;
    voiceHint: string;
    listening: string;
    preparing: string;
  };
  onVoiceStart: () => void;
  onVoiceStop: () => void;
  formatAmount: (amount: number) => string;
}) {
  return (
    <div className="flex h-full flex-col justify-center space-y-3">
      <h1 className="text-xl font-bold text-[#171452]">{labels.title}</h1>
      <div className="rounded-lg border border-indigo-200 bg-[#f4f3ff] p-4">
        <p className="text-sm font-semibold text-slate-700">{labels.question}</p>
        <p className="mt-1 text-3xl font-bold text-[#302992]">{formatAmount(amount)}</p>
      </div>
      <p className="text-xs font-semibold text-slate-600">{labels.hint}</p>
      <button
        type="button"
        disabled={!isVoiceSupported}
        onPointerDown={(event) => {
          event.preventDefault();
          event.currentTarget.setPointerCapture(event.pointerId);
          onVoiceStart();
        }}
        onPointerUp={onVoiceStop}
        onPointerCancel={onVoiceStop}
        className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#302992] px-3 text-sm font-bold text-white outline-none hover:bg-[#211c72] focus:ring-2 focus:ring-cyan-400 disabled:bg-slate-300"
      >
        <Mic className="h-4 w-4" aria-hidden="true" />
        {isPreparingVoice ? labels.preparing : isListening ? labels.listening : labels.voiceButton}
      </button>
      <p className="text-xs font-semibold text-slate-600">{labels.voiceHint}</p>
      {speechError && <div role="alert" className="rounded-lg border border-amber-300 bg-amber-50 p-2 text-xs font-semibold text-amber-900">{speechError}</div>}
    </div>
  );
}

export function AtmReceiptPromptScreen({
  isPrinting,
  labels,
  onPrintReceipt,
  onSkipReceipt,
}: {
  isPrinting: boolean;
  labels: {
    title: string;
    question: string;
    printing: string;
    printReceipt: string;
    skipReceipt: string;
  };
  onPrintReceipt: () => void;
  onSkipReceipt: () => void;
}) {
  return (
    <div className="flex h-full flex-col justify-center space-y-3">
      <h1 className="text-xl font-bold text-[#171452]">{labels.title}</h1>
      <div className="rounded-lg border border-indigo-200 bg-[#f4f3ff] p-4">
        <p className="text-lg font-bold text-[#302992]">{isPrinting ? labels.printing : labels.question}</p>
      </div>
      {!isPrinting && <>
        <div className="grid grid-cols-2 gap-3">
          <button type="button" onClick={onPrintReceipt} className="min-h-14 rounded-lg bg-[#302992] px-4 font-bold text-white hover:bg-[#211c72] focus:outline-none focus:ring-2 focus:ring-cyan-400">{labels.printReceipt}</button>
          <button type="button" onClick={onSkipReceipt} className="min-h-14 rounded-lg border-2 border-[#302992] bg-white px-4 font-bold text-[#302992] hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-cyan-400">{labels.skipReceipt}</button>
        </div>
      </>}
    </div>
  );
}

export function AtmCashDispensingScreen({ title, message }: { title: string; message: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center text-center">
      <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-cyan-100" aria-hidden="true">
        <span className="h-8 w-8 animate-spin rounded-full border-4 border-cyan-200 border-t-[#302992]" />
      </div>
      <p className="text-xs font-bold uppercase tracking-wide text-[#3730a3]">{title}</p>
      <h1 className="mt-2 max-w-lg text-2xl font-bold text-slate-950">{message}</h1>
    </div>
  );
}

export function AtmCashCollectScreen({ title, message, hint }: { title: string; message: string; hint: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center text-center">
      <div aria-hidden="true" className="mb-5 flex h-28 w-32 items-center justify-center rounded-2xl bg-gradient-to-br from-[#197dab] via-[#249aca] to-[#56c7e3] shadow-lg ring-1 ring-cyan-700/15">
        <svg viewBox="0 0 160 144" className="h-full w-full" fill="none">
          <rect x="25" y="18" width="110" height="13" rx="4" fill="#103652" opacity="0.9" />
          <rect x="42" y="39" width="76" height="39" rx="6" fill="white" />
          <rect x="49" y="46" width="62" height="7" rx="2" fill="#197dab" />
          <circle cx="80" cy="64" r="8" stroke="#197dab" strokeWidth="4" />
          <path transform="translate(31 31) scale(.58 .7)" d="M80 129c-19 0-31-9-39-22L28 88c-3-5-1-11 4-14 5-3 10-1 13 3l7 10V65c0-6 4-10 10-10s10 4 10 10v18-25c0-6 4-10 10-10s10 4 10 10v25-19c0-6 4-10 10-10s10 4 10 10v22-13c0-6 4-10 10-10s10 4 10 10v24c0 20-15 32-32 32H80Z" fill="#197dab" stroke="white" strokeWidth="6" strokeLinejoin="round" />
          <path d="M139 53v37m0 0-10-11m10 11 10-11" stroke="white" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <p className="text-xs font-bold uppercase tracking-wide text-[#3730a3]">{title}</p>
      <h1 className="mt-2 max-w-lg text-2xl font-bold text-slate-950">{message}</h1>
      <p className="mt-4 text-sm font-semibold text-slate-600">{hint}</p>
    </div>
  );
}

export function AtmInsufficientFundsScreen({
  attemptedAmount,
  balance,
  isFading,
  labels,
  formatAmount,
}: {
  attemptedAmount: number;
  balance: number;
  isFading: boolean;
  formatAmount: (amount: number) => string;
  labels: {
    title: string;
    body: string;
    attemptedAmount: string;
    availableBalance: string;
    returning: string;
  };
}) {
  return (
    <div
      role="alert"
      className={`flex h-full flex-col justify-center transition-opacity duration-500 ease-out ${isFading ? "opacity-0" : "opacity-100"}`}
    >
      <div className="rounded-xl border-2 border-rose-400 bg-rose-50 p-5 text-rose-950 shadow-inner">
        <p className="text-xs font-bold uppercase tracking-wide text-rose-700">{labels.title}</p>
        <h1 className="mt-2 text-2xl font-bold">{labels.body}</h1>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-white/80 p-3">
            <p className="text-xs font-bold uppercase text-rose-700">{labels.attemptedAmount}</p>
            <p className="mt-1 text-xl font-bold">{formatAmount(attemptedAmount)}</p>
          </div>
          <div className="rounded-lg bg-white/80 p-3">
            <p className="text-xs font-bold uppercase text-rose-700">{labels.availableBalance}</p>
            <p className="mt-1 text-xl font-bold">{formatAmount(balance)}</p>
          </div>
        </div>
        <p className="mt-4 text-sm font-semibold text-rose-800">{labels.returning}</p>
      </div>
    </div>
  );
}

export function AtmWithdrawalResultScreen({
  withdrawnAmount,
  remainingBalance,
  labels,
  formatAmount,
  isListening,
  isPreparingVoice,
  isVoiceSupported,
  speechError,
  onAnotherTransaction,
  onFinish,
  onVoiceStart,
  onVoiceStop,
}: {
  withdrawnAmount: number;
  remainingBalance: number;
  formatAmount: (amount: number) => string;
  labels: {
    title: string;
    withdrawnAmount: string;
    remainingBalance: string;
    pressEnter: string;
    question: string;
    anotherTransaction: string;
    finish: string;
    voiceButton: string;
    listening: string;
    preparing: string;
  };
  isListening: boolean;
  isPreparingVoice: boolean;
  isVoiceSupported: boolean;
  speechError: string;
  onAnotherTransaction: () => void;
  onFinish: () => void;
  onVoiceStart: () => void;
  onVoiceStop: () => void;
}) {
  return (
    <div className="flex h-full flex-col justify-center">
      <h1 className="text-2xl font-bold text-[#171452]">{labels.title}</h1>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-lg bg-[#f4f3ff] p-4">
          <p className="text-xs font-bold uppercase text-slate-600">{labels.withdrawnAmount}</p>
          <p className="mt-1 text-2xl font-bold text-[#302992]">{formatAmount(withdrawnAmount)}</p>
        </div>
        <div className="rounded-lg bg-cyan-50 p-4">
          <p className="text-xs font-bold uppercase text-slate-600">{labels.remainingBalance}</p>
          <p className="mt-1 text-2xl font-bold text-[#087f8c]">{formatAmount(remainingBalance)}</p>
        </div>
      </div>
      <p className="mt-4 text-base font-bold text-slate-800">{labels.question}</p>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <button type="button" onClick={onAnotherTransaction} className="min-h-11 rounded-lg bg-[#302992] px-4 font-bold text-white hover:bg-[#211c72] focus:outline-none focus:ring-2 focus:ring-cyan-400">{labels.anotherTransaction}</button>
        <button type="button" onClick={onFinish} className="min-h-11 rounded-lg border-2 border-[#302992] bg-white px-4 font-bold text-[#302992] hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-cyan-400">{labels.finish}</button>
      </div>
      <button
        type="button"
        disabled={!isVoiceSupported}
        onPointerDown={(event) => { event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId); onVoiceStart(); }}
        onPointerUp={onVoiceStop}
        onPointerCancel={onVoiceStop}
        className="mt-3 flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#302992] px-3 text-sm font-bold text-white disabled:bg-slate-300"
      >
        <Mic className="h-4 w-4" aria-hidden="true" />
        {isPreparingVoice ? labels.preparing : isListening ? labels.listening : labels.voiceButton}
      </button>
      {speechError && <div role="alert" className="mt-3 rounded-lg border border-amber-300 bg-amber-50 p-2 text-xs font-semibold text-amber-900">{speechError}</div>}
    </div>
  );
}

export function AtmCardReturnScreen({ title, message }: { title: string; message: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center text-center">
      <div aria-hidden="true" className="mb-5 flex h-28 w-32 items-center justify-center rounded-2xl bg-gradient-to-br from-[#197dab] via-[#249aca] to-[#56c7e3] shadow-lg">
        <svg viewBox="0 0 160 144" className="h-full w-full" fill="none">
          <rect x="25" y="18" width="110" height="13" rx="4" fill="#103652" opacity="0.9" />
          <rect x="42" y="39" width="76" height="42" rx="6" fill="white" />
          <rect x="49" y="46" width="62" height="8" rx="2" fill="#197dab" />
          <path d="M80 124V89m0 35-11-12m11 12 11-12" stroke="white" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <p className="text-xs font-bold uppercase tracking-wide text-[#3730a3]">{title}</p>
      <h1 className="mt-2 max-w-lg text-2xl font-bold text-slate-950">{message}</h1>
    </div>
  );
}

import { Mic } from "lucide-react";
