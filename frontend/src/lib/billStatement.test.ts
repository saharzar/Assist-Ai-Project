import { describe, expect, it } from "vitest";

import { createBillStatementMetadata } from "./billStatement";

describe("bill statement metadata", () => {
  it("creates a due date beginning tomorrow using the user's local date", () => {
    const now = new Date(2026, 7, 15, 23, 45);
    const statement = createBillStatementMetadata("electricity", now, () => 0);

    expect(statement.dueDate).toEqual(new Date(2026, 7, 16));
    expect(statement.subscriptionNumber).toBe("10000000");
    expect(statement.referenceNumber).toBe("ELC-20260816-0000");
  });

  it("keeps the randomized deadline within thirty days", () => {
    const now = new Date(2026, 11, 20);
    const statement = createBillStatementMetadata("internet", now, () => 0.999999);

    expect(statement.dueDate).toEqual(new Date(2027, 0, 19));
    expect(statement.referenceNumber.startsWith("NET-20270119-")).toBe(true);
  });
});
