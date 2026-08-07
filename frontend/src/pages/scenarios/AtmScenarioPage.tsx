import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Mic } from "lucide-react";
import atmCardInsertSound from "../../assets/atm-card-insert.mp3";
import atmReceiptPrintSound from "../../assets/atm-receipt-print.mp3";
import atmCashDispenseSound from "../../assets/atm-cash-dispense.mp3";
import atmCardRemoveSound from "../../assets/atm-card-remove.mp3";

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
  AtmCashDispensingScreen,
  AtmCashCollectScreen,
  AtmCardReturnScreen,
  AtmReceiptPromptScreen,
  AtmWithdrawalConfirmScreen,
  AtmWithdrawalResultScreen,
  AtmWithdrawalScreen,
} from "../../components/atm/AtmWithdrawalScreen";
import { AtmWelcomeScreen } from "../../components/atm/AtmWelcomeScreen";
import { SoundToggle } from "../../components/atm/SoundToggle";
import { useAuth } from "../../context/AuthContext";
import { useTranslation } from "../../i18n";
import { ATM_ERROR, atmReducer, createInitialAtmState } from "../../lib/atmStateMachine";
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
  unlockAssistantAudioPlayback,
} from "../../services/speechSynthesisService";

const SOUND_STORAGE_KEY = "assist_ai_sound_enabled";
const LAST_BALANCE_STORAGE_KEY = "assist_ai_atm_last_balance";

function createNewAtmSessionState() {
  const storedBalance = Number(sessionStorage.getItem(LAST_BALANCE_STORAGE_KEY));
  const previousBalance = Number.isFinite(storedBalance) && storedBalance >= 500
    ? storedBalance
    : undefined;
  const nextState = createInitialAtmState(previousBalance);
  sessionStorage.setItem(LAST_BALANCE_STORAGE_KEY, String(nextState.accountBalance));
  return nextState;
}
const receiptPrintAudio = new Audio(atmReceiptPrintSound);
receiptPrintAudio.preload = "auto";

function getReceiptPrintDurationMs() {
  if (Number.isFinite(receiptPrintAudio.duration) && receiptPrintAudio.duration > 0) {
    return Promise.resolve(Math.ceil(receiptPrintAudio.duration * 1000));
  }
  return new Promise<number>((resolve) => {
    const finish = () => resolve(
      Number.isFinite(receiptPrintAudio.duration) && receiptPrintAudio.duration > 0
        ? Math.ceil(receiptPrintAudio.duration * 1000)
        : 4000,
    );
    receiptPrintAudio.addEventListener("loadedmetadata", finish, { once: true });
    receiptPrintAudio.addEventListener("error", finish, { once: true });
    receiptPrintAudio.load();
  });
}

function playReceiptPrintSound() {
  receiptPrintAudio.pause();
  receiptPrintAudio.currentTime = 0;
  receiptPrintAudio.volume = 0.7;
  void receiptPrintAudio.play().catch(() => undefined);
}

const cashDispenseAudio = new Audio(atmCashDispenseSound);
cashDispenseAudio.preload = "auto";

function getCashDispenseDurationMs() {
  if (Number.isFinite(cashDispenseAudio.duration) && cashDispenseAudio.duration > 0) {
    return Promise.resolve(Math.ceil(cashDispenseAudio.duration * 1000));
  }
  return new Promise<number>((resolve) => {
    const finish = () => resolve(
      Number.isFinite(cashDispenseAudio.duration) && cashDispenseAudio.duration > 0
        ? Math.ceil(cashDispenseAudio.duration * 1000)
        : 5000,
    );
    cashDispenseAudio.addEventListener("loadedmetadata", finish, { once: true });
    cashDispenseAudio.addEventListener("error", finish, { once: true });
    cashDispenseAudio.load();
  });
}

function playCashDispenseSound() {
  cashDispenseAudio.pause();
  cashDispenseAudio.currentTime = 0;
  cashDispenseAudio.volume = 0.7;
  void cashDispenseAudio.play().catch(() => undefined);
}

const cardRemoveAudio = new Audio(atmCardRemoveSound);
cardRemoveAudio.preload = "auto";

