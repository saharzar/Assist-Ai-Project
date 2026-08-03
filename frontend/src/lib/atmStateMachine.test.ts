import { describe, expect, it } from "vitest";

import { ATM_ERROR, atmReducer, createInitialAtmState } from "./atmStateMachine";

function withdrawalState(balance = 1200) {
  return {
    ...createInitialAtmState(),
    status: "withdrawal" as const,
    accountBalance: balance,
    identityVerified: true,
  };
}

describe("ATM withdrawal flow", () => {
  it("creates a practice balance between 500 and 5000 in 100-unit steps", () => {
    for (let index = 0; index < 50; index += 1) {
      const balance = createInitialAtmState().accountBalance;
      expect(balance).toBeGreaterThanOrEqual(500);
      expect(balance).toBeLessThanOrEqual(5000);
      expect(balance % 100).toBe(0);
    }
  });

  it("always gives a different practice balance when the scenario is retried", () => {
    const current = withdrawalState(700);
    const retried = atmReducer(current, { type: "RESET" });
    expect(retried.accountBalance).not.toBe(current.accountBalance);
  });

  it("rejects a withdrawal larger than the practice balance", () => {
    const next = atmReducer(withdrawalState(500), { type: "WITHDRAWAL_SELECT", amount: 1000 });
    expect(next.status).toBe("withdrawal");
    expect(next.errorMessage).toBe(ATM_ERROR.insufficientFunds);

    const returned = atmReducer(next, { type: "WITHDRAWAL_WARNING_COMPLETE" });
    expect(returned.status).toBe("withdrawal");
    expect(returned.withdrawalInput).toBe("");
  });

  it("asks for confirmation before completing the withdrawal", () => {
    const confirmation = atmReducer(withdrawalState(1200), { type: "WITHDRAWAL_SELECT", amount: 500 });
    expect(confirmation.status).toBe("withdrawal_confirm");
    expect(confirmation.withdrawnAmount).toBe(500);

    const receipt = atmReducer(confirmation, { type: "WITHDRAWAL_CONFIRM" });
    expect(receipt.status).toBe("withdrawal_result");
    expect(receipt.remainingBalance).toBe(700);
  });

  it("returns to amount selection when the user rejects the amount", () => {
    const confirmation = atmReducer(withdrawalState(1200), { type: "WITHDRAWAL_SELECT", amount: 500 });
    const rejected = atmReducer(confirmation, { type: "WITHDRAWAL_REJECT" });
    expect(rejected.status).toBe("withdrawal");
    expect(rejected.withdrawnAmount).toBe(0);
  });

  it("only reaches the applause success state after the receipt is confirmed", () => {
    const confirmation = atmReducer(withdrawalState(1200), { type: "WITHDRAWAL_SELECT", amount: 500 });
    const receipt = atmReducer(confirmation, { type: "WITHDRAWAL_CONFIRM" });
    const completed = atmReducer(receipt, { type: "WITHDRAWAL_RESULT_CONTINUE" });
    expect(completed.status).toBe("success");
  });
});
