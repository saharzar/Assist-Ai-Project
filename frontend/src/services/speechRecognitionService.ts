type SpeechRecognitionResultCallback = (transcript: string) => void;

type SpeechRecognitionMode = "name" | "pin";
type SpeechRecognitionLanguage = "en" | "es" | "de" | "tr" | "pt" | "fr";

type SpeechRecognitionCallbacks = {
  onResult: SpeechRecognitionResultCallback;
  onError: (message: string) => void;
  onEnd: () => void;
};

type SpeechRecognitionErrorMessages = {
  microphoneBlocked: string;
  problem: string;
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

const speechRecognitionLocales: Record<SpeechRecognitionLanguage, string> = {
  en: "en-US",
  es: "es-ES",
  de: "de-DE",
  tr: "tr-TR",
  pt: "pt-PT",
  fr: "fr-FR",
};

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
  cero: "0",
  null: "0",
  sıfır: "0",
  sifir: "0",
  zéro: "0",
  oh: "0",
  o: "0",
  one: "1",
  uno: "1",
  eins: "1",
  ein: "1",
  bir: "1",
  um: "1",
  uma: "1",
  un: "1",
  une: "1",
  two: "2",
  to: "2",
  too: "2",
  dos: "2",
  zwei: "2",
  iki: "2",
  dois: "2",
  duas: "2",
  deux: "2",
  three: "3",
  tres: "3",
  drei: "3",
  üç: "3",
  uc: "3",
  três: "3",
  trois: "3",
  four: "4",
  for: "4",
  cuatro: "4",
  vier: "4",
  dört: "4",
  dort: "4",
  quatro: "4",
  quatre: "4",
  five: "5",
  cinco: "5",
  fünf: "5",
  funf: "5",
  beş: "5",
  bes: "5",
  cinq: "5",
  six: "6",
  seis: "6",
  sechs: "6",
  seven: "7",
  siete: "7",
  sieben: "7",
  yedi: "7",
  sete: "7",
  sept: "7",
  eight: "8",
  ate: "8",
  ocho: "8",
  acht: "8",
  sekiz: "8",
  oito: "8",
  huit: "8",
  nine: "9",
  nueve: "9",
  neun: "9",
  dokuz: "9",
  nove: "9",
  neuf: "9",
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
  language: SpeechRecognitionLanguage = "en",
  errorMessages: SpeechRecognitionErrorMessages = {
    microphoneBlocked: "Microphone access was blocked. Please type or use the keypad.",
    problem: "Voice input had a problem. Please try again or type.",
  },
) {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    return null;
  }

  const recognition = new SpeechRecognition();
  recognition.lang = speechRecognitionLocales[language];
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
        ? errorMessages.microphoneBlocked
        : errorMessages.problem;
    callbacks.onError(message);
  };

  recognition.onend = callbacks.onEnd;

  return recognition;
}
