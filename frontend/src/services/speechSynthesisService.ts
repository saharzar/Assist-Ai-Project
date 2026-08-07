import applauseSoundUrl from "../assets/audio/applause.mp3";
import type { LanguageCode } from "../i18n";
import { API_BASE_URL, ApiError, getSessionHeaders } from "./api";
import { notifyTtsUsageUpdated, type TtsUsage } from "./ttsUsageService";
import { notifySpeechProviderUsed, type GlobalSpeechProvider } from "./speechProviderService";

type SpeechCallbacks = {
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (message: string) => void;
  onCreditsRemaining?: (characters: number) => void;
  onUsageUpdate?: (usage: TtsUsage) => void;
  allowBrowserFallback?: boolean;
};

type PreparedSpeech = {
  audioBlob: Blob | null;
  provider: string | null;
  remaining: number | null;
  usage: TtsUsage | null;
};

const preparedSpeechCache = new Map<string, PreparedSpeech>();
const pendingSpeechRequests = new Map<string, Promise<PreparedSpeech>>();
const MAX_PREPARED_SPEECH_ITEMS = 8;

let reusableSonioxAudio: HTMLAudioElement | null = null;
let currentSonioxAudioUrl: string | null = null;
let assistantAudioUnlocked = false;
let assistantAudioUnlockPromise: Promise<void> | null = null;
let currentAssistantAbortController: AbortController | null = null;
let currentSuccessAudio: HTMLAudioElement | null = null;
let currentSuccessToneContext: AudioContext | null = null;
let activeSpeechId = 0;
let currentBrowserUtterance: SpeechSynthesisUtterance | null = null;

export function unlockAssistantAudioPlayback() {
  if (assistantAudioUnlocked || assistantAudioUnlockPromise) return;

  // Use a separate one-shot element. Reusing the Soniox player here creates a
  // race where the unlock cleanup pauses a fast cached message that has just
  // started playing on the withdrawal or account-information screen.
  const unlockAudio = new Audio(
    "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YQAAAAA=",
  );
  unlockAudio.volume = 0.01;
  assistantAudioUnlockPromise = unlockAudio.play()
    .then(() => {
      assistantAudioUnlocked = true;
      unlockAudio.pause();
      unlockAudio.removeAttribute("src");
    })
    .catch(() => undefined)
    .finally(() => {
      assistantAudioUnlockPromise = null;
    });
}

export function isSpeechSynthesisSupported() {
  return typeof window !== "undefined" && typeof Audio !== "undefined";
}

export function stopAssistantSpeech() {
  activeSpeechId += 1;

  if ("speechSynthesis" in window) {
    window.speechSynthesis.cancel();
    currentBrowserUtterance = null;
  }

  if (currentAssistantAbortController) {
    currentAssistantAbortController.abort();
    currentAssistantAbortController = null;
  }

  if (reusableSonioxAudio) {
    reusableSonioxAudio.onplay = null;
    reusableSonioxAudio.onended = null;
    reusableSonioxAudio.onerror = null;
    reusableSonioxAudio.pause();
    reusableSonioxAudio.currentTime = 0;
    reusableSonioxAudio.removeAttribute("src");
    reusableSonioxAudio.load();
  }
  if (currentSonioxAudioUrl) {
    URL.revokeObjectURL(currentSonioxAudioUrl);
    currentSonioxAudioUrl = null;
  }

}

export function speakAssistantMessage(
  message: string,
  callbacks: SpeechCallbacks = {},
  language: LanguageCode = "en",
) {
  if (!message.trim()) {
    callbacks.onEnd?.();
    return;
  }

  stopAssistantSpeech();
  const speechId = activeSpeechId;
  currentAssistantAbortController = new AbortController();

  void playBackendTts(message, callbacks, speechId, currentAssistantAbortController, language);
}

export async function preloadAssistantMessage(
  message: string,
  language: LanguageCode = "en",
) {
  if (!message.trim()) return;

  try {
    await getPreparedSpeech(message, language);
  } catch {
    // Playback will retry normally and surface any error to the user.
  }
}

