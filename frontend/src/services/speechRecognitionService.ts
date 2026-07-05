type SpeechRecognitionResultCallback = (transcript: string) => void;

type SpeechRecognitionMode = "name" | "pin";

type SpeechRecognitionCallbacks = {
  onResult: SpeechRecognitionResultCallback;
  onError: (message: string) => void;
  onEnd: () => void;
};

type BrowserSpeechRecognition = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
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
    length: number;
    item?: (index: number) => {
      transcript: string;
      confidence?: number;
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
      /^(my full name is|my name is|the name is|name is|i am|i'm|call me|it is|it's|benim adım|benim adim|adım|adim|ismim|أنا اسمي|اسمي|انا اسمي|الاسم|اسمي هو)\s+/i,
      "",
    )
    .replace(/\s+/g, " ")
    .trim();
}

const spokenDigitMap: Record<string, string> = {
  zero: "0",
  oh: "0",
  o: "0",
  one: "1",
  two: "2",
  to: "2",
  too: "2",
  three: "3",
  four: "4",
  for: "4",
  five: "5",
  six: "6",
  seven: "7",
  eight: "8",
  ate: "8",
  nine: "9",
};

export function cleanSpokenPinTranscript(transcript: string) {
  const words = transcript
    .toLowerCase()
    .replace(/[-,.;:!?]/g, " ")
    .split(/\s+/)
    .filter(Boolean);

  const digits = words.flatMap((word) => {
    const directDigits = word.replace(/\D/g, "");
    if (directDigits) {
      return directDigits.split("");
    }
    return spokenDigitMap[word] ? [spokenDigitMap[word]] : [];
  });

  return digits.join("").slice(0, 4);
}

function getResultAlternatives(result: SpeechRecognitionEvent["results"][number]) {
  if (typeof result.item === "function") {
    return Array.from({ length: result.length }, (_, index) => result.item?.(index)?.transcript ?? "");
  }
  return [result[0].transcript];
}

function chooseBestNameTranscript(result: SpeechRecognitionEvent["results"][number]) {
  const alternatives = getResultAlternatives(result)
    .map(cleanSpokenNameTranscript)
    .filter(Boolean);

  return alternatives.find((value) => value.length > 1) ?? alternatives[0] ?? "";
}

function chooseBestPinTranscript(result: SpeechRecognitionEvent["results"][number]) {
  const alternatives = getResultAlternatives(result)
    .map(cleanSpokenPinTranscript)
    .filter(Boolean);

  return alternatives.find((value) => value.length === 4) ?? alternatives[0] ?? "";
}

export function createSpeechRecognizer(
  callbacks: SpeechRecognitionCallbacks,
  mode: SpeechRecognitionMode = "name",
) {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    return null;
  }

  const recognition = new SpeechRecognition();
  recognition.lang = "en-US";
  recognition.interimResults = mode === "name";
  recognition.continuous = false;
  recognition.maxAlternatives = 5;

  recognition.onresult = (event) => {
    const lastResult = event.results[event.results.length - 1];
    const transcript =
      mode === "pin" ? chooseBestPinTranscript(lastResult) : chooseBestNameTranscript(lastResult);
    if (transcript) {
      callbacks.onResult(transcript);
    }
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
