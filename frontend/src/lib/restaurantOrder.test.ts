import { describe, expect, it } from "vitest";
import { restaurantMenuItems } from "./restaurantMenu";
import { getShortRestaurantMenuDescription, restaurantMenuDescriptions } from "./restaurantMenuDescriptions";
import { getOrderItemName, getOrderTotalCents, isOrderComplete } from "./restaurantOrder";
import { restaurantOrderTranslations } from "./restaurantOrderTranslations";
import { emptyRestaurantOrder } from "./restaurantState";

describe("restaurant order summary", () => {
  it("requires only a main dish", () => {
    expect(isOrderComplete(emptyRestaurantOrder)).toBe(false);
    expect(isOrderComplete({ ...emptyRestaurantOrder, mains: "pizza" })).toBe(true);
    expect(isOrderComplete({ ...emptyRestaurantOrder, drinks: "tea" })).toBe(false);
    expect(isOrderComplete({ ...emptyRestaurantOrder, mains: "pizza", drinks: "tea" })).toBe(true);
    expect(isOrderComplete({ ...emptyRestaurantOrder, mains: "pizza", drinks: "none" })).toBe(true);
  });
  it("adds all selected static prices without conversion", () => {
    const order = { mains: "pizza", salads: "salad", soups: "lentil", desserts: "cake", drinks: "tea" };
    expect(getOrderTotalCents(order, "en")).toBe(1200 + 800 + 750 + 600 + 250);
    expect(getOrderTotalCents(order, "tr")).toBe(38000 + 26000 + 24000 + 19000 + 7000);
    expect(getOrderTotalCents({ ...order, salads: null }, "en")).toBe(1200 + 750 + 600 + 250);
    expect(getOrderTotalCents({ ...emptyRestaurantOrder, drinks: "none" }, "en")).toBe(0);
  });
  it("names every selected menu item and the explicit no-drink choice in each language", () => {
    for (const language of ["en", "es", "de", "tr", "pt", "fr"] as const) {
      expect(getOrderItemName({ ...emptyRestaurantOrder, desserts: "cake" }, "desserts", language)).toBeTruthy();
      expect(getOrderItemName({ ...emptyRestaurantOrder, drinks: "none" }, "drinks", language)).toBe(restaurantOrderTranslations[language].noDrink);
    }
  });
  it("has a specific, translated description for every menu item", () => {
    for (const language of ["en", "es", "de", "tr", "pt", "fr"] as const) {
      expect(Object.keys(restaurantMenuDescriptions[language]).sort()).toEqual(restaurantMenuItems.map((item) => item.id).sort());
      for (const item of restaurantMenuItems) expect(restaurantMenuDescriptions[language][item.id].trim().length).toBeGreaterThan(5);
      for (const item of restaurantMenuItems) expect(getShortRestaurantMenuDescription(language, item.id).split(/\s+/u).length).toBeLessThanOrEqual(5);
    }
    expect(Object.values(restaurantMenuDescriptions.en)).not.toContain("Freshly prepared");
    expect(Object.values(restaurantMenuDescriptions.en)).not.toContain("Prepared on request");
  });
});
