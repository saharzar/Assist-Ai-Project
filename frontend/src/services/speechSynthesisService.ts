import applauseSoundUrl from "../assets/audio/applause.mp3";
import type { LanguageCode } from "../i18n";
import { API_BASE_URL, ApiError } from "./api";
import { notifyTtsUsageUpdated, type TtsUsage } from "./ttsUsageService";

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

export function isSpeechSynthesisSupported() {
  return typeof window !== "undefined" && typeof Audio !== "undefined";
}

export function stopAssistantSpeech() {
  activeSpeechId += 1;

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
    const token = localStorage.getItem("assist_ai_token");
    const response = await fetch(`${API_BASE_URL}/api/tts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ text: message, language }),
      signal: abortController.signal,
    });

    if (!response.ok) {
      throw new ApiError(await readTtsError(response), response.status);
    }

    if (activeSpeechId !== speechId) {
      return;
    }

    const remainingHeader = response.headers.get("X-TTS-Remaining-Characters");
    const limitHeader = response.headers.get("X-TTS-Limit-Characters");
    if (remainingHeader) {
      callbacks.onCreditsRemaining?.(Number(remainingHeader));
    }
    if (remainingHeader && limitHeader) {
      const usage = {
        remaining: Number(remainingHeader),
        used: Number(limitHeader) - Number(remainingHeader),
        limit: Number(limitHeader),
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
