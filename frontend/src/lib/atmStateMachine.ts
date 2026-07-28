import type { AtmAction, AtmState, ParsedAtmName } from "../types/atm";

const PIN_LENGTH = 4;
const LOCKOUT_SECONDS = 10;

export const ATM_ERROR = {
  invalidName: "invalid_name",
  incompletePin: "incomplete_pin",
  wrongPin: "wrong_pin",
  incompleteLetters: "incomplete_letters",
  letterMismatch: "letter_mismatch",
} as const;

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
    postVerificationPinFailureCount: 0,
    securityTerminationReason: null,
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
          errorMessage: ATM_ERROR.invalidName,
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
        assistantMessage: `Please enter the practice password ${state.demoPin}`,
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
          errorMessage: ATM_ERROR.incompletePin,
          assistantMessage: "Please enter all four numbers of the password.",
        };
      }

      if (state.pinAttemptCount === 0) {
        return {
          ...state,
          status: "security_message",
          currentPinInput: "",
          pinAttemptCount: 1,
          pinWasCorrectBeforeVerification: null,
          errorMessage: "",
          assistantMessage: "There is a problem with the system. Please enter the PIN again.",
        };
      }

      if (!state.identityVerified && state.pinWasCorrectBeforeVerification === null) {
        return {
          ...state,
          status: "letter_check",
          currentPinInput: "",
          pinAttemptCount: 2,
          pinWasCorrectBeforeVerification: state.currentPinInput === state.demoPin,
          letterInput: "",
          errorMessage: "",
          assistantMessage: "Enter the second letter of your first name and the last letter of your last name.",
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
        const failures = state.postVerificationPinFailureCount + 1;
        if (failures >= 2) {
          return {
            ...state,
            status: "security_terminated",
            currentPinInput: "",
            postVerificationPinFailureCount: failures,
            securityTerminationReason: "pin_failed_after_verification",
            lockoutSecondsRemaining: LOCKOUT_SECONDS,
            errorMessage: "",
            assistantMessage: "For your security, this ATM session has ended. Please wait before starting again.",
          };
        }
        return {
          ...state,
          status: "pin_attempt",
          currentPinInput: "",
          postVerificationPinFailureCount: failures,
          errorMessage: ATM_ERROR.wrongPin,
          assistantMessage: `Please check the practice password and enter it again: ${state.demoPin}`,
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
      return {...state,status:"pin_attempt",currentPinInput:"",errorMessage:"",assistantMessage:`Please enter the practice password again: ${state.demoPin}`};

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
          errorMessage: ATM_ERROR.incompleteLetters,
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
          assistantMessage: `Thank you. Please enter the practice password again: ${state.demoPin}`,
        };
      }
      const attempts=state.verificationAttemptCount+1;
      if(attempts>=3)return{...state,status:"security_terminated",letterInput:"",verificationAttemptCount:attempts,securityTerminationReason:"verification_failed",lockoutSecondsRemaining:LOCKOUT_SECONDS,errorMessage:"",assistantMessage:"For your security, this ATM session has ended. Please wait before starting again."};
      return{...state,letterInput:"",verificationAttemptCount:attempts,errorMessage:`${ATM_ERROR.letterMismatch}:${3-attempts}`,assistantMessage:"That does not match our information. Please check the letters and try again."};
    }

    case "LOCKOUT_TICK":
      return {
        ...state,
        lockoutSecondsRemaining: Math.max(0, state.lockoutSecondsRemaining - 1),
      };

    case "SECURITY_TICK":
      if (state.status !== "security_terminated") return state;
      if (state.lockoutSecondsRemaining <= 1) return createInitialAtmState();
      return {
        ...state,
        lockoutSecondsRemaining: state.lockoutSecondsRemaining - 1,
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
        assistantMessage: `Please enter the practice password ${state.demoPin}`,
      };

    case "RESET":
      return createInitialAtmState();

    default:
      return state;
  }
}