async function playBackendTts(
  message: string,
  callbacks: SpeechCallbacks,
  speechId: number,
  abortController: AbortController,
  language: LanguageCode,
) {
  try {
    const prepared = await getPreparedSpeech(message, language, abortController.signal);
    if (abortController.signal.aborted || activeSpeechId !== speechId) {
      return;
    }
    if (prepared.provider === "browser" && !prepared.audioBlob) {
      if (callbacks.allowBrowserFallback === false) {
        callbacks.onError?.("Soniox voice is currently unavailable.");
        callbacks.onEnd?.();
      } else {
        playBrowserTts(message, language, callbacks, speechId);
      }
      return;
    }

    if (activeSpeechId !== speechId) {
      return;
    }

    if (prepared.remaining !== null) {
      callbacks.onCreditsRemaining?.(prepared.remaining);
    }
    if (prepared.usage) {
      callbacks.onUsageUpdate?.(prepared.usage);
    }

    const audioBlob = prepared.audioBlob;
    if (!audioBlob) {
      throw new Error("Assistant voice returned no audio.");
    }
    if (activeSpeechId !== speechId) {
      return;
    }

    await playSonioxAudio(audioBlob, callbacks, speechId);
  } catch (error) {
    if (abortController.signal.aborted || activeSpeechId !== speechId) {
      return;
    }
    if (callbacks.allowBrowserFallback !== false && "speechSynthesis" in window) {
      playBrowserTts(message, language, callbacks, speechId);
    } else {
      callbacks.onError?.(
        error instanceof Error ? error.message : "Assistant voice had a problem.",
      );
      callbacks.onEnd?.();
    }
  } finally {
    if (currentAssistantAbortController === abortController) {
      currentAssistantAbortController = null;
    }
  }
}

async function playSonioxAudio(
  audioBlob: Blob,
  callbacks: SpeechCallbacks,
  speechId: number,
) {
  await playSonioxHtmlAudio(audioBlob, callbacks, speechId);
}

function getReusableSonioxAudio() {
  if (!reusableSonioxAudio) {
    reusableSonioxAudio = new Audio();
    reusableSonioxAudio.preload = "auto";
  }
  return reusableSonioxAudio;
}

async function playSonioxHtmlAudio(
  audioBlob: Blob,
  callbacks: SpeechCallbacks,
  speechId: number,
) {
  const audio = getReusableSonioxAudio();
  const audioUrl = URL.createObjectURL(audioBlob);
  currentSonioxAudioUrl = audioUrl;
  audio.src = audioUrl;
  audio.currentTime = 0;
  audio.volume = 1;
  audio.onplay = () => {
    if (activeSpeechId === speechId) callbacks.onStart?.();
  };
  audio.onended = () => {
    audio.onplay = null;
    audio.onended = null;
    audio.onerror = null;
    if (currentSonioxAudioUrl === audioUrl) {
      URL.revokeObjectURL(audioUrl);
      currentSonioxAudioUrl = null;
    }
    if (activeSpeechId === speechId) callbacks.onEnd?.();
  };
  await audio.play();
}

function playBrowserTts(
  message: string,
  language: LanguageCode,
  callbacks: SpeechCallbacks,
  speechId: number,
) {
  if (!("speechSynthesis" in window) || typeof SpeechSynthesisUtterance === "undefined") {
    callbacks.onError?.("Browser speech is not supported on this device.");
    callbacks.onEnd?.();
    return;
  }
  const localeByLanguage: Record<LanguageCode, string> = {
    en: "en-US",
    es: "es-ES",
    de: "de-DE",
    tr: "tr-TR",
    pt: "pt-PT",
    fr: "fr-FR",
  };
  const utterance = new SpeechSynthesisUtterance(message);
  utterance.lang = localeByLanguage[language];
  const voices = window.speechSynthesis.getVoices();
  utterance.voice = voices.find((voice) => voice.lang === utterance.lang)
    ?? voices.find((voice) => voice.lang.startsWith(language))
    ?? null;
  currentBrowserUtterance = utterance;
  utterance.onstart = () => {
    if (activeSpeechId === speechId) callbacks.onStart?.();
  };
  utterance.onend = () => {
    if (activeSpeechId !== speechId) return;
    currentBrowserUtterance = null;
    callbacks.onEnd?.();
  };
  utterance.onerror = () => {
    if (activeSpeechId !== speechId) return;
    currentBrowserUtterance = null;
    callbacks.onError?.("Browser speech could not play.");
    callbacks.onEnd?.();
  };
  window.speechSynthesis.speak(utterance);
}

