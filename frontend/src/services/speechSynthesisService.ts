import applauseSoundUrl from "../assets/audio/applause.mp3";

type SpeechCallbacks = {
  onStart?: () => void;
  onEnd?: () => void;
  onError?: () => void;
};

type SpeechLanguage = "en" | "es" | "de" | "tr" | "pt" | "fr";

let currentSuccessAudio: HTMLAudioElement | null = null;
let currentSuccessToneContext: AudioContext | null = null;

const speechSynthesisLocales: Record<SpeechLanguage, string> = {
  en: "en-US",
  es: "es-ES",
  de: "de-DE",
  tr: "tr-TR",
  pt: "pt-PT",
  fr: "fr-FR",
};

export function isSpeechSynthesisSupported() {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export function stopAssistantSpeech() {
  if (!isSpeechSynthesisSupported()) {
    return;
  }
  window.speechSynthesis.cancel();
}

function getVoiceForLanguage(language: SpeechLanguage) {
  const voices = window.speechSynthesis.getVoices();
  const locale = speechSynthesisLocales[language].toLowerCase();
  const languagePrefix = locale.split("-")[0];

  return (
    voices.find((voice) => voice.lang.toLowerCase() === locale) ??
    voices.find((voice) => voice.lang.toLowerCase().startsWith(languagePrefix)) ??
    null
  );
}

export function speakAssistantMessage(
  message: string,
  callbacks: SpeechCallbacks = {},
  language: SpeechLanguage = "en",
) {
  if (!isSpeechSynthesisSupported() || !message.trim()) {
    callbacks.onEnd?.();
    return;
  }

  stopAssistantSpeech();
  const utterance = new SpeechSynthesisUtterance(message);
  utterance.rate = 0.9;
  utterance.pitch = 1;
  utterance.volume = 1;
  utterance.lang = speechSynthesisLocales[language];
  utterance.voice = getVoiceForLanguage(language);
  utterance.onstart = () => callbacks.onStart?.();
  utterance.onend = () => callbacks.onEnd?.();
  utterance.onerror = () => {
    callbacks.onError?.();
    callbacks.onEnd?.();
  };
  window.speechSynthesis.speak(utterance);
}

export function playSuccessSound() {
  stopSuccessSound();

  try {
    const applause = new Audio(applauseSoundUrl);
    applause.loop = false;
    applause.volume = 0.75;
    currentSuccessAudio = applause;
    applause.onended = () => {
      if (currentSuccessAudio === applause) {
        currentSuccessAudio = null;
      }
    };
    applause.play().catch(() => {
      currentSuccessAudio = null;
      playFallbackSuccessTone();
    });
    return;
  } catch {
    playFallbackSuccessTone();
  }
}

export function stopSuccessSound() {
  if (currentSuccessAudio) {
    currentSuccessAudio.pause();
    currentSuccessAudio.currentTime = 0;
    currentSuccessAudio = null;
  }

  if (currentSuccessToneContext) {
    currentSuccessToneContext.close().catch(() => {
      // The browser may already have closed this short audio context.
    });
    currentSuccessToneContext = null;
  }
}

function playFallbackSuccessTone() {
  const AudioContextConstructor = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextConstructor) {
    return;
  }

  try {
    const audioContext = new AudioContextConstructor();
    currentSuccessToneContext = audioContext;
    const notes = [523.25, 659.25, 783.99];
    const now = audioContext.currentTime;

    notes.forEach((frequency, index) => {
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      const start = now + index * 0.14;
      const end = start + 0.18;

      oscillator.frequency.value = frequency;
      oscillator.type = "sine";
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.18, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, end);
        oscillator.connect(gain);
        gain.connect(audioContext.destination);
        oscillator.start(start);
        oscillator.stop(end);
      });
    window.setTimeout(() => {
      if (currentSuccessToneContext === audioContext) {
        currentSuccessToneContext = null;
      }
    }, 800);
  } catch {
    // Audio may be blocked by the browser. The visual success screen still works.
  }
}
