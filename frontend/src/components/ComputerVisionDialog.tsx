import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useTranslation } from "../i18n";
import { atmTranslations } from "../lib/atmTranslations";
import { speakAssistantMessage, stopAssistantSpeech, unlockAssistantAudioPlayback } from "../services/speechSynthesisService";
import { AtmAssistantMessage } from "./atm/AtmAssistantMessage";
/** Shared accessible, voiced dialog for consent and the camera preflight. */
export function ComputerVisionDialog({ title, message, children }: { title: string; message: string; children: ReactNode }) {
  const { language } = useTranslation();
  const voiceText = atmTranslations[language];
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const requestRef = useRef(0);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [ttsError, setTtsError] = useState("");
  const spokenMessage = `${title}. ${message}`;

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
    <h2 ref={titleRef} id="computer-vision-consent-title" tabIndex={-1} className="mb-5 mt-2 text-2xl font-extrabold outline-none">{title}</h2>
    <div id="computer-vision-consent-message">
      <AtmAssistantMessage message={message} soundEnabled isSpeaking={isSpeaking}
        repeatLabel={voiceText.repeatAssistant} stopLabel={voiceText.stopVoice} ttsError={ttsError}
        onRepeat={repeat} onStop={stop} />
    </div>
    <div className="mt-6">{children}</div>
  </dialog>;
}
