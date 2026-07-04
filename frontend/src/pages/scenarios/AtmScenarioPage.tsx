import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import { AtmAssistantMessage } from "../../components/atm/AtmAssistantMessage";
import { AtmConfirmNameScreen } from "../../components/atm/AtmConfirmNameScreen";
import { AtmFrame } from "../../components/atm/AtmFrame";
import { AtmLetterCheckScreen } from "../../components/atm/AtmLetterCheckScreen";
import { AtmLockoutScreen } from "../../components/atm/AtmLockoutScreen";
import { AtmNameScreen } from "../../components/atm/AtmNameScreen";
import { AtmPinScreen } from "../../components/atm/AtmPinScreen";
import { AtmSuccessScreen } from "../../components/atm/AtmSuccessScreen";
import { AtmWelcomeScreen } from "../../components/atm/AtmWelcomeScreen";
import { SoundToggle } from "../../components/atm/SoundToggle";
import { atmReducer, initialAtmState } from "../../lib/atmStateMachine";
import {
  createSpeechRecognizer,
  isSpeechRecognitionSupported,
} from "../../services/speechRecognitionService";
import {
  playSuccessSound,
  speakAssistantMessage,
  stopAssistantSpeech,
} from "../../services/speechSynthesisService";

const SOUND_STORAGE_KEY = "assist_ai_sound_enabled";

export function AtmScenarioPage() {
  const navigate = useNavigate();
  const [state, dispatch] = useReducer(atmReducer, initialAtmState);
  const [soundEnabled, setSoundEnabled] = useState(() => {
    const storedValue = localStorage.getItem(SOUND_STORAGE_KEY);
    return storedValue === null ? true : storedValue === "true";
  });
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [speechError, setSpeechError] = useState("");
  const recognizerRef = useRef<ReturnType<typeof createSpeechRecognizer> | null>(null);
  const successSoundPlayedRef = useRef(false);
  const isListeningRef = useRef(false);
  const stopListeningTimerRef = useRef<number | null>(null);
  const speechRecognitionSupported = isSpeechRecognitionSupported();

  const assistantMessage = useMemo(() => {
    if (state.status === "confirm_name" && state.fullName) {
      return `I heard your name as ${state.fullName}. Is this correct?`;
    }
    if (state.status === "enter_name") {
      return "Please hold Space and say your full name, or type it in the box.";
    }
    if (state.status === "success") {
      return "Well done. You entered the correct password.";
    }
    if (state.status === "pin_attempt" && !state.errorMessage && !state.identityVerified) {
      return `Please enter the ATM password. The practice password is ${state.demoPin}. You can type the numbers or hold Space and say them.`;
    }
    return state.assistantMessage;
  }, [
    state.assistantMessage,
    state.demoPin,
    state.errorMessage,
    state.fullName,
    state.identityVerified,
    state.status,
  ]);

  const speakCurrentMessage = useCallback(() => {
    if (!soundEnabled) {
      return;
    }
    speakAssistantMessage(assistantMessage, {
      onStart: () => setIsSpeaking(true),
      onEnd: () => setIsSpeaking(false),
      onError: () => setIsSpeaking(false),
    });
  }, [assistantMessage, soundEnabled]);

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
      if (stopListeningTimerRef.current) {
        window.clearTimeout(stopListeningTimerRef.current);
      }
      recognizerRef.current?.stop();
    };
  }, [stopSpeech]);

  useEffect(() => {
    isListeningRef.current = isListening;
  }, [isListening]);

  const startNameListening = useCallback(() => {
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
    );

    if (!recognizer) {
      setSpeechError("Voice input is not supported in this browser. Please type your name.");
      return;
    }

    recognizerRef.current = recognizer;
    try {
      setIsListening(true);
      recognizer.start();
    } catch {
      setIsListening(false);
      setSpeechError("Voice input could not start. Please try again or type your name.");
    }
  }, []);

  const startPinListening = useCallback(() => {
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
    );

    if (!recognizer) {
      setSpeechError("Voice input is not supported in this browser. Please use the keypad.");
      return;
    }

    recognizerRef.current = recognizer;
    try {
      setIsListening(true);
      recognizer.start();
    } catch {
      setIsListening(false);
      setSpeechError("Voice input could not start. Please try again or use the keypad.");
    }
  }, []);

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
      if (event.code !== "Space" || event.repeat || isTextInputTarget(event.target)) {
        return;
      }
      event.preventDefault();
      if (!isListeningRef.current) {
        stopSpeech();
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

  const screen = (() => {
    switch (state.status) {
      case "welcome":
        return <AtmWelcomeScreen onStart={() => dispatch({ type: "START" })} />;

      case "enter_name":
        return (
          <AtmNameScreen
            errorMessage={state.errorMessage}
            transcript={transcript}
            speechError={speechError}
            isListening={isListening}
            isVoiceSupported={speechRecognitionSupported}
            onSubmit={(fullName) => dispatch({ type: "NAME_SUBMITTED", fullName })}
          />
        );

      case "confirm_name":
        return (
          <AtmConfirmNameScreen
            fullName={state.fullName}
            onConfirm={() => dispatch({ type: "NAME_CONFIRMED" })}
            onRetry={() => {
              setTranscript("");
              setSpeechError("");
              dispatch({ type: "NAME_RETRY" });
            }}
          />
        );

      case "pin_attempt":
        return (
          <AtmPinScreen
            pinInput={state.currentPinInput}
            errorMessage={state.errorMessage}
            speechError={speechError}
            isListening={isListening}
            isVoiceSupported={speechRecognitionSupported}
            onDigit={(digit) => dispatch({ type: "PIN_DIGIT", digit })}
            onClear={() => dispatch({ type: "PIN_CLEAR" })}
            onBackspace={() => dispatch({ type: "PIN_BACKSPACE" })}
            onSubmit={() => dispatch({ type: "PIN_SUBMIT" })}
          />
        );

      case "letter_check":
        return (
          <AtmLetterCheckScreen
            letterInput={state.letterInput}
            errorMessage={state.errorMessage}
            firstName={state.firstName}
            lastName={state.lastName}
            onLetter={(letter) => dispatch({ type: "LETTER_INPUT", letter })}
            onClear={() => dispatch({ type: "LETTER_CLEAR" })}
            onBackspace={() => dispatch({ type: "LETTER_BACKSPACE" })}
            onSubmit={() => dispatch({ type: "LETTER_SUBMIT" })}
          />
        );

      case "lockout":
        return (
          <AtmLockoutScreen
            secondsRemaining={state.lockoutSecondsRemaining}
            onTryAgain={() => dispatch({ type: "TRY_AGAIN" })}
          />
        );

      case "success":
        return (
          <AtmSuccessScreen
            onFinish={() => navigate("/scenarios")}
            onTryAgain={() => {
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
      soundControls={<SoundToggle isEnabled={soundEnabled} onToggle={toggleSound} />}
      assistantMessage={
        <AtmAssistantMessage
          message={assistantMessage}
          soundEnabled={soundEnabled}
          isSpeaking={isSpeaking}
          onRepeat={speakCurrentMessage}
          onStop={stopSpeech}
        />
      }
    >
      {screen}
    </AtmFrame>
  );
}
