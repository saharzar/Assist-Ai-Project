import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

import { useAuth } from "../context/AuthContext";
import { useTranslation } from "../i18n";
import { atmTranslations } from "../lib/atmTranslations";
import { computerVisionConsentTranslations } from "../lib/computerVisionConsentTranslations";
import { speakAssistantMessage, stopAssistantSpeech, unlockAssistantAudioPlayback } from "../services/speechSynthesisService";
import { AtmAssistantMessage } from "./atm/AtmAssistantMessage";

export function ComputerVisionConsentGate({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading, computerVisionConsent, chooseComputerVisionConsent } = useAuth();
  if (isAuthenticated && isLoading) return null;
  if (isAuthenticated && computerVisionConsent === null) {
    return <SessionConsentDialog onChoose={chooseComputerVisionConsent} />;
  }
  return children;
}

function SessionConsentDialog({ onChoose }: { onChoose: (allowed: boolean) => void }) {
  const { language } = useTranslation();
  const text = computerVisionConsentTranslations[language];
  const voiceText = atmTranslations[language];
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const requestRef = useRef(0);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [ttsError, setTtsError] = useState("");
  const spokenMessage = `${text.legend}. ${text.description}`;

  const stop = useCallback(() => {
    requestRef.current += 1;
    stopAssistantSpeech();
    setIsSpeaking(false);
  }, []);

  const speak = useCallback(() => {
    setTtsError("");
    speakAssistantMessage(spokenMessage, {
      allowBrowserFallback: true,
      onStart: () => setIsSpeaking(true),
      onEnd: () => setIsSpeaking(false),
      onError: () => { setIsSpeaking(false); setTtsError(voiceText.assistantVoiceProblem); },
    }, language);
  }, [language, spokenMessage, voiceText.assistantVoiceProblem]);

  const repeat = () => {
    const request = ++requestRef.current;
    void unlockAssistantAudioPlayback().then(() => {
      if (requestRef.current === request) speak();
    });
  };

  useEffect(() => {
    const dialog = dialogRef.current;
    dialog?.showModal();
    titleRef.current?.focus();
    return () => { dialog?.close(); };
  }, []);

  useEffect(() => {
    if (localStorage.getItem("assist_ai_sound_enabled") !== "false") speak();
    return () => {
      requestRef.current += 1;
      stopAssistantSpeech();
    };
  }, [speak]);

  return <dialog ref={dialogRef} aria-modal="true" aria-labelledby="computer-vision-consent-title"
    aria-describedby="computer-vision-consent-message" onCancel={(event) => event.preventDefault()}
    className="fixed inset-0 m-auto max-h-[85vh] w-[calc(100%-2rem)] max-w-xl overflow-y-auto rounded-3xl border-2 border-cyan-200 bg-white p-6 text-[#1d1a5e] shadow-2xl backdrop:bg-indigo-950/50 sm:p-8">
    <p className="text-sm font-extrabold tracking-wide text-[#302992]">ASSIST-AI</p>
    <h2 ref={titleRef} id="computer-vision-consent-title" tabIndex={-1} className="mb-5 mt-2 text-2xl font-extrabold outline-none">{text.legend}</h2>
    <div id="computer-vision-consent-message">
      <AtmAssistantMessage message={text.description} soundEnabled isSpeaking={isSpeaking}
        repeatLabel={voiceText.repeatAssistant} stopLabel={voiceText.stopVoice} ttsError={ttsError}
        onRepeat={repeat} onStop={stop} />
    </div>
    <div className="mt-6 grid gap-3">
      {[{ allowed: true, label: text.yes }, { allowed: false, label: text.no }].map((choice) =>
        <button key={String(choice.allowed)} type="button" onClick={() => { stop(); onChoose(choice.allowed); }}
          className="min-h-14 rounded-xl border-2 border-indigo-200 bg-indigo-50 px-5 py-3 text-base font-extrabold text-[#302992] hover:border-cyan-400 hover:bg-cyan-50 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2">
          {choice.label}
        </button>)}
    </div>
  </dialog>;
}
