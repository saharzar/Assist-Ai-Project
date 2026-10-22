import type { LanguageCode } from "../i18n";
import type { MenuCategory, RestaurantOrder, RestaurantState } from "../lib/restaurantState";
import type { RestaurantPaymentState } from "../lib/restaurantPayment";
import { apiRequest } from "./api";

export type RestaurantWaiterTurn = { role: "user" | "assistant"; content: string };
export type RestaurantPendingClarification = {
  action: "add_item" | "remove_item" | "replace_item";
  item_query: string;
  replacement_query?: string | null;
  matches: string[];
  clarify_field: "item" | "replacement";
};
export type RestaurantWaiterSnapshot = {
  step: RestaurantState["step"]; category: MenuCategory; unavailable: string | null;
  order: RestaurantOrder; payment_phase: RestaurantPaymentState["phase"];
  payment_method: RestaurantPaymentState["method"];
};
export type RestaurantWaiterAction = {
  type: "OPEN_MENU" | "SHOW_MENU_CATEGORY" | "SHOW_MENU_ITEM" | "SELECT_ITEM" | "REMOVE_ITEM" |
    "REVIEW_ORDER" | "CHANGE_ORDER" | "CONFIRM_ORDER" | "CHOOSE_PAYMENT_METHOD";
  category?: MenuCategory | null; item_id?: string | null; method?: "card" | "cash" | null;
};
export type RestaurantWaiterChatRequest = {
  message: string;
  language: LanguageCode;
  history: RestaurantWaiterTurn[];
  state: RestaurantWaiterSnapshot;
  pending?: RestaurantPendingClarification | null;
};
export type RestaurantWaiterChatResponse = {
  reply: string; actions: RestaurantWaiterAction[]; state: RestaurantWaiterSnapshot;
  pending?: RestaurantPendingClarification | null;
};

export function restaurantWaiterSnapshot(state: RestaurantState, payment: RestaurantPaymentState): RestaurantWaiterSnapshot {
  return { step: state.step, category: state.category, unavailable: state.unavailable,
    order: { ...state.order }, payment_phase: payment.phase, payment_method: payment.method };
}

export async function chatWithRestaurantWaiter(payload: RestaurantWaiterChatRequest, signal?: AbortSignal) {
  const response = await apiRequest<RestaurantWaiterChatResponse>("/api/restaurant/waiter/chat", {
    method: "POST",
    body: JSON.stringify(payload),
    signal,
  });
  if (typeof response?.reply !== "string" || !response.reply.trim() ||
      !Array.isArray(response.actions) || !response.state || typeof response.state !== "object") {
    throw new Error("The waiter returned an invalid reply.");
  }
  return { ...response, reply: response.reply.trim() };
}
