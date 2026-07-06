import type { AtmAction, AtmState, ParsedAtmName } from "../types/atm";

const PIN_LENGTH = 4;
const LOCKOUT_SECONDS = 10;

function createDemoPin() {
  return String(Math.floor(1000 + Math.random() * 9000));
}

export function createInitialAtmState(): AtmState {
  return {
    status: "welcome",
    fullName: "",
    firstName: "",
    lastName: "",
    expectedSecondLetter: "",
    expectedLastLetter: "",
    demoPin: createDemoPin(),
    currentPinInput: "",
    pinAttemptCount: 0,
    letterInput: "",
    identityVerified: false,
    lockoutSecondsRemaining: LOCKOUT_SECONDS,
    errorMessage: "",
    assistantMessage: "Welcome to the ATM practice. Click start when you are ready.",
  };
}

export const initialAtmState: AtmState = createInitialAtmState();

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
        assistantMessage: "Please say or type your full name clearly.",
      };

    case "NAME_SUBMITTED": {
      const parsedName = parseAtmName(action.fullName);
      if (!parsedName) {
        return {
          ...state,
          errorMessage: "Please write your first and last name.",
          assistantMessage: "Please enter your first and last name so we can continue.",
        };
      }

      return {
        ...state,
        ...parsedName,
        status: "confirm_name",
        errorMessage: "",
        assistantMessage: `I heard your name as ${parsedName.fullName}. Please confirm if that is correct.`,
      };
    }

    case "NAME_CONFIRMED":
      return {
        ...state,
        status: "pin_attempt",
        currentPinInput: "",
        errorMessage: "",
        assistantMessage: `Please enter the practice password ${state.demoPin}.`,
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
        assistantMessage: "Please say or type your full name clearly.",
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

    case "PIN_REPLACE":
      if (state.status !== "pin_attempt") {
        return state;
      }
      return {
        ...state,
        currentPinInput: action.value.slice(0, PIN_LENGTH),
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
      if (state.currentPinInput.length !== PIN_LENGTH) {
        return {
          ...state,
          errorMessage: "Please enter all four numbers before continuing.",
          assistantMessage: "Please enter all four numbers of the password.",
        };
      }

      if (state.pinAttemptCount === 0) {
        return {
          ...state,
          currentPinInput: "",
          pinAttemptCount: 1,
          errorMessage: "The system has a problem, so please try again.",
          assistantMessage: `There is a temporary system problem. Please try again with password ${state.demoPin}.`,
        };
      }

      if (state.currentPinInput === state.demoPin) {
        return {
          ...state,
          status: "success",
          currentPinInput: "",
          errorMessage: "",
          assistantMessage: "Well done. You completed this ATM practice step successfully.",
        };
      }

      if (state.identityVerified) {
        return {
          ...state,
          status: "lockout",
          currentPinInput: "",
          lockoutSecondsRemaining: LOCKOUT_SECONDS,
          errorMessage: "",
          assistantMessage: "There is a temporary problem. Please wait calmly before trying again.",
        };
      }

      return {
        ...state,
        status: "letter_check",
        currentPinInput: "",
        pinAttemptCount: 2,
        letterInput: "",
        errorMessage: "",
        assistantMessage:
          "For a quick identity check, enter the second letter of your first name and the last letter of your last name.",
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
          assistantMessage: "Please enter both requested letters to continue.",
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
          assistantMessage: `Thank you. Please enter the practice password again: ${state.demoPin}.`,
        };
      }

      return {
        ...state,
        status: "lockout",
        letterInput: "",
        lockoutSecondsRemaining: LOCKOUT_SECONDS,
        errorMessage: "",
        assistantMessage: "There is a temporary problem. Please wait calmly before trying again.",
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
        assistantMessage: `Please enter the practice password ${state.demoPin}.`,
      };

    case "RESET":
      return createInitialAtmState();

    default:
      return state;
  }
}
