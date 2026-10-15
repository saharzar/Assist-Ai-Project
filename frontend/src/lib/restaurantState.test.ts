import { describe, expect, it } from "vitest";
import { drinks, initialRestaurantState, meals, restaurantReducer } from "./restaurantState";
import { restaurantTranslations } from "./restaurantTranslations";

describe("guided restaurant ordering", () => {
  it.each(meals)("makes the first %s choice unavailable and accepts a different meal", (meal) => {
    const challenge = restaurantReducer(initialRestaurantState, { type: "choose", meal });
    expect(challenge.step).toBe("alternative"); expect(challenge.unavailable).toBe(meal);
    expect(restaurantReducer(challenge, { type: "choose", meal })).toBe(challenge);
    const alternative = meals.find((choice) => choice !== meal)!;
    const confirmation = restaurantReducer(challenge, { type: "choose", meal: alternative });
    expect(confirmation).toMatchObject({ step: "confirmation", selected: alternative });
    expect(restaurantReducer(confirmation, { type: "confirm" }).step).toBe("drink");
  });
  it("reopens the menu without making the unavailable dish selectable", () => {
    const challenge = restaurantReducer(initialRestaurantState, { type: "choose", meal: "pasta" });
    const reopened = restaurantReducer(challenge, { type: "menu" });
    expect(reopened).toMatchObject({ step: "alternative", unavailable: "pasta", fullMenu: true });
    expect(restaurantReducer(reopened, { type: "choose", meal: "pasta" })).toBe(reopened);
  });
  it("allows changing an alternative before confirming and ignores actions after completion", () => {
    const first = restaurantReducer(initialRestaurantState, { type: "choose", meal: "pasta" });
    const second = restaurantReducer(first, { type: "choose", meal: "soup" });
    expect(restaurantReducer(second, { type: "change" })).toMatchObject({ step: "alternative", selected: null });
    const drinkChoice = restaurantReducer(restaurantReducer(second, { type: "confirm" }), { type: "chooseDrink", drink: "water" });
    const completed = restaurantReducer(drinkChoice, { type: "placeOrder" });
    expect(restaurantReducer(completed, { type: "choose", meal: "salad" })).toBe(completed);
    expect(restaurantReducer(initialRestaurantState, { type: "confirm" })).toBe(initialRestaurantState);
  });
  it.each(drinks)("requires final confirmation for %s and preserves the meal when changing drinks", (drink) => {
    const challenge = restaurantReducer(initialRestaurantState, { type: "choose", meal: "pasta" });
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
      expect(Object.keys(text.steps).sort()).toEqual(["alternative", "confirmation", "menu", "success"]);
      for (const value of Object.values(text)) if (typeof value === "string") expect(value.trim()).not.toBe("");
    }
  });
});