function playCardRemoveSound() {
  cardRemoveAudio.pause();
  cardRemoveAudio.currentTime = 0;
  cardRemoveAudio.volume = 0.7;
  void cardRemoveAudio.play().catch(() => undefined);
}

function stopCardRemoveSound() {
  cardRemoveAudio.pause();
  cardRemoveAudio.currentTime = 0;
}

function playCardInsertSound() {
  const audio = new Audio(atmCardInsertSound);
  audio.volume = 0.7;
  return new Promise<void>((resolve) => {
    let finished = false;
    let trimTimer: number | null = null;
    const finish = () => {
      if (finished) return;
      finished = true;
      if (trimTimer !== null) window.clearTimeout(trimTimer);
      audio.pause();
      resolve();
    };
    audio.addEventListener("loadedmetadata", () => {
      const shortenedDurationMs = Math.max(0, audio.duration - 1) * 1000;
      trimTimer = window.setTimeout(finish, shortenedDurationMs);
    }, { once: true });
    audio.addEventListener("ended", finish, { once: true });
    audio.addEventListener("error", finish, { once: true });
    void audio.play().catch(finish);
  });
}

function getRemainingAttempts(errorMessage: string) {
  const attempts = Number(errorMessage.split(":")[1]);
  return Number.isFinite(attempts) ? Math.max(0, attempts) : 0;
}

