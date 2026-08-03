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
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-end justify-between gap-4 border-b border-indigo-100 pb-2">
        <div>
          <h1 className="text-xl font-bold text-[#171452]">{labels.title}</h1>
          <p className="mt-1 text-xs font-semibold text-slate-600">{labels.availableBalance}</p>
        </div>
        <strong className="text-2xl text-[#302992]">{balance.toLocaleString()}</strong>
      </div>

      <div>
        <p className="text-xs font-bold uppercase text-slate-600">{labels.chooseAmount}</p>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {PRESET_AMOUNTS.map((amount) => (
            <button
              key={amount}
              type="button"
              aria-label={`${labels.chooseAmount}: ${amount}`}
              onClick={() => onPresetSelect(amount)}
              className="min-h-10 rounded-lg border border-indigo-200 bg-[#f4f3ff] px-2 text-sm font-bold text-[#302992] hover:border-cyan-400 hover:bg-cyan-50 focus:outline-none focus:ring-2 focus:ring-cyan-400"
            >
              {amount.toLocaleString()}
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
}) {
  return (
    <div className="flex h-full flex-col justify-center space-y-3">
      <h1 className="text-xl font-bold text-[#171452]">{labels.title}</h1>
      <div className="rounded-lg border border-indigo-200 bg-[#f4f3ff] p-4">
        <p className="text-sm font-semibold text-slate-700">{labels.question}</p>
        <p className="mt-1 text-3xl font-bold text-[#302992]">{amount.toLocaleString()}</p>
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

export function AtmInsufficientFundsScreen({
  attemptedAmount,
  balance,
  labels,
}: {
  attemptedAmount: number;
  balance: number;
  labels: {
    title: string;
    body: string;
    attemptedAmount: string;
    availableBalance: string;
    returning: string;
  };
}) {
  return (
    <div role="alert" className="flex h-full flex-col justify-center">
      <div className="rounded-xl border-2 border-rose-400 bg-rose-50 p-5 text-rose-950 shadow-inner">
        <p className="text-xs font-bold uppercase tracking-wide text-rose-700">{labels.title}</p>
        <h1 className="mt-2 text-2xl font-bold">{labels.body}</h1>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-white/80 p-3">
            <p className="text-xs font-bold uppercase text-rose-700">{labels.attemptedAmount}</p>
            <p className="mt-1 text-xl font-bold">{attemptedAmount.toLocaleString()}</p>
          </div>
          <div className="rounded-lg bg-white/80 p-3">
            <p className="text-xs font-bold uppercase text-rose-700">{labels.availableBalance}</p>
            <p className="mt-1 text-xl font-bold">{balance.toLocaleString()}</p>
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
}: {
  withdrawnAmount: number;
  remainingBalance: number;
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
          <p className="mt-1 text-2xl font-bold text-[#302992]">{withdrawnAmount.toLocaleString()}</p>
        </div>
        <div className="rounded-lg bg-cyan-50 p-4">
          <p className="text-xs font-bold uppercase text-slate-600">{labels.remainingBalance}</p>
          <p className="mt-1 text-2xl font-bold text-[#087f8c]">{remainingBalance.toLocaleString()}</p>
        </div>
      </div>
      <p className="mt-4 text-sm font-semibold text-slate-700">{labels.pressEnter}</p>
    </div>
  );
}

import { Mic } from "lucide-react";
