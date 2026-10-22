import { useCallback, useEffect, useRef, useState } from "react";
import { RotateCcw, Square } from "lucide-react";

import type { LanguageCode } from "../../i18n";
import { atmTranslations } from "../../lib/atmTranslations";
import {
  speakAssistantMessage,
  stopAssistantSpeech,
  stopSuccessSound,
  unlockAssistantAudioPlayback,
} from "../../services/speechSynthesisService";
import { AtmAssistantMessage } from "./AtmAssistantMessage";
import { SoundToggle } from "./SoundToggle";

const SOUND_STORAGE_KEY = "assist_ai_sound_enabled";
export type AssistantSpeechOutcome = "ended" | "stopped" | "error" | "skipped";

export function AtmSetupVoiceAssistant({
  language,
  message,
  modeLabel,
  speechRequestId,
  stopRequestId = 0,
  onSpeakingChange,
  onMessageSettled,
  scenario,
  compact = false,
  speechDelayMs = 0,
}: {
  language: LanguageCode;
  message: string;
  modeLabel: string;
  speechRequestId: number;
  stopRequestId?: number;
  onSpeakingChange?: (speaking: boolean) => void;
  onMessageSettled?: (message: string, outcome: AssistantSpeechOutcome) => void;
  scenario?: "restaurant";
  compact?: boolean;
  speechDelayMs?: number;
}) {
  const text = atmTranslations[language];
  const [soundEnabled, setSoundEnabled] = useState(() => localStorage.getItem(SOUND_STORAGE_KEY) !== "false");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [ttsError, setTtsError] = useState("");
  const lastSpokenRef = useRef("");
  const speechRequestRef = useRef(0);
  const lastStopRequestRef = useRef(stopRequestId);
  const pendingSpeechRef = useRef(false);
  const onMessageSettledRef = useRef(onMessageSettled);
  onMessageSettledRef.current = onMessageSettled;

  const settleSpeech = useCallback((spokenMessage: string, outcome: AssistantSpeechOutcome) => {
    if (!pendingSpeechRef.current) return;
    pendingSpeechRef.current = false;
    onMessageSettledRef.current?.(spokenMessage, outcome);
  }, []);

  const stopSpeech = useCallback(() => {
    speechRequestRef.current += 1;
    stopAssistantSpeech();
    setIsSpeaking(false);
    onSpeakingChange?.(false);
    settleSpeech(message, "stopped");
  }, [message, onSpeakingChange, settleSpeech]);

  const speak = useCallback(() => {
    if (!soundEnabled || !message.trim()) return;
    const requestId = speechRequestRef.current + 1;
    speechRequestRef.current = requestId;
    pendingSpeechRef.current = true;
    setIsSpeaking(false);
    onSpeakingChange?.(false);
    setTtsError("");
    void unlockAssistantAudioPlayback().then(() => {
      if (speechRequestRef.current !== requestId) return;
      speakAssistantMessage(message, {
        scenario,
        allowBrowserFallback: true,
        onStart: () => { if (speechRequestRef.current !== requestId) return; setIsSpeaking(true); onSpeakingChange?.(true); },
        onEnd: () => { if (speechRequestRef.current !== requestId) return; setIsSpeaking(false); onSpeakingChange?.(false); settleSpeech(message, "ended"); },
        onError: () => {
          if (speechRequestRef.current !== requestId) return;
          setIsSpeaking(false);
          onSpeakingChange?.(false);
          setTtsError(text.assistantVoiceProblem);
          settleSpeech(message, "error");
        },
      }, language);
    });
  }, [language, message, onSpeakingChange, scenario, settleSpeech, soundEnabled, text.assistantVoiceProblem]);

  useEffect(() => {
    const speechKey = `${language}:${speechRequestId}:${message}`;
    if (lastSpokenRef.current === speechKey) return;
    lastSpokenRef.current = speechKey;
    if (!soundEnabled) { onMessageSettledRef.current?.(message, "skipped"); return; }
    if (speechDelayMs === 0) { speak(); return; }
    const timer = window.setTimeout(speak, speechDelayMs);
    return () => window.clearTimeout(timer);
  }, [language, message, soundEnabled, speak, speechDelayMs, speechRequestId]);

  useEffect(() => {
    if (stopRequestId === lastStopRequestRef.current) return;
    lastStopRequestRef.current = stopRequestId;
    stopSpeech();
  }, [stopRequestId, stopSpeech]);

  useEffect(() => () => {
    speechRequestRef.current += 1;
    lastSpokenRef.current = "";
    stopAssistantSpeech();
    onSpeakingChange?.(false);
  }, [onSpeakingChange]);

  const toggleSound = () => {
    setSoundEnabled((current) => {
      const next = !current;
      localStorage.setItem(SOUND_STORAGE_KEY, String(next));
      if (!next) {
        stopSpeech();
        stopSuccessSound();
      } else {
        lastSpokenRef.current = "";
      }
      return next;
    });
  };

  if (compact) return <>
    <button type="button" onClick={() => {
      if (soundEnabled) speak();
      else {
        localStorage.setItem(SOUND_STORAGE_KEY, "true");
        lastSpokenRef.current = "";
        setSoundEnabled(true);
      }
    }} aria-label={text.repeatAssistant} title={text.repeatAssistant}
      className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-indigo-200 bg-white text-[#302992] shadow-sm hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-cyan-400">
      <RotateCcw className="h-4 w-4" aria-hidden="true" />
    </button>
    {isSpeaking && <button type="button" onClick={stopSpeech} aria-label={text.stopVoice} title={text.stopVoice}
      className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-indigo-200 bg-white text-[#302992] shadow-sm hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-cyan-400">
      <Square className="h-3.5 w-3.5" aria-hidden="true" />
    </button>}
    {ttsError && <p role="alert" className="text-xs text-red-700">{ttsError}</p>}
  </>;

  return (
    <aside className="flex flex-col gap-4 rounded-2xl border border-cyan-300/25 bg-[#111735]/95 p-5 shadow-[0_20px_55px_rgba(3,7,18,0.32)]">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="font-display text-sm font-bold uppercase tracking-wide text-white">ASSIST-AI</p>
          <p className="text-xs font-semibold text-cyan-100/65">{modeLabel}</p>
        </div>
        <div className="flex h-2.5 w-20 overflow-hidden rounded-full" aria-hidden="true">
          <i className="w-2/3 bg-[#5148cf]" />
          <i className="w-1/3 bg-[#2dd8d8]" />
        </div>
      </div>

      <SoundToggle
        isEnabled={soundEnabled}
        labels={{
          soundOn: text.soundOn,
          soundOff: text.soundOff,
          turnSoundOn: text.turnSoundOn,
          turnSoundOff: text.turnSoundOff,
        }}
        onToggle={toggleSound}
      />
      <AtmAssistantMessage
        message={message}
        soundEnabled={soundEnabled}
        isSpeaking={isSpeaking}
        repeatLabel={text.repeatAssistant}
        stopLabel={text.stopVoice}
        ttsError={ttsError}
        onRepeat={speak}
        onStop={stopSpeech}
      />
    </aside>
  );
}
