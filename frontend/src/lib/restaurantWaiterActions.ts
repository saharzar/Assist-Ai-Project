import { restaurantMenuItems } from "./restaurantMenu";
import { restaurantPaymentReducer, type RestaurantPaymentAction, type RestaurantPaymentState } from "./restaurantPayment";
import { menuCategories, restaurantReducer, type RestaurantAction, type RestaurantState } from "./restaurantState";
import { restaurantWaiterSnapshot, type RestaurantWaiterAction, type RestaurantWaiterSnapshot } from "../services/restaurantWaiterChatService";

export function sameRestaurantSnapshot(left: RestaurantWaiterSnapshot, right: RestaurantWaiterSnapshot): boolean {
  return left.step === right.step && left.category === right.category && left.unavailable === right.unavailable &&
    left.payment_phase === right.payment_phase && left.payment_method === right.payment_method &&
    menuCategories.every((category) => left.order[category] === right.order[category]);
}

export function previewRestaurantWaiterActions(state: RestaurantState, payment: RestaurantPaymentState,
  actions: RestaurantWaiterAction[]): { snapshot: RestaurantWaiterSnapshot; restaurantActions: RestaurantAction[];
    paymentActions: RestaurantPaymentAction[]; focusItemId: string | null } | null {
  if (actions.length > 8) return null;
  let nextState = state;
  let nextPayment = payment;
  let focusItemId: string | null = null;
  const restaurantActions: RestaurantAction[] = [];
  const paymentActions: RestaurantPaymentAction[] = [];
  const apply = (action: RestaurantAction) => { nextState = restaurantReducer(nextState, action); restaurantActions.push(action); };
  for (const action of actions) {
    if (!action || typeof action !== "object") return null;
    switch (action.type) {
      case "OPEN_MENU": apply({ type: "openMenu" }); break;
      case "SHOW_MENU_CATEGORY":
        if (!action.category || !menuCategories.includes(action.category)) return null;
        apply({ type: "category", category: action.category }); break;
      case "SHOW_MENU_ITEM": {
        const item = restaurantMenuItems.find((entry) => entry.id === action.item_id);
        if (!item || nextState.category !== item.category || (nextState.step !== "menu" && nextState.step !== "alternative")) return null;
        focusItemId = item.id; break;
      }
      case "SELECT_ITEM": {
        const item = restaurantMenuItems.find((entry) => entry.id === action.item_id && entry.category === action.category);
        if (!item) return null;
        apply({ type: "selectItem", category: item.category, id: item.id }); break;
      }
      case "REMOVE_ITEM":
        if (!action.category || !menuCategories.includes(action.category)) return null;
        apply({ type: "removeItem", category: action.category }); break;
      case "REVIEW_ORDER": apply({ type: "reviewOrder" }); break;
      case "CHANGE_ORDER": apply({ type: "changeOrder" }); break;
      case "CONFIRM_ORDER": apply({ type: "confirmOrder" }); break;
      case "CHOOSE_PAYMENT_METHOD": {
        if (action.method !== "card" && action.method !== "cash") return null;
        const paymentAction = { type: "method" as const, method: action.method };
        nextPayment = restaurantPaymentReducer(nextPayment, paymentAction);
        paymentActions.push(paymentAction);
        break;
      }
      default: return null;
    }
  }
  return { snapshot: restaurantWaiterSnapshot(nextState, nextPayment), restaurantActions, paymentActions, focusItemId };
}
