import { describe, expect, it } from "vitest";

import { createPracticeCardDetails, isLuhnValid, matchesPracticeCard } from "./practiceCard";

describe("practice payment card", () => {
  it("creates valid fictional card details with a future expiry", () => {
    const card = createPracticeCardDetails("Sahar Zar", new Date(2026, 7, 16), () => 0);

    expect(card.cardNumber).toHaveLength(16);
    expect(isLuhnValid(card.cardNumber)).toBe(true);
    expect(card.expiry).toBe("08/27");
    expect(card.cvv).toBe("100");
    expect(card.cardholderName).toBe("SAHAR ZAR");
  });

  it("accepts only details copied from the displayed card", () => {
    const card = createPracticeCardDetails("Sahar Zar", new Date(2026, 7, 16), () => 0.25);

    expect(matchesPracticeCard({ ...card }, card)).toBe(true);
    expect(matchesPracticeCard({ ...card, cardholderName: "ÇAĞLA MÜLLER" }, card)).toBe(true);
    expect(matchesPracticeCard({ ...card, cvv: "999" }, card)).toBe(false);
    expect(matchesPracticeCard({ ...card, cardNumber: card.cardNumber.replace(/^./, "4") }, card)).toBe(false);
  });
});
