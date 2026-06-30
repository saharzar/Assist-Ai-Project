import applauseSoundUrl from "../assets/audio/applause.mp3";

type SpeechCallbacks = {
  onStart?: () => void;
  onEnd?: () => void;
  onError?: () => void;
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

function getEnglishVoice() {
  const voices = window.speechSynthesis.getVoices();
  return (
    voices.find((voice) => voice.lang.toLowerCase().startsWith("en-us")) ??
    voices.find((voice) => voice.lang.toLowerCase().startsWith("en-gb")) ??
    voices.find((voice) => voice.lang.toLowerCase().startsWith("en")) ??
    null
  );
}

export function speakAssistantMessage(message: string, callbacks: SpeechCallbacks = {}) {
  if (!isSpeechSynthesisSupported() || !message.trim()) {
    callbacks.onEnd?.();
    return;
  }

  stopAssistantSpeech();
  const utterance = new SpeechSynthesisUtterance(message);
  utterance.rate = 0.9;
  utterance.pitch = 1;
  utterance.volume = 1;
  utterance.lang = "en-US";
  utterance.voice = getEnglishVoice();
  utterance.onstart = () => callbacks.onStart?.();
  utterance.onend = () => callbacks.onEnd?.();
  utterance.onerror = () => {
    callbacks.onError?.();
    callbacks.onEnd?.();
  };
  window.speechSynthesis.speak(utterance);
}

export function playSuccessSound() {
  try {
    const applause = new Audio(applauseSoundUrl);
    applause.loop = false;
    applause.volume = 0.75;
    applause.play().catch(() => {
      playFallbackSuccessTone();
    });
    return;
  } catch {
    playFallbackSuccessTone();
  }
}

function playFallbackSuccessTone() {
  const AudioContextConstructor = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextConstructor) {
    return;
  }

  try {
    const audioContext = new AudioContextConstructor();
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
  } catch {
    // Audio may be blocked by the browser. The visual success screen still works.
  }
}
