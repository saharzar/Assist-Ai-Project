import type { AtmAction, AtmState, ParsedAtmName } from "../types/atm";

const DEMO_PIN = "2580";
const PIN_LENGTH = 4;
const LOCKOUT_SECONDS = 10;

export const initialAtmState: AtmState = {
  status: "welcome",
  fullName: "",
  firstName: "",
  lastName: "",
  expectedSecondLetter: "",
  expectedLastLetter: "",
  currentPinInput: "",
  pinAttemptCount: 0,
  letterInput: "",
  identityVerified: false,
  lockoutSecondsRemaining: LOCKOUT_SECONDS,
  errorMessage: "",
  assistantMessage: "Welcome to the ATM practice. Press start when you are ready.",
};

export function parseAtmName(value: string): ParsedAtmName | null {
  const parts = value.trim().replace(/\s+/g, " ").split(" ").filter(Boolean);
  if (parts.length < 2) {
    return null;
  }

  const firstName = parts[0];
  const lastName = parts[parts.length - 1];
  if (firstName.length < 2 || lastName.length < 1) {
    return null;
  }

  return {
    fullName: parts.join(" "),
    firstName,
    lastName,
    expectedSecondLetter: firstName[1].toLowerCase(),
    expectedLastLetter: lastName[lastName.length - 1].toLowerCase(),
  };
}

export function atmReducer(state: AtmState, action: AtmAction): AtmState {
  switch (action.type) {
    case "START":
      return {
        ...state,
        status: "enter_name",
        errorMessage: "",
        assistantMessage: "Please write your full name.",
      };

    case "NAME_SUBMITTED": {
      const parsedName = parseAtmName(action.fullName);
      if (!parsedName) {
        return {
          ...state,
          errorMessage: "Please write your first and last name.",
          assistantMessage: "Please write your full name.",
        };
      }

      return {
        ...state,
        ...parsedName,
        status: "confirm_name",
        errorMessage: "",
        assistantMessage: "Please check your name.",
      };
    }

    case "NAME_CONFIRMED":
      return {
        ...state,
        status: "pin_attempt",
        currentPinInput: "",
        errorMessage: "",
        assistantMessage: "Please enter the ATM password.",
      };

    case "NAME_RETRY":
      return {
        ...state,
        status: "enter_name",
        fullName: "",
        firstName: "",
        lastName: "",
        expectedSecondLetter: "",
        expectedLastLetter: "",
        errorMessage: "",
        assistantMessage: "Please write your full name.",
      };

    case "PIN_DIGIT":
      if (state.status !== "pin_attempt" || state.currentPinInput.length >= PIN_LENGTH) {
        return state;
      }
      return {
        ...state,
        currentPinInput: `${state.currentPinInput}${action.digit}`,
        errorMessage: "",
      };

    case "PIN_BACKSPACE":
      return {
        ...state,
        currentPinInput: state.currentPinInput.slice(0, -1),
        errorMessage: "",
      };

    case "PIN_CLEAR":
      return {
        ...state,
        currentPinInput: "",
        errorMessage: "",
      };

    case "PIN_SUBMIT": {
      if (state.currentPinInput === DEMO_PIN) {
        return {
          ...state,
          status: "success",
          currentPinInput: "",
          errorMessage: "",
          assistantMessage: "Well done. You completed this step.",
        };
      }

      if (state.identityVerified) {
        return {
          ...state,
          status: "lockout",
          currentPinInput: "",
          lockoutSecondsRemaining: LOCKOUT_SECONDS,
          errorMessage: "",
          assistantMessage: "The ATM has a temporary problem. Please wait calmly.",
        };
      }

      if (state.pinAttemptCount === 0) {
        return {
          ...state,
          currentPinInput: "",
          pinAttemptCount: 1,
          errorMessage: "There seems to be a problem. Please try again.",
          assistantMessage: "There seems to be a problem. Please try again.",
        };
      }

      return {
        ...state,
        status: "letter_check",
        currentPinInput: "",
        pinAttemptCount: 2,
        letterInput: "",
        errorMessage: "",
        assistantMessage: "Let's check your name before trying again.",
      };
    }

    case "LETTER_INPUT":
      if (state.status !== "letter_check" || state.letterInput.length >= 2) {
        return state;
      }
      return {
        ...state,
        letterInput: `${state.letterInput}${action.letter.toLowerCase()}`,
        errorMessage: "",
      };

    case "LETTER_BACKSPACE":
      return {
        ...state,
        letterInput: state.letterInput.slice(0, -1),
        errorMessage: "",
      };

    case "LETTER_CLEAR":
      return {
        ...state,
        letterInput: "",
        errorMessage: "",
      };

    case "LETTER_SUBMIT": {
      if (state.letterInput.length !== 2) {
        return {
          ...state,
          errorMessage: "Please enter two letters.",
          assistantMessage: "Let's check your name before trying again.",
        };
      }

      const expected = `${state.expectedSecondLetter}${state.expectedLastLetter}`;
      if (state.letterInput.toLowerCase() === expected) {
        return {
          ...state,
          status: "pin_attempt",
          currentPinInput: "",
          letterInput: "",
          identityVerified: true,
          errorMessage: "",
          assistantMessage: "Thank you. Please enter the password one more time.",
        };
      }

      return {
        ...state,
        status: "lockout",
        letterInput: "",
        lockoutSecondsRemaining: LOCKOUT_SECONDS,
        errorMessage: "",
        assistantMessage: "The ATM has a temporary problem. Please wait calmly.",
      };
    }

    case "LOCKOUT_TICK":
      return {
        ...state,
        lockoutSecondsRemaining: Math.max(0, state.lockoutSecondsRemaining - 1),
      };

    case "TRY_AGAIN":
      return {
        ...state,
        status: "pin_attempt",
        currentPinInput: "",
        pinAttemptCount: 0,
        letterInput: "",
        identityVerified: false,
        lockoutSecondsRemaining: LOCKOUT_SECONDS,
        errorMessage: "",
        assistantMessage: "Please enter the ATM password.",
      };

    case "RESET":
      return initialAtmState;

    default:
      return state;
  }
}
