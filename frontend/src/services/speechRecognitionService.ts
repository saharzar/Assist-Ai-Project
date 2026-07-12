import { API_BASE_URL, ApiError } from "./api";
import { notifySttUsageUpdated, type SttUsage } from "./sttUsageService";

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
  }
}

export function isSpeechRecognitionSupported() {
  return Boolean(
    typeof navigator.mediaDevices?.getUserMedia === "function" &&
      (window.AudioContext || window.webkitAudioContext),
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
  const token = localStorage.getItem("assist_ai_token");
  const response = await fetch(
    `${API_BASE_URL}/api/stt?language=${encodeURIComponent(language)}&mode=${mode}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "audio/wav",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
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

  const data = (await response.json()) as AzureSttResponse;
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

class AzureSpeechRecognizer {
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
    const audio = encodeWav(mergeAudioBuffers(this.buffers), sampleRate);

    await this.cleanup();

    try {
      const transcript = await transcribeAzureSpeech(audio, this.language, this.mode);
      const cleanedTranscript =
        this.mode === "pin"
          ? cleanSpokenPinTranscript(transcript)
          : cleanSpokenNameTranscript(transcript);
      if (cleanedTranscript) {
        this.callbacks.onResult(cleanedTranscript);
      } else {
        this.callbacks.onError(this.errorMessages.problem);
      }
    } catch (error) {
      if (error instanceof TypeError && error.message.toLowerCase().includes("fetch")) {
        this.callbacks.onError(
          `Cannot reach the speech backend at ${API_BASE_URL}. Please restart the frontend and make sure the backend is running.`,
        );
      } else {
        this.callbacks.onError(error instanceof Error ? error.message : this.errorMessages.problem);
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

export function createSpeechRecognizer(
  callbacks: SpeechRecognitionCallbacks,
  mode: SpeechRecognitionMode = "name",
  language: SpeechRecognitionLanguage = "en",
  errorMessages: SpeechRecognitionErrorMessages = {
    microphoneBlocked: "Microphone access was blocked. Please type or use the keypad.",
    problem: "Voice input had a problem. Please try again or type.",
  },
) {
  if (!isSpeechRecognitionSupported()) {
    return null;
  }

  return new AzureSpeechRecognizer(callbacks, mode, language, errorMessages);
}
