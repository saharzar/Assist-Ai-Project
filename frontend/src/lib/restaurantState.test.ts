import { describe, expect, it } from "vitest";
import { drinks, initialRestaurantState, meals, menuCategories, optionalOrderCategories, requiredOrderCategories, restaurantReducer } from "./restaurantState";
import { restaurantTranslations } from "./restaurantTranslations";

describe("guided restaurant ordering", () => {
  const openState = restaurantReducer(initialRestaurantState, { type: "openMenu" });
  it("opens, closes, reopens, and switches all five categories", () => {
    expect(initialRestaurantState.step).toBe("menuCover");
    expect(openState.step).toBe("menu");
    expect(restaurantReducer(restaurantReducer(openState, { type: "closeMenu" }), { type: "openMenu" }).step).toBe("menu");
    for (const category of menuCategories) expect(restaurantReducer(openState, { type: "category", category }).category).toBe(category);
  });
  it.each(meals)("makes the first %s choice unavailable and accepts a different meal", (meal) => {
    const challenge = restaurantReducer(openState, { type: "choose", meal });
    expect(challenge.step).toBe("alternative"); expect(challenge.unavailable).toBe(meal);
    expect(restaurantReducer(challenge, { type: "choose", meal })).toBe(challenge);
    const alternative = meals.find((choice) => choice !== meal)!;
    const confirmation = restaurantReducer(challenge, { type: "choose", meal: alternative });
    expect(confirmation).toMatchObject({ step: "confirmation", selected: alternative });
    expect(restaurantReducer(confirmation, { type: "confirm" }).step).toBe("drink");
  });
  it("reopens the menu without making the unavailable dish selectable", () => {
    const challenge = restaurantReducer(openState, { type: "choose", meal: "pasta" });
    const closed = restaurantReducer(challenge, { type: "closeMenu" });
    expect(closed.step).toBe("alternativeCover");
    expect(restaurantReducer(closed, { type: "openMenu" })).toMatchObject({ step: "alternative", unavailable: "pasta" });
    const reopened = restaurantReducer(challenge, { type: "menu" });
    expect(reopened).toMatchObject({ step: "alternative", unavailable: "pasta", fullMenu: true });
    expect(restaurantReducer(reopened, { type: "choose", meal: "pasta" })).toBe(reopened);
  });
  it("returns to Main Dishes after an unavailable choice from another category", () => {
    const salads = restaurantReducer(openState, { type: "category", category: "salads" });
    const challenge = restaurantReducer(salads, { type: "choose", meal: "salad" });
    expect(challenge).toMatchObject({ step: "alternative", category: "mains", unavailable: "salad" });
  });
  it("opens the drink menu directly and can close and reopen it", () => {
    const challenge = restaurantReducer(openState, { type: "choose", meal: "pasta" });
    const meal = restaurantReducer(challenge, { type: "choose", meal: "soup" });
    const drink = restaurantReducer(meal, { type: "confirm" });
    expect(drink).toMatchObject({ step: "drink", category: "drinks" });
    const closed = restaurantReducer(drink, { type: "closeMenu" });
    expect(closed.step).toBe("drinkCover");
    expect(restaurantReducer(closed, { type: "openMenu" })).toMatchObject({ step: "drink", category: "drinks", selected: "soup" });
  });
  it("allows changing an alternative before confirming and ignores actions after completion", () => {
    const first = restaurantReducer(openState, { type: "choose", meal: "pasta" });
    const second = restaurantReducer(first, { type: "choose", meal: "soup" });
    expect(restaurantReducer(second, { type: "change" })).toMatchObject({ step: "alternative", selected: null });
    const drinkChoice = restaurantReducer(restaurantReducer(second, { type: "confirm" }), { type: "chooseDrink", drink: "water" });
    const completed = restaurantReducer(drinkChoice, { type: "placeOrder" });
    expect(restaurantReducer(completed, { type: "choose", meal: "salad" })).toBe(completed);
    expect(restaurantReducer(initialRestaurantState, { type: "confirm" })).toBe(initialRestaurantState);
  });
  it.each(drinks)("requires final confirmation for %s and preserves the meal when changing drinks", (drink) => {
    const challenge = restaurantReducer(openState, { type: "choose", meal: "pasta" });
    const meal = restaurantReducer(challenge, { type: "choose", meal: "soup" });
    expect(restaurantReducer(meal, { type: "chooseDrink", drink })).toBe(meal);
    const drinkStep = restaurantReducer(meal, { type: "confirm" });
    expect(restaurantReducer(drinkStep, { type: "placeOrder" })).toBe(drinkStep);
    const order = restaurantReducer(drinkStep, { type: "chooseDrink", drink });
    expect(order).toMatchObject({ step: "orderConfirmation", selected: "soup", drink, unavailable: "pasta" });
    expect(restaurantReducer(order, { type: "changeDrink" })).toMatchObject({ step: "drink", selected: "soup", drink: null, unavailable: "pasta" });
    const changeMeal = restaurantReducer(order, { type: "changeMeal" });
    expect(changeMeal).toMatchObject({ step: "alternative", selected: null, drink, unavailable: "pasta", fullMenu: true });
    expect(restaurantReducer(changeMeal, { type: "choose", meal: "pasta" })).toBe(changeMeal);
    const newMeal = restaurantReducer(changeMeal, { type: "choose", meal: "salad" });
    expect(restaurantReducer(newMeal, { type: "confirm" })).toMatchObject({ step: "orderConfirmation", selected: "salad", drink });
    const success = restaurantReducer(order, { type: "placeOrder" });
    expect(success).toMatchObject({ step: "success", selected: "soup", drink });
    expect(restaurantReducer(success, { type: "changeDrink" })).toBe(success);
    expect(restaurantReducer(success, { type: "changeMeal" })).toBe(success);
  });
  it("provides complete text, food labels and steps in all six languages", () => {
    expect(Object.keys(restaurantTranslations).sort()).toEqual(["de", "en", "es", "fr", "pt", "tr"]);
    for (const text of Object.values(restaurantTranslations)) {
      expect(Object.keys(text).sort()).toEqual(Object.keys(restaurantTranslations.en).sort());
      expect(Object.keys(text.foods).sort()).toEqual([...meals].sort());
      expect(Object.keys(text.drinks).sort()).toEqual([...drinks].sort());
      expect(Object.keys(text.steps).sort()).toEqual(["alternative", "confirmation", "menu", "menuCover", "success"]);
      for (const value of Object.values(text)) if (typeof value === "string") expect(value.trim()).not.toBe("");
    }
  });
});

