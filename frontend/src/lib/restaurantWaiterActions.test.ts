import { describe, expect, it } from "vitest";
import { previewRestaurantWaiterActions, sameRestaurantSnapshot } from "./restaurantWaiterActions";
import { initialRestaurantPayment } from "./restaurantPayment";
import { initialRestaurantState, restaurantReducer, type RestaurantState } from "./restaurantState";
import { restaurantWaiterSnapshot, type RestaurantWaiterAction } from "../services/restaurantWaiterChatService";

const base = (): RestaurantState => ({ ...initialRestaurantState, order: { ...initialRestaurantState.order } });
const ready = (): RestaurantState => ({ ...base(), step: "alternative", unavailable: "pasta", order: { ...base().order, mains: "pizza", drinks: "water" } });
const preview = (state: RestaurantState, actions: RestaurantWaiterAction[]) => previewRestaurantWaiterActions(state, initialRestaurantPayment, actions);

describe("validated Restaurant waiter action projection", () => {
  it("opens the physical menu and navigates to desserts and cheesecake", () => {
    const result = preview(base(), [
      { type: "OPEN_MENU" }, { type: "SHOW_MENU_CATEGORY", category: "desserts" },
      { type: "SHOW_MENU_ITEM", item_id: "cheesecake" },
    ]);
    expect(result?.snapshot.step).toBe("menu");
    expect(result?.snapshot.category).toBe("desserts");
    expect(result?.focusItemId).toBe("cheesecake");
    expect(result?.restaurantActions).toEqual([{ type: "openMenu" }, { type: "category", category: "desserts" }]);
  });

  it("adds, removes, and replaces through the existing reducer", () => {
    const current = ready();
    const result = preview(current, [
      { type: "SELECT_ITEM", category: "salads", item_id: "caesar" },
      { type: "REMOVE_ITEM", category: "drinks" },
      { type: "SELECT_ITEM", category: "mains", item_id: "chicken" },
    ]);
    expect(result?.snapshot.order).toMatchObject({ mains: "chicken", salads: "caesar", drinks: null });
    expect(current.order).toMatchObject({ mains: "pizza", salads: null, drinks: "water" });
  });

  it("preserves the first-main unavailability step", () => {
    const opened = restaurantReducer(base(), { type: "openMenu" });
    const result = preview(opened, [{ type: "SELECT_ITEM", category: "mains", item_id: "pasta" }]);
    expect(result?.snapshot.step).toBe("alternative");
    expect(result?.snapshot.unavailable).toBe("pasta");
    expect(result?.snapshot.order.mains).toBeNull();
  });

  it("reviews, returns to the menu, and selects simulated card or cash", () => {
    const reviewed = preview(ready(), [{ type: "REVIEW_ORDER" }]);
    expect(reviewed?.snapshot.step).toBe("review");
    const back = preview({ ...ready(), step: "review" }, [{ type: "CHANGE_ORDER" }]);
    expect(back?.snapshot.step).toBe("alternative");
    expect(back?.snapshot.order.mains).toBe("pizza");
    const payment = preview({ ...ready(), step: "review" }, [{ type: "CONFIRM_ORDER" }, { type: "CHOOSE_PAYMENT_METHOD", method: "card" }]);
    expect(payment?.snapshot.step).toBe("success");
    expect(payment?.snapshot.payment_phase).toBe("card");
    const cash = preview({ ...ready(), step: "success" }, [{ type: "CHOOSE_PAYMENT_METHOD", method: "cash" }]);
    expect(cash?.snapshot.payment_phase).toBe("cash");
  });

  it("rejects unsupported or mismatched actions and compares fresh state", () => {
    expect(preview(ready(), [{ type: "DROP_DATABASE" } as unknown as RestaurantWaiterAction])).toBeNull();
    expect(preview(ready(), [{ type: "SELECT_ITEM", category: "drinks", item_id: "pizza" }])).toBeNull();
    expect(preview(ready(), [{ type: "SHOW_MENU_ITEM", item_id: "cheesecake" }])).toBeNull();
    const before = restaurantWaiterSnapshot(ready(), initialRestaurantPayment);
    const changed = { ...before, order: { ...before.order, drinks: null } };
    expect(sameRestaurantSnapshot(before, changed)).toBe(false);
  });

  it("keeps manual controls working after an approved waiter selection", () => {
    const initial = ready();
    const approved = preview(initial, [{ type: "SELECT_ITEM", category: "salads", item_id: "caesar" }]);
    expect(approved).not.toBeNull();
    const afterWaiter = approved!.restaurantActions.reduce(restaurantReducer, initial);
    const afterManualCategory = restaurantReducer(afterWaiter, { type: "category", category: "drinks" });
    const afterManualSelection = restaurantReducer(afterManualCategory, { type: "selectItem", category: "drinks", id: "orangeJuice" });
    expect(afterManualSelection.order).toMatchObject({ mains: "pizza", salads: "caesar", drinks: "orangeJuice" });
    expect(afterManualSelection.category).toBe("drinks");
  });
});
