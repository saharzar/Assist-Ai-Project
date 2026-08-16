import type { BillType } from "./billPaymentState";

export type BillStatementMetadata = {
  dueDate: Date;
  subscriptionNumber: string;
  referenceNumber: string;
};

const BILL_CODES: Record<BillType, string> = {
  electricity: "ELC",
  "natural-gas": "GAS",
  water: "WTR",
  internet: "NET",
};

export function createBillStatementMetadata(
  billType: BillType,
  now = new Date(),
  random: () => number = Math.random,
): BillStatementMetadata {
  const safeRandom = () => Math.min(Math.max(random(), 0), 0.999999999);
  const daysUntilDue = 1 + Math.floor(safeRandom() * 30);
  const dueDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + daysUntilDue);
  const subscriptionNumber = String(10_000_000 + Math.floor(safeRandom() * 90_000_000));
  const dateCode = `${dueDate.getFullYear()}${String(dueDate.getMonth() + 1).padStart(2, "0")}${String(dueDate.getDate()).padStart(2, "0")}`;

  return {
    dueDate,
    subscriptionNumber,
    referenceNumber: `${BILL_CODES[billType]}-${dateCode}-${subscriptionNumber.slice(-4)}`,
  };
}
