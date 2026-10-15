export const meals = ["pasta", "chicken", "salad", "soup"] as const;
export type Meal = typeof meals[number];
export type RestaurantStep = "menu" | "alternative" | "confirmation" | "success";
export const drinks = ["water", "juice", "none"] as const;
export type Drink = typeof drinks[number];
export type RestaurantFlowStep = RestaurantStep | "drink" | "orderConfirmation";
export type RestaurantState = { step: RestaurantFlowStep; unavailable: Meal | null; selected: Meal | null; fullMenu: boolean; drink: Drink | null };
export const initialRestaurantState: RestaurantState = { step: "menu", unavailable: null, selected: null, fullMenu: false, drink: null };
export type RestaurantAction = { type: "choose"; meal: Meal } | { type: "menu" } | { type: "confirm" } | { type: "change" }
  | { type: "chooseDrink"; drink: Drink } | { type: "changeDrink" } | { type: "changeMeal" } | { type: "placeOrder" };
export function restaurantReducer(state: RestaurantState, action: RestaurantAction): RestaurantState {
  if (action.type === "choose" && meals.includes(action.meal)) {
    if (state.step === "menu") return { ...state, step: "alternative", unavailable: action.meal };
    if (state.step === "alternative" && action.meal !== state.unavailable) return { ...state, step: "confirmation", selected: action.meal };
  }
  if (action.type === "menu" && state.step === "alternative") return { ...state, fullMenu: true };
  if (action.type === "change" && state.step === "confirmation") return { ...state, step: "alternative", selected: null, fullMenu: true };
  if (action.type === "confirm" && state.step === "confirmation" && state.selected) return { ...state, step: state.drink ? "orderConfirmation" : "drink" };
  if (action.type === "chooseDrink" && state.step === "drink" && state.selected && drinks.includes(action.drink)) return { ...state, step: "orderConfirmation", drink: action.drink };
  if (action.type === "changeDrink" && state.step === "orderConfirmation") return { ...state, step: "drink", drink: null };
  if (action.type === "changeMeal" && state.step === "orderConfirmation") return { ...state, step: "alternative", selected: null, fullMenu: true };
  if (action.type === "placeOrder" && state.step === "orderConfirmation" && state.selected && state.drink) return { ...state, step: "success" };
  return state;
}
