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
};

let currentAssistantAudio: HTMLAudioElement | null = null;
let currentAssistantAudioUrl: string | null = null;
let currentAssistantAbortController: AbortController | null = null;
let currentSuccessAudio: HTMLAudioElement | null = null;
let currentSuccessToneContext: AudioContext | null = null;
let activeSpeechId = 0;
let currentBrowserUtterance: SpeechSynthesisUtterance | null = null;

export function isSpeechSynthesisSupported() {
  return typeof window !== "undefined" && (
    typeof Audio !== "undefined" || "speechSynthesis" in window
  );
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

  if (currentAssistantAudio) {
    currentAssistantAudio.pause();
    currentAssistantAudio.currentTime = 0;
    currentAssistantAudio = null;
  }

  if (currentAssistantAudioUrl) {
    URL.revokeObjectURL(currentAssistantAudioUrl);
    currentAssistantAudioUrl = null;
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

async function playBackendTts(
  message: string,
  callbacks: SpeechCallbacks,
  speechId: number,
  abortController: AbortController,
  language: LanguageCode,
) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/tts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getSessionHeaders(),
        "X-Speech-Request-ID": crypto.randomUUID(),
        "X-Browser-Speech-Supported": String("speechSynthesis" in window),
      },
      body: JSON.stringify({ text: message, language }),
      signal: abortController.signal,
    });

    const selectedProvider = response.headers.get("X-Speech-Provider");
    if (selectedProvider) {
      notifySpeechProviderUsed("tts", selectedProvider.replace("-cache", "") as GlobalSpeechProvider);
    }
    if (response.status === 204 && selectedProvider === "browser") {
      playBrowserTts(message, language, callbacks, speechId);
      return;
    }

    if (!response.ok) {
      throw new ApiError(await readTtsError(response), response.status);
    }

    if (activeSpeechId !== speechId) {
      return;
    }

    const remainingHeader = response.headers.get("X-TTS-Remaining-Characters");
    const limitHeader = response.headers.get("X-TTS-Limit-Characters");
    const resetDateHeader = response.headers.get("X-TTS-Reset-Date");
    if (remainingHeader) {
      callbacks.onCreditsRemaining?.(Number(remainingHeader));
    }
    if (remainingHeader && limitHeader) {
      const usage = {
        remaining: Number(remainingHeader),
        used: Number(limitHeader) - Number(remainingHeader),
        limit: Number(limitHeader),
        resetDate: resetDateHeader ?? "",
      };
      callbacks.onUsageUpdate?.(usage);
      notifyTtsUsageUpdated(usage);
    }

    const audioBlob = await response.blob();
    if (activeSpeechId !== speechId) {
      return;
    }

    const audioUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(audioUrl);
    currentAssistantAudioUrl = audioUrl;
    currentAssistantAudio = audio;

    audio.onplay = () => {
      if (activeSpeechId === speechId) {
        callbacks.onStart?.();
      }
    };
    audio.onended = () => finishAssistantAudio(audio, audioUrl, callbacks, speechId);
    audio.onerror = () => {
      finishAssistantAudio(audio, audioUrl, callbacks, speechId);
      callbacks.onError?.("Assistant voice could not play.");
    };

    await audio.play();
  } catch (error) {
    if (abortController.signal.aborted || activeSpeechId !== speechId) {
      return;
    }
    callbacks.onError?.(
      error instanceof Error ? error.message : "Assistant voice had a problem.",
    );
    callbacks.onEnd?.();
  } finally {
    if (currentAssistantAbortController === abortController) {
      currentAssistantAbortController = null;
    }
  }
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

async function readTtsError(response: Response) {
  try {
    const data = (await response.json()) as { detail?: string };
    return data.detail ?? "Assistant voice had a problem.";
  } catch {
    return "Assistant voice had a problem.";
  }
}

function finishAssistantAudio(
  audio: HTMLAudioElement,
  audioUrl: string,
  callbacks: SpeechCallbacks,
  speechId: number,
) {
  if (activeSpeechId !== speechId) {
    return;
  }
  if (currentAssistantAudio === audio) {
    currentAssistantAudio = null;
  }
  if (currentAssistantAudioUrl === audioUrl) {
    URL.revokeObjectURL(audioUrl);
    currentAssistantAudioUrl = null;
  }
  callbacks.onEnd?.();
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
