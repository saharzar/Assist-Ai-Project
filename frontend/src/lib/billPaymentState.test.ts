import { describe, expect, it } from "vitest";

import { billDefinitions, billPaymentReducer, initialBillPaymentState, isValidCardExpiry } from "./billPaymentState";

describe("bill payment scenario state", () => {
  it("moves from login through bill selection and card payment", () => {
    const loggedIn = billPaymentReducer(initialBillPaymentState, { type: "LOGIN_SUCCESS" });
    const selected = billPaymentReducer(loggedIn, { type: "SELECT_BILL", bill: billDefinitions[0] });
    const payment = billPaymentReducer(selected, { type: "PAY_BY_CARD" });

    expect(loggedIn.step).toBe("bill-selection");
    expect(selected.selectedBill?.type).toBe("electricity");
    expect(payment.step).toBe("card-payment");
  });

  it("records the intentional first error and then completes", () => {
    const selected = billPaymentReducer(
      billPaymentReducer(initialBillPaymentState, { type: "LOGIN_SUCCESS" }),
      { type: "SELECT_BILL", bill: billDefinitions[2] },
    );
    const payment = billPaymentReducer(selected, { type: "PAY_BY_CARD" });
    const failed = billPaymentReducer(payment, { type: "PAYMENT_SYSTEM_ERROR" });
    const completed = billPaymentReducer(failed, { type: "PAYMENT_SUCCESS" });

    expect(failed.systemError).toBe(true);
    expect(failed.paymentAttempts).toBe(1);
    expect(completed.step).toBe("success");
    expect(completed.paymentAttempts).toBe(2);
    expect(completed.paidBillTypes).toEqual(["water"]);
  });

  it("keeps a paid bill marked when the user chooses another bill", () => {
    const selected = billPaymentReducer(
      { ...initialBillPaymentState, step: "bill-selection" },
      { type: "SELECT_BILL", bill: billDefinitions[0] },
    );
    const completed = billPaymentReducer(selected, { type: "PAYMENT_SUCCESS" });
    const anotherBill = billPaymentReducer(completed, { type: "PAY_ANOTHER_BILL" });

    expect(anotherBill.step).toBe("bill-selection");
    expect(anotherBill.selectedBill).toBeNull();
    expect(anotherBill.paidBillTypes).toEqual(["electricity"]);
  });

  it("returns to bill selection without retaining the selected bill", () => {
    const selected = billPaymentReducer(
      { ...initialBillPaymentState, step: "bill-selection" },
      { type: "SELECT_BILL", bill: billDefinitions[1] },
    );
    const returned = billPaymentReducer(selected, { type: "BACK_TO_BILLS" });

    expect(returned.step).toBe("bill-selection");
    expect(returned.selectedBill).toBeNull();
  });

  it("rejects expired cards and accepts the current or a future expiry month", () => {
    const referenceDate = new Date(2026, 7, 11);

    expect(isValidCardExpiry("07/26", referenceDate)).toBe(false);
    expect(isValidCardExpiry("08/26", referenceDate)).toBe(true);
    expect(isValidCardExpiry("01/27", referenceDate)).toBe(true);
    expect(isValidCardExpiry("13/27", referenceDate)).toBe(false);
  });
});
