type SpeechRecognitionResultCallback = (transcript: string) => void;

type SpeechRecognitionCallbacks = {
  onResult: SpeechRecognitionResultCallback;
  onError: (message: string) => void;
  onEnd: () => void;
};

type BrowserSpeechRecognition = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

type SpeechRecognitionConstructor = new () => BrowserSpeechRecognition;

type SpeechRecognitionEvent = {
  results: ArrayLike<{
    0: {
      transcript: string;
    };
  }>;
};

type SpeechRecognitionErrorEvent = {
  error: string;
};

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
    webkitAudioContext?: typeof AudioContext;
  }
}

export function isSpeechRecognitionSupported() {
  return Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
}

export function cleanSpokenNameTranscript(transcript: string) {
  return transcript
    .trim()
    .replace(/[.?!]+$/g, "")
    .replace(
      /^(my full name is|my name is|the name is|name is|i am|i'm|call me|it is|it's)\s+/i,
      "",
    )
    .replace(/\s+/g, " ")
    .trim();
}

export function createSpeechRecognizer(callbacks: SpeechRecognitionCallbacks) {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    return null;
  }

  const recognition = new SpeechRecognition();
  recognition.lang = "en-US";
  recognition.interimResults = false;
  recognition.continuous = false;

  recognition.onresult = (event) => {
    const lastResult = event.results[event.results.length - 1];
    callbacks.onResult(cleanSpokenNameTranscript(lastResult[0].transcript));
  };

  recognition.onerror = (event) => {
    const message =
      event.error === "not-allowed"
        ? "Microphone access was blocked. Please type your name."
        : "Voice input had a problem. Please try again or type your name.";
    callbacks.onError(message);
  };

  recognition.onend = callbacks.onEnd;

  return recognition;
}
