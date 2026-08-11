export const BILL_SETUP_STORAGE_KEY = "assist_ai_bill_setup";

export type BillSetupDetails = {
  firstName: string;
  lastName: string;
  username: string;
  password: string;
};

export type BillType = "electricity" | "natural-gas" | "water" | "internet";

export type BillDefinition = {
  type: BillType;
  label: string;
  amount: number;
};

export const billDefinitions: BillDefinition[] = [
  { type: "electricity", label: "Electricity", amount: 86 },
  { type: "natural-gas", label: "Natural Gas", amount: 64 },
  { type: "water", label: "Water", amount: 38 },
  { type: "internet", label: "Internet", amount: 52 },
];

export type BillPaymentStep = "login" | "bill-selection" | "bill-details" | "card-payment" | "success";

export type BillPaymentState = {
  step: BillPaymentStep;
  selectedBill: BillDefinition | null;
  paymentAttempts: number;
  systemError: boolean;
};

export type BillPaymentAction =
  | { type: "LOGIN_SUCCESS" }
  | { type: "SELECT_BILL"; bill: BillDefinition }
  | { type: "PAY_BY_CARD" }
  | { type: "PAYMENT_SYSTEM_ERROR" }
  | { type: "PAYMENT_SUCCESS" }
  | { type: "BACK_TO_BILLS" };

export const initialBillPaymentState: BillPaymentState = {
  step: "login",
  selectedBill: null,
  paymentAttempts: 0,
  systemError: false,
};

export function isValidCardExpiry(value: string, now = new Date()) {
  const match = /^(0[1-9]|1[0-2])\/(\d{2})$/.exec(value);
  if (!match) return false;
  const expiryMonth = Number(match[1]);
  const expiryYear = 2000 + Number(match[2]);
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  return expiryYear > currentYear || (expiryYear === currentYear && expiryMonth >= currentMonth);
}

export function billPaymentReducer(state: BillPaymentState, action: BillPaymentAction): BillPaymentState {
  switch (action.type) {
    case "LOGIN_SUCCESS":
      return { ...state, step: "bill-selection" };
    case "SELECT_BILL":
      return { ...state, selectedBill: action.bill, step: "bill-details", systemError: false };
    case "PAY_BY_CARD":
      return state.selectedBill ? { ...state, step: "card-payment" } : state;
    case "PAYMENT_SYSTEM_ERROR":
      return { ...state, paymentAttempts: state.paymentAttempts + 1, systemError: true };
    case "PAYMENT_SUCCESS":
      return { ...state, paymentAttempts: state.paymentAttempts + 1, systemError: false, step: "success" };
    case "BACK_TO_BILLS":
      return { ...state, selectedBill: null, step: "bill-selection", systemError: false };
    default:
      return state;
  }
}
