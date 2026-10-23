import { useEffect, useRef, useState } from "react";
import { Mic, Send, Square } from "lucide-react";
import type { LanguageCode } from "../../i18n";
import { restaurantOrderTranslations } from "../../lib/restaurantOrderTranslations";
import { createSpeechRecognizer, isSpeechRecognitionSupported } from "../../services/speechRecognitionService";
import { stopAssistantSpeech } from "../../services/speechSynthesisService";

export function WaiterConversationBar({ language, value, pending, onChange, onSend, onVoiceResult }: {
  language: LanguageCode; value: string; pending: boolean;
  onChange: (value: string) => void; onSend: () => void; onVoiceResult?: (transcript: string) => void;
}) {
  const text = restaurantOrderTranslations[language];
  const recognizer = useRef<ReturnType<typeof createSpeechRecognizer>>(null);
  const [listening, setListening] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState("");
  const supported = typeof window !== "undefined" && isSpeechRecognitionSupported();

  useEffect(() => () => { recognizer.current?.stop(); recognizer.current = null; }, [language]);

  const toggleVoice = () => {
    if (recognizer.current) {
      recognizer.current.stop();
      return;
    }
    if (!supported || pending) return;
    stopAssistantSpeech();
    setVoiceStatus("");
    const instance = createSpeechRecognizer({
      onReady: () => setListening(true),
      onPartialResult: (transcript) => onChange(transcript.slice(0, 1200)),
      onFallback: () => setVoiceStatus(text.conversationBrowserFallback),
      onResult: (transcript) => { setVoiceStatus(text.conversationReviewSpeech); onVoiceResult?.(transcript.slice(0, 1200)); },
      onError: () => setVoiceStatus(text.conversationVoiceError),
      onEnd: () => { recognizer.current = null; setListening(false); },
    }, "restaurant", language);
    recognizer.current = instance;
    instance?.start();
  };

  return <div className="restaurant-conversation-bar" aria-label={text.conversationLabel}>
    <label htmlFor="restaurant-future-message">{text.conversationLabel}</label>
    <form className="restaurant-conversation-controls" onSubmit={(event) => { event.preventDefault(); if (!pending && value.trim()) onSend(); }}>
      <input id="restaurant-future-message" type="text" value={value} maxLength={1200} onChange={(event) => onChange(event.target.value)} placeholder={text.conversationPlaceholder} disabled={pending} readOnly={listening} aria-describedby="restaurant-chat-status" />
      <button type="button" onClick={toggleVoice} disabled={!supported || pending} aria-label={text.microphoneLabel} aria-pressed={listening} aria-describedby="restaurant-chat-status">{listening ? <Square aria-hidden="true" size={19} /> : <Mic aria-hidden="true" size={19} />}</button>
      <button type="submit" className="restaurant-conversation-send" disabled={pending || listening || !value.trim()} aria-label={text.sendLabel} aria-describedby="restaurant-chat-status"><Send aria-hidden="true" size={16} /><span>{text.sendLabel}</span></button>
    </form>
    <p id="restaurant-chat-status" role="status" aria-live="polite">{pending ? text.conversationThinking : voiceStatus || (listening ? text.conversationListening : supported ? text.conversationSpeakHint : text.conversationSoon)}</p>
  </div>;
}
