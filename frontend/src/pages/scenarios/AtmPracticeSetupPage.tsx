import { useEffect, useRef, useState } from "react";
import { CreditCard, Eye, EyeOff, KeyRound, Mic, ShieldCheck, Square, UserRound } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "../../i18n";
import { AtmSetupVoiceAssistant } from "../../components/atm/AtmSetupVoiceAssistant";
import { atmSetupTranslations } from "../../lib/atmSetupTranslations";
import { atmTranslations } from "../../lib/atmTranslations";
import { createSpeechRecognizer, isSpeechRecognitionSupported } from "../../services/speechRecognitionService";
import { preloadAssistantMessage, unlockAssistantAudioPlayback } from "../../services/speechSynthesisService";

export function AtmPracticeSetupPage() {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [pin, setPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [nameInputUnlocked, setNameInputUnlocked] = useState(false);
  const [pinInputUnlocked, setPinInputUnlocked] = useState(false);
  const [listeningFor, setListeningFor] = useState<"name" | "pin" | null>(null);
  const [voiceError, setVoiceError] = useState("");
  const recognizerRef = useRef<ReturnType<typeof createSpeechRecognizer> | null>(null);
  const { language } = useTranslation();
  const setupText = atmSetupTranslations[language];
  const atmText = atmTranslations[language];
  const [submitted, setSubmitted] = useState(false);
  const [assistantSpeechRequestId, setAssistantSpeechRequestId] = useState(0);
  const [assistantStopRequestId, setAssistantStopRequestId] = useState(0);
  const [assistantValidationMessage, setAssistantValidationMessage] = useState("");

  useEffect(() => {
    setAssistantValidationMessage("");
    setVoiceError("");
  }, [language]);

  useEffect(() => {
    // Prepare the Soniox card-insertion prompt while the user completes the
    // form. The submit click can then navigate immediately without losing the
    // browser's user-initiated audio permission while waiting on the network.
    void preloadAssistantMessage(atmTranslations[language].cardInsertPrompt, language);
  }, [language]);

  const sanitizeName = (value: string) => value.replace(/[^\p{L}\p{M} '\u2019-]/gu, "").replace(/\s+/g, " ");
  const nameIsValid = /^[\p{L}\p{M}]+(?:[ '\u2019-][\p{L}\p{M}]+)+$/u.test(fullName.trim());
  const pinIsValid = /^\d{4}$/.test(pin);
  const canStart = nameIsValid && pinIsValid;
  const validationAssistantMessage = [
    !nameIsValid ? setupText.nameError : "",
    !pinIsValid ? setupText.pinError : "",
  ].filter(Boolean).join(" ");
  const setupAssistantMessage = assistantValidationMessage || setupText.assistantMessage;

  const reportVoiceError = (message: string) => {
    setVoiceError(message);
    setAssistantValidationMessage(message);
    setAssistantSpeechRequestId((current) => current + 1);
  };

  const startVoiceInput = (mode: "name" | "pin") => {
    if (!isSpeechRecognitionSupported() || recognizerRef.current) return;
    setAssistantStopRequestId((current) => current + 1);
    setVoiceError("");
    setListeningFor(mode);
    recognizerRef.current = createSpeechRecognizer({
      onResult: (result) => {
        if (mode === "name") setFullName(sanitizeName(result));
        else setPin(result.replace(/\D/g, "").slice(0, 4));
      },
      onError: reportVoiceError,
      onEnd: () => {
        recognizerRef.current = null;
        setListeningFor(null);
      },
    }, mode, language, {
      microphoneBlocked: atmText.speechMicBlocked,
      problem: atmText.speechProblem,
      browserFallback: atmText.speechBrowserFallback,
      noSpeech: atmText.speechNoMatch,
      limitReached: atmText.speechLimitReached,
      sessionExpired: atmText.speechSessionExpired,
      providerUnavailable: atmText.speechProviderUnavailable,
      networkError: atmText.speechNetworkError,
      busy: atmText.speechBusy,
    });
    recognizerRef.current?.start();
  };

  const stopVoiceInput = () => {
    setListeningFor(null);
    recognizerRef.current?.stop();
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitted(true);
    if (!canStart) {
      setAssistantValidationMessage(validationAssistantMessage);
      setAssistantSpeechRequestId((current) => current + 1);
    }
    if (canStart) {
      void unlockAssistantAudioPlayback();
      sessionStorage.setItem("assist_ai_atm_name", fullName.trim());
      sessionStorage.setItem("assist_ai_atm_pin", pin);
      navigate("/scenario/atm-withdrawal/practice");
    }
  };

  return (
    <section className="mx-auto grid w-full max-w-6xl items-start gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
    <div className="overflow-hidden rounded-3xl border-2 border-cyan-200/70 bg-white/95 shadow-[0_24px_60px_-34px_rgba(48,41,146,0.55)]">
      <div className="relative overflow-hidden bg-gradient-to-r from-[#211c72] via-[#302992] to-[#087f8c] px-6 py-6 text-white sm:px-8">
        <div className="absolute -right-10 -top-16 h-44 w-44 rounded-full border-[22px] border-white/10" aria-hidden="true" />
        <div className="relative flex items-center gap-4"><span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/25"><CreditCard className="h-9 w-9" aria-hidden="true" /></span><div><p className="text-xs font-extrabold uppercase tracking-[0.14em] text-cyan-100">{setupText.eyebrow}</p><h1 className="mt-1 text-3xl font-extrabold tracking-tight">{setupText.title}</h1><p className="mt-2 max-w-2xl font-medium leading-6 text-cyan-50">{setupText.description}</p></div></div>
      </div>

      <form className="space-y-6 p-5 sm:p-8" autoComplete="off" onSubmit={handleSubmit}>
        <div className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-white to-indigo-50/45 p-5 shadow-sm">
          <div className="mb-3 flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-[#302992]"><UserRound className="h-6 w-6" aria-hidden="true" /></span><label htmlFor="atm-full-name" className="text-base font-extrabold text-slate-800">{setupText.fullName}</label></div>
          <input
            id="atm-full-name"
            name="atm-session-name-not-username"
            value={fullName}
            onChange={(event) => setFullName(sanitizeName(event.target.value))}
            onFocus={() => setNameInputUnlocked(true)}
            onPointerDown={() => setNameInputUnlocked(true)}
            type="text"
            autoComplete="new-password"
            readOnly={!nameInputUnlocked}
            data-lpignore="true"
            data-1p-ignore="true"
            placeholder={setupText.fullNamePlaceholder}
            className="min-h-14 w-full rounded-xl border-2 border-slate-200 bg-white px-4 text-lg text-slate-950 shadow-sm outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200"
          />
          {isSpeechRecognitionSupported() && <button type="button" aria-label={setupText.holdName} onClick={() => { if (listeningFor === "name") stopVoiceInput(); else startVoiceInput("name"); }} className={`mt-2 inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-bold text-white ${listeningFor === "name" ? "animate-pulse bg-rose-600 ring-2 ring-rose-300" : "bg-[#302992]"}`}>{listeningFor === "name" ? <Square className="h-4 w-4 fill-current" /> : <Mic className="h-4 w-4" />}{listeningFor === "name" ? setupText.listening : setupText.holdName}</button>}
          {submitted && !nameIsValid && <p className="mt-2 text-sm font-semibold text-rose-700">{setupText.nameError}</p>}
        </div>

        <div className="rounded-2xl border border-cyan-100 bg-gradient-to-br from-white to-cyan-50/50 p-5 shadow-sm">
          <div className="mb-3 flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-100 text-[#087f8c]"><KeyRound className="h-6 w-6" aria-hidden="true" /></span><label htmlFor="atm-practice-pin" className="text-base font-extrabold text-slate-800">{setupText.pinLabel}</label></div>
          <div className="relative">
            <input
              id="atm-practice-pin"
              name="atm-session-pin-not-password"
              value={pin}
              onChange={(event) => setPin(event.target.value.replace(/\D/g, "").slice(0, 4))}
              onFocus={() => setPinInputUnlocked(true)}
              onPointerDown={() => setPinInputUnlocked(true)}
              type={showPin ? "text" : "password"}
              inputMode="numeric"
              autoComplete="new-password"
              readOnly={!pinInputUnlocked}
              data-lpignore="true"
              data-1p-ignore="true"
              maxLength={4}
              placeholder="••••"
              className="min-h-14 w-full rounded-xl border-2 border-slate-200 bg-white px-4 pr-12 text-2xl tracking-[0.5em] text-slate-950 shadow-sm outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200"
            />
            <button
              type="button"
              onClick={() => setShowPin((current) => !current)}
              aria-label={showPin ? setupText.hidePin : setupText.showPin}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-600 hover:bg-slate-100 hover:text-[#302992] focus:outline-none focus:ring-2 focus:ring-cyan-400"
            >
              {showPin ? <Eye className="h-5 w-5" aria-hidden="true" /> : <EyeOff className="h-5 w-5" aria-hidden="true" />}
            </button>
          </div>
          {isSpeechRecognitionSupported() && <button type="button" aria-label={setupText.holdPin} onClick={() => { if (listeningFor === "pin") stopVoiceInput(); else startVoiceInput("pin"); }} className={`mt-2 inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-bold text-white ${listeningFor === "pin" ? "animate-pulse bg-rose-600 ring-2 ring-rose-300" : "bg-[#302992]"}`}>{listeningFor === "pin" ? <Square className="h-4 w-4 fill-current" /> : <Mic className="h-4 w-4" />}{listeningFor === "pin" ? setupText.listening : setupText.holdPin}</button>}
          <p className="mt-2 text-sm text-slate-600">{setupText.pinHint}</p>
          {submitted && !pinIsValid && <p className="mt-2 text-sm font-semibold text-rose-700">{setupText.pinError}</p>}
        </div>

        {voiceError && <p className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm font-semibold text-amber-900">{voiceError}</p>}

        <button type="submit" className="inline-flex min-h-14 w-full items-center justify-center gap-3 rounded-xl bg-[#079c6b] px-5 py-3 text-lg font-extrabold text-white shadow-lg shadow-emerald-950/15 hover:bg-[#057a55] focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2">
          <ShieldCheck className="h-6 w-6" aria-hidden="true" />{setupText.start}
        </button>
      </form>

      <div className="border-t border-indigo-100 bg-slate-50/70 px-6 py-4 sm:px-8"><Link to="/scenario/atm-withdrawal" className="font-bold text-[#302992] hover:underline">{setupText.back}</Link></div>
    </div>
    <AtmSetupVoiceAssistant
      language={language}
      message={setupAssistantMessage}
      modeLabel={setupText.assistantMode}
      speechRequestId={assistantSpeechRequestId}
      stopRequestId={assistantStopRequestId}
    />
    </section>
  );
}
