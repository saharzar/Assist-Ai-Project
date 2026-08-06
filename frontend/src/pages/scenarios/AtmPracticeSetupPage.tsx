import { useEffect, useRef, useState } from "react";
import { Eye, EyeOff, Mic } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "../../i18n";
import { atmTranslations } from "../../lib/atmTranslations";
import { createSpeechRecognizer, isSpeechRecognitionSupported } from "../../services/speechRecognitionService";
import { preloadAssistantMessage, unlockAssistantAudioPlayback } from "../../services/speechSynthesisService";

export function AtmPracticeSetupPage() {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [pin, setPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [listeningFor, setListeningFor] = useState<"name" | "pin" | null>(null);
  const [voiceError, setVoiceError] = useState("");
  const recognizerRef = useRef<ReturnType<typeof createSpeechRecognizer> | null>(null);
  const { language } = useTranslation();
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    void preloadAssistantMessage(atmTranslations[language].cardInsertPrompt, language);
  }, [language]);

  const nameIsValid = /^[A-Za-z]+(?: [A-Za-z]+)*$/.test(fullName.trim());
  const pinIsValid = /^\d{4}$/.test(pin);
  const canStart = nameIsValid && pinIsValid;

  const startVoiceInput = (mode: "name" | "pin") => {
    if (!isSpeechRecognitionSupported() || recognizerRef.current) return;
    setVoiceError("");
    setListeningFor(mode);
    recognizerRef.current = createSpeechRecognizer({
      onResult: (result) => {
        if (mode === "name") setFullName(result.replace(/[^A-Za-z ]/g, "").replace(/\s+/g, " "));
        else setPin(result.replace(/\D/g, "").slice(0, 4));
      },
      onError: (message) => setVoiceError(message),
      onEnd: () => {
        recognizerRef.current = null;
        setListeningFor(null);
      },
    }, mode, language);
    recognizerRef.current?.start();
  };

  const stopVoiceInput = () => {
    setListeningFor(null);
    recognizerRef.current?.stop();
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitted(true);
    if (canStart) {
      unlockAssistantAudioPlayback();
      sessionStorage.setItem("assist_ai_atm_name", fullName.trim());
      sessionStorage.setItem("assist_ai_atm_pin", pin);
      navigate("/scenario/atm-withdrawal/practice");
    }
  };

  return (
    <section className="mx-auto w-full max-w-2xl rounded-3xl border border-cyan-200/80 bg-white/95 p-6 shadow-soft sm:p-9">
      <p className="text-xs font-bold uppercase tracking-wide text-[#087f8c]">ATM practice setup</p>
      <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-[#1d1a5e]">Set up your practice</h1>
      <p className="mt-3 leading-7 text-slate-600">
        Enter your name and create a four-digit practice PIN. This information is used only for this practice session.
      </p>

      <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
        <div>
          <label htmlFor="atm-full-name" className="block text-sm font-bold text-slate-800">Full name</label>
          <input
            id="atm-full-name"
            value={fullName}
            onChange={(event) => setFullName(event.target.value.replace(/[^A-Za-z ]/g, "").replace(/\s+/g, " "))}
            type="text"
            autoComplete="name"
            placeholder="Enter your full name"
            className="mt-2 min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-base text-slate-950 outline-none focus:border-[#302992] focus:ring-2 focus:ring-cyan-400"
          />
          {isSpeechRecognitionSupported() && <button type="button" aria-label="Hold to say your name" onPointerDown={(event) => { event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId); startVoiceInput("name"); }} onPointerUp={stopVoiceInput} onPointerCancel={stopVoiceInput} onPointerLeave={stopVoiceInput} className="mt-2 inline-flex items-center gap-2 rounded-lg bg-[#302992] px-3 py-2 text-sm font-bold text-white"><Mic className="h-4 w-4" />{listeningFor === "name" ? "Listening…" : "Hold to say your name"}</button>}
          {submitted && !nameIsValid && <p className="mt-2 text-sm font-semibold text-rose-700">Please enter your full name.</p>}
        </div>

        <div>
          <label htmlFor="atm-practice-pin" className="block text-sm font-bold text-slate-800">Create a 4-digit PIN</label>
          <div className="relative mt-2">
            <input
              id="atm-practice-pin"
              value={pin}
              onChange={(event) => setPin(event.target.value.replace(/\D/g, "").slice(0, 4))}
              type={showPin ? "text" : "password"}
              inputMode="numeric"
              autoComplete="off"
              maxLength={4}
              placeholder="••••"
              className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 pr-12 text-2xl tracking-[0.5em] text-slate-950 outline-none focus:border-[#302992] focus:ring-2 focus:ring-cyan-400"
            />
            <button
              type="button"
              onClick={() => setShowPin((current) => !current)}
              aria-label={showPin ? "Hide PIN" : "Show PIN"}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-600 hover:bg-slate-100 hover:text-[#302992] focus:outline-none focus:ring-2 focus:ring-cyan-400"
            >
              {showPin ? <Eye className="h-5 w-5" aria-hidden="true" /> : <EyeOff className="h-5 w-5" aria-hidden="true" />}
            </button>
          </div>
          {isSpeechRecognitionSupported() && <button type="button" aria-label="Hold to say your PIN" onPointerDown={(event) => { event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId); startVoiceInput("pin"); }} onPointerUp={stopVoiceInput} onPointerCancel={stopVoiceInput} onPointerLeave={stopVoiceInput} className="mt-2 inline-flex items-center gap-2 rounded-lg bg-[#302992] px-3 py-2 text-sm font-bold text-white"><Mic className="h-4 w-4" />{listeningFor === "pin" ? "Listening…" : "Hold to say your PIN"}</button>}
          <p className="mt-2 text-sm text-slate-600">Use exactly four numbers.</p>
          {submitted && !pinIsValid && <p className="mt-2 text-sm font-semibold text-rose-700">Your PIN must contain exactly four numbers.</p>}
        </div>

        {voiceError && <p className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm font-semibold text-amber-900">{voiceError}</p>}

        <button type="submit" className="min-h-12 w-full rounded-xl bg-[#302992] px-5 py-3 font-bold text-white hover:bg-[#211c72] focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2">
          Start ATM practice
        </button>
      </form>

      <Link to="/scenario/atm-withdrawal" className="mt-5 inline-flex font-bold text-[#302992] hover:underline">Back to introduction</Link>
    </section>
  );
}
