import { describe, expect, it } from "vitest";
import { formatRestaurantPrice, getRestaurantReceipt, initialRestaurantPayment, restaurantPaymentReducer } from "./restaurantPayment";
import { restaurantPaymentTranslations } from "./restaurantPaymentTranslations";
import { drinks, meals } from "./restaurantState";

describe("restaurant practice payments", () => {
  it.each(["card", "cash"] as const)("requires the complete %s interaction before showing a receipt", (method) => {
    expect(restaurantPaymentReducer(initialRestaurantPayment, { type: "receipt" })).toBe(initialRestaurantPayment);
    expect(restaurantPaymentReducer(initialRestaurantPayment, { type: "complete" })).toBe(initialRestaurantPayment);
    const selected = restaurantPaymentReducer(initialRestaurantPayment, { type: "method", method });
    expect(selected).toEqual({ phase: method, method });
    const processing = restaurantPaymentReducer(selected, { type: "pay" });
    expect(processing.phase).toBe("processing");
    expect(restaurantPaymentReducer(processing, { type: "pay" })).toBe(processing);
    const paid = restaurantPaymentReducer(processing, { type: "complete" });
    expect(paid).toEqual({ phase: "paid", method });
    const receipt = restaurantPaymentReducer(paid, { type: "receipt" });
    expect(receipt).toEqual({ phase: "receipt", method });
    expect(restaurantPaymentReducer(receipt, { type: "pay" })).toBe(receipt);
  });
  it("calculates exact practice totals including no drink", () => {
    expect(getRestaurantReceipt("pasta", "water")).toEqual({ mealCents: 1000, drinkCents: 200, totalCents: 1200 });
    expect(getRestaurantReceipt("pasta", "water", "tr")).toEqual({ mealCents: 32000, drinkCents: 5000, totalCents: 37000 });
    expect(meals.map((meal) => getRestaurantReceipt(meal, "none", "en").mealCents)).toEqual([1000, 1400, 1200, 1100, 1350, 1550, 2200, 1200, 1450, 1400, 800, 950, 850, 1000, 1150, 1050, 1200, 1100, 1000, 700, 750, 750, 800, 850, 900, 800, 850, 800]);
    expect(meals.map((meal) => getRestaurantReceipt(meal, "none", "tr").mealCents)).toEqual([32000, 42000, 38000, 35000, 41000, 47000, 68000, 38000, 45000, 43000, 26000, 30000, 27000, 32000, 36000, 33000, 38000, 35000, 32000, 22000, 24000, 24000, 26000, 28000, 30000, 26000, 28000, 26000]);
    expect(drinks.map((drink) => getRestaurantReceipt("pasta", drink, "en").drinkCents)).toEqual([200, 300, 0]);
    expect(drinks.map((drink) => getRestaurantReceipt("pasta", drink, "tr").drinkCents)).toEqual([5000, 8000, 0]);
    for (const language of Object.keys(restaurantPaymentTranslations)) for (const meal of meals) for (const drink of drinks) {
      const receipt = getRestaurantReceipt(meal, drink, language);
      expect(receipt.totalCents).toBe(receipt.mealCents + receipt.drinkCents);
      if (drink === "none") expect(receipt.drinkCents).toBe(0);
    }
  });
  it("provides complete payment text and uses lira only for Turkish", () => {
    expect(Object.keys(restaurantPaymentTranslations).sort()).toEqual(["de", "en", "es", "fr", "pt", "tr"]);
    for (const [language, text] of Object.entries(restaurantPaymentTranslations)) {
      expect(Object.keys(text).sort()).toEqual(Object.keys(restaurantPaymentTranslations.en).sort());
      for (const value of Object.values(text)) expect(value.trim()).not.toBe("");
      expect(formatRestaurantPrice(37000, language)).toContain(language === "tr" ? "₺" : "€");
      expect(formatRestaurantPrice(37000, language)).not.toContain(language === "tr" ? "€" : "₺");
    }
    expect(formatRestaurantPrice(1250, "en")).toBe("€12.50");
    expect(formatRestaurantPrice(1250, "de")).toContain("12,50");
    expect(formatRestaurantPrice(37000, "tr")).toBe("₺370");
  });
});
