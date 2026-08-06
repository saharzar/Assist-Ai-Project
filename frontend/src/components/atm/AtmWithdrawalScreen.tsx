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
  };
  onAmountChange: (value: string) => void;
  onPresetSelect: (amount: number) => void;
  onVoiceStart: () => void;
  onVoiceStop: () => void;
  formatAmount: (amount: number) => string;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-end justify-between gap-4 border-b border-indigo-100 pb-2">
        <div>
          <h1 className="text-xl font-bold text-[#171452]">{labels.title}</h1>
          <p className="mt-1 text-xs font-semibold text-slate-600">{labels.availableBalance}</p>
        </div>
        <strong className="text-2xl text-[#302992]">{formatAmount(balance)}</strong>
      </div>

      <div>
        <p className="text-xs font-bold uppercase text-slate-600">{labels.chooseAmount}</p>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {PRESET_AMOUNTS.map((amount) => (
            <button
              key={amount}
              type="button"
              aria-label={`${labels.chooseAmount}: ${formatAmount(amount)}`}
              onClick={() => onPresetSelect(amount)}
              className="min-h-10 rounded-lg border border-indigo-200 bg-[#f4f3ff] px-2 text-sm font-bold text-[#302992] hover:border-cyan-400 hover:bg-cyan-50 focus:outline-none focus:ring-2 focus:ring-cyan-400"
            >
              {formatAmount(amount)}
            </button>
          ))}
        </div>
      </div>

      <label className="block text-xs font-bold text-slate-700">
        {labels.customAmount}
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={amountInput}
          onChange={(event) => onAmountChange(event.target.value)}
          placeholder={labels.amountPlaceholder}
          className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-xl font-bold text-slate-950 outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-200"
        />
      </label>

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

      {errorMessage && (
        <div role="alert" className="rounded-lg border border-rose-300 bg-rose-50 p-2 text-xs font-semibold text-rose-900">
          {errorMessage}
        </div>
      )}
      <p className="text-xs font-semibold text-[#302992]">{labels.pressEnter}</p>
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
  speechError,
  isListening,
  isPreparingVoice,
  isVoiceSupported,
  isPrinting,
  labels,
  onVoiceStart,
  onVoiceStop,
  onTestReceipt,
}: {
  speechError: string;
  isListening: boolean;
  isPreparingVoice: boolean;
  isVoiceSupported: boolean;
  isPrinting: boolean;
  labels: {
    title: string;
    question: string;
    hint: string;
    voiceButton: string;
    voiceHint: string;
    printing: string;
    testReceipt: string;
    listening: string;
    preparing: string;
  };
  onVoiceStart: () => void;
  onVoiceStop: () => void;
  onTestReceipt: () => void;
}) {
  return (
    <div className="flex h-full flex-col justify-center space-y-3">
      <h1 className="text-xl font-bold text-[#171452]">{labels.title}</h1>
      <div className="rounded-lg border border-indigo-200 bg-[#f4f3ff] p-4">
        <p className="text-lg font-bold text-[#302992]">{isPrinting ? labels.printing : labels.question}</p>
      </div>
      {!isPrinting && <>
        <p className="text-xs font-semibold text-slate-600">{labels.hint}</p>
        <button
          type="button"
          onClick={onTestReceipt}
          className="min-h-11 w-full rounded-lg border-2 border-[#302992] bg-white px-3 text-sm font-bold text-[#302992] hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-cyan-400"
        >
          {labels.testReceipt}
        </button>
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
      <div className="mb-5 rounded-xl bg-emerald-100 px-6 py-3 text-3xl" aria-hidden="true">💶</div>
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
}: {
  withdrawnAmount: number;
  remainingBalance: number;
  formatAmount: (amount: number) => string;
  labels: {
    title: string;
    withdrawnAmount: string;
    remainingBalance: string;
    pressEnter: string;
  };
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
      <p className="mt-4 text-sm font-semibold text-slate-700">{labels.pressEnter}</p>
    </div>
  );
}

import { Mic } from "lucide-react";
