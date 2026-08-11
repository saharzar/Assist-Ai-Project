import { describe, expect, it } from "vitest";

import { billDefinitions, billPaymentReducer, initialBillPaymentState } from "./billPaymentState";

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
});

