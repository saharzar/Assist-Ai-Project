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
    pinWasCorrectBeforeVerification: null,
    verificationAttemptCount: 0,
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
  const firstLetters = Array.from(firstName.normalize("NFC")).filter((value) => /\p{L}/u.test(value));
  const lastLetters = Array.from(lastName.normalize("NFC")).filter((value) => /\p{L}/u.test(value));
  if (firstLetters.length < 2 || lastLetters.length < 1) {
    return null;
  }

  return {
    fullName: parts.join(" "),
    firstName,
    lastName,
    expectedSecondLetter: firstLetters[1].toLocaleLowerCase(),
    expectedLastLetter: lastLetters[lastLetters.length - 1].toLocaleLowerCase(),
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
          status: "security_message",
          currentPinInput: "",
          pinAttemptCount: 1,
          pinWasCorrectBeforeVerification: state.currentPinInput === state.demoPin,
          errorMessage: "",
          assistantMessage: "For your security, we need to verify your identity before continuing.",
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

    case "SHOW_VERIFICATION":
      if (state.status !== "security_message") return state;
      return {...state,status:"letter_check",letterInput:"",errorMessage:"",assistantMessage:"For your security, enter the second letter of your first name and the last letter of your last name."};

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

      const expected = `${state.expectedSecondLetter}${state.expectedLastLetter}`.normalize("NFC").toLocaleLowerCase();
      if (state.letterInput.trim().normalize("NFC").toLocaleLowerCase() === expected) {
        if (state.pinWasCorrectBeforeVerification) {
          return {...state,status:"success",letterInput:"",identityVerified:true,errorMessage:"",assistantMessage:"Well done. Your identity was verified and you completed the ATM practice."};
        }
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
      const attempts=state.verificationAttemptCount+1;
      if(attempts>=3)return{...state,status:"security_terminated",letterInput:"",verificationAttemptCount:attempts,errorMessage:"",assistantMessage:"For your security, this ATM session has ended. Please start again."};
      return{...state,letterInput:"",verificationAttemptCount:attempts,errorMessage:`The letters do not match. Please try again. ${3-attempts} attempt${3-attempts===1?"":"s"} remaining.`,assistantMessage:"That does not match our information. Please check the letters and try again."};
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
