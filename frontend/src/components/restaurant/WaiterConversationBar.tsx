import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { Mic, Send } from "lucide-react";
import type { LanguageCode } from "../../i18n";
import { restaurantOrderTranslations, restaurantQuotaBrowserFallback } from "../../lib/restaurantOrderTranslations";
import { createSpeechRecognizer, isSpeechRecognitionSupported } from "../../services/speechRecognitionService";
import { stopAssistantSpeech } from "../../services/speechSynthesisService";

type VoicePhase = "idle" | "listening" | "finalizing" | "processing";

export function WaiterConversationBar({ language, value, pending, speaking = false, onChange, onSend, onVoiceSubmit, onInterruptWaiter }: {
  language: LanguageCode; value: string; pending: boolean; speaking?: boolean;
  onChange: (value: string) => void; onSend: () => void;
  onVoiceSubmit?: (transcript: string) => Promise<void>;
  onInterruptWaiter?: () => void;
}) {
  const text = restaurantOrderTranslations[language];
  const recognizer = useRef<ReturnType<typeof createSpeechRecognizer>>(null);
  const session = useRef(0);
  const phaseRef = useRef<VoicePhase>("idle");
  const pointerId = useRef<number | null>(null);
  const keyboardHeld = useRef(false);
  const resultHandled = useRef(false);
  const cancelled = useRef(false);
  const failed = useRef(false);
  const [phase, setVoicePhase] = useState<VoicePhase>("idle");
  const [voiceStatus, setVoiceStatus] = useState("");
  const supported = typeof window !== "undefined" && isSpeechRecognitionSupported();
  const setPhase = (next: VoicePhase) => { phaseRef.current = next; setVoicePhase(next); };

  useEffect(() => {
    setPhase("idle");
    setVoiceStatus("");
    return () => {
      session.current += 1;
      cancelled.current = true;
      keyboardHeld.current = false;
      pointerId.current = null;
      phaseRef.current = "idle";
      recognizer.current?.stop();
      recognizer.current = null;
    };
  }, [language]);

  const startVoice = () => {
    if (!supported || pending || phaseRef.current !== "idle") return false;
    stopAssistantSpeech();
    if (speaking) onInterruptWaiter?.();
    const id = ++session.current;
    if (import.meta.env.DEV) console.debug("restaurant_voice", { utterance_id: id, tts_interrupted: speaking, event: "listening" });
    resultHandled.current = false;
    cancelled.current = false;
    failed.current = false;
    setVoiceStatus("");
    setPhase("listening");
    const instance = createSpeechRecognizer({
      onPartialResult: () => { /* Interim words are never submitted. */ },
      onFallback: (reason) => {
        if (session.current !== id) return;
        failed.current = true;
        setVoiceStatus(reason === "quota" ? restaurantQuotaBrowserFallback[language] : text.conversationBrowserFallback);
      },
      onResult: (transcript) => {
        if (session.current !== id || cancelled.current || resultHandled.current || phaseRef.current !== "finalizing") return;
        resultHandled.current = true;
        const finalText = transcript.trim().slice(0, 1200);
        if (import.meta.env.DEV) console.debug("restaurant_voice", { utterance_id: id, stt_final_received: Boolean(finalText), auto_submit_triggered: Boolean(finalText) });
        if (!finalText) {
          setVoiceStatus(text.conversationVoiceError);
          setPhase("idle");
          return;
        }
        setPhase("processing");
        void Promise.resolve(onVoiceSubmit?.(finalText)).catch(() => {
          if (session.current === id) setVoiceStatus(text.conversationVoiceError);
        }).finally(() => {
          if (session.current === id) setPhase("idle");
        });
      },
      onError: (message) => {
        if (session.current !== id) return;
        failed.current = true;
        setVoiceStatus(message || text.conversationVoiceError);
      },
      onEnd: () => {
        if (session.current !== id) return;
        recognizer.current = null;
        if (!resultHandled.current) {
          if (!cancelled.current && !failed.current) setVoiceStatus(text.conversationVoiceError);
          setPhase("idle");
        }
      },
    }, "restaurant", language);
    if (!instance) {
      setVoiceStatus(text.conversationVoiceError);
      setPhase("idle");
      return false;
    }
    recognizer.current = instance;
    instance.start();
    return true;
  };

  const finishVoice = (discard = false) => {
    if (phaseRef.current !== "listening") return;
    cancelled.current = discard;
    setPhase("finalizing");
    recognizer.current?.stop();
  };
  const onPointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    if (!startVoice()) return;
    event.preventDefault();
    pointerId.current = event.pointerId;
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };
  const onPointerUp = (event: PointerEvent<HTMLButtonElement>) => {
    if (pointerId.current !== event.pointerId) return;
    pointerId.current = null;
    finishVoice();
  };
  const onPointerCancel = (event: PointerEvent<HTMLButtonElement>) => {
    if (pointerId.current !== event.pointerId) return;
    pointerId.current = null;
    finishVoice(true);
  };
  const onPointerLeave = (event: PointerEvent<HTMLButtonElement>) => {
    if (pointerId.current !== event.pointerId || event.currentTarget.hasPointerCapture?.(event.pointerId)) return;
    pointerId.current = null;
    finishVoice(true);
  };
  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key !== " " && event.key !== "Enter") return;
    event.preventDefault();
    if (!event.repeat && !keyboardHeld.current && startVoice()) keyboardHeld.current = true;
  };
  const onKeyUp = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key !== " " && event.key !== "Enter") return;
    event.preventDefault();
    if (!keyboardHeld.current) return;
    keyboardHeld.current = false;
    finishVoice();
  };
  const status = pending ? text.conversationThinking
    : phase === "listening" ? text.conversationListening
    : phase === "finalizing" || phase === "processing" ? text.conversationReviewSpeech
    : voiceStatus || (supported ? "" : text.conversationSoon);
  const micLabel = phase === "listening" ? text.conversationReleaseLabel
    : phase === "finalizing" || phase === "processing" ? text.conversationProcessingLabel
    : text.microphoneLabel;

  return <div className="restaurant-conversation-bar" aria-label={text.conversationLabel}>
    <label htmlFor="restaurant-future-message">{text.conversationLabel}</label>
    <form className="restaurant-conversation-controls" onSubmit={(event) => { event.preventDefault(); if (!pending && phase === "idle" && value.trim()) onSend(); }}>
      <button type="button" className="restaurant-hold-to-talk" onPointerDown={onPointerDown} onPointerUp={onPointerUp} onPointerCancel={onPointerCancel} onPointerLeave={onPointerLeave} onLostPointerCapture={() => { pointerId.current = null; finishVoice(true); }} onKeyDown={onKeyDown} onKeyUp={onKeyUp} onBlur={() => { if (keyboardHeld.current) { keyboardHeld.current = false; finishVoice(true); } }} disabled={!supported || pending || phase === "finalizing" || phase === "processing"} aria-label={micLabel} aria-pressed={phase === "listening"} aria-describedby="restaurant-chat-status"><Mic aria-hidden="true" size={22} /><span>{phase === "listening" ? text.conversationListening : phase === "finalizing" || phase === "processing" ? text.conversationReviewSpeech : text.conversationSpeakHint}</span></button>
      <div className="restaurant-conversation-text-row"><input id="restaurant-future-message" type="text" value={value} maxLength={1200} onChange={(event) => onChange(event.target.value)} placeholder={text.conversationPlaceholder} disabled={pending} aria-describedby="restaurant-chat-status" />
      <button type="submit" className="restaurant-conversation-send" disabled={pending || phase !== "idle" || !value.trim()} aria-label={text.sendLabel} aria-describedby="restaurant-chat-status"><Send aria-hidden="true" size={16} /><span>{text.sendLabel}</span></button></div>
    </form>
    <p id="restaurant-chat-status" role="status" aria-live="polite">{status}</p>
  </div>;
}
