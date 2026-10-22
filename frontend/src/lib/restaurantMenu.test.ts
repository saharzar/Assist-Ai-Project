import { describe, expect, it } from "vitest";
import { getRestaurantMenuItemPrice, menuExtras, restaurantMenuItems } from "./restaurantMenu";
import { restaurantMenuTranslations } from "./restaurantMenuTranslations";
import { menuCategories } from "./restaurantState";

describe("static restaurant menu", () => {
  it("has five populated categories and keeps existing meal prices", () => {
    for (const category of menuCategories) expect(restaurantMenuItems.filter((item) => item.category === category).length).toBeGreaterThan(0);
    expect(restaurantMenuItems.find((item) => item.id === "pasta")?.meal).toBe("pasta");
    expect(restaurantMenuItems.find((item) => item.id === "chicken")?.meal).toBe("chicken");
    expect(getRestaurantMenuItemPrice(restaurantMenuItems.find((item) => item.id === "pasta")!, "en")).toBe(1000);
    expect(getRestaurantMenuItemPrice(restaurantMenuItems.find((item) => item.id === "pasta")!, "tr")).toBe(32000);
  });
  it("keeps desserts and preview drinks browse-only with static prices", () => {
    for (const item of restaurantMenuItems.filter((entry) => entry.category === "desserts" || entry.category === "drinks")) {
      expect(item.meal).toBeUndefined();
      expect(getRestaurantMenuItemPrice(item, "en")).toBeGreaterThan(0);
      expect(getRestaurantMenuItemPrice(item, "tr")).toBeGreaterThan(0);
    }
  });
  it("translates all menu controls and items", () => {
    for (const text of Object.values(restaurantMenuTranslations)) {
      expect(Object.keys(text.categories).sort()).toEqual([...menuCategories].sort());
      expect(Object.keys(text.extras).sort()).toEqual([...menuExtras].sort());
      expect(text.categories.desserts).toBeTruthy();
      expect(text.open).toBeTruthy();
      expect(text.close).toBeTruthy();
    }
  });
});
