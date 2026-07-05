export type AtmScenarioStatus =
  | "welcome"
  | "enter_name"
  | "confirm_name"
  | "pin_attempt"
  | "letter_check"
  | "lockout"
  | "success";

export type AtmState = {
  status: AtmScenarioStatus;
  fullName: string;
  firstName: string;
  lastName: string;
  expectedSecondLetter: string;
  expectedLastLetter: string;
  demoPin: string;
  currentPinInput: string;
  pinAttemptCount: number;
  letterInput: string;
  identityVerified: boolean;
  lockoutSecondsRemaining: number;
  errorMessage: string;
  assistantMessage: string;
};

export type AtmAction =
  | { type: "START" }
  | { type: "NAME_SUBMITTED"; fullName: string }
  | { type: "NAME_CONFIRMED" }
  | { type: "NAME_RETRY" }
  | { type: "PIN_DIGIT"; digit: string }
  | { type: "PIN_REPLACE"; value: string }
  | { type: "PIN_BACKSPACE" }
  | { type: "PIN_CLEAR" }
  | { type: "PIN_SUBMIT" }
  | { type: "LETTER_INPUT"; letter: string }
  | { type: "LETTER_BACKSPACE" }
  | { type: "LETTER_CLEAR" }
  | { type: "LETTER_SUBMIT" }
  | { type: "LOCKOUT_TICK" }
  | { type: "TRY_AGAIN" }
  | { type: "RESET" };

export type ParsedAtmName = {
  fullName: string;
  firstName: string;
  lastName: string;
  expectedSecondLetter: string;
  expectedLastLetter: string;
};
