import { useCallback, useEffect, useRef, useState } from "react";

import { useTranslation } from "../../i18n";
import { billAssistantTranslations } from "../../lib/billAssistantTranslations";
import { AtmAssistantMessage } from "../atm/AtmAssistantMessage";
import { SoundToggle } from "../atm/SoundToggle";
import { speakAssistantMessage, stopAssistantSpeech, stopSuccessSound } from "../../services/speechSynthesisService";

const SOUND_STORAGE_KEY = "assist_ai_sound_enabled";

export function BillVoiceAssistant({ message }: { message: string }) {
  const { language } = useTranslation();
  const text = billAssistantTranslations[language];
  const [soundEnabled, setSoundEnabled] = useState(() => localStorage.getItem(SOUND_STORAGE_KEY) !== "false");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [ttsError, setTtsError] = useState("");
  const lastSpokenRef = useRef("");

  const stopSpeech = useCallback(() => {
    stopAssistantSpeech();
    setIsSpeaking(false);
  }, []);

  const speak = useCallback(() => {
    if (!soundEnabled || !message.trim()) return;
    setTtsError("");
    speakAssistantMessage(message, {
      allowBrowserFallback: true,
      onStart: () => setIsSpeaking(true),
      onEnd: () => setIsSpeaking(false),
      onError: () => { setIsSpeaking(false); setTtsError(text.voiceError); },
    }, language);
  }, [language, message, soundEnabled, text.voiceError]);

  useEffect(() => {
    const speechKey = `${language}:${message}`;
    if (!soundEnabled || lastSpokenRef.current === speechKey) return;
    lastSpokenRef.current = speechKey;
    speak();
  }, [language, message, soundEnabled, speak]);

  useEffect(() => () => stopAssistantSpeech(), []);

  const toggleSound = () => {
    setSoundEnabled((current) => {
      const next = !current;
      localStorage.setItem(SOUND_STORAGE_KEY, String(next));
      if (!next) {
        stopSpeech();
        stopSuccessSound();
      }
      else lastSpokenRef.current = "";
      return next;
    });
  };

  return (
    <aside className="flex flex-col gap-4 rounded-2xl border border-cyan-300/25 bg-[#111735]/95 p-5 shadow-[0_20px_55px_rgba(3,7,18,0.32)] xl:sticky xl:top-5">
      <div className="flex items-center justify-between gap-4"><div><p className="font-display text-sm font-bold uppercase tracking-wide text-white">{text.panelTitle}</p><p className="text-xs font-semibold text-cyan-100/65">{text.guidedMode}</p></div><div className="flex h-2.5 w-20 overflow-hidden rounded-full" aria-hidden="true"><i className="w-2/3 bg-[#5148cf]" /><i className="w-1/3 bg-[#2dd8d8]" /></div></div>
      <SoundToggle isEnabled={soundEnabled} labels={{ soundOn: text.soundOn, soundOff: text.soundOff, turnSoundOn: text.turnSoundOn, turnSoundOff: text.turnSoundOff }} onToggle={toggleSound} />
      <AtmAssistantMessage message={message} soundEnabled={soundEnabled} isSpeaking={isSpeaking} repeatLabel={text.repeat} stopLabel={text.stop} ttsError={ttsError} onRepeat={speak} onStop={stopSpeech} />
      <p className="border-t border-cyan-100/15 pt-4 text-sm font-semibold leading-6 text-slate-200">{text.safety}</p>
    </aside>
  );
}
