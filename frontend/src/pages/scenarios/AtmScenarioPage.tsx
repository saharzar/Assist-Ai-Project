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
import { AtmWelcomeScreen } from "../../components/atm/AtmWelcomeScreen";
import { SoundToggle } from "../../components/atm/SoundToggle";
import { useAuth } from "../../context/AuthContext";
import { useTranslation } from "../../i18n";
import { atmReducer, initialAtmState } from "../../lib/atmStateMachine";
import { atmTranslations } from "../../lib/atmTranslations";
import {
  abandonAtmAnalyticsSession,
  completeAtmAnalyticsSession,
  recordAtmAnalyticsEvent,
  startAtmAnalyticsSession,
  type AtmInputMode,
  type AtmPinOutcome,
} from "../../services/atmAnalyticsService";
import {
  createSpeechRecognizer,
  isSpeechRecognitionSupported,
} from "../../services/speechRecognitionService";
import { getSttUsage, type SttUsage } from "../../services/sttUsageService";
import {
  playSuccessSound,
  speakAssistantMessage,
  stopAssistantSpeech,
  stopSuccessSound,
} from "../../services/speechSynthesisService";

const SOUND_STORAGE_KEY = "assist_ai_sound_enabled";

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
  const [transcript, setTranscript] = useState("");
  const [speechError, setSpeechError] = useState("");
  const [ttsError, setTtsError] = useState("");
  const [nameInputEvent, setNameInputEvent] = useState<AtmNameInputEvent | null>(null);
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
  const recordedInputModesRef = useRef<Set<AtmInputMode>>(new Set());
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
          stt_provider: inputMode === "voice" ? "azure" : undefined,
        }),
      );
    },
    [enqueueAnalytics],
  );

  useEffect(() => {
    return () => {
      const startPromise = analyticsStartRef.current;
      if (!startPromise || latestStatusRef.current === "success") {
        return;
      }
      void analyticsQueueRef.current.finally(async () => {
        const sessionId = await startPromise;
        if (sessionId) {
          const credentials = analyticsCredentialsRef.current;
          await abandonAtmAnalyticsSession(
            sessionId,
            latestStatusRef.current,
            credentials.token,
            credentials.guestToken,
          ).catch(() => undefined);
        }
      });
    };
  }, []);

  const assistantMessage = useMemo(() => {
    if (state.status === "confirm_name" && state.fullName) {
      return text.confirmNameAssistant(state.fullName);
    }
    if (state.status === "enter_name") {
      return state.errorMessage ? text.invalidNameAssistant : text.enterNameAssistant;
    }
    if (state.status === "success") {
      return text.successAssistant;
    }
    if (state.status === "pin_attempt") {
      if (state.errorMessage) {
        return text.systemProblemAssistant(state.demoPin);
      }
      if (state.identityVerified) {
        return text.retryPinAfterLettersAssistant(state.demoPin);
      }
      return text.pinAssistant(state.demoPin);
    }
    if (state.status === "letter_check") {
      return state.errorMessage ? text.letterIncompleteAssistant : text.letterCheckAssistant;
    }
    if (state.status === "lockout") {
      return text.lockoutAssistant;
    }
    return text.welcomeAssistant;
  }, [
    state.demoPin,
    state.errorMessage,
    state.fullName,
    state.identityVerified,
    state.status,
    text,
  ]);

  const displayedErrorMessage = useMemo(() => {
    if (!state.errorMessage) {
      return "";
    }
    if (state.status === "enter_name") {
      return text.invalidNameError;
    }
    if (state.status === "pin_attempt") {
      if (state.errorMessage.toLowerCase().includes("four")) {
        return text.incompletePinError;
      }
      return text.systemProblemError;
    }
    if (state.status === "letter_check") {
      return text.letterIncompleteError;
    }
    return state.errorMessage;
  }, [state.currentPinInput.length, state.errorMessage, state.status, text]);

  const speakCurrentMessage = useCallback(() => {
    if (!soundEnabled) {
      return;
    }
    setTtsError("");
    speakAssistantMessage(assistantMessage, {
      onStart: () => setIsSpeaking(true),
      onEnd: () => setIsSpeaking(false),
      onError: (message) => {
        setIsSpeaking(false);
        setTtsError(message);
      },
    }, language);
  }, [assistantMessage, language, soundEnabled]);

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
    const usage = await getSttUsage();
    sttUsageRef.current = usage;
    return usage;
  }, []);

  const finishListeningSession = useCallback(() => {
    if (sttAutoStopTimerRef.current) {
      window.clearTimeout(sttAutoStopTimerRef.current);
      sttAutoStopTimerRef.current = null;
    }

    listeningStartedAtRef.current = null;
    setIsListening(false);
  }, []);

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
    enqueueAnalytics((sessionId) =>
      recordAtmAnalyticsEvent(sessionId, {
        client_event_id: crypto.randomUUID(),
        event_type: "progress",
        final_step_reached: state.status,
      }),
    );
  }, [enqueueAnalytics, state.status]);

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
      stopSpeech();
      return;
    }
    speakCurrentMessage();
  }, [assistantMessage, soundEnabled, speakCurrentMessage, stopSpeech]);

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

    const handleNavigationClick = (event: MouseEvent) => {
      const element = event.target as HTMLElement | null;
      if (element?.closest("header a, header button")) {
        stopAllScenarioAudio();
      }
    };

    window.addEventListener("pagehide", stopAllScenarioAudio);
    window.addEventListener("beforeunload", stopAllScenarioAudio);
    window.addEventListener("popstate", stopAllScenarioAudio);
    document.addEventListener("click", handleNavigationClick, true);

    return () => {
      window.removeEventListener("pagehide", stopAllScenarioAudio);
      window.removeEventListener("beforeunload", stopAllScenarioAudio);
      window.removeEventListener("popstate", stopAllScenarioAudio);
      document.removeEventListener("click", handleNavigationClick, true);
    };
  }, [finishListeningSession, stopSpeech]);

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
        onResult: (nextTranscript) => {
          setTranscript(nextTranscript);
        },
        onError: (message) => {
          setSpeechError(message);
        },
        onEnd: finishListeningSession,
      },
      "name",
      language,
      {
        microphoneBlocked: text.speechMicBlocked,
        problem: text.speechProblem,
      },
    );

    if (!recognizer) {
      setSpeechError(text.speechNameUnsupported);
      return;
    }

    recognizerRef.current = recognizer;
    try {
      recognizer.start();
      recordInputMode("voice");
      listeningStartedAtRef.current = Date.now();
      setIsListening(true);
      sttAutoStopTimerRef.current = window.setTimeout(() => {
        setSpeechError(text.speechLimitReached);
        recognizerRef.current?.stop();
        finishListeningSession();
      }, usage.remaining * 1000);
    } catch {
      listeningStartedAtRef.current = null;
      setIsListening(false);
      setSpeechError(text.speechNameStartError);
    }
  }, [finishListeningSession, language, recordInputMode, refreshSttUsage, stopSpeech, text]);

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
        onResult: (nextTranscript) => {
          dispatch({ type: "PIN_REPLACE", value: nextTranscript });
        },
        onError: (message) => {
          setSpeechError(message);
        },
        onEnd: finishListeningSession,
      },
      "pin",
      language,
      {
        microphoneBlocked: text.speechMicBlocked,
        problem: text.speechProblem,
      },
    );

    if (!recognizer) {
      setSpeechError(text.speechPinUnsupported);
      return;
    }

    recognizerRef.current = recognizer;
    try {
      recognizer.start();
      recordInputMode("voice");
      listeningStartedAtRef.current = Date.now();
      setIsListening(true);
      sttAutoStopTimerRef.current = window.setTimeout(() => {
        setSpeechError(text.speechLimitReached);
        recognizerRef.current?.stop();
        finishListeningSession();
      }, usage.remaining * 1000);
    } catch {
      listeningStartedAtRef.current = null;
      setIsListening(false);
      setSpeechError(text.speechPinStartError);
    }
  }, [finishListeningSession, language, recordInputMode, refreshSttUsage, stopSpeech, text]);

  const stopListening = useCallback(() => {
    if (stopListeningTimerRef.current) {
      window.clearTimeout(stopListeningTimerRef.current);
    }
    spaceIsHeldRef.current = false;
    stopListeningTimerRef.current = window.setTimeout(() => {
      recognizerRef.current?.stop();
      finishListeningSession();
      stopListeningTimerRef.current = null;
    }, 250);
  }, [finishListeningSession]);

  useEffect(() => {
    if (!["enter_name", "pin_attempt"].includes(state.status) || !speechRecognitionSupported) {
      return;
    }

    const isTextInputTarget = (target: EventTarget | null) => {
      const element = target as HTMLElement | null;
      return Boolean(
        element?.closest("input, textarea, select, button") ||
          element?.isContentEditable,
      );
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code !== "Space" || event.repeat) {
        return;
      }
      stopSpeech();
      if (isTextInputTarget(event.target)) {
        return;
      }
      event.preventDefault();
      spaceIsHeldRef.current = true;
      if (!isListeningRef.current) {
        if (state.status === "enter_name") {
          void startNameListening();
        }
        if (state.status === "pin_attempt") {
          void startPinListening();
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
  }, [speechRecognitionSupported, startNameListening, startPinListening, state.status, stopListening]);

  const emitNameInputEvent = (event: AtmNameInputEventPayload) => {
    setNameInputEvent({
      ...event,
      id: Date.now(),
    });
  };

  const keypadMode =
    state.status === "pin_attempt"
      ? "numeric"
      : state.status === "confirm_name"
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
            isVoiceSupported={speechRecognitionSupported}
            inputEvent={nameInputEvent}
            labels={{
              title: text.enterNameTitle,
              hint: text.enterNameHint,
              voiceInput: text.voiceInput,
              voiceUnsupported: text.voiceUnsupportedName,
              listening: text.listening,
              heard: text.heardLabel,
              fullName: text.fullNameLabel,
              placeholder: text.fullNamePlaceholder,
              pressEnter: text.pressEnterName,
            }}
            onSubmit={(fullName) => dispatch({ type: "NAME_SUBMITTED", fullName })}
            onKeyboardInput={() => recordInputMode("keyboard")}
          />
        );

      case "confirm_name":
        return (
          <AtmConfirmNameScreen
            fullName={state.fullName}
            labels={{
              heard: text.heardLabel,
              hint: text.confirmNameHint,
            }}
          />
        );

      case "pin_attempt":
        return (
          <AtmPinScreen
            pinInput={state.currentPinInput}
            errorMessage={displayedErrorMessage}
            speechError={speechError}
            isListening={isListening}
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
            }}
          />
        );

      case "letter_check":
        return (
          <AtmLetterCheckScreen
            letterInput={state.letterInput}
            errorMessage={displayedErrorMessage}
            firstName={state.firstName}
            lastName={state.lastName}
            labels={{
              title: text.letterTitle,
              hint: text.letterHint,
              firstName: text.firstName,
              lastName: text.lastName,
              lettersEntered: text.lettersEntered,
              lettersAria: text.lettersAria,
            }}
          />
        );

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
        dispatch({ type: "PIN_DIGIT", digit });
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
        stopSpeech();
        if (state.status === "enter_name") {
          emitNameInputEvent({ type: "clear" });
        }
        if (state.status === "confirm_name") {
          setTranscript("");
          setSpeechError("");
          dispatch({ type: "NAME_RETRY" });
        }
        if (state.status === "pin_attempt") {
          dispatch({ type: "PIN_CLEAR" });
        }
        if (state.status === "letter_check") {
          dispatch({ type: "LETTER_CLEAR" });
        }
      }}
      onBackspace={() => {
        stopSpeech();
        if (state.status === "enter_name") {
          emitNameInputEvent({ type: "backspace" });
        }
        if (state.status === "confirm_name") {
          setTranscript("");
          setSpeechError("");
          dispatch({ type: "NAME_RETRY" });
        }
        if (state.status === "pin_attempt") {
          dispatch({ type: "PIN_BACKSPACE" });
        }
        if (state.status === "letter_check") {
          dispatch({ type: "LETTER_BACKSPACE" });
        }
      }}
      onEnter={() => {
        stopSpeech();
        if (state.status === "enter_name") {
          emitNameInputEvent({ type: "submit" });
        }
        if (state.status === "confirm_name") {
          dispatch({ type: "NAME_CONFIRMED" });
        }
        if (state.status === "pin_attempt") {
          if (state.currentPinInput.length === 4) {
            let pinOutcome: AtmPinOutcome = "incorrect";
            if (state.pinAttemptCount === 0) {
              pinOutcome = "simulated_system_error";
            } else if (state.currentPinInput === state.demoPin) {
              pinOutcome = "success";
            }
            enqueueAnalytics((sessionId) =>
              recordAtmAnalyticsEvent(sessionId, {
                client_event_id: crypto.randomUUID(),
                event_type: "pin_submission",
                pin_outcome: pinOutcome,
                final_step_reached: pinOutcome === "success" ? "success" : state.status,
              }),
            );
          }
          dispatch({ type: "PIN_SUBMIT" });
        }
        if (state.status === "letter_check") {
          dispatch({ type: "LETTER_SUBMIT" });
        }
      }}
      onCancel={() => {
        stopSpeech();
        if (state.status === "enter_name") {
          emitNameInputEvent({ type: "clear" });
        }
        if (state.status === "confirm_name") {
          setTranscript("");
          setSpeechError("");
          dispatch({ type: "NAME_RETRY" });
        }
        if (state.status === "pin_attempt") {
          dispatch({ type: "PIN_CLEAR" });
        }
        if (state.status === "letter_check") {
          dispatch({ type: "LETTER_CLEAR" });
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