describe("restaurant order building", () => {
  const opened = restaurantReducer(initialRestaurantState, { type: "openMenu" });
  it("starts empty and keeps browsing separate from progression", () => {
    expect(initialRestaurantState.order).toEqual({ mains: null, salads: null, soups: null, desserts: null, drinks: null });
    expect(restaurantReducer(opened, { type: "category", category: "desserts" })).toMatchObject({ step: "menu", category: "desserts" });
  });
  it("preserves other categories when the first main becomes unavailable", () => {
    let current = restaurantReducer(opened, { type: "selectItem", category: "salads", id: "salad" });
    current = restaurantReducer(current, { type: "selectItem", category: "drinks", id: "tea" });
    current = restaurantReducer(current, { type: "selectItem", category: "mains", id: "pasta" });
    expect(current).toMatchObject({ step: "alternative", category: "mains", unavailable: "pasta", order: { mains: null, salads: "salad", drinks: "tea" } });
    expect(restaurantReducer(current, { type: "selectItem", category: "mains", id: "pasta" })).toBe(current);
    current = restaurantReducer(current, { type: "selectItem", category: "mains", id: "pizza" });
    expect(current.order.mains).toBe("pizza");
    expect(restaurantReducer(current, { type: "selectItem", category: "mains", id: "burger" }).order.mains).toBe("burger");
  });
  it("fills, replaces and removes one item per category", () => {
    let current = restaurantReducer(opened, { type: "selectItem", category: "soups", id: "lentil" });
    current = restaurantReducer(current, { type: "selectItem", category: "soups", id: "tomatoSoup" });
    current = restaurantReducer(current, { type: "selectItem", category: "desserts", id: "cake" });
    expect(current.order).toMatchObject({ soups: "tomatoSoup", desserts: "cake" });
    current = restaurantReducer(current, { type: "removeItem", category: "soups" });
    expect(current.order.soups).toBeNull();
    expect(current.order.desserts).toBe("cake");
  });
  it("requires only a main before review and preserves choices on change", () => {
    expect(requiredOrderCategories).toEqual(["mains"]);
    expect(optionalOrderCategories).toEqual(["salads", "soups", "desserts", "drinks"]);
    let current = restaurantReducer(opened, { type: "selectItem", category: "mains", id: "pasta" });
    current = restaurantReducer(current, { type: "selectItem", category: "mains", id: "pizza" });
    current = restaurantReducer(current, { type: "reviewOrder" });
    expect(current.step).toBe("review");
    current = restaurantReducer(current, { type: "changeOrder" });
    expect(current).toMatchObject({ step: "alternative", order: { mains: "pizza", drinks: null } });
    current = restaurantReducer(current, { type: "reviewOrder" });
    expect(restaurantReducer(current, { type: "confirmOrder" }).step).toBe("success");
  });
});
