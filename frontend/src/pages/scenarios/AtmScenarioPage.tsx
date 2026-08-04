import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import { AtmAssistantMessage } from "../../components/atm/AtmAssistantMessage";
import { AtmConfirmNameScreen } from "../../components/atm/AtmConfirmNameScreen";
import { AtmFrame } from "../../components/atm/AtmFrame";
import { AtmLetterCheckScreen } from "../../components/atm/AtmLetterCheckScreen";
import { AtmLockoutScreen } from "../../components/atm/AtmLockoutScreen";
import {
  AtmNameScreen,
  type AtmNameInputEvent,
  type AtmNameInputEventPayload,
} from "../../components/atm/AtmNameScreen";
import { AtmPinScreen } from "../../components/atm/AtmPinScreen";
import { AtmSuccessScreen } from "../../components/atm/AtmSuccessScreen";
import {
  AtmInsufficientFundsScreen,
  AtmWithdrawalConfirmScreen,
  AtmWithdrawalResultScreen,
  AtmWithdrawalScreen,
} from "../../components/atm/AtmWithdrawalScreen";
import { AtmWelcomeScreen } from "../../components/atm/AtmWelcomeScreen";
import { SoundToggle } from "../../components/atm/SoundToggle";
import { useAuth } from "../../context/AuthContext";
import { useTranslation } from "../../i18n";
import { ATM_ERROR, atmReducer, initialAtmState } from "../../lib/atmStateMachine";
import { atmTranslations } from "../../lib/atmTranslations";
import {
  abandonAtmAnalyticsSession,
  completeAtmAnalyticsSession,
  recordAtmAnalyticsEvent,
  startAtmAnalyticsSession,
  terminateAtmAnalyticsSession,
  type AtmInputMode,
  type AtmPinOutcome,
} from "../../services/atmAnalyticsService";
import {
  createSpeechRecognizer,
  cleanSpokenLetterTranscript,
  isSpeechRecognitionSupported,
  parseSpokenConfirmation,
} from "../../services/speechRecognitionService";
import { getSttUsage, type SttUsage } from "../../services/sttUsageService";
import {
  SPEECH_PROVIDER_USED_EVENT,
  type GlobalSpeechProvider,
} from "../../services/speechProviderService";
import {
  playSuccessSound,
  speakAssistantMessage,
  preloadAssistantMessage,
  stopAssistantSpeech,
  stopSuccessSound,
} from "../../services/speechSynthesisService";

const SOUND_STORAGE_KEY = "assist_ai_sound_enabled";

function getRemainingAttempts(errorMessage: string) {
  const attempts = Number(errorMessage.split(":")[1]);
  return Number.isFinite(attempts) ? Math.max(0, attempts) : 0;
}

