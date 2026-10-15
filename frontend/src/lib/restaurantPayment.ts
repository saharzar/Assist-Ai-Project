import type { Drink, Meal } from "./restaurantState";

export type RestaurantPaymentMethod = "card" | "cash";
export type RestaurantPaymentPhase = "method" | "card" | "cash" | "processing" | "paid" | "receipt";
export type RestaurantPaymentState = { phase: RestaurantPaymentPhase; method: RestaurantPaymentMethod | null };
export type RestaurantPaymentAction = { type: "method"; method: RestaurantPaymentMethod } | { type: "pay" } | { type: "complete" } | { type: "receipt" };
export const initialRestaurantPayment: RestaurantPaymentState = { phase: "method", method: null };
export const RESTAURANT_PAYMENT_DELAY_MS = 1400;
export const RESTAURANT_RECEIPT_DELAY_MS = 2800;

export function restaurantPaymentReducer(state: RestaurantPaymentState, action: RestaurantPaymentAction): RestaurantPaymentState {
  if (action.type === "method" && state.phase === "method" && (action.method === "card" || action.method === "cash")) return { phase: action.method, method: action.method };
  if (action.type === "pay" && (state.phase === "card" || state.phase === "cash")) return { ...state, phase: "processing" };
  if (action.type === "complete" && state.phase === "processing") return { ...state, phase: "paid" };
  if (action.type === "receipt" && state.phase === "paid") return { ...state, phase: "receipt" };
  return state;
}

// Fixed training prices in minor currency units; never live exchange rates.
const prices = {
  eur: { meals: { pasta: 1000, chicken: 1400, salad: 800, soup: 700 }, drinks: { water: 200, juice: 300, none: 0 } },
  try: { meals: { pasta: 32000, chicken: 42000, salad: 26000, soup: 22000 }, drinks: { water: 5000, juice: 8000, none: 0 } },
};
export function getRestaurantMealPrice(meal: Meal, language: string) {
  return prices[language === "tr" ? "try" : "eur"].meals[meal];
}
export function getRestaurantDrinkPrice(drink: Drink, language: string) {
  return prices[language === "tr" ? "try" : "eur"].drinks[drink];
}
export function getRestaurantReceipt(meal: Meal, drink: Drink, language = "en") {
  const mealCents = getRestaurantMealPrice(meal, language);
  const drinkCents = getRestaurantDrinkPrice(drink, language);
  return { mealCents, drinkCents, totalCents: mealCents + drinkCents };
}
export function formatRestaurantPrice(cents: number, language: string) {
  return new Intl.NumberFormat(language, { style: "currency", currency: language === "tr" ? "TRY" : "EUR", minimumFractionDigits: language === "tr" ? 0 : 2, maximumFractionDigits: language === "tr" ? 0 : 2 }).format(cents / 100);
}
