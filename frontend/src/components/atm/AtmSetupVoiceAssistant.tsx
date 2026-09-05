import { useCallback, useEffect, useRef, useState } from "react";

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

export function AtmSetupVoiceAssistant({
  language,
  message,
  modeLabel,
  speechRequestId,
  stopRequestId = 0,
}: {
  language: LanguageCode;
  message: string;
  modeLabel: string;
  speechRequestId: number;
  stopRequestId?: number;
}) {
  const text = atmTranslations[language];
  const [soundEnabled, setSoundEnabled] = useState(() => localStorage.getItem(SOUND_STORAGE_KEY) !== "false");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [ttsError, setTtsError] = useState("");
  const lastSpokenRef = useRef("");
  const speechRequestRef = useRef(0);
  const lastStopRequestRef = useRef(stopRequestId);

  const stopSpeech = useCallback(() => {
    speechRequestRef.current += 1;
    stopAssistantSpeech();
    setIsSpeaking(false);
  }, []);

  const speak = useCallback(() => {
    if (!soundEnabled || !message.trim()) return;
    const requestId = speechRequestRef.current + 1;
    speechRequestRef.current = requestId;
    setTtsError("");
    void unlockAssistantAudioPlayback().then(() => {
      if (speechRequestRef.current !== requestId) return;
      speakAssistantMessage(message, {
        allowBrowserFallback: true,
        onStart: () => setIsSpeaking(true),
        onEnd: () => setIsSpeaking(false),
        onError: () => {
          setIsSpeaking(false);
          setTtsError(text.assistantVoiceProblem);
        },
      }, language);
    });
  }, [language, message, soundEnabled, text.assistantVoiceProblem]);

  useEffect(() => {
    const speechKey = `${language}:${speechRequestId}:${message}`;
    if (!soundEnabled || lastSpokenRef.current === speechKey) return;
    lastSpokenRef.current = speechKey;
    speak();
  }, [language, message, soundEnabled, speak, speechRequestId]);

  useEffect(() => {
    if (stopRequestId === lastStopRequestRef.current) return;
    lastStopRequestRef.current = stopRequestId;
    stopSpeech();
  }, [stopRequestId, stopSpeech]);

  useEffect(() => () => {
    speechRequestRef.current += 1;
    lastSpokenRef.current = "";
    stopAssistantSpeech();
  }, []);

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

  return (
    <aside className="flex flex-col gap-4 rounded-2xl border border-cyan-300/25 bg-[#111735]/95 p-5 shadow-[0_20px_55px_rgba(3,7,18,0.32)] lg:sticky lg:top-5">
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
