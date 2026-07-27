import { API_BASE_URL, ApiError, getSessionHeaders } from "./api";
import { notifySpeechProviderUsed, resolveSpeechProvider, type GlobalSpeechProvider } from "./speechProviderService";
import { notifySttUsageUpdated, type SttUsage } from "./sttUsageService";

type SpeechRecognitionResultCallback = (transcript: string) => void;

type SpeechRecognitionMode = "name" | "pin" | "confirmation" | "letters";
type SpeechRecognitionLanguage = "en" | "es" | "de" | "tr" | "pt" | "fr";

type SpeechRecognitionCallbacks = {
  onReady?: () => void;
  onResult: SpeechRecognitionResultCallback;
  onError: (message: string) => void;
  onEnd: () => void;
};

type SpeechRecognitionErrorMessages = {
  microphoneBlocked: string;
  problem: string;
  browserFallback: string;
  noSpeech: string;
  limitReached: string;
};

const BROWSER_FALLBACK_CODE = "browser-stt-fallback";

type AzureSttResponse = {
  transcript: string;
  detected_language?: string | null;
  confidence?: number | null;
  stt_limit_seconds: number;
  stt_used_seconds: number;
  stt_remaining_seconds: number;
  stt_reset_date: string;
};

type RecorderNode = ScriptProcessorNode & {
  onaudioprocess: ((event: AudioProcessingEvent) => void) | null;
};

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
    SpeechRecognition?: BrowserSpeechRecognitionConstructor;
    webkitSpeechRecognition?: BrowserSpeechRecognitionConstructor;
  }
}

type BrowserSpeechRecognitionEvent = Event & {
  results: ArrayLike<ArrayLike<{ transcript: string }>>;
};

type BrowserSpeechRecognitionErrorEvent = Event & { error?: string };

type BrowserSpeechRecognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onstart: (() => void) | null;
  onresult: ((event: BrowserSpeechRecognitionEvent) => void) | null;
  onerror: ((event: BrowserSpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

type BrowserSpeechRecognitionConstructor = new () => BrowserSpeechRecognition;

export function isSpeechRecognitionSupported() {
  return Boolean(
    (typeof navigator.mediaDevices?.getUserMedia === "function" &&
      (window.AudioContext || window.webkitAudioContext)) ||
      window.SpeechRecognition ||
      window.webkitSpeechRecognition,
  );
}

export function cleanSpokenNameTranscript(transcript: string) {
  return transcript
    .trim()
    .replace(/[.?!]+$/g, "")
    .replace(
      /^(my full name is|my name is|the name is|name is|i am|i'm|call me|it is|it's|benim adım|benim adim|adım|adim|ismim|mi nombre es|me llamo|mein name ist|ich heiße|ich heisse|je m'appelle|mon nom est|meu nome é|meu nome e)\s+/i,
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

const spokenLetterNames: Record<string, string> = {
  ay: "a", be: "b", bee: "b", ce: "c", cee: "c", de: "d", dee: "d",
  ef: "f", ge: "g", gee: "g", ache: "h", aitch: "h", eye: "i", jota: "j",
  jay: "j", ka: "k", kay: "k", ele: "l", el: "l", eme: "m", em: "m",
  ene: "n", en: "n", oh: "o", pe: "p", pee: "p", cu: "q", cue: "q",
  erre: "r", are: "r", re: "r", ese: "s", ess: "s", te: "t", tee: "t",
  you: "u", ve: "v", vee: "v", equis: "x", ex: "x", why: "y", zeta: "z",
  zed: "z", zee: "z",
};

export function cleanSpokenLetterTranscript(transcript: string) {
  const originalWords = transcript.normalize("NFC").match(/\p{L}+/gu) ?? [];
  const directLetters = originalWords.flatMap((word) => Array.from(word));
  if (directLetters.length === 2) return directLetters.join("");

  const letters = originalWords.flatMap((word) => {
    if (Array.from(word).length === 1) return [word];
    const normalized = normalizeConfirmationText(word);
    return spokenLetterNames[normalized] ? [spokenLetterNames[normalized]] : [];
  });
  return letters.length === 2 ? letters.join("") : "";
}

export type SpokenConfirmation = "confirm" | "reject";

const confirmationPhrases: Record<
  SpeechRecognitionLanguage,
  { confirm: string[]; reject: string[] }
> = {
  en: {
    confirm: ["yes", "confirm", "i confirm", "yes i confirm", "correct", "that is correct", "thats correct"],
    reject: ["no", "i do not confirm", "i dont confirm", "no i do not confirm", "incorrect", "not correct", "that is wrong"],
  },
  es: {
    confirm: ["si", "confirmo", "si confirmo", "correcto", "es correcto"],
    reject: ["no", "no confirmo", "incorrecto", "no es correcto", "esta mal"],
  },
  de: {
    confirm: ["ja", "ich bestatige", "ja ich bestatige", "korrekt", "das stimmt", "richtig"],
    reject: ["nein", "ich bestatige nicht", "nicht korrekt", "das stimmt nicht", "falsch"],
  },
  tr: {
    confirm: ["evet", "onayliyorum", "evet onayliyorum", "dogru", "evet dogru"],
    reject: ["hayir", "onaylamiyorum", "hayir onaylamiyorum", "yanlis", "dogru degil"],
  },
  pt: {
    confirm: ["sim", "confirmo", "sim confirmo", "correto", "esta correto"],
    reject: ["nao", "nao confirmo", "incorreto", "nao esta correto", "esta errado"],
  },
  fr: {
    confirm: ["oui", "je confirme", "oui je confirme", "correct", "c est correct"],
    reject: ["non", "je ne confirme pas", "non je ne confirme pas", "incorrect", "ce n est pas correct", "c est faux"],
  },
};

function normalizeConfirmationText(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase()
    .replace(/ı/g, "i")
    .replace(/ß/g, "ss")
    .replace(/[^a-z\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function parseSpokenConfirmation(
  transcript: string,
  language: SpeechRecognitionLanguage,
): SpokenConfirmation | null {
  const normalized = normalizeConfirmationText(transcript);
  const padded = ` ${normalized} `;
  const phrases = confirmationPhrases[language];
  if (phrases.reject.some((phrase) => padded.includes(` ${phrase} `))) {
    return "reject";
  }
  if (phrases.confirm.some((phrase) => padded.includes(` ${phrase} `))) {
    return "confirm";
  }
  return null;
}

function mapSttUsage(response: AzureSttResponse): SttUsage {
  return {
    limit: response.stt_limit_seconds,
    used: response.stt_used_seconds,
    remaining: response.stt_remaining_seconds,
    resetDate: response.stt_reset_date,
  };
}

async function transcribeAzureSpeech(
  audio: Blob,
  language: SpeechRecognitionLanguage,
  mode: SpeechRecognitionMode,
) {
  const response = await fetch(
    `${API_BASE_URL}/api/stt?language=${encodeURIComponent(language)}&mode=${mode}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "audio/wav",
        ...getSessionHeaders(),
        "X-Speech-Request-ID": crypto.randomUUID(),
        "X-Browser-Speech-Supported": String(Boolean(window.SpeechRecognition || window.webkitSpeechRecognition)),
      },
      body: audio,
    },
  );

  if (!response.ok) {
    let message = "Voice input had a problem. Please try again or type.";
    try {
      const data = (await response.json()) as { detail?: string };
      if (data.detail) {
        message = data.detail;
      }
    } catch {
      // Keep friendly fallback.
    }
    throw new ApiError(message, response.status);
  }

  if (response.status === 204 && response.headers.get("X-Speech-Provider") === "browser") {
    notifySpeechProviderUsed("stt", "browser");
    throw new ApiError(BROWSER_FALLBACK_CODE, 503);
  }

  const data = (await response.json()) as AzureSttResponse;
  const provider = response.headers.get("X-Speech-Provider");
  if (provider) notifySpeechProviderUsed("stt", provider as GlobalSpeechProvider);
  notifySttUsageUpdated(mapSttUsage(data));
  return data.transcript;
}

function mergeAudioBuffers(buffers: Float32Array[]) {
  const length = buffers.reduce((total, buffer) => total + buffer.length, 0);
  const result = new Float32Array(length);
  let offset = 0;
  for (const buffer of buffers) {
    result.set(buffer, offset);
    offset += buffer.length;
  }
  return result;
}

function encodeWav(samples: Float32Array, sampleRate: number) {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);

  const writeString = (offset: number, value: string) => {
    for (let index = 0; index < value.length; index += 1) {
      view.setUint8(offset + index, value.charCodeAt(index));
    }
  };

  writeString(0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, "data");
  view.setUint32(40, samples.length * 2, true);

  let offset = 44;
  for (const sample of samples) {
    const clamped = Math.max(-1, Math.min(1, sample));
    view.setInt16(offset, clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff, true);
    offset += 2;
  }

  return new Blob([view], { type: "audio/wav" });
}

class BackendSpeechRecognizer {
  private audioContext: AudioContext | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private processor: RecorderNode | null = null;
  private stream: MediaStream | null = null;
  private buffers: Float32Array[] = [];
  private isStopping = false;
  private isStarted = false;
  private hasEnded = false;

  constructor(
    private readonly callbacks: SpeechRecognitionCallbacks,
    private readonly mode: SpeechRecognitionMode,
    private readonly language: SpeechRecognitionLanguage,
    private readonly errorMessages: SpeechRecognitionErrorMessages,
  ) {}

  start() {
    void this.startRecording();
  }

  stop() {
    void this.stopRecording();
  }

  private async startRecording() {
    try {
      const AudioContextConstructor = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextConstructor) {
        this.callbacks.onError(this.errorMessages.problem);
        this.callbacks.onEnd();
        return;
      }

      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (this.isStopping) {
        await this.cleanup();
        this.endOnce();
        return;
      }

      this.audioContext = new AudioContextConstructor();
      if (this.audioContext.state === "suspended") {
        await this.audioContext.resume();
      }
      this.source = this.audioContext.createMediaStreamSource(this.stream);
      this.processor = this.audioContext.createScriptProcessor(4096, 1, 1) as RecorderNode;
      this.processor.onaudioprocess = (event) => {
        if (this.isStopping) {
          return;
        }
        this.buffers.push(new Float32Array(event.inputBuffer.getChannelData(0)));
      };
      this.source.connect(this.processor);
      this.processor.connect(this.audioContext.destination);
      this.isStarted = true;
      this.callbacks.onReady?.();
    } catch (error) {
      this.callbacks.onError(
        error instanceof DOMException && error.name === "NotAllowedError"
          ? this.errorMessages.microphoneBlocked
          : this.errorMessages.problem,
      );
      await this.cleanup();
      this.endOnce();
    }
  }

  private async stopRecording() {
    if (this.isStopping) {
      return;
    }
    this.isStopping = true;

    if (!this.isStarted || !this.audioContext) {
      await this.cleanup();
      this.endOnce();
      return;
    }

    const sampleRate = this.audioContext.sampleRate;
    if (this.buffers.length === 0) {
      this.callbacks.onError(this.errorMessages.problem);
      await this.cleanup();
      this.endOnce();
      return;
    }
    const audio = encodeWav(mergeAudioBuffers(this.buffers), sampleRate);

    await this.cleanup();

    try {
      const transcript = await transcribeAzureSpeech(audio, this.language, this.mode);
      const cleanedTranscript =
        this.mode === "pin"
          ? cleanSpokenPinTranscript(transcript)
          : this.mode === "letters"
            ? cleanSpokenLetterTranscript(transcript)
          : this.mode === "name"
            ? cleanSpokenNameTranscript(transcript)
            : transcript.trim();
      if (cleanedTranscript) {
        this.callbacks.onResult(cleanedTranscript);
      } else {
        this.callbacks.onError(this.errorMessages.problem);
      }
    } catch (error) {
      if (error instanceof ApiError && error.message === BROWSER_FALLBACK_CODE) {
        this.callbacks.onError(this.errorMessages.browserFallback);
      } else if (error instanceof ApiError && error.status === 422) {
        this.callbacks.onError(this.errorMessages.noSpeech);
      } else if (error instanceof ApiError && error.status === 403) {
        this.callbacks.onError(this.errorMessages.limitReached);
      } else {
        this.callbacks.onError(this.errorMessages.problem);
      }
    } finally {
      this.endOnce();
    }
  }

  private endOnce() {
    if (this.hasEnded) {
      return;
    }
    this.hasEnded = true;
    this.callbacks.onEnd();
  }

  private async cleanup() {
    this.processor?.disconnect();
    this.source?.disconnect();
    this.processor = null;
    this.source = null;

    this.stream?.getTracks().forEach((track) => track.stop());
    this.stream = null;

    if (this.audioContext?.state !== "closed") {
      await this.audioContext?.close();
    }
    this.audioContext = null;
  }
}

class BrowserSpeechRecognizer {
  private recognition: BrowserSpeechRecognition | null = null;
  private hasEnded = false;

  constructor(
    private readonly callbacks: SpeechRecognitionCallbacks,
    private readonly mode: SpeechRecognitionMode,
    private readonly language: SpeechRecognitionLanguage,
    private readonly errorMessages: SpeechRecognitionErrorMessages,
  ) {}

  start() {
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) {
      this.callbacks.onError(this.errorMessages.problem);
      this.endOnce();
      return;
    }
    const localeByLanguage: Record<SpeechRecognitionLanguage, string> = {
      en: "en-US",
      es: "es-ES",
      de: "de-DE",
      tr: "tr-TR",
      pt: "pt-PT",
      fr: "fr-FR",
    };
    const recognition = new Recognition();
    recognition.lang = localeByLanguage[this.language];
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onstart = () => this.callbacks.onReady?.();
    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript ?? "";
      const cleaned = this.mode === "pin"
        ? cleanSpokenPinTranscript(transcript)
        : this.mode === "letters"
          ? cleanSpokenLetterTranscript(transcript)
        : this.mode === "name"
          ? cleanSpokenNameTranscript(transcript)
          : transcript.trim();
      if (cleaned) this.callbacks.onResult(cleaned);
      else this.callbacks.onError(this.errorMessages.problem);
    };
    recognition.onerror = (event) => {
      this.callbacks.onError(
        event.error === "not-allowed" ? this.errorMessages.microphoneBlocked : this.errorMessages.problem,
      );
    };
    recognition.onend = () => this.endOnce();
    this.recognition = recognition;
    try {
      recognition.start();
    } catch {
      this.callbacks.onError(this.errorMessages.problem);
      this.endOnce();
    }
  }

  stop() {
    this.recognition?.stop();
  }

  private endOnce() {
    if (this.hasEnded) return;
    this.hasEnded = true;
    this.recognition = null;
    this.callbacks.onEnd();
  }
}

class ManagedSpeechRecognizer {
  private delegate: BackendSpeechRecognizer | BrowserSpeechRecognizer | null = null;
  private stopRequested = false;
  private ended = false;

  constructor(
    private readonly callbacks: SpeechRecognitionCallbacks,
    private readonly mode: SpeechRecognitionMode,
    private readonly language: SpeechRecognitionLanguage,
    private readonly errorMessages: SpeechRecognitionErrorMessages,
  ) {}

  start() {
    void this.selectAndStart();
  }

  stop() {
    this.stopRequested = true;
    this.delegate?.stop();
  }

  private async selectAndStart() {
    try {
      const decision = await resolveSpeechProvider("stt");
      notifySpeechProviderUsed("stt", decision.provider);
      if (this.stopRequested) {
        this.endOnce();
        return;
      }
      const delegatedCallbacks: SpeechRecognitionCallbacks = {
        ...this.callbacks,
        onEnd: () => this.endOnce(),
      };
      this.delegate = decision.provider === "browser"
        ? new BrowserSpeechRecognizer(delegatedCallbacks, this.mode, this.language, this.errorMessages)
        : new BackendSpeechRecognizer(delegatedCallbacks, this.mode, this.language, this.errorMessages);
      this.delegate.start();
    } catch (error) {
      const BrowserRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (this.stopRequested || !BrowserRecognition) {
        console.error("ASSIST-AI could not resolve an STT provider", error);
        this.callbacks.onError(error instanceof Error ? error.message : this.errorMessages.problem);
        this.endOnce();
        return;
      }

      // Provider routing should not disable the browser's built-in recognizer.
      const delegatedCallbacks: SpeechRecognitionCallbacks = {
        ...this.callbacks,
        onEnd: () => this.endOnce(),
      };
      notifySpeechProviderUsed("stt", "browser");
      this.delegate = new BrowserSpeechRecognizer(
        delegatedCallbacks,
        this.mode,
        this.language,
        this.errorMessages,
      );
      this.delegate.start();
    }
  }

  private endOnce() {
    if (this.ended) return;
    this.ended = true;
    this.callbacks.onEnd();
  }
}

export function createSpeechRecognizer(
  callbacks: SpeechRecognitionCallbacks,
  mode: SpeechRecognitionMode = "name",
  language: SpeechRecognitionLanguage = "en",
  errorMessages: SpeechRecognitionErrorMessages = {
    microphoneBlocked: "Microphone access was blocked. Please type or use the keypad.",
    problem: "Voice input had a problem. Please try again or type.",
    browserFallback: "Browser voice input is ready. Hold Space and speak again.",
    noSpeech: "No clear speech was recognized. Hold Space and try again.",
    limitReached: "Speech time limit reached. Please type or use the keypad.",
  },
) {
  if (!isSpeechRecognitionSupported()) {
    return null;
  }

  return new ManagedSpeechRecognizer(callbacks, mode, language, errorMessages);
}
