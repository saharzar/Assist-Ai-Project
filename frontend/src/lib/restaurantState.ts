import { restaurantMenuItems } from "./restaurantMenu";

export const meals = ["pasta", "chicken", "pizza", "rice", "burger", "fish", "steak", "wrap", "lasagna", "risotto", "salad", "caesar", "tomatoCucumber", "greekSalad", "tunaSalad", "quinoaSalad", "chickenSalad", "avocadoSalad", "pastaSalad", "soup", "lentil", "vegetableSoup", "tomatoSoup", "mushroomSoup", "chickenSoup", "pumpkinSoup", "minestrone", "broccoliSoup"] as const;
export type Meal = typeof meals[number];
export const menuCategories = ["mains", "salads", "soups", "desserts", "drinks"] as const;
export type MenuCategory = typeof menuCategories[number];
export type RestaurantStep = "menu" | "alternative" | "confirmation" | "success";
export const drinks = ["water", "juice", "none"] as const;
export type Drink = typeof drinks[number];
export type RestaurantFlowStep = RestaurantStep | "menuCover" | "alternativeCover" | "drink" | "drinkCover" | "orderConfirmation" | "review";
export type RestaurantOrder = Record<MenuCategory, string | null>;
export const requiredOrderCategories: readonly MenuCategory[] = ["mains"];
export const optionalOrderCategories: readonly MenuCategory[] = ["salads", "soups", "desserts", "drinks"];
export const emptyRestaurantOrder: RestaurantOrder = { mains: null, salads: null, soups: null, desserts: null, drinks: null };
export type RestaurantState = { step: RestaurantFlowStep; category: MenuCategory; unavailable: Meal | null; selected: Meal | null; fullMenu: boolean; drink: Drink | null; order: RestaurantOrder };
export const initialRestaurantState: RestaurantState = { step: "menuCover", category: "mains", unavailable: null, selected: null, fullMenu: false, drink: null, order: emptyRestaurantOrder };
export type RestaurantAction = { type: "openMenu" } | { type: "closeMenu" } | { type: "category"; category: MenuCategory }
  | { type: "choose"; meal: Meal } | { type: "menu" } | { type: "confirm" } | { type: "change" }
  | { type: "chooseDrink"; drink: Drink } | { type: "changeDrink" } | { type: "changeMeal" } | { type: "placeOrder" }
  | { type: "selectItem"; category: MenuCategory; id: string } | { type: "removeItem"; category: MenuCategory }
  | { type: "reviewOrder" } | { type: "changeOrder" } | { type: "confirmOrder" };
export function restaurantReducer(state: RestaurantState, action: RestaurantAction): RestaurantState {
  if (action.type === "selectItem" && (state.step === "menu" || state.step === "alternative")) {
    if (!restaurantMenuItems.some((item) => item.category === action.category && item.id === action.id) && !(action.category === "drinks" && action.id === "none")) return state;
    if (action.category === "mains" && action.id === state.unavailable) return state;
    if (action.category === "mains" && state.unavailable === null) return { ...state, step: "alternative", category: "mains", unavailable: action.id as Meal, order: { ...state.order, mains: null } };
    return { ...state, order: { ...state.order, [action.category]: action.id }, selected: action.category === "mains" ? action.id as Meal : state.selected, fullMenu: action.category === "mains" ? true : state.fullMenu };
  }
  if (action.type === "removeItem" && (state.step === "menu" || state.step === "alternative") && menuCategories.includes(action.category))
    return { ...state, order: { ...state.order, [action.category]: null }, selected: action.category === "mains" ? null : state.selected };
  if (action.type === "reviewOrder" && (state.step === "menu" || state.step === "alternative") && requiredOrderCategories.every((category) => state.order[category]))
    return { ...state, step: "review" };
  if (action.type === "changeOrder" && state.step === "review") return { ...state, step: state.unavailable ? "alternative" : "menu" };
  if (action.type === "confirmOrder" && state.step === "review" && requiredOrderCategories.every((category) => state.order[category])) return { ...state, step: "success" };
  if (action.type === "openMenu" && (state.step === "menuCover" || state.step === "alternativeCover" || state.step === "drinkCover")) return { ...state, step: state.step === "menuCover" ? "menu" : state.step === "drinkCover" ? "drink" : "alternative" };
  if (action.type === "closeMenu" && state.step === "menu") return { ...state, step: "menuCover" };
  if (action.type === "closeMenu" && state.step === "alternative") return { ...state, step: "alternativeCover" };
  if (action.type === "closeMenu" && state.step === "drink") return { ...state, step: "drinkCover" };
  if (action.type === "category" && (state.step === "menu" || state.step === "alternative") && menuCategories.includes(action.category)) return { ...state, category: action.category };
  if (action.type === "choose" && meals.includes(action.meal)) {
    if (state.step === "menu") return { ...state, step: "alternative", category: "mains", unavailable: action.meal };
    if (state.step === "alternative" && action.meal !== state.unavailable) return { ...state, step: "confirmation", selected: action.meal };
  }
  if (action.type === "menu" && state.step === "alternative") return { ...state, fullMenu: true };
  if (action.type === "change" && state.step === "confirmation") return { ...state, step: "alternative", selected: null, fullMenu: true };
  if (action.type === "confirm" && state.step === "confirmation" && state.selected) return { ...state, step: state.drink ? "orderConfirmation" : "drink", category: state.drink ? state.category : "drinks" };
  if (action.type === "chooseDrink" && state.step === "drink" && state.selected && drinks.includes(action.drink)) return { ...state, step: "orderConfirmation", drink: action.drink };
  if (action.type === "changeDrink" && state.step === "orderConfirmation") return { ...state, step: "drink", category: "drinks", drink: null };
  if (action.type === "changeMeal" && state.step === "orderConfirmation") return { ...state, step: "alternative", selected: null, fullMenu: true };
  if (action.type === "placeOrder" && state.step === "orderConfirmation" && state.selected && state.drink) return { ...state, step: "success" };
  return state;
}