export function AtmScenarioPage() {
  const navigate = useNavigate();
  const { token, guestSessionToken } = useAuth();
  const { language } = useTranslation();
  const text = atmTranslations[language];
  const [state, dispatch] = useReducer(atmReducer, undefined, createNewAtmSessionState);
  const [soundEnabled, setSoundEnabled] = useState(() => {
    const storedValue = localStorage.getItem(SOUND_STORAGE_KEY);
    return storedValue === null ? true : storedValue === "true";
  });
  const [cardInserted, setCardInserted] = useState(false);
  const [cardInsertionComplete, setCardInsertionComplete] = useState(false);
  const [entryPin, setEntryPin] = useState("");
  const [entryPinError, setEntryPinError] = useState<"" | "incomplete" | "incorrect">("");
  const [entryPinAttempts, setEntryPinAttempts] = useState(0);
  const [pinSessionEnded, setPinSessionEnded] = useState(false);
  const [securityCardCollected, setSecurityCardCollected] = useState(false);
  const [pinVerified, setPinVerified] = useState(false);
  const [showAccountInformation, setShowAccountInformation] = useState(false);
  const setupPinRef = useRef(sessionStorage.getItem("assist_ai_atm_pin") ?? "");
  const setupNameRef = useRef(sessionStorage.getItem("assist_ai_atm_name") ?? "");
  const formatCurrencyAmount = useCallback((amount: number) => {
    const localeByLanguage = { en: "en-IE", es: "es-ES", de: "de-DE", tr: "tr-TR", pt: "pt-PT", fr: "fr-FR" } as const;
    return new Intl.NumberFormat(localeByLanguage[language], {
      style: "currency",
      currency: language === "tr" ? "TRY" : "EUR",
      maximumFractionDigits: 0,
    }).format(amount);
  }, [language]);
  const formattedAccountBalance = useMemo(
    () => formatCurrencyAmount(state.accountBalance),
    [formatCurrencyAmount, state.accountBalance],
  );
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
  const [isInsufficientFundsFading, setIsInsufficientFundsFading] = useState(false);
  const [receiptAnimating, setReceiptAnimating] = useState(false);
  const [receiptAnimationDurationMs, setReceiptAnimationDurationMs] = useState(4000);
  const [cashAnimating, setCashAnimating] = useState(false);
  const [cashAnimationDurationMs, setCashAnimationDurationMs] = useState(5000);
  const [cardEjecting, setCardEjecting] = useState(false);
  const [cardCollectible, setCardCollectible] = useState(false);
  const [leaveFromMenu, setLeaveFromMenu] = useState(false);
  const recognizerRef = useRef<ReturnType<typeof createSpeechRecognizer> | null>(null);
  const sttUsageRef = useRef<SttUsage | null>(null);
  const listeningStartedAtRef = useRef<number | null>(null);
  const successSoundPlayedRef = useRef(false);
  const isListeningRef = useRef(false);
  const spaceIsHeldRef = useRef(false);
  const stopListeningTimerRef = useRef<number | null>(null);
  const sttAutoStopTimerRef = useRef<number | null>(null);
  const insufficientFundsFadeTimerRef = useRef<number | null>(null);
  const cashDispenseStartedRef = useRef(false);
  const cardEjectionStartedRef = useRef(false);
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

  const finishInsufficientFundsWarning = useCallback(() => {
    if (insufficientFundsFadeTimerRef.current !== null) return;
    setIsInsufficientFundsFading(true);
    insufficientFundsFadeTimerRef.current = window.setTimeout(() => {
      insufficientFundsFadeTimerRef.current = null;
      dispatch({ type: "WITHDRAWAL_WARNING_COMPLETE" });
    }, 500);
  }, []);

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
    if (pinSessionEnded) return securityCardCollected ? text.pinSecurityCardTaken : text.pinSecurityEndedAssistant;
    if (state.status === "welcome" && !cardInsertionComplete) {
      return text.cardInsertPrompt;
    }
    if (state.status === "welcome" && cardInsertionComplete && !pinVerified) {
      if (entryPinError === "incorrect") return text.cardPinIncorrectAttempts(Math.max(0, 3 - entryPinAttempts));
      if (entryPinError === "incomplete") return text.cardPinIncomplete;
      return text.cardPinPrompt;
    }
    if (state.status === "welcome" && pinVerified) {
      if (showAccountInformation) {
        return text.accountInformationAssistant(setupNameRef.current, formattedAccountBalance);
      }
      return text.accountMenuAssistant(setupNameRef.current);
    }
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
        ? text.insufficientFundsAssistant(formatCurrencyAmount(state.accountBalance))
        : text.withdrawalAssistant(formatCurrencyAmount(state.accountBalance));
    }
    if (state.status === "withdrawal_confirm") {
      return text.withdrawalConfirmAssistant(formatCurrencyAmount(state.withdrawnAmount));
    }
    if (state.status === "receipt_prompt") return text.receiptAssistant;
    if (state.status === "cash_dispensing") return text.cashDispensingAssistant;
    if (state.status === "cash_collect") return text.cashCollectAssistant;
    if (state.status === "card_return") return text.cardReturnAssistant;
    if (state.status === "withdrawal_result") {
      return text.withdrawalResultAssistant(
        formatCurrencyAmount(state.withdrawnAmount),
        formatCurrencyAmount(state.remainingBalance),
      );
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
    cardInserted,
    cardInsertionComplete,
    entryPinError,
    entryPinAttempts,
    pinVerified,
    formattedAccountBalance,
    formatCurrencyAmount,
    showAccountInformation,
    pinSessionEnded,
    securityCardCollected,
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

  const startCashDispensing = useCallback(() => {
    if (cashDispenseStartedRef.current) return;
    cashDispenseStartedRef.current = true;
    void getCashDispenseDurationMs().then((durationMs) => {
      setCashAnimationDurationMs(durationMs);
      if (soundEnabled) playCashDispenseSound();
      setCashAnimating(true);
      window.setTimeout(() => {
        dispatch({ type: "CASH_DISPENSE_COMPLETE" });
      }, durationMs + 500);
    });
  }, [soundEnabled]);

  const startCardEjection = useCallback(() => {
    if (cardEjectionStartedRef.current) return;
    cardEjectionStartedRef.current = true;
    if (soundEnabled) playCardRemoveSound();
    setCardEjecting(true);
    window.setTimeout(() => setCardCollectible(true), 1400);
  }, [soundEnabled]);

  const speakCurrentMessage = useCallback(() => {
    if (!soundEnabled) {
      return;
    }
    setTtsError("");
    speakAssistantMessage(spokenAssistantMessage, {
      onStart: () => {
        setIsSpeaking(true);
        if (state.status === "cash_dispensing") startCashDispensing();
        if (state.status === "card_return") startCardEjection();
        if (pinSessionEnded && !securityCardCollected) startCardEjection();
      },
      onEnd: () => {
        setIsSpeaking(false);
        if (state.status === "withdrawal" && state.errorMessage === ATM_ERROR.insufficientFunds) {
          finishInsufficientFundsWarning();
        }
        if (latestStatusRef.current === "security_message") {
          dispatch({ type: "SHOW_VERIFICATION" });
        }
      },
      onError: () => {
        setIsSpeaking(false);
        setTtsError(text.assistantVoiceProblem);
        if (latestStatusRef.current === "cash_dispensing") startCashDispensing();
        if (latestStatusRef.current === "card_return") startCardEjection();
        if (pinSessionEnded && !securityCardCollected) startCardEjection();
      },
    }, language);
  }, [finishInsufficientFundsWarning, language, pinSessionEnded, securityCardCollected, soundEnabled, spokenAssistantMessage, startCardEjection, startCashDispensing, state.errorMessage, state.status, text.assistantVoiceProblem]);

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

  const completeTransactionChoice = useCallback((anotherTransaction: boolean) => {
    setSpeechError("");
    stopSpeech();
    setShowAccountInformation(false);
    dispatch({ type: anotherTransaction ? "ANOTHER_TRANSACTION" : "FINISH_TRANSACTION" });
  }, [stopSpeech]);

  const completeReceiptChoice = useCallback((wantsReceipt: boolean) => {
    if (receiptAnimating) return;
    setSpeechError("");
    stopSpeech();
    if (!wantsReceipt) {
      dispatch({ type: "RECEIPT_DECLINE" });
      return;
    }
    void getReceiptPrintDurationMs().then((durationMs) => {
      setReceiptAnimationDurationMs(durationMs);
      if (soundEnabled) playReceiptPrintSound();
      setReceiptAnimating(true);
      window.setTimeout(() => {
        setReceiptAnimating(false);
        dispatch({ type: "RECEIPT_ACCEPT" });
      }, durationMs + 500);
    });
  }, [receiptAnimating, stopSpeech]);

  useEffect(() => {
    if (state.status === "cash_collect") return;
    if (state.status !== "cash_dispensing") {
      cashDispenseStartedRef.current = false;
      setCashAnimating(false);
      return;
    }
    if (!soundEnabled) startCashDispensing();
  }, [soundEnabled, startCashDispensing, state.status]);

  useEffect(() => {
    const cardReturnActive = state.status === "card_return" || (pinSessionEnded && !securityCardCollected);
    if (!cardReturnActive) {
      cardEjectionStartedRef.current = false;
      setCardEjecting(false);
      setCardCollectible(false);
      return;
    }
    if (!soundEnabled) startCardEjection();
  }, [pinSessionEnded, securityCardCollected, soundEnabled, startCardEjection, state.status]);

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
    const showingWarning = state.status === "withdrawal" && state.errorMessage === ATM_ERROR.insufficientFunds;
    if (!showingWarning) {
      setIsInsufficientFundsFading(false);
      if (insufficientFundsFadeTimerRef.current !== null) {
        window.clearTimeout(insufficientFundsFadeTimerRef.current);
        insufficientFundsFadeTimerRef.current = null;
      }
      return;
    }
    setIsInsufficientFundsFading(false);
    if (soundEnabled) return;
    const timer = window.setTimeout(finishInsufficientFundsWarning, 3000);
    return () => window.clearTimeout(timer);
  }, [finishInsufficientFundsWarning, soundEnabled, state.errorMessage, state.status]);

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
    const currentSpeechStatus = `${state.status}:${cardInsertionComplete}:${pinVerified}:${entryPinError}:${entryPinAttempts}:${showAccountInformation}:${pinSessionEnded}:${securityCardCollected}`;
    const screenChanged = previous.status !== currentSpeechStatus;
    const languageChanged = previous.language !== language;
    const newErrorAppeared = Boolean(state.errorMessage) && (
      previous.errorMessage !== state.errorMessage ||
      previous.assistantMessage !== assistantMessage
    );

    lastAutoSpeechRef.current = {
      status: currentSpeechStatus,
      language,
      errorMessage: state.errorMessage,
      assistantMessage,
    };

    if (screenChanged || languageChanged || newErrorAppeared) {
      speakCurrentMessage();
    }
  }, [
    assistantMessage,
    cardInserted,
    cardInsertionComplete,
    entryPinError,
    entryPinAttempts,
    language,
    soundEnabled,
    pinVerified,
    showAccountInformation,
    pinSessionEnded,
    securityCardCollected,
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
          if (state.status === "welcome" && cardInsertionComplete && !pinVerified) {
            setEntryPin(nextTranscript.replace(/\D/g, "").slice(0, 4));
            setEntryPinError("");
          } else {
            dispatch({ type: "PIN_REPLACE", value: nextTranscript });
          }
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
  }, [cardInsertionComplete, finishListeningSession, language, pinVerified, recordInputMode, refreshSttUsage, showLocalizedSpeechError, state.status, stopSpeech, text]);

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
            setSpeechError(
              state.status === "withdrawal_result"
                ? text.anotherTransactionUnclear
                : text.withdrawalConfirmUnclear,
            );
            return;
          }
          if (state.status === "withdrawal_result") {
            completeTransactionChoice(decision === "confirm");
          } else if (state.status === "receipt_prompt") {
            completeReceiptChoice(decision === "confirm");
          } else {
            completeWithdrawalConfirmation(decision === "confirm");
          }
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
  }, [completeReceiptChoice, completeTransactionChoice, completeWithdrawalConfirmation, finishListeningSession, language, recordInputMode, refreshSttUsage, showLocalizedSpeechError, state.status, stopSpeech, text]);

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
    if (!["confirm_name", "letter_check", "withdrawal", "withdrawal_confirm", "withdrawal_result"].includes(state.status) || !speechRecognitionSupported) {
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
        if (state.status === "confirm_name" && confirmationSecondsRemaining === 0) {
          void startConfirmationListening();
        }
        if (state.status === "letter_check") {
          void startLetterListening();
        }
        if (state.status === "withdrawal") {
          void startAmountListening();
        }
        if (state.status === "withdrawal_confirm" || state.status === "withdrawal_result") {
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
    startAmountListening,
    startWithdrawalConfirmationListening,
    state.status,
    stopListening,
  ]);

  useEffect(() => {
    const handleNumberKey = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.altKey || event.metaKey) return;
      const element = event.target as HTMLElement | null;
      if (element?.closest("input, textarea, select") || element?.isContentEditable) return;

      const enteringInitialPin = !pinSessionEnded && state.status === "welcome" && cardInsertionComplete && !pinVerified;
      const enteringScenarioPin = state.status === "pin_attempt";
      const enteringAmount = state.status === "withdrawal" && state.errorMessage !== ATM_ERROR.insufficientFunds;
      if (!enteringInitialPin && !enteringScenarioPin && !enteringAmount) return;
      const isDigit = /^\d$/.test(event.key);
      const isBackspace = event.key === "Backspace";
      const isDelete = event.key === "Delete";
      if (!isDigit && !isBackspace && !isDelete) return;

      event.preventDefault();
      recordInputMode("keyboard");
      if (enteringInitialPin) {
        setEntryPin((current) => isDelete ? "" : isBackspace ? current.slice(0, -1) : `${current}${event.key}`.slice(0, 4));
        setEntryPinError("");
      } else if (enteringAmount) {
        dispatch(isDelete
          ? { type: "WITHDRAWAL_CLEAR" }
          : isBackspace
            ? { type: "WITHDRAWAL_BACKSPACE" }
            : { type: "WITHDRAWAL_DIGIT", digit: event.key });
      } else {
        dispatch(isDelete
          ? { type: "PIN_CLEAR" }
          : isBackspace
            ? { type: "PIN_BACKSPACE" }
            : { type: "PIN_DIGIT", digit: event.key });
      }
    };

    window.addEventListener("keydown", handleNumberKey);
    return () => window.removeEventListener("keydown", handleNumberKey);
  }, [cardInsertionComplete, pinSessionEnded, pinVerified, recordInputMode, state.errorMessage, state.status]);

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
    (!pinSessionEnded && state.status === "welcome" && cardInsertionComplete && !pinVerified) || state.status === "pin_attempt" || (state.status === "withdrawal" && state.errorMessage !== ATM_ERROR.insufficientFunds)
      ? "numeric"
      : state.status === "confirm_name" || state.status === "withdrawal_confirm" || state.status === "receipt_prompt" || state.status === "withdrawal_result" || (state.status === "welcome" && pinVerified && showAccountInformation)
        ? "confirm"
      : ["enter_name", "letter_check"].includes(state.status)
        ? "letters"
        : "none";

  const screen = (() => {
    if (pinSessionEnded) {
      return (
        <div className="flex h-full flex-col items-center justify-center text-center">
          <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-rose-100 text-3xl text-rose-700" aria-hidden="true">!</div>
          <p className="text-xs font-bold uppercase tracking-wide text-rose-700">{text.pinSecurityEndedTitle}</p>
          <h1 className="mt-2 max-w-xl text-2xl font-bold text-slate-950">
            {securityCardCollected ? text.pinSecurityCardTaken : text.pinSecurityEndedMessage}
          </h1>
          {securityCardCollected && (
            <button
              type="button"
              onClick={() => {
                stopSpeech();
                sessionStorage.removeItem("assist_ai_atm_name");
                sessionStorage.removeItem("assist_ai_atm_pin");
                navigate("/scenario/atm-withdrawal/setup");
              }}
              className="mt-6 min-h-12 rounded-lg bg-[#302992] px-6 py-3 font-bold text-white hover:bg-[#211c72] focus:outline-none focus:ring-2 focus:ring-cyan-400"
            >
              {text.leaveAtm}
            </button>
          )}
        </div>
      );
    }
    if (state.status === "welcome" && cardInsertionComplete && !pinVerified) {
      const pinError = entryPinError === "incorrect"
        ? text.cardPinIncorrectAttempts(Math.max(0, 3 - entryPinAttempts))
        : entryPinError === "incomplete"
          ? text.cardPinIncomplete
          : "";
      return (
        <div className="flex h-full flex-col justify-center">
          <p className="text-xs font-bold uppercase tracking-wide text-[#3730a3]">PIN</p>
          <h1 className="mt-2 text-2xl font-bold text-slate-950">{text.cardPinPrompt}</h1>
          <div aria-label="PIN entered" className="mt-5 flex min-h-14 items-center rounded-lg border border-slate-300 bg-white px-4 text-2xl font-bold tracking-[0.6em] text-slate-950">
            {entryPin ? "•".repeat(entryPin.length) : "----"}
          </div>
          <p className="mt-3 text-sm font-semibold text-slate-600">{text.cardPinContinue}</p>
          {speechRecognitionSupported && (
            <button
              type="button"
              aria-label={text.cardPinVoiceButton}
              onPointerDown={(event) => {
                event.preventDefault();
                event.currentTarget.setPointerCapture(event.pointerId);
                spaceIsHeldRef.current = true;
                void startPinListening();
              }}
              onPointerUp={stopListening}
              onPointerCancel={stopListening}
              onPointerLeave={stopListening}
              className="mt-3 inline-flex min-h-11 w-fit items-center justify-center gap-2 rounded-lg bg-[#302992] px-4 py-2 text-sm font-bold text-white hover:bg-[#211c72] focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2"
            >
              <Mic className="h-4 w-4" aria-hidden="true" />
              {isPreparingVoice ? text.preparingVoice : isListening ? text.listening : text.cardPinVoiceButton}
            </button>
          )}
          {speechError && <p className="mt-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm font-bold text-amber-900">{speechError}</p>}
          {pinError && <p role="alert" className="mt-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm font-bold text-amber-900">{pinError}</p>}
        </div>
      );
    }
    if (state.status === "welcome" && pinVerified && showAccountInformation) {
      return (
        <div className="flex h-full flex-col justify-center">
          <p className="text-xs font-bold uppercase tracking-wide text-[#3730a3]">{text.checkBalance}</p>
          <h1 className="mt-2 text-2xl font-bold text-slate-950">{text.checkBalance}</h1>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{text.accountHolder}</p>
              <p className="mt-2 text-lg font-bold text-[#1d1a5e]">{setupNameRef.current}</p>
            </div>
            <div className="rounded-xl border border-cyan-200 bg-cyan-50 p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{text.availableBalance}</p>
              <p className="mt-2 text-2xl font-bold text-[#087f8c]">{formattedAccountBalance}</p>
            </div>
          </div>
          <button type="button" onClick={() => { stopSpeech(); setShowAccountInformation(false); }} className="mt-4 min-h-11 w-fit rounded-lg border border-[#302992] bg-white px-5 py-2 font-bold text-[#302992] hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-cyan-400">
            {text.backToMenu}
          </button>
        </div>
      );
    }
    if (state.status === "welcome" && pinVerified) {
      const disabledButtonClass = "relative min-h-14 rounded-xl border border-slate-200 bg-slate-100 px-4 py-3 text-left font-bold text-slate-400";
      return (
        <div className="flex h-full flex-col justify-center">
          <p className="text-xs font-bold uppercase tracking-wide text-[#3730a3]">ATM</p>
          <h1 className="mt-2 text-2xl font-bold text-slate-950">{text.welcomeUser(setupNameRef.current)}</h1>
          <p className="mt-2 text-sm font-semibold text-slate-600">{text.accountMenuTitle}</p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <button type="button" onClick={() => { stopSpeech(); beginAnalyticsSession(); dispatch({ type: "START_WITHDRAWAL" }); }} className="min-h-14 rounded-xl bg-[#302992] px-4 py-3 font-bold text-white hover:bg-[#211c72] focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2">
              {text.withdrawMoney}
            </button>
            <button type="button" disabled className={disabledButtonClass}>
              <span className="block">{text.depositMoney}</span>
              <span className="mt-1 block text-[10px] uppercase tracking-wide">{text.unavailableForNow}</span>
            </button>
            <button type="button" onClick={() => { stopSpeech(); setShowAccountInformation(true); }} className="min-h-14 rounded-xl bg-[#302992] px-4 py-3 font-bold text-white hover:bg-[#211c72] focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2">
              {text.checkBalance}
            </button>
            <button
              type="button"
              onClick={() => {
                stopSpeech();
                setShowAccountInformation(false);
                setLeaveFromMenu(true);
                dispatch({ type: "LEAVE_ATM" });
              }}
              className="min-h-14 rounded-xl bg-[#302992] px-4 py-3 font-bold text-white hover:bg-[#211c72] focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2"
            >
              {text.leaveAtmMenu}
            </button>
          </div>
        </div>
      );
    }
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
              cardPrompt: text.cardInsertPrompt,
            }}
            cardInserted={cardInsertionComplete}
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
              isFading={isInsufficientFundsFading}
              formatAmount={formatCurrencyAmount}
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
            formatAmount={formatCurrencyAmount}
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
            formatAmount={formatCurrencyAmount}
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
            formatAmount={formatCurrencyAmount}
            speechError={speechError}
            isListening={isListening}
            isPreparingVoice={isPreparingVoice}
            isVoiceSupported={speechRecognitionSupported}
            labels={{
              title: text.withdrawalResultTitle,
              withdrawnAmount: text.withdrawnAmount,
              remainingBalance: text.remainingBalance,
              pressEnter: text.withdrawalResultPressEnter,
              question: text.anotherTransactionQuestion,
              anotherTransaction: text.anotherTransactionButton,
              finish: text.finishTransactionButton,
              voiceButton: text.anotherTransactionVoiceButton,
              listening: text.listening,
              preparing: text.preparingVoice,
            }}
            onAnotherTransaction={() => completeTransactionChoice(true)}
            onFinish={() => completeTransactionChoice(false)}
            onVoiceStart={() => {
              spaceIsHeldRef.current = true;
              void startWithdrawalConfirmationListening();
            }}
            onVoiceStop={stopListening}
          />
        );

      case "card_return":
        return <AtmCardReturnScreen title={text.cardReturnTitle} message={text.cardReturnMessage} />;

      case "receipt_prompt":
        return (
          <AtmReceiptPromptScreen
            isPrinting={receiptAnimating}
            labels={{
              title: text.receiptTitle,
              question: text.receiptQuestion,
              printing: text.receiptPrinting,
              printReceipt: text.receiptPrintButton,
              skipReceipt: text.receiptSkipButton,
            }}
            onPrintReceipt={() => completeReceiptChoice(true)}
            onSkipReceipt={() => completeReceiptChoice(false)}
          />
        );

      case "cash_dispensing":
        return (
          <AtmCashDispensingScreen
            title={text.cashDispensingTitle}
            message={text.cashDispensingMessage}
          />
        );

      case "cash_collect":
        return (
          <AtmCashCollectScreen
            title={text.cashCollectTitle}
            message={text.cashCollectMessage}
            hint={text.cashCollectHint}
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
              sessionStorage.removeItem("assist_ai_atm_name");
              sessionStorage.removeItem("assist_ai_atm_pin");
              navigate("/scenario/atm-withdrawal/setup");
            }}
          />
        );

      default:
        return null;
    }
  })();

  return (
    <div onPointerDownCapture={unlockAssistantAudioPlayback}>
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
      cardInserted={cardInserted}
      cardAnimating={cardInserted && !cardInsertionComplete}
      receiptAnimating={receiptAnimating}
      receiptAnimationDurationMs={receiptAnimationDurationMs}
      cashAnimating={cashAnimating}
      cashAnimationDurationMs={cashAnimationDurationMs}
      cashCollectible={state.status === "cash_collect"}
      onCashCollect={() => {
        if (state.status !== "cash_collect") return;
        stopSpeech();
        setCashAnimating(false);
        dispatch({ type: "CASH_COLLECTED" });
      }}
      cardEjecting={cardEjecting}
      cardCollectible={cardCollectible}
      onCardCollect={() => {
        if (!cardCollectible) return;
        stopSpeech();
        stopCardRemoveSound();
        setCardEjecting(false);
        setCardCollectible(false);
        if (pinSessionEnded) {
          setSecurityCardCollected(true);
        } else if (state.status === "card_return") {
          if (leaveFromMenu) {
            setLeaveFromMenu(false);
            navigate("/scenarios");
          } else {
            dispatch({ type: "CARD_COLLECTED" });
          }
        }
      }}
      onCardInsert={() => {
        setEntryPin("");
        setEntryPinError("");
        setEntryPinAttempts(0);
        setPinSessionEnded(false);
        setSecurityCardCollected(false);
        setCardInsertionComplete(false);
        setCardInserted(true);
        const animationFinished = new Promise<void>((resolve) => window.setTimeout(resolve, 1400));
        const soundFinished = soundEnabled ? playCardInsertSound() : Promise.resolve();
        void Promise.all([animationFinished, soundFinished]).then(() => setCardInsertionComplete(true));
      }}
      onDigit={(digit) => {
        if (!pinSessionEnded && state.status === "welcome" && cardInsertionComplete && !pinVerified) {
          setEntryPin((current) => `${current}${digit}`.slice(0, 4));
          setEntryPinError("");
          return;
        }
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
        if (!pinSessionEnded && state.status === "welcome" && cardInsertionComplete && !pinVerified) {
          setEntryPin("");
          setEntryPinError("");
          return;
        }
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
        if (state.status === "receipt_prompt") completeReceiptChoice(false);
      }}
      onBackspace={() => {
        if (state.status === "welcome" && pinVerified && showAccountInformation) {
          stopSpeech();
          setShowAccountInformation(false);
          return;
        }
        if (state.status === "welcome" && cardInsertionComplete && !pinVerified) {
          setEntryPin((current) => current.slice(0, -1));
          setEntryPinError("");
          return;
        }
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
        if (state.status === "receipt_prompt") completeReceiptChoice(false);
      }}
      onEnter={() => {
        if (state.status === "welcome" && cardInsertionComplete && !pinVerified) {
          stopSpeech();
          if (entryPin.length !== 4) {
            setEntryPinError("incomplete");
            return;
          }
          if (entryPin !== setupPinRef.current) {
            const nextAttempts = entryPinAttempts + 1;
            setEntryPin("");
            setEntryPinAttempts(nextAttempts);
            if (nextAttempts >= 3) {
              setEntryPinError("");
              setPinSessionEnded(true);
            } else {
              setEntryPinError("incorrect");
            }
            return;
          }
          setEntryPinError("");
          setPinVerified(true);
          return;
        }
        if (state.status === "confirm_name") {
          completeNameConfirmation(true);
          return;
        }
        if (state.status === "withdrawal_confirm") {
          completeWithdrawalConfirmation(true);
          return;
        }
        if (state.status === "receipt_prompt") {
          completeReceiptChoice(true);
          return;
        }
        if (state.status === "cash_collect") {
          stopSpeech();
          setCashAnimating(false);
          dispatch({ type: "CASH_COLLECTED" });
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
        if (state.status === "receipt_prompt") completeReceiptChoice(false);
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
    </div>
  );
}
