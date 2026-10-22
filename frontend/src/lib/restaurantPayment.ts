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
  eur: { meals: { pasta: 1000, chicken: 1400, pizza: 1200, rice: 1100, burger: 1350, fish: 1550, steak: 2200, wrap: 1200, lasagna: 1450, risotto: 1400, salad: 800, caesar: 950, tomatoCucumber: 850, greekSalad: 1000, tunaSalad: 1150, quinoaSalad: 1050, chickenSalad: 1200, avocadoSalad: 1100, pastaSalad: 1000, soup: 700, lentil: 750, vegetableSoup: 750, tomatoSoup: 800, mushroomSoup: 850, chickenSoup: 900, pumpkinSoup: 800, minestrone: 850, broccoliSoup: 800 }, drinks: { water: 200, juice: 300, none: 0 } },
  try: { meals: { pasta: 32000, chicken: 42000, pizza: 38000, rice: 35000, burger: 41000, fish: 47000, steak: 68000, wrap: 38000, lasagna: 45000, risotto: 43000, salad: 26000, caesar: 30000, tomatoCucumber: 27000, greekSalad: 32000, tunaSalad: 36000, quinoaSalad: 33000, chickenSalad: 38000, avocadoSalad: 35000, pastaSalad: 32000, soup: 22000, lentil: 24000, vegetableSoup: 24000, tomatoSoup: 26000, mushroomSoup: 28000, chickenSoup: 30000, pumpkinSoup: 26000, minestrone: 28000, broccoliSoup: 26000 }, drinks: { water: 5000, juice: 8000, none: 0 } },
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