function getSpeechCacheKey(message: string, language: LanguageCode) {
  return `${language}:${message.trim()}`;
}

async function getPreparedSpeech(
  message: string,
  language: LanguageCode,
  signal?: AbortSignal,
) {
  const isGuest = !localStorage.getItem("assist_ai_token") && Boolean(localStorage.getItem("assist_ai_guest_session"));
  if (isGuest) {
    notifySpeechProviderUsed("tts", "browser");
    return { audioBlob: null, provider: "browser", remaining: null, usage: null };
  }
  const cacheKey = getSpeechCacheKey(message, language);
  const cached = preparedSpeechCache.get(cacheKey);
  if (cached) return cached;

  const pending = pendingSpeechRequests.get(cacheKey);
  if (pending) return pending;

  const request = fetchPreparedSpeech(message, language, signal)
    .then((prepared) => {
      // Cache generated provider audio, but never remember a browser fallback.
      // Otherwise one temporary Soniox failure makes this message use the
      // browser voice for the rest of the session even after Soniox recovers.
      if (prepared.audioBlob && prepared.provider !== "browser") {
        preparedSpeechCache.set(cacheKey, prepared);
        while (preparedSpeechCache.size > MAX_PREPARED_SPEECH_ITEMS) {
          const oldestKey = preparedSpeechCache.keys().next().value;
          if (oldestKey) preparedSpeechCache.delete(oldestKey);
        }
      }
      return prepared;
    })
    .finally(() => pendingSpeechRequests.delete(cacheKey));

  pendingSpeechRequests.set(cacheKey, request);
  return request;
}

async function fetchPreparedSpeech(
  message: string,
  language: LanguageCode,
  signal?: AbortSignal,
): Promise<PreparedSpeech> {
  const response = await fetch(`${API_BASE_URL}/api/tts`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getSessionHeaders(),
      "X-Speech-Request-ID": crypto.randomUUID(),
      "X-Browser-Speech-Supported": String("speechSynthesis" in window),
    },
    body: JSON.stringify({ text: message, language }),
    signal,
  });

  const provider = response.headers.get("X-Speech-Provider");
  if (provider) {
    notifySpeechProviderUsed("tts", provider.replace("-cache", "") as GlobalSpeechProvider);
  }
  if (response.status === 204 && provider === "browser") {
    return { audioBlob: null, provider, remaining: null, usage: null };
  }
  if (!response.ok) {
    throw new ApiError(await readTtsError(response), response.status);
  }

  const remainingHeader = response.headers.get("X-TTS-Remaining-Characters");
  const limitHeader = response.headers.get("X-TTS-Limit-Characters");
  const resetDateHeader = response.headers.get("X-TTS-Reset-Date");
  const remaining = remainingHeader ? Number(remainingHeader) : null;
  const usage = remainingHeader && limitHeader
    ? {
        remaining: Number(remainingHeader),
        used: Number(limitHeader) - Number(remainingHeader),
        limit: Number(limitHeader),
        resetDate: resetDateHeader ?? "",
      }
    : null;
  if (usage) notifyTtsUsageUpdated(usage);

  return {
    audioBlob: await response.blob(),
    provider,
    remaining,
    usage,
  };
}

async function readTtsError(response: Response) {
  try {
    const data = (await response.json()) as { detail?: string };
    return data.detail ?? "Assistant voice had a problem.";
  } catch {
    return "Assistant voice had a problem.";
  }
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
