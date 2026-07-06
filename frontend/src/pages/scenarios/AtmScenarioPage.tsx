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
import { useTranslation } from "../../i18n";
import { atmReducer, initialAtmState } from "../../lib/atmStateMachine";
import { atmTranslations } from "../../lib/atmTranslations";
import {
  createSpeechRecognizer,
  isSpeechRecognitionSupported,
} from "../../services/speechRecognitionService";
import {
  playSuccessSound,
  speakAssistantMessage,
  stopAssistantSpeech,
  stopSuccessSound,
} from "../../services/speechSynthesisService";

const SOUND_STORAGE_KEY = "assist_ai_sound_enabled";

export function AtmScenarioPage() {
  const navigate = useNavigate();
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
  const successSoundPlayedRef = useRef(false);
  const isListeningRef = useRef(false);
  const stopListeningTimerRef = useRef<number | null>(null);
  const speechRecognitionSupported = isSpeechRecognitionSupported();

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
      recognizerRef.current?.stop();
    };
  }, [stopSpeech]);

  useEffect(() => {
    const stopAllScenarioAudio = () => {
      stopSpeech();
      stopSuccessSound();
      recognizerRef.current?.stop();
      setIsListening(false);
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
  }, [stopSpeech]);

  useEffect(() => {
    isListeningRef.current = isListening;
  }, [isListening]);

  const startNameListening = useCallback(() => {
    stopSpeech();
    setSpeechError("");
    setTranscript("");

    const recognizer = createSpeechRecognizer(
      {
        onResult: (nextTranscript) => {
          setTranscript(nextTranscript);
        },
        onError: (message) => {
          setSpeechError(message);
        },
        onEnd: () => {
          setIsListening(false);
        },
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
      setIsListening(true);
      recognizer.start();
    } catch {
      setIsListening(false);
      setSpeechError(text.speechNameStartError);
    }
  }, [language, stopSpeech, text]);

  const startPinListening = useCallback(() => {
    stopSpeech();
    setSpeechError("");

    const recognizer = createSpeechRecognizer(
      {
        onResult: (nextTranscript) => {
          dispatch({ type: "PIN_REPLACE", value: nextTranscript });
        },
        onError: (message) => {
          setSpeechError(message);
        },
        onEnd: () => {
          setIsListening(false);
        },
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
      setIsListening(true);
      recognizer.start();
    } catch {
      setIsListening(false);
      setSpeechError(text.speechPinStartError);
    }
  }, [language, stopSpeech, text]);

  const stopListening = useCallback(() => {
    if (stopListeningTimerRef.current) {
      window.clearTimeout(stopListeningTimerRef.current);
    }
    stopListeningTimerRef.current = window.setTimeout(() => {
      recognizerRef.current?.stop();
      setIsListening(false);
      stopListeningTimerRef.current = null;
    }, 250);
  }, []);

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
      if (!isListeningRef.current) {
        if (state.status === "enter_name") {
          startNameListening();
        }
        if (state.status === "pin_attempt") {
          startPinListening();
        }
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.code !== "Space" || isTextInputTarget(event.target)) {
        return;
      }
      event.preventDefault();
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
      onDigit={(digit) => dispatch({ type: "PIN_DIGIT", digit })}
      onLetter={(letter) => {
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
