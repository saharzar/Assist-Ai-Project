import { useEffect, useReducer } from "react";
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
import { atmReducer, initialAtmState } from "../../lib/atmStateMachine";

export function AtmScenarioPage() {
  const navigate = useNavigate();
  const [state, dispatch] = useReducer(atmReducer, initialAtmState);

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

  const screen = (() => {
    switch (state.status) {
      case "welcome":
        return <AtmWelcomeScreen onStart={() => dispatch({ type: "START" })} />;

      case "enter_name":
        return (
          <AtmNameScreen
            errorMessage={state.errorMessage}
            onSubmit={(fullName) => dispatch({ type: "NAME_SUBMITTED", fullName })}
          />
        );

      case "confirm_name":
        return (
          <AtmConfirmNameScreen
            fullName={state.fullName}
            onConfirm={() => dispatch({ type: "NAME_CONFIRMED" })}
            onRetry={() => dispatch({ type: "NAME_RETRY" })}
          />
        );

      case "pin_attempt":
        return (
          <AtmPinScreen
            pinInput={state.currentPinInput}
            errorMessage={state.errorMessage}
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
            onTryAgain={() => dispatch({ type: "RESET" })}
          />
        );

      default:
        return null;
    }
  })();

  return (
    <AtmFrame assistantMessage={<AtmAssistantMessage message={state.assistantMessage} />}>
      {screen}
    </AtmFrame>
  );
}
