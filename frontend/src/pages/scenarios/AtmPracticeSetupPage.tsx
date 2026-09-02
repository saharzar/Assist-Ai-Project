import { useEffect, useRef, useState } from "react";
import { Eye, EyeOff, Mic, Square } from "lucide-react";
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
  const [assistantValidationMessage, setAssistantValidationMessage] = useState("");

  useEffect(() => {
    setAssistantValidationMessage("");
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

  const startVoiceInput = (mode: "name" | "pin") => {
    if (!isSpeechRecognitionSupported() || recognizerRef.current) return;
    setVoiceError("");
    setListeningFor(mode);
    recognizerRef.current = createSpeechRecognizer({
      onResult: (result) => {
        if (mode === "name") setFullName(sanitizeName(result));
        else setPin(result.replace(/\D/g, "").slice(0, 4));
      },
      onError: (message) => setVoiceError(message),
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

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitted(true);
    if (!canStart) {
      setAssistantValidationMessage(validationAssistantMessage);
      setAssistantSpeechRequestId((current) => current + 1);
    }
    if (canStart) {
      await Promise.all([
        unlockAssistantAudioPlayback(),
        preloadAssistantMessage(atmTranslations[language].cardInsertPrompt, language),
      ]);
      sessionStorage.setItem("assist_ai_atm_name", fullName.trim());
      sessionStorage.setItem("assist_ai_atm_pin", pin);
      navigate("/scenario/atm-withdrawal/practice");
    }
  };

  return (
    <section className="mx-auto grid w-full max-w-6xl items-start gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
    <div className="rounded-3xl border border-cyan-200/80 bg-white/95 p-6 shadow-soft sm:p-9">
      <p className="text-xs font-bold uppercase tracking-wide text-[#087f8c]">{setupText.eyebrow}</p>
      <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-[#1d1a5e]">{setupText.title}</h1>
      <p className="mt-3 leading-7 text-slate-600">
        {setupText.description}
      </p>

      <form className="mt-8 space-y-6" autoComplete="off" onSubmit={handleSubmit}>
        <div>
          <label htmlFor="atm-full-name" className="block text-sm font-bold text-slate-800">{setupText.fullName}</label>
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
            className="mt-2 min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-base text-slate-950 outline-none focus:border-[#302992] focus:ring-2 focus:ring-cyan-400"
          />
          {isSpeechRecognitionSupported() && <button type="button" aria-label={setupText.holdName} onClick={() => { if (listeningFor === "name") stopVoiceInput(); else startVoiceInput("name"); }} className={`mt-2 inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-bold text-white ${listeningFor === "name" ? "animate-pulse bg-rose-600 ring-2 ring-rose-300" : "bg-[#302992]"}`}>{listeningFor === "name" ? <Square className="h-4 w-4 fill-current" /> : <Mic className="h-4 w-4" />}{listeningFor === "name" ? setupText.listening : setupText.holdName}</button>}
          {submitted && !nameIsValid && <p className="mt-2 text-sm font-semibold text-rose-700">{setupText.nameError}</p>}
        </div>

        <div>
          <label htmlFor="atm-practice-pin" className="block text-sm font-bold text-slate-800">{setupText.pinLabel}</label>
          <div className="relative mt-2">
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
              className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 pr-12 text-2xl tracking-[0.5em] text-slate-950 outline-none focus:border-[#302992] focus:ring-2 focus:ring-cyan-400"
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

        <button type="submit" className="min-h-12 w-full rounded-xl bg-[#302992] px-5 py-3 font-bold text-white hover:bg-[#211c72] focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2">
          {setupText.start}
        </button>
      </form>

      <Link to="/scenario/atm-withdrawal" className="mt-5 inline-flex font-bold text-[#302992] hover:underline">{setupText.back}</Link>
    </div>
    <AtmSetupVoiceAssistant
      language={language}
      message={setupAssistantMessage}
      modeLabel={setupText.assistantMode}
      speechRequestId={assistantSpeechRequestId}
    />
    </section>
  );
}