export function AtmScenarioPage() {
  const navigate = useNavigate();
  const { token, guestSessionToken } = useAuth();
  const { language } = useTranslation();
  const text = atmTranslations[language];
  const [state, dispatch] = useReducer(atmReducer, initialAtmState);
  const [soundEnabled, setSoundEnabled] = useState(() => {
    const storedValue = localStorage.getItem(SOUND_STORAGE_KEY);
    return storedValue === null ? true : storedValue === "true";
  });
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isPreparingVoice, setIsPreparingVoice] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [speechError, setSpeechError] = useState("");
  const [ttsError, setTtsError] = useState("");
  const [nameInputEvent, setNameInputEvent] = useState<AtmNameInputEvent | null>(null);
  const [confirmationSecondsRemaining, setConfirmationSecondsRemaining] = useState(0);
  const [confirmationDecisionPending, setConfirmationDecisionPending] = useState(false);
  const [lastConfirmationDecision, setLastConfirmationDecision] = useState<boolean | null>(null);
  const recognizerRef = useRef<ReturnType<typeof createSpeechRecognizer> | null>(null);
  const sttUsageRef = useRef<SttUsage | null>(null);
  const listeningStartedAtRef = useRef<number | null>(null);
  const successSoundPlayedRef = useRef(false);
  const isListeningRef = useRef(false);
  const spaceIsHeldRef = useRef(false);
  const stopListeningTimerRef = useRef<number | null>(null);
  const sttAutoStopTimerRef = useRef<number | null>(null);
  const analyticsSessionIdRef = useRef<string | null>(null);
  const analyticsStartRef = useRef<Promise<string | null> | null>(null);
  const analyticsQueueRef = useRef<Promise<void>>(Promise.resolve());
  const latestStatusRef = useRef(state.status);
  const lastAutoSpeechRef = useRef({
    status: "",
    language: "",
    errorMessage: "",
    assistantMessage: "",
  });
  const recordedInputModesRef = useRef<Set<AtmInputMode>>(new Set());
  const activeSttProviderRef = useRef<GlobalSpeechProvider | null>(null);
  const analyticsCredentialsRef = useRef<{
    token: string | null;
    guestToken: string | null;
  }>({ token: null, guestToken: null });
  const speechRecognitionSupported = isSpeechRecognitionSupported();

  const enqueueAnalytics = useCallback(
    (operation: (sessionId: string) => Promise<unknown>) => {
      const knownSessionId = analyticsSessionIdRef.current;
      const startPromise = analyticsStartRef.current;
      analyticsQueueRef.current = analyticsQueueRef.current
        .then(async () => {
          const sessionId = knownSessionId ?? (await startPromise);
          if (!sessionId) {
            return;
          }
          analyticsSessionIdRef.current = sessionId;
          await operation(sessionId);
        })
        .catch(() => {
          // Analytics must never interrupt the learner's practice flow.
        });
    },
    [],
  );

  const beginAnalyticsSession = useCallback(() => {
    analyticsSessionIdRef.current = null;
    recordedInputModesRef.current = new Set();
    analyticsCredentialsRef.current = { token, guestToken: guestSessionToken };
    const startPromise = startAtmAnalyticsSession(language).catch(() => null);
    analyticsStartRef.current = startPromise;
    void startPromise.then((sessionId) => {
      if (analyticsStartRef.current === startPromise) {
        analyticsSessionIdRef.current = sessionId;
      }
    });
  }, [guestSessionToken, language, token]);

  const abandonCurrentAnalyticsSession = useCallback(() => {
    if (latestStatusRef.current === "success" || latestStatusRef.current === "security_terminated") {
      return;
    }
    const knownSessionId = analyticsSessionIdRef.current;
    const startPromise = analyticsStartRef.current;
    if (!knownSessionId && !startPromise) {
      return;
    }
    const credentials = analyticsCredentialsRef.current;
    const finalStep = latestStatusRef.current;
    analyticsSessionIdRef.current = null;
    analyticsStartRef.current = null;

    if (knownSessionId) {
      void abandonAtmAnalyticsSession(
        knownSessionId,
        finalStep,
        credentials.token,
        credentials.guestToken,
      ).catch(() => undefined);
      return;
    }

    void startPromise?.then((sessionId) => {
      if (!sessionId) return;
      return abandonAtmAnalyticsSession(
        sessionId,
        finalStep,
        credentials.token,
        credentials.guestToken,
      );
    }).catch(() => undefined);
  }, []);

  const recordInputMode = useCallback(
    (inputMode: AtmInputMode) => {
      if (recordedInputModesRef.current.has(inputMode)) {
        return;
      }
      recordedInputModesRef.current.add(inputMode);
      enqueueAnalytics((sessionId) =>
        recordAtmAnalyticsEvent(sessionId, {
          client_event_id: crypto.randomUUID(),
          event_type: "input_mode",
          input_mode: inputMode,
          stt_provider: inputMode === "voice" ? activeSttProviderRef.current ?? undefined : undefined,
        }),
      );
    },
    [enqueueAnalytics],
  );

  useEffect(() => {
    const rememberProvider = (event: Event) => {
      const detail = (
        event as CustomEvent<{
          serviceType: "tts" | "stt";
          provider: GlobalSpeechProvider;
        }>
      ).detail;
      if (detail.serviceType === "stt") {
        activeSttProviderRef.current = detail.provider;
      }
    };
    window.addEventListener(SPEECH_PROVIDER_USED_EVENT, rememberProvider);
    return () => window.removeEventListener(SPEECH_PROVIDER_USED_EVENT, rememberProvider);
  }, []);

  useEffect(() => {
    return abandonCurrentAnalyticsSession;
  }, [abandonCurrentAnalyticsSession]);

  const assistantMessage = useMemo(() => {
    if (state.status === "confirm_name" && state.fullName) {
      return text.confirmNameAssistant(state.fullName);
    }
    if (state.status === "enter_name") {
      const message = state.errorMessage ? text.invalidNameAssistant : text.enterNameAssistant;
      return lastConfirmationDecision === false
        ? `${text.nameRejectedFeedback} ${message}`
        : message;
    }
    if (state.status === "success") {
      return text.successAssistant;
    }
    if (state.status === "withdrawal") {
      return state.errorMessage === ATM_ERROR.insufficientFunds
        ? text.insufficientFundsAssistant(state.accountBalance)
        : text.withdrawalAssistant(state.accountBalance);
    }
    if (state.status === "withdrawal_confirm") {
      return text.withdrawalConfirmAssistant(state.withdrawnAmount);
    }
    if (state.status === "withdrawal_result") {
      return text.withdrawalResultAssistant(state.withdrawnAmount, state.remainingBalance);
    }
    if (state.status === "security_message") return text.securityMessage;
    if (state.status === "security_terminated") return text.securityTerminatedAssistant;
    if (state.status === "pin_attempt") {
      if (state.errorMessage) {
        if (state.identityVerified && state.postVerificationPinFailureCount > 0) {
          return text.wrongPinAssistant(Math.max(0, 2 - state.postVerificationPinFailureCount));
        }
        return state.errorMessage === ATM_ERROR.incompletePin
          ? text.incompletePinAssistant
          : text.wrongPinAssistant(Math.max(0, 2 - state.postVerificationPinFailureCount));
      }
      if (state.identityVerified) {
        return text.retryPinAfterLettersAssistant(state.demoPin);
      }
      const message = text.pinAssistant(state.demoPin);
      return lastConfirmationDecision === true && state.pinAttemptCount === 0
        ? `${text.nameConfirmedFeedback} ${message}`
        : message;
    }
    if (state.status === "letter_check") {
      if (state.errorMessage === ATM_ERROR.incompleteLetters) {
        return text.letterIncompleteAssistant;
      }
      if (state.errorMessage.startsWith(`${ATM_ERROR.letterMismatch}:`)) {
        return text.letterMismatchError(getRemainingAttempts(state.errorMessage));
      }
      return text.letterCheckAssistant;
    }
    if (state.status === "lockout") {
      return text.lockoutAssistant;
    }
    return text.welcomeAssistant;
  }, [
    state.demoPin,
    state.accountBalance,
    state.errorMessage,
    state.fullName,
    state.identityVerified,
    state.pinAttemptCount,
    state.postVerificationPinFailureCount,
    state.status,
    state.withdrawnAmount,
    state.remainingBalance,
    lastConfirmationDecision,
    text,
  ]);

  const confirmedPinAssistantMessage = useMemo(
    () => `${text.nameConfirmedFeedback} ${text.pinAssistant(state.demoPin)}`,
    [state.demoPin, text],
  );

  const displayedErrorMessage = useMemo(() => {
    if (!state.errorMessage) {
      return "";
    }
    if (state.status === "enter_name") {
      return text.invalidNameError;
    }
    if (state.status === "pin_attempt") {
      if (state.errorMessage === ATM_ERROR.incompletePin) {
        return text.incompletePinError;
      }
      if (state.identityVerified && state.postVerificationPinFailureCount > 0) {
        return text.wrongPinAssistant(Math.max(0, 2 - state.postVerificationPinFailureCount));
      }
      return text.wrongPinAssistant(Math.max(0, 2 - state.postVerificationPinFailureCount));
    }
    if (state.status === "letter_check") {
      if (state.errorMessage.startsWith(`${ATM_ERROR.letterMismatch}:`)) {
        return text.letterMismatchError(getRemainingAttempts(state.errorMessage));
      }
      return text.letterIncompleteError;
    }
    if (state.status === "withdrawal") {
      return state.errorMessage === ATM_ERROR.insufficientFunds
        ? text.insufficientFundsError
        : text.invalidAmountError;
    }
    return state.errorMessage;
  }, [state.currentPinInput.length, state.errorMessage, state.identityVerified, state.postVerificationPinFailureCount, state.status, text]);

  const spokenAssistantMessage = useMemo(() => {
    if (language === "tr" && state.status === "confirm_name" && state.fullName) {
      const clearlySpokenName = state.fullName.trim().split(/\s+/).join("  ");
      return `Adını ${clearlySpokenName} olarak duydum. Lütfen doğru olup olmadığını onayla.`;
    }
    if (state.demoPin && assistantMessage.includes(state.demoPin)) {
      return assistantMessage.split(state.demoPin).join(state.demoPin.split("").join(" "));
    }
    return assistantMessage;
  }, [assistantMessage, language, state.demoPin, state.fullName, state.status, text]);

  const speakCurrentMessage = useCallback(() => {
    if (!soundEnabled) {
      return;
    }
    setTtsError("");
    speakAssistantMessage(spokenAssistantMessage, {
      onStart: () => setIsSpeaking(true),
      onEnd: () => {
        setIsSpeaking(false);
        if (latestStatusRef.current === "security_message") {
          dispatch({ type: "SHOW_VERIFICATION" });
        }
      },
      onError: () => {
        setIsSpeaking(false);
        setTtsError(text.assistantVoiceProblem);
      },
    }, language);
  }, [language, soundEnabled, spokenAssistantMessage, text.assistantVoiceProblem]);

  const stopSpeech = useCallback(() => {
    stopAssistantSpeech();
    setIsSpeaking(false);
  }, []);

  const toggleSound = () => {
    setSoundEnabled((current) => {
      const nextValue = !current;
      localStorage.setItem(SOUND_STORAGE_KEY, String(nextValue));
      if (!nextValue) {
        stopSpeech();
        stopSuccessSound();
      }
      return nextValue;
    });
  };

  const refreshSttUsage = useCallback(async () => {
    try {
      const usage = await getSttUsage();
      sttUsageRef.current = usage;
      return usage;
    } catch (error) {
      console.warn("STT usage preflight failed; the transcription endpoint will enforce quota.", error);
      return sttUsageRef.current ?? { limit: 3600, used: 0, remaining: 3600, resetDate: "" };
    }
  }, []);

  const finishListeningSession = useCallback(() => {
    if (sttAutoStopTimerRef.current) {
      window.clearTimeout(sttAutoStopTimerRef.current);
      sttAutoStopTimerRef.current = null;
    }

    listeningStartedAtRef.current = null;
    recognizerRef.current = null;
    setIsPreparingVoice(false);
    setIsListening(false);
  }, []);

  const showLocalizedSpeechError = useCallback((message: string) => {
    const translatedMessages = new Set([
      text.speechMicBlocked,
      text.speechProblem,
      text.speechSessionExpired,
      text.speechProviderUnavailable,
      text.speechNetworkError,
      text.speechBusy,
      text.speechBrowserFallback,
      text.speechNoMatch,
      text.speechLimitReached,
      text.speechNameUnsupported,
      text.speechNameStartError,
      text.speechPinUnsupported,
      text.speechPinStartError,
      text.voiceUnsupportedLetters,
    ]);
    setSpeechError(translatedMessages.has(message) ? message : text.speechProblem);
  }, [text]);

  const completeNameConfirmation = useCallback((confirmed: boolean) => {
    if (confirmationSecondsRemaining > 0 || confirmationDecisionPending) {
      return;
    }

    setConfirmationDecisionPending(true);
    setSpeechError("");
    stopSpeech();
    setLastConfirmationDecision(confirmed);
    setTranscript("");
    dispatch({ type: confirmed ? "NAME_CONFIRMED" : "NAME_RETRY" });
    setConfirmationDecisionPending(false);
  }, [
    confirmationDecisionPending,
    confirmationSecondsRemaining,
    stopSpeech,
  ]);

  const completeWithdrawalConfirmation = useCallback((confirmed: boolean) => {
    setSpeechError("");
    stopSpeech();
    dispatch({ type: confirmed ? "WITHDRAWAL_CONFIRM" : "WITHDRAWAL_REJECT" });
  }, [stopSpeech]);

  useEffect(() => {
    latestStatusRef.current = state.status;
    if (state.status === "welcome" || !analyticsStartRef.current) {
      return;
    }
    if (state.status === "success") {
      enqueueAnalytics(async (sessionId) => {
        await completeAtmAnalyticsSession(sessionId, "success");
        if (analyticsSessionIdRef.current === sessionId) {
          analyticsSessionIdRef.current = null;
          analyticsStartRef.current = null;
        }
      });
      return;
    }
    if(state.status==="security_terminated" && state.securityTerminationReason){
      enqueueAnalytics(async(sessionId)=>{await terminateAtmAnalyticsSession(sessionId,state.securityTerminationReason!);if(analyticsSessionIdRef.current===sessionId){analyticsSessionIdRef.current=null;analyticsStartRef.current=null;}});return;
    }
    enqueueAnalytics((sessionId) =>
      recordAtmAnalyticsEvent(sessionId, {
        client_event_id: crypto.randomUUID(),
        event_type: "progress",
        final_step_reached: state.status,
      }),
    );
  }, [enqueueAnalytics, state.securityTerminationReason, state.status]);

  useEffect(() => {
    if (state.status !== "security_message") return;
    const fallbackDelay = soundEnabled ? 12000 : 2500;
    const timer = window.setTimeout(
      () => dispatch({ type: "SHOW_VERIFICATION" }),
      fallbackDelay,
    );
    return () => window.clearTimeout(timer);
  }, [soundEnabled, state.status]);

  useEffect(() => {
    if (state.status !== "withdrawal" || state.errorMessage !== ATM_ERROR.insufficientFunds) return;
    const timer = window.setTimeout(
      () => dispatch({ type: "WITHDRAWAL_WARNING_COMPLETE" }),
      soundEnabled ? 5000 : 3000,
    );
    return () => window.clearTimeout(timer);
  }, [soundEnabled, state.errorMessage, state.status]);

  useEffect(() => {
    if (state.status !== "confirm_name") {
      setConfirmationSecondsRemaining(0);
      setConfirmationDecisionPending(false);
      return;
    }

    setLastConfirmationDecision(null);
    setConfirmationSecondsRemaining(3);
    setConfirmationDecisionPending(false);
    const timer = window.setInterval(() => {
      setConfirmationSecondsRemaining((current) => {
        if (current <= 1) {
          window.clearInterval(timer);
          return 0;
        }
        return current - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [state.status]);

  useEffect(() => {
    if (state.status !== "confirm_name" || !soundEnabled) return;

    const spokenMessage = state.demoPin
      ? confirmedPinAssistantMessage
          .split(state.demoPin)
          .join(state.demoPin.split("").join(" "))
      : confirmedPinAssistantMessage;
    void preloadAssistantMessage(spokenMessage, language);
  }, [confirmedPinAssistantMessage, language, soundEnabled, state.demoPin, state.status]);

  useEffect(() => {
    if (state.status !== "security_terminated") return;
    const timer = window.setTimeout(() => dispatch({ type: "SECURITY_TICK" }), 1000);
    return () => window.clearTimeout(timer);
  }, [state.lockoutSecondsRemaining, state.status]);

  useEffect(() => {
    if (state.status !== "lockout" || state.lockoutSecondsRemaining === 0) {
      return;
    }

    // TODO: In production/scenario mode this can be changed to 180 seconds.
    const timer = window.setTimeout(() => {
      dispatch({ type: "LOCKOUT_TICK" });
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [state.lockoutSecondsRemaining, state.status]);

  useEffect(() => {
    if (!soundEnabled) {
      lastAutoSpeechRef.current.status = "";
      stopSpeech();
      return;
    }
    const previous = lastAutoSpeechRef.current;
    const screenChanged = previous.status !== state.status;
    const languageChanged = previous.language !== language;
    const newErrorAppeared = Boolean(state.errorMessage) && (
      previous.errorMessage !== state.errorMessage ||
      previous.assistantMessage !== assistantMessage
    );

    lastAutoSpeechRef.current = {
      status: state.status,
      language,
      errorMessage: state.errorMessage,
      assistantMessage,
    };

    if (screenChanged || languageChanged || newErrorAppeared) {
      speakCurrentMessage();
    }
  }, [
    assistantMessage,
    language,
    soundEnabled,
    speakCurrentMessage,
    state.errorMessage,
    state.status,
    stopSpeech,
  ]);

  useEffect(() => {
    if (state.status !== "success") {
      successSoundPlayedRef.current = false;
      return;
    }

    if (soundEnabled && !successSoundPlayedRef.current) {
      successSoundPlayedRef.current = true;
      playSuccessSound();
    }
  }, [soundEnabled, state.status]);

  useEffect(() => {
    return () => {
      lastAutoSpeechRef.current = {
        status: "",
        language: "",
        errorMessage: "",
        assistantMessage: "",
      };
      stopSpeech();
      stopSuccessSound();
      if (stopListeningTimerRef.current) {
        window.clearTimeout(stopListeningTimerRef.current);
      }
      if (sttAutoStopTimerRef.current) {
        window.clearTimeout(sttAutoStopTimerRef.current);
      }
      recognizerRef.current?.stop();
      spaceIsHeldRef.current = false;
      finishListeningSession();
    };
  }, [finishListeningSession, stopSpeech]);

  useEffect(() => {
    const stopAllScenarioAudio = () => {
      stopSpeech();
      stopSuccessSound();
      recognizerRef.current?.stop();
      spaceIsHeldRef.current = false;
      finishListeningSession();
    };

    const leaveScenario = () => {
      stopAllScenarioAudio();
      abandonCurrentAnalyticsSession();
    };

    const handleNavigationClick = (event: MouseEvent) => {
      const element = event.target as HTMLElement | null;
      if (element?.closest("header a, header button")) {
        leaveScenario();
      }
    };

    window.addEventListener("pagehide", leaveScenario);
    window.addEventListener("beforeunload", leaveScenario);
    window.addEventListener("popstate", leaveScenario);
    document.addEventListener("click", handleNavigationClick, true);

    return () => {
      window.removeEventListener("pagehide", leaveScenario);
      window.removeEventListener("beforeunload", leaveScenario);
      window.removeEventListener("popstate", leaveScenario);
      document.removeEventListener("click", handleNavigationClick, true);
    };
  }, [abandonCurrentAnalyticsSession, finishListeningSession, stopSpeech]);

  useEffect(() => {
    isListeningRef.current = isListening;
  }, [isListening]);

  const startNameListening = useCallback(async () => {
    stopSpeech();
    setSpeechError("");
    setTranscript("");

    const usage = await refreshSttUsage().catch(() => {
      setSpeechError(text.speechProblem);
      return null;
    });
    if (!usage) {
      return;
    }
    if (usage.remaining <= 0) {
      setSpeechError(text.speechLimitReached);
      return;
    }
    if (!spaceIsHeldRef.current) {
      return;
    }

    const recognizer = createSpeechRecognizer(
      {
        onReady: () => {
          setIsPreparingVoice(false);
          listeningStartedAtRef.current = Date.now();
          setIsListening(true);
          sttAutoStopTimerRef.current = window.setTimeout(() => {
            setSpeechError(text.speechLimitReached);
            recognizerRef.current?.stop();
            finishListeningSession();
          }, usage.remaining * 1000);
        },
        onResult: (nextTranscript) => {
          setTranscript(nextTranscript);
        },
        onError: showLocalizedSpeechError,
        onEnd: finishListeningSession,
      },
      "name",
      language,
      {
        microphoneBlocked: text.speechMicBlocked,
        problem: text.speechProblem,
        browserFallback: text.speechBrowserFallback,
        noSpeech: text.speechNoMatch,
        limitReached: text.speechLimitReached,
        sessionExpired: text.speechSessionExpired,
        providerUnavailable: text.speechProviderUnavailable,
        networkError: text.speechNetworkError,
        busy: text.speechBusy,
      },
    );

    if (!recognizer) {
      setSpeechError(text.speechNameUnsupported);
      return;
    }

    recognizerRef.current = recognizer;
    try {
      setIsPreparingVoice(true);
      recognizer.start();
      recordInputMode("voice");
    } catch {
      listeningStartedAtRef.current = null;
      setIsPreparingVoice(false);
      setIsListening(false);
      setSpeechError(text.speechNameStartError);
    }
  }, [finishListeningSession, language, recordInputMode, refreshSttUsage, showLocalizedSpeechError, stopSpeech, text]);

  const startPinListening = useCallback(async () => {
    stopSpeech();
    setSpeechError("");

    const usage = await refreshSttUsage().catch(() => {
      setSpeechError(text.speechProblem);
      return null;
    });
    if (!usage) {
      return;
    }
    if (usage.remaining <= 0) {
      setSpeechError(text.speechLimitReached);
      return;
    }
    if (!spaceIsHeldRef.current) {
      return;
    }

    const recognizer = createSpeechRecognizer(
      {
        onReady: () => {
          setIsPreparingVoice(false);
          listeningStartedAtRef.current = Date.now();
          setIsListening(true);
          sttAutoStopTimerRef.current = window.setTimeout(() => {
            setSpeechError(text.speechLimitReached);
            recognizerRef.current?.stop();
            finishListeningSession();
          }, usage.remaining * 1000);
        },
        onResult: (nextTranscript) => {
          dispatch({ type: "PIN_REPLACE", value: nextTranscript });
        },
        onError: showLocalizedSpeechError,
        onEnd: finishListeningSession,
      },
      "pin",
      language,
      {
        microphoneBlocked: text.speechMicBlocked,
        problem: text.speechProblem,
        browserFallback: text.speechBrowserFallback,
        noSpeech: text.speechNoMatch,
        limitReached: text.speechLimitReached,
        sessionExpired: text.speechSessionExpired,
        providerUnavailable: text.speechProviderUnavailable,
        networkError: text.speechNetworkError,
        busy: text.speechBusy,
      },
    );

    if (!recognizer) {
      setSpeechError(text.speechPinUnsupported);
      return;
    }

    recognizerRef.current = recognizer;
    try {
      setIsPreparingVoice(true);
      recognizer.start();
      recordInputMode("voice");
    } catch {
      listeningStartedAtRef.current = null;
      setIsPreparingVoice(false);
      setIsListening(false);
      setSpeechError(text.speechPinStartError);
    }
  }, [finishListeningSession, language, recordInputMode, refreshSttUsage, showLocalizedSpeechError, stopSpeech, text]);

  const startAmountListening = useCallback(async () => {
    stopSpeech();
    setSpeechError("");
    const usage = await refreshSttUsage().catch(() => {
      setSpeechError(text.speechProblem);
      return null;
    });
    if (!usage || !spaceIsHeldRef.current) return;
    if (usage.remaining <= 0) {
      setSpeechError(text.speechLimitReached);
      return;
    }
    const recognizer = createSpeechRecognizer(
      {
        onReady: () => {
          setIsPreparingVoice(false);
          listeningStartedAtRef.current = Date.now();
          setIsListening(true);
        },
        onResult: (value) => dispatch({ type: "WITHDRAWAL_REPLACE", value }),
        onError: showLocalizedSpeechError,
        onEnd: finishListeningSession,
      },
      "amount",
      language,
      {
        microphoneBlocked: text.speechMicBlocked,
        problem: text.speechProblem,
        browserFallback: text.speechBrowserFallback,
        noSpeech: text.speechNoMatch,
        limitReached: text.speechLimitReached,
        sessionExpired: text.speechSessionExpired,
        providerUnavailable: text.speechProviderUnavailable,
        networkError: text.speechNetworkError,
        busy: text.speechBusy,
      },
    );
    if (!recognizer) {
      setSpeechError(text.speechPinUnsupported);
      return;
    }
    recognizerRef.current = recognizer;
    try {
      setIsPreparingVoice(true);
      recognizer.start();
      recordInputMode("voice");
    } catch {
      setIsPreparingVoice(false);
      setSpeechError(text.speechPinStartError);
      finishListeningSession();
    }
  }, [finishListeningSession, language, recordInputMode, refreshSttUsage, showLocalizedSpeechError, stopSpeech, text]);

  const startConfirmationListening = useCallback(async () => {
    if (confirmationSecondsRemaining > 0 || confirmationDecisionPending) {
      return;
    }
    stopSpeech();
    setSpeechError("");

    const usage = await refreshSttUsage().catch(() => {
      setSpeechError(text.speechProblem);
      return null;
    });
    if (!usage) return;
    if (usage.remaining <= 0) {
      setSpeechError(text.speechLimitReached);
      return;
    }
    if (!spaceIsHeldRef.current) return;

    const recognizer = createSpeechRecognizer(
      {
        onReady: () => {
          setIsPreparingVoice(false);
          listeningStartedAtRef.current = Date.now();
          setIsListening(true);
          sttAutoStopTimerRef.current = window.setTimeout(() => {
            setSpeechError(text.speechLimitReached);
            recognizerRef.current?.stop();
            finishListeningSession();
          }, usage.remaining * 1000);
        },
        onResult: (nextTranscript) => {
          const decision = parseSpokenConfirmation(nextTranscript, language);
          if (!decision) {
            setSpeechError(text.confirmUnclear);
            return;
          }
          completeNameConfirmation(decision === "confirm");
        },
        onError: showLocalizedSpeechError,
        onEnd: finishListeningSession,
      },
      "confirmation",
      language,
      {
        microphoneBlocked: text.speechMicBlocked,
        problem: text.speechProblem,
        browserFallback: text.speechBrowserFallback,
        noSpeech: text.speechNoMatch,
        limitReached: text.speechLimitReached,
        sessionExpired: text.speechSessionExpired,
        providerUnavailable: text.speechProviderUnavailable,
        networkError: text.speechNetworkError,
        busy: text.speechBusy,
      },
    );
    if (!recognizer) {
      setSpeechError(text.speechNameUnsupported);
      return;
    }

    recognizerRef.current = recognizer;
    try {
      setIsPreparingVoice(true);
      recognizer.start();
      recordInputMode("voice");
    } catch {
      setIsPreparingVoice(false);
      setSpeechError(text.speechNameStartError);
      finishListeningSession();
    }
  }, [
    completeNameConfirmation,
    confirmationDecisionPending,
    confirmationSecondsRemaining,
    finishListeningSession,
    language,
    recordInputMode,
    refreshSttUsage,
    showLocalizedSpeechError,
    stopSpeech,
    text,
  ]);

  const startWithdrawalConfirmationListening = useCallback(async () => {
    stopSpeech();
    setSpeechError("");
    const usage = await refreshSttUsage().catch(() => {
      setSpeechError(text.speechProblem);
      return null;
    });
    if (!usage || !spaceIsHeldRef.current) return;
    if (usage.remaining <= 0) {
      setSpeechError(text.speechLimitReached);
      return;
    }
    const recognizer = createSpeechRecognizer(
      {
        onReady: () => {
          setIsPreparingVoice(false);
          listeningStartedAtRef.current = Date.now();
          setIsListening(true);
        },
        onResult: (value) => {
          const decision = parseSpokenConfirmation(value, language);
          if (!decision) {
            setSpeechError(text.withdrawalConfirmUnclear);
            return;
          }
          completeWithdrawalConfirmation(decision === "confirm");
        },
        onError: showLocalizedSpeechError,
        onEnd: finishListeningSession,
      },
      "confirmation",
      language,
      {
        microphoneBlocked: text.speechMicBlocked,
        problem: text.speechProblem,
        browserFallback: text.speechBrowserFallback,
        noSpeech: text.speechNoMatch,
        limitReached: text.speechLimitReached,
        sessionExpired: text.speechSessionExpired,
        providerUnavailable: text.speechProviderUnavailable,
        networkError: text.speechNetworkError,
        busy: text.speechBusy,
      },
    );
    if (!recognizer) {
      setSpeechError(text.speechNameUnsupported);
      return;
    }
    recognizerRef.current = recognizer;
    setIsPreparingVoice(true);
    recognizer.start();
    recordInputMode("voice");
  }, [completeWithdrawalConfirmation, finishListeningSession, language, recordInputMode, refreshSttUsage, showLocalizedSpeechError, stopSpeech, text]);

  const startLetterListening = useCallback(async () => {
    stopSpeech();
    setSpeechError("");
    const usage = await refreshSttUsage().catch(() => {
      setSpeechError(text.speechProblem);
      return null;
    });
    if (!usage) return;
    if (usage.remaining <= 0) {
      setSpeechError(text.speechLimitReached);
      return;
    }
    if (!spaceIsHeldRef.current) return;

    const recognizer = createSpeechRecognizer(
      {
        onReady: () => {
          setIsPreparingVoice(false);
          listeningStartedAtRef.current = Date.now();
          setIsListening(true);
          sttAutoStopTimerRef.current = window.setTimeout(() => {
            setSpeechError(text.speechLimitReached);
            recognizerRef.current?.stop();
            finishListeningSession();
          }, usage.remaining * 1000);
        },
        onResult: (nextTranscript) => {
          const letters = cleanSpokenLetterTranscript(nextTranscript);
          if (letters.length !== 2) {
            setSpeechError(text.letterIncompleteError);
            return;
          }
          dispatch({ type: "LETTER_CLEAR" });
          Array.from(letters).forEach((letter) => dispatch({ type: "LETTER_INPUT", letter }));
        },
        onError: showLocalizedSpeechError,
        onEnd: finishListeningSession,
      },
      "letters",
      language,
      {
        microphoneBlocked: text.speechMicBlocked,
        problem: text.speechProblem,
        browserFallback: text.speechBrowserFallback,
        noSpeech: text.speechNoMatch,
        limitReached: text.speechLimitReached,
        sessionExpired: text.speechSessionExpired,
        providerUnavailable: text.speechProviderUnavailable,
        networkError: text.speechNetworkError,
        busy: text.speechBusy,
      },
    );
    if (!recognizer) {
      setSpeechError(text.voiceUnsupportedLetters);
      return;
    }
    recognizerRef.current = recognizer;
    try {
      setIsPreparingVoice(true);
      recognizer.start();
      recordInputMode("voice");
    } catch {
      setIsPreparingVoice(false);
      setSpeechError(text.speechProblem);
      finishListeningSession();
    }
  }, [finishListeningSession, language, recordInputMode, refreshSttUsage, showLocalizedSpeechError, stopSpeech, text]);

  const stopListening = useCallback(() => {
    if (stopListeningTimerRef.current) {
      window.clearTimeout(stopListeningTimerRef.current);
    }
    spaceIsHeldRef.current = false;
    stopListeningTimerRef.current = window.setTimeout(() => {
      recognizerRef.current?.stop();
      finishListeningSession();
      stopListeningTimerRef.current = null;
    }, 50);
  }, [finishListeningSession]);

  useEffect(() => {
    if (!["enter_name", "confirm_name", "pin_attempt", "letter_check", "withdrawal", "withdrawal_confirm"].includes(state.status) || !speechRecognitionSupported) {
      return;
    }

    const isTextInputTarget = (target: EventTarget | null) => {
      const element = target as HTMLElement | null;
      return Boolean(
        element?.closest("input, textarea, select") ||
          element?.isContentEditable,
      );
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code !== "Space" || event.repeat) {
        return;
      }
      if (isTextInputTarget(event.target)) {
        return;
      }
      event.preventDefault();
      if (document.activeElement instanceof HTMLButtonElement) {
        document.activeElement.blur();
      }
      stopSpeech();
      spaceIsHeldRef.current = true;
      if (!isListeningRef.current && !recognizerRef.current) {
        if (state.status === "enter_name") {
          void startNameListening();
        }
        if (state.status === "pin_attempt") {
          void startPinListening();
        }
        if (state.status === "confirm_name" && confirmationSecondsRemaining === 0) {
          void startConfirmationListening();
        }
        if (state.status === "letter_check") {
          void startLetterListening();
        }
        if (state.status === "withdrawal") {
          void startAmountListening();
        }
        if (state.status === "withdrawal_confirm") {
          void startWithdrawalConfirmationListening();
        }
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.code !== "Space" || isTextInputTarget(event.target)) {
        return;
      }
      event.preventDefault();
      spaceIsHeldRef.current = false;
      stopListening();
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [
    confirmationSecondsRemaining,
    speechRecognitionSupported,
    startConfirmationListening,
    startLetterListening,
    startNameListening,
    startPinListening,
    startAmountListening,
    startWithdrawalConfirmationListening,
    state.status,
    stopListening,
  ]);

  useEffect(() => {
    if (document.activeElement instanceof HTMLButtonElement) {
      document.activeElement.blur();
    }
  }, [state.status]);

  const emitNameInputEvent = (event: AtmNameInputEventPayload) => {
    setNameInputEvent({
      ...event,
      id: Date.now(),
    });
  };

  const keypadMode =
    state.status === "pin_attempt" || (state.status === "withdrawal" && state.errorMessage !== ATM_ERROR.insufficientFunds)
      ? "numeric"
      : state.status === "confirm_name" || state.status === "withdrawal_confirm" || state.status === "withdrawal_result"
        ? "confirm"
      : ["enter_name", "letter_check"].includes(state.status)
        ? "letters"
        : "none";

  const screen = (() => {
    switch (state.status) {
      case "welcome":
        return (
          <AtmWelcomeScreen
            labels={{
              eyebrow: text.welcomeEyebrow,
              title: text.welcomeTitle,
              body: text.welcomeBody,
              start: text.start,
              startAria: text.startAria,
            }}
            onStart={() => {
              stopSpeech();
              beginAnalyticsSession();
              latestStatusRef.current = "enter_name";
              dispatch({ type: "START" });
            }}
          />
        );

      case "enter_name":
        return (
          <AtmNameScreen
            errorMessage={displayedErrorMessage}
            transcript={transcript}
            speechError={speechError}
            isListening={isListening}
            isPreparingVoice={isPreparingVoice}
            isVoiceSupported={speechRecognitionSupported}
            inputEvent={nameInputEvent}
            labels={{
              title: text.enterNameTitle,
              voiceUnsupported: text.voiceUnsupportedName,
              listening: text.listening,
              preparing: text.preparingVoice,
              voiceButton: text.nameVoiceButton,
              heard: text.heardLabel,
              fullName: text.fullNameLabel,
              placeholder: text.fullNamePlaceholder,
              pressEnter: text.pressEnterName,
            }}
            onSubmit={(fullName) => dispatch({ type: "NAME_SUBMITTED", fullName })}
            onKeyboardInput={() => recordInputMode("keyboard")}
            onVoiceStart={() => {
              spaceIsHeldRef.current = true;
              void startNameListening();
            }}
            onVoiceStop={stopListening}
          />
        );

      case "confirm_name":
        return (
          <AtmConfirmNameScreen
            fullName={state.fullName}
            secondsRemaining={confirmationSecondsRemaining}
            isListening={isListening}
            isPreparingVoice={isPreparingVoice}
            isVoiceSupported={speechRecognitionSupported}
            isDecisionPending={confirmationDecisionPending}
            speechError={speechError}
            labels={{
              heard: text.heardLabel,
              hint: text.confirmNameHint,
              voice: text.confirmVoice,
              wait: text.confirmWait(confirmationSecondsRemaining),
              voiceHint: text.confirmVoiceHint,
              listening: text.listening,
              preparing: text.preparingVoice,
            }}
            onVoiceStart={() => {
              spaceIsHeldRef.current = true;
              void startConfirmationListening();
            }}
            onVoiceStop={stopListening}
          />
        );

      case "pin_attempt":
        return (
          <AtmPinScreen
            pinInput={state.currentPinInput}
            errorMessage={displayedErrorMessage}
            speechError={speechError}
            isListening={isListening}
            isPreparingVoice={isPreparingVoice}
            isVoiceSupported={speechRecognitionSupported}
            labels={{
              title: text.pinTitle,
              hint: text.pinHint,
              practiceHint: text.pinPracticeHint,
              passwordInput: text.passwordInput,
              pinAria: text.pinAria,
              voiceInput: text.voiceInput,
              voiceUnsupported: text.voiceUnsupportedPin,
              listening: text.listening,
              preparing: text.preparingVoice,
              voiceButton: text.pinVoiceButton,
              voiceHint: text.pinVoiceHint,
            }}
            onVoiceStart={() => {
              spaceIsHeldRef.current = true;
              void startPinListening();
            }}
            onVoiceStop={stopListening}
          />
        );

      case "letter_check":
        return (
          <AtmLetterCheckScreen
            letterInput={state.letterInput}
            errorMessage={displayedErrorMessage}
            speechError={speechError}
            isListening={isListening}
            isPreparingVoice={isPreparingVoice}
            isVoiceSupported={speechRecognitionSupported}
            labels={{
              title: text.letterTitle,
              hint: text.letterHint,
              lettersEntered: text.lettersEntered,
              lettersAria: text.lettersAria,
              voiceUnsupported: text.voiceUnsupportedLetters,
              voiceButton: text.letterVoiceButton,
              voiceHint: text.letterVoiceHint,
              listening: text.listening,
              preparing: text.preparingVoice,
            }}
            onVoiceStart={() => {
              spaceIsHeldRef.current = true;
              void startLetterListening();
            }}
            onVoiceStop={stopListening}
          />
        );
      case "security_message":
        return <div className="flex h-full flex-col justify-center"><p className="text-sm font-bold uppercase text-[#3730a3]">{text.securityCheckEyebrow}</p><h1 className="mt-2 text-2xl font-bold text-[#171452]">{text.securityWaitTitle}</h1><p className="mt-3 max-w-lg font-semibold leading-7 text-slate-700">{text.securityMessage}</p></div>;
      case "security_terminated":
        return <div className="flex h-full flex-col justify-center"><p className="text-sm font-bold uppercase text-rose-700">{text.securityNoticeEyebrow}</p><h1 className="mt-2 text-2xl font-bold text-slate-950">{text.securityTerminatedTitle}</h1><p className="mt-3 max-w-lg font-semibold leading-7 text-slate-700">{text.securityTerminatedBody}</p><p role="status" className="mt-5 w-fit rounded-lg bg-slate-900 px-5 py-3 font-bold text-white">{text.waitTime}: {state.lockoutSecondsRemaining} {text.seconds}</p></div>;

      case "lockout":
        return (
          <AtmLockoutScreen
            secondsRemaining={state.lockoutSecondsRemaining}
            labels={{
              title: text.lockoutTitle,
              hint: text.lockoutHint,
              waitTime: text.waitTime,
              seconds: text.seconds,
              tryAgain: text.tryAgain,
              tryAgainAria: text.tryAgainAria,
            }}
            onTryAgain={() => {
              stopSpeech();
              dispatch({ type: "TRY_AGAIN" });
            }}
          />
        );

      case "withdrawal":
        if (state.errorMessage === ATM_ERROR.insufficientFunds) {
          return (
            <AtmInsufficientFundsScreen
              attemptedAmount={state.withdrawnAmount}
              balance={state.accountBalance}
              labels={{
                title: text.insufficientFundsTitle,
                body: text.insufficientFundsError,
                attemptedAmount: text.attemptedAmount,
                availableBalance: text.availableBalance,
                returning: text.returningToWithdrawal,
              }}
            />
          );
        }
        return (
          <AtmWithdrawalScreen
            balance={state.accountBalance}
            amountInput={state.withdrawalInput}
            errorMessage={displayedErrorMessage}
            speechError={speechError}
            isListening={isListening}
            isPreparingVoice={isPreparingVoice}
            isVoiceSupported={speechRecognitionSupported}
            labels={{
              title: text.withdrawalTitle,
              availableBalance: text.availableBalance,
              chooseAmount: text.chooseAmount,
              customAmount: text.customAmount,
              amountPlaceholder: text.amountPlaceholder,
              pressEnter: text.withdrawalPressEnter,
              voiceButton: text.amountVoiceButton,
              voiceHint: text.amountVoiceHint,
              listening: text.listening,
              preparing: text.preparingVoice,
            }}
            onAmountChange={(value) => dispatch({ type: "WITHDRAWAL_REPLACE", value })}
            onPresetSelect={(amount) => {
              stopSpeech();
              dispatch({ type: "WITHDRAWAL_SELECT", amount });
            }}
            onVoiceStart={() => {
              spaceIsHeldRef.current = true;
              void startAmountListening();
            }}
            onVoiceStop={stopListening}
          />
        );

      case "withdrawal_confirm":
        return (
          <AtmWithdrawalConfirmScreen
            amount={state.withdrawnAmount}
            speechError={speechError}
            isListening={isListening}
            isPreparingVoice={isPreparingVoice}
            isVoiceSupported={speechRecognitionSupported}
            labels={{
              title: text.withdrawalConfirmTitle,
              question: text.withdrawalConfirmQuestion,
              hint: text.withdrawalConfirmHint,
              voiceButton: text.withdrawalConfirmVoiceButton,
              voiceHint: text.withdrawalConfirmVoiceHint,
              listening: text.listening,
              preparing: text.preparingVoice,
            }}
            onVoiceStart={() => {
              spaceIsHeldRef.current = true;
              void startWithdrawalConfirmationListening();
            }}
            onVoiceStop={stopListening}
          />
        );

      case "withdrawal_result":
        return (
          <AtmWithdrawalResultScreen
            withdrawnAmount={state.withdrawnAmount}
            remainingBalance={state.remainingBalance}
            labels={{
              title: text.withdrawalResultTitle,
              withdrawnAmount: text.withdrawnAmount,
              remainingBalance: text.remainingBalance,
              pressEnter: text.withdrawalResultPressEnter,
            }}
          />
        );

      case "success":
        return (
          <AtmSuccessScreen
            labels={{
              title: text.successTitle,
              body: text.successBody,
              finish: text.finish,
              finishAria: text.finishAria,
              tryAgain: text.tryAgain,
              tryAgainAria: text.tryAgainAria,
            }}
            onFinish={() => {
              stopSpeech();
              stopSuccessSound();
              navigate("/scenarios");
            }}
            onTryAgain={() => {
              stopSpeech();
              stopSuccessSound();
              setTranscript("");
              setSpeechError("");
              dispatch({ type: "RESET" });
            }}
          />
        );

      default:
        return null;
    }
  })();

  return (
    <AtmFrame
      labels={{
        panelTitle: text.panelTitle,
        practiceMode: text.practiceMode,
        warning: text.warning,
      }}
      soundControls={
        <SoundToggle
          isEnabled={soundEnabled}
          labels={{
            soundOn: text.soundOn,
            soundOff: text.soundOff,
            turnSoundOn: text.turnSoundOn,
            turnSoundOff: text.turnSoundOff,
          }}
          onToggle={toggleSound}
        />
      }
      keypadMode={keypadMode}
      onDigit={(digit) => {
        recordInputMode("keyboard");
        dispatch({ type: state.status === "withdrawal" ? "WITHDRAWAL_DIGIT" : "PIN_DIGIT", digit });
      }}
      onLetter={(letter) => {
        recordInputMode("keyboard");
        if (state.status === "enter_name") {
          emitNameInputEvent({ type: "letter", value: letter });
        }
        if (state.status === "letter_check" && letter.trim()) {
          dispatch({ type: "LETTER_INPUT", letter });
        }
      }}
      onClear={() => {
        if (state.status === "enter_name") {
          emitNameInputEvent({ type: "clear" });
        }
        if (state.status === "confirm_name") {
          completeNameConfirmation(false);
        }
        if (state.status === "pin_attempt") {
          dispatch({ type: "PIN_CLEAR" });
        }
        if (state.status === "letter_check") {
          dispatch({ type: "LETTER_CLEAR" });
        }
        if (state.status === "withdrawal") {
          dispatch({ type: "WITHDRAWAL_CLEAR" });
        }
        if (state.status === "withdrawal_confirm") {
          completeWithdrawalConfirmation(false);
        }
      }}
      onBackspace={() => {
        if (state.status === "enter_name") {
          emitNameInputEvent({ type: "backspace" });
        }
        if (state.status === "confirm_name") {
          completeNameConfirmation(false);
        }
        if (state.status === "pin_attempt") {
          dispatch({ type: "PIN_BACKSPACE" });
        }
        if (state.status === "letter_check") {
          dispatch({ type: "LETTER_BACKSPACE" });
        }
        if (state.status === "withdrawal") {
          dispatch({ type: "WITHDRAWAL_BACKSPACE" });
        }
        if (state.status === "withdrawal_confirm") {
          completeWithdrawalConfirmation(false);
        }
      }}
      onEnter={() => {
        if (state.status === "confirm_name") {
          completeNameConfirmation(true);
          return;
        }
        if (state.status === "withdrawal_confirm") {
          completeWithdrawalConfirmation(true);
          return;
        }
        stopSpeech();
        if (state.status === "enter_name") {
          emitNameInputEvent({ type: "submit" });
        }
        if (state.status === "pin_attempt") {
          if (state.currentPinInput.length === 4) {
            let pinOutcome: AtmPinOutcome = state.pinAttemptCount === 0 ? "simulated_system_error" : "incorrect";
            if (state.pinAttemptCount > 0 && state.currentPinInput === state.demoPin) {
              pinOutcome = "success";
            }
            enqueueAnalytics((sessionId) =>
              recordAtmAnalyticsEvent(sessionId, {
                client_event_id: crypto.randomUUID(),
                event_type: "pin_submission",
                pin_outcome: pinOutcome,
                final_step_reached: state.pinAttemptCount===0 ? "security_message" : !state.identityVerified ? "letter_check" : pinOutcome === "success" ? "withdrawal" : state.status,
              }),
            );
          }
          dispatch({ type: "PIN_SUBMIT" });
        }
        if (state.status === "letter_check") {
          if(state.letterInput.length===2){const expected=`${state.expectedSecondLetter}${state.expectedLastLetter}`.normalize("NFC").toLocaleLowerCase();const correct=state.letterInput.trim().normalize("NFC").toLocaleLowerCase()===expected;enqueueAnalytics(sessionId=>recordAtmAnalyticsEvent(sessionId,{client_event_id:crypto.randomUUID(),event_type:"identity_verification",verification_outcome:correct?"success":"failed",final_step_reached:correct?(state.pinWasCorrectBeforeVerification?"withdrawal":"pin_attempt"):(state.verificationAttemptCount+1>=3?"security_terminated":"letter_check")}));if(correct&&state.pinWasCorrectBeforeVerification===false)enqueueAnalytics(sessionId=>recordAtmAnalyticsEvent(sessionId,{client_event_id:crypto.randomUUID(),event_type:"returned_to_pin",final_step_reached:"pin_attempt"}));}
          dispatch({ type: "LETTER_SUBMIT" });
        }
        if (state.status === "withdrawal") {
          dispatch({ type: "WITHDRAWAL_SUBMIT" });
        }
        if (state.status === "withdrawal_result") {
          dispatch({ type: "WITHDRAWAL_RESULT_CONTINUE" });
        }
      }}
      onCancel={() => {
        if (state.status === "enter_name") {
          emitNameInputEvent({ type: "clear" });
        }
        if (state.status === "confirm_name") {
          completeNameConfirmation(false);
        }
        if (state.status === "pin_attempt") {
          dispatch({ type: "PIN_CLEAR" });
        }
        if (state.status === "letter_check") {
          dispatch({ type: "LETTER_CLEAR" });
        }
        if (state.status === "withdrawal") {
          dispatch({ type: "WITHDRAWAL_CLEAR" });
        }
        if (state.status === "withdrawal_confirm") {
          completeWithdrawalConfirmation(false);
        }
      }}
      assistantMessage={
        <AtmAssistantMessage
          message={assistantMessage}
          soundEnabled={soundEnabled}
          isSpeaking={isSpeaking}
          repeatLabel={text.repeatAssistant}
          stopLabel={text.stopVoice}
          ttsError={ttsError}
          onRepeat={speakCurrentMessage}
          onStop={stopSpeech}
        />
      }
    >
      {screen}
    </AtmFrame>
  );
}
