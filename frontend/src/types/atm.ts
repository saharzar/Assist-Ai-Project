export type AtmScenarioStatus =
  | "welcome"
  | "enter_name"
  | "confirm_name"
  | "pin_attempt"
  | "security_message"
  | "letter_check"
  | "security_terminated"
  | "lockout"
  | "withdrawal"
  | "withdrawal_confirm"
  | "receipt_prompt"
  | "cash_dispensing"
  | "cash_collect"
  | "withdrawal_result"
  | "card_return"
  | "success";

export type AtmState = {
  status: AtmScenarioStatus;
  fullName: string;
  firstName: string;
  lastName: string;
  expectedSecondLetter: string;
  expectedLastLetter: string;
  demoPin: string;
  accountBalance: number;
  withdrawalInput: string;
  withdrawnAmount: number;
  remainingBalance: number;
  currentPinInput: string;
  pinAttemptCount: number;
  letterInput: string;
  identityVerified: boolean;
  pinWasCorrectBeforeVerification: boolean | null;
  verificationAttemptCount: number;
  postVerificationPinFailureCount: number;
  securityTerminationReason: "verification_failed" | "pin_failed_after_verification" | null;
  lockoutSecondsRemaining: number;
  errorMessage: string;
  assistantMessage: string;
};

export type AtmAction =
  | { type: "START" }
  | { type: "START_WITHDRAWAL" }
  | { type: "NAME_SUBMITTED"; fullName: string }
  | { type: "NAME_CONFIRMED" }
  | { type: "NAME_RETRY" }
  | { type: "PIN_DIGIT"; digit: string }
  | { type: "PIN_REPLACE"; value: string }
  | { type: "PIN_BACKSPACE" }
  | { type: "PIN_CLEAR" }
  | { type: "PIN_SUBMIT" }
  | { type: "SHOW_VERIFICATION" }
  | { type: "LETTER_INPUT"; letter: string }
  | { type: "LETTER_BACKSPACE" }
  | { type: "LETTER_CLEAR" }
  | { type: "LETTER_SUBMIT" }
  | { type: "WITHDRAWAL_DIGIT"; digit: string }
  | { type: "WITHDRAWAL_REPLACE"; value: string }
  | { type: "WITHDRAWAL_BACKSPACE" }
  | { type: "WITHDRAWAL_CLEAR" }
  | { type: "WITHDRAWAL_RETURN_TO_MENU" }
  | { type: "WITHDRAWAL_SELECT"; amount: number }
  | { type: "WITHDRAWAL_SUBMIT" }
  | { type: "WITHDRAWAL_WARNING_COMPLETE" }
  | { type: "WITHDRAWAL_CONFIRM" }
  | { type: "WITHDRAWAL_REJECT" }
  | { type: "RECEIPT_ACCEPT" }
  | { type: "RECEIPT_DECLINE" }
  | { type: "CASH_DISPENSE_COMPLETE" }
  | { type: "CASH_COLLECTED" }
  | { type: "WITHDRAWAL_RESULT_CONTINUE" }
  | { type: "ANOTHER_TRANSACTION" }
  | { type: "FINISH_TRANSACTION" }
  | { type: "CARD_COLLECTED" }
  | { type: "LEAVE_ATM" }
  | { type: "LOCKOUT_TICK" }
  | { type: "SECURITY_TICK" }
  | { type: "TRY_AGAIN" }
  | { type: "RESET" };

export type ParsedAtmName = {
  fullName: string;
  firstName: string;
  lastName: string;
  expectedSecondLetter: string;
  expectedLastLetter: string;
};
