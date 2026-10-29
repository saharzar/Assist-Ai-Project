import { restaurantMenuItems } from "./restaurantMenu";

export const meals = ["pasta", "chicken", "pizza", "rice", "burger", "fish", "steak", "wrap", "lasagna", "risotto", "salad", "caesar", "tomatoCucumber", "greekSalad", "tunaSalad", "quinoaSalad", "chickenSalad", "avocadoSalad", "pastaSalad", "soup", "lentil", "vegetableSoup", "tomatoSoup", "mushroomSoup", "chickenSoup", "pumpkinSoup", "minestrone", "broccoliSoup"] as const;
export type Meal = typeof meals[number];
export const menuCategories = ["mains", "salads", "soups", "desserts", "drinks"] as const;
export type MenuCategory = typeof menuCategories[number];
export type RestaurantStep = "menu" | "alternative" | "confirmation" | "success";
export const drinks = ["water", "juice", "none"] as const;
export type Drink = typeof drinks[number];
export type RestaurantFlowStep = RestaurantStep | "menuCover" | "alternativeCover" | "drink" | "drinkCover" | "orderConfirmation" | "review";
export type RestaurantOrderLine = { item_id: string; quantity: number };
export type RestaurantOrder = Record<MenuCategory, string | null> & { lines: RestaurantOrderLine[] };
export const requiredOrderCategories: readonly MenuCategory[] = ["mains"];
export const optionalOrderCategories: readonly MenuCategory[] = ["salads", "soups", "desserts", "drinks"];
export const emptyRestaurantOrder: RestaurantOrder = { mains: null, salads: null, soups: null, desserts: null, drinks: null, lines: [] };
export type RestaurantState = { step: RestaurantFlowStep; category: MenuCategory; unavailable: Meal | null; selected: Meal | null; fullMenu: boolean; drink: Drink | null; order: RestaurantOrder };
export const initialRestaurantState: RestaurantState = { step: "menuCover", category: "mains", unavailable: null, selected: null, fullMenu: false, drink: null, order: emptyRestaurantOrder };
const hasMainDish = (order: RestaurantOrder) => order.lines.some((line) => line.quantity > 0 &&
  restaurantMenuItems.some((item) => item.id === line.item_id && item.category === "mains"));
export type RestaurantAction = { type: "openMenu" } | { type: "closeMenu" } | { type: "category"; category: MenuCategory }
  | { type: "choose"; meal: Meal } | { type: "menu" } | { type: "confirm" } | { type: "change" }
  | { type: "chooseDrink"; drink: Drink } | { type: "changeDrink" } | { type: "changeMeal" } | { type: "placeOrder" }
  | { type: "selectItem"; category: MenuCategory; id: string; quantity?: number } | { type: "removeItem"; category: MenuCategory; id?: string }
  | { type: "setQuantity"; category: MenuCategory; id: string; quantity: number }
  | { type: "reviewOrder" } | { type: "changeOrder" } | { type: "confirmOrder" };
export function restaurantReducer(state: RestaurantState, action: RestaurantAction): RestaurantState {
  if (action.type === "selectItem" && (state.step === "menu" || state.step === "alternative")) {
    if (!restaurantMenuItems.some((item) => item.category === action.category && item.id === action.id) && !(action.category === "drinks" && action.id === "none")) return state;
    if (action.category === "mains" && action.id === state.unavailable) return state;
    if (action.category === "mains" && state.unavailable === null) return { ...state, step: "alternative", category: "mains", unavailable: action.id as Meal };
    const quantity = action.quantity ?? 1;
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) return state;
    const current = state.order.lines.find((line) => line.item_id === action.id)?.quantity ?? 0;
    if (current + quantity > 99) return state;
    const lines = current
      ? state.order.lines.map((line) => line.item_id === action.id ? { ...line, quantity: current + quantity } : line)
      : [...state.order.lines, { item_id: action.id, quantity }];
    return { ...state, order: { ...state.order, [action.category]: action.id, lines }, selected: action.category === "mains" ? action.id as Meal : state.selected, fullMenu: action.category === "mains" ? true : state.fullMenu };
  }
  if (action.type === "setQuantity" && (state.step === "menu" || state.step === "alternative") && Number.isInteger(action.quantity) && action.quantity >= 0 && action.quantity <= 99) {
    const current = state.order.lines.find((line) => line.item_id === action.id);
    if (!current || !restaurantMenuItems.some((item) => item.category === action.category && item.id === action.id)) return state;
    const lines = action.quantity
      ? state.order.lines.map((line) => line.item_id === action.id ? { ...line, quantity: action.quantity } : line)
      : state.order.lines.filter((line) => line.item_id !== action.id);
    const remaining = lines.filter((line) => restaurantMenuItems.some((item) => item.category === action.category && item.id === line.item_id));
    return { ...state, order: { ...state.order, lines, [action.category]: remaining[remaining.length - 1]?.item_id ?? null },
      selected: action.category === "mains" ? (remaining[remaining.length - 1]?.item_id as Meal | undefined) ?? null : state.selected };
  }
  if (action.type === "removeItem" && (state.step === "menu" || state.step === "alternative") && menuCategories.includes(action.category)) {
    const lines = state.order.lines.filter((line) => action.id ? line.item_id !== action.id : !restaurantMenuItems.some((item) => item.category === action.category && item.id === line.item_id));
    const remaining = lines.filter((line) => restaurantMenuItems.some((item) => item.category === action.category && item.id === line.item_id));
    return { ...state, order: { ...state.order, lines, [action.category]: remaining[remaining.length - 1]?.item_id ?? null },
      selected: action.category === "mains" ? (remaining[remaining.length - 1]?.item_id as Meal | undefined) ?? null : state.selected };
  }
  if (action.type === "reviewOrder" && (state.step === "menu" || state.step === "alternative") && hasMainDish(state.order))
    return { ...state, step: "review" };
  if (action.type === "changeOrder" && state.step === "review") return { ...state, step: state.unavailable ? "alternative" : "menu" };
  if (action.type === "confirmOrder" && state.step === "review" && hasMainDish(state.order)) return { ...state, step: "success" };
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
