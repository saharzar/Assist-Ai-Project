import { Children, isValidElement, type ReactElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RestaurantIntroductionPage, RestaurantOrderAttempt, RestaurantScenarioPage as RestaurantPage } from "./RestaurantScenarioPage";
import { initialRestaurantState, restaurantReducer, type RestaurantAction, type RestaurantState } from "../../lib/restaurantState";
import { restaurantTranslations } from "../../lib/restaurantTranslations";
import { useFaceTracking } from "../../hooks/useFaceTracking";
import { playSuccessSound, stopSuccessSound } from "../../services/speechSynthesisService";
import type { LanguageCode } from "../../i18n";
import { formatRestaurantPrice, getRestaurantReceipt, initialRestaurantPayment, restaurantPaymentReducer, RESTAURANT_PAYMENT_DELAY_MS, RESTAURANT_RECEIPT_DELAY_MS, type RestaurantPaymentAction, type RestaurantPaymentState } from "../../lib/restaurantPayment";
import { restaurantPaymentTranslations } from "../../lib/restaurantPaymentTranslations";
import { RestaurantPaymentPanel } from "../../components/restaurant/RestaurantPaymentPanel";
const state = vi.hoisted(() => ({ current: null as RestaurantState | null, payment: { phase: "method", method: null } as RestaurantPaymentState, language: "en" as LanguageCode, event: vi.fn(), restart: vi.fn(), wrapperMode: false, attempt: 0, getSessionId: () => "restaurant-attempt", effects: [] as (() => void | (() => void))[] }));
vi.mock("react", async (original) => {
  const react = await original<typeof import("react")>();
  return { ...react,
  useState: (initial: unknown) => state.wrapperMode && typeof initial === "number"
    ? [state.attempt, (update: (current: number) => number) => { state.attempt = update(state.attempt); }]
    : react.useState(initial),
  useReducer: (_reducer: unknown, initial: RestaurantState | RestaurantPaymentState) => "phase" in initial
    ? [state.payment, (action: RestaurantPaymentAction) => { state.payment = restaurantPaymentReducer(state.payment, action); }]
    : [state.current ?? initial, (action: RestaurantAction) => { state.current = restaurantReducer(state.current ?? initial, action); }],
  useRef: () => ({ current: null }), useEffect: (effect: () => void | (() => void)) => { state.effects.push(effect); },
}; });
vi.mock("react-router-dom", () => ({ Link: ({ to, children }: { to: string; children: ReactNode }) => <a href={to}>{children}</a> }));
vi.mock("../../i18n", () => ({ useTranslation: () => ({ language: state.language }) }));
vi.mock("../../hooks/useRestaurantAnalytics", () => ({ useRestaurantAnalytics: () => ({ event: state.event, getSessionId: state.getSessionId }) }));
vi.mock("../../hooks/useFaceTracking", () => ({ useFaceTracking: vi.fn(() => ({ getPreviewFrame: () => null })) }));
vi.mock("../../services/speechSynthesisService", () => ({ playSuccessSound: vi.fn(), stopSuccessSound: vi.fn() }));
vi.mock("../../components/AdminFaceTrackingPreview", () => ({ AdminFaceTrackingPreview: () => null }));
vi.mock("../../components/atm/AtmSetupVoiceAssistant", () => ({ AtmSetupVoiceAssistant: ({ message }: { message: string }) => <aside data-spoken-message={message} /> }));
vi.mock("../../components/ScenarioStartButton", () => ({ ScenarioStartButton: ({ to, children }: { to: string; children: ReactNode }) => <a href={to}>{children}</a> }));

function elements(node: ReactNode): ReactElement<Record<string, unknown>>[] {
  if (!isValidElement<{ children?: ReactNode }>(node)) return [];
  if (node.type === RestaurantPaymentPanel) return elements(RestaurantPaymentPanel(node.props as Parameters<typeof RestaurantPaymentPanel>[0]));
  return [node as ReactElement<Record<string, unknown>>, ...Children.toArray(node.props.children).flatMap(elements)];
}
function RestaurantScenarioPage() { return RestaurantOrderAttempt({ onOrderAgain: state.restart }); }
function click(label: string) {
  const element = elements(RestaurantScenarioPage()).find((node) => node.type === "button" && renderToStaticMarkup(node).includes(label));
  expect(element).toBeDefined(); (element!.props.onClick as () => void)();
}
function finishPayment(method: "card" | "cash" = "card") {
  const text = restaurantPaymentTranslations[state.language];
  click(text[method]); click(method === "card" ? text.tap : text.give);
  state.payment = restaurantPaymentReducer(state.payment, { type: "complete" });
  state.payment = restaurantPaymentReducer(state.payment, { type: "receipt" });
}
beforeEach(() => { vi.clearAllMocks(); state.current = initialRestaurantState; state.payment = initialRestaurantPayment; state.language = "en"; state.effects = []; state.wrapperMode = false; state.attempt = 0; });
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

describe("restaurant scenario UI", () => {
  it.each(["card", "cash"] as const)("completes the simulated %s payment and shows the right receipt", (method) => {
    const text = restaurantPaymentTranslations.en;
    click("Pasta"); click("Soup"); click("Confirm selection"); click("Water"); click("Yes, place my order");
    expect(renderToStaticMarkup(RestaurantScenarioPage())).toContain(text.totalQuestion.replace("{total}", "€9.00"));
    expect(state.event.mock.calls.filter(([event]) => event === "order_confirmed")).toHaveLength(1);
    click(text[method]);
    expect(renderToStaticMarkup(RestaurantScenarioPage())).toContain(method === "card" ? text.cardInstruction : text.cashInstruction);
    click(method === "card" ? text.tap : text.give);
    expect(state.payment.phase).toBe("processing");
    const processing = renderToStaticMarkup(RestaurantScenarioPage());
    expect(processing).toContain("disabled");
    expect(processing).toContain(method === "card" ? "restaurant-card-tap" : "restaurant-cash-give");
    state.payment = restaurantPaymentReducer(state.payment, { type: "complete" });
    expect(renderToStaticMarkup(RestaurantScenarioPage())).toContain(method === "card" ? text.cardSuccess : text.cashSuccess);
    state.payment = restaurantPaymentReducer(state.payment, { type: "receipt" });
    const receipt = renderToStaticMarkup(RestaurantScenarioPage());
    expect(receipt).toContain("Soup"); expect(receipt).toContain("Water");
    expect(receipt).toContain("€9.00"); expect(receipt).toContain(method === "card" ? text.cardLabel : text.cashLabel); expect(receipt).toContain(text.paid);
    expect(receipt).not.toContain("<input");
    expect(receipt).toContain("data-drink-illustration=\"water\"");
    expect(state.event.mock.calls.filter(([event]) => event === "order_confirmed")).toHaveLength(1);
    click("Order again"); expect(state.restart).toHaveBeenCalledOnce();
  });
  it.each(["en", "es", "de", "tr", "pt", "fr"] as const)("keeps payment dialogue and TTS aligned for every payment stage in %s", (language) => {
    state.language = language;
    state.current = { ...initialRestaurantState, step: "success", selected: "salad", drink: "none" };
    const text = restaurantPaymentTranslations[language];
    const stages: [RestaurantPaymentState, string][] = [
      [initialRestaurantPayment, text.totalQuestion.replace("{total}", formatRestaurantPrice(getRestaurantReceipt("salad", "none", language).totalCents, language))], [{ phase: "card", method: "card" }, text.cardInstruction],
      [{ phase: "cash", method: "cash" }, text.cashInstruction], [{ phase: "processing", method: "card" }, text.processing],
      [{ phase: "paid", method: "card" }, text.cardSuccess], [{ phase: "paid", method: "cash" }, text.cashSuccess],
      [{ phase: "receipt", method: "cash" }, text.complete],
    ];
    for (const [payment, message] of stages) {
      state.payment = payment;
      const html = renderToStaticMarkup(RestaurantScenarioPage());
      const escaped = renderToStaticMarkup(<span>{message}</span>).slice(6, -7);
      expect(html).toContain(`data-spoken-message="${escaped}"`);
      expect(html).toContain(`aria-live="polite">${escaped}</p>`);
      expect(html).toContain("restaurant-counter.png");
      expect(html).not.toContain("<input");
    }
  });
  it.each(["card", "cash"] as const)("automatically shows the %s receipt after success and clears timers on exit", (method) => {
    vi.useFakeTimers();
    vi.stubGlobal("window", { setTimeout, clearTimeout });
    state.current = { ...initialRestaurantState, step: "success", selected: "soup", drink: "none" };
    state.payment = { phase: "processing", method };
    RestaurantScenarioPage();
    let cleanups = state.effects.map((effect) => effect());
    vi.advanceTimersByTime(RESTAURANT_PAYMENT_DELAY_MS - 1);
    expect(state.payment.phase).toBe("processing");
    vi.advanceTimersByTime(1);
    expect(state.payment.phase).toBe("paid");
    cleanups.forEach((cleanup) => cleanup?.());
    state.effects = [];
    RestaurantScenarioPage();
    cleanups = state.effects.map((effect) => effect());
    const paidHtml = renderToStaticMarkup(RestaurantScenarioPage());
    expect(paidHtml).not.toContain("See receipt");
    expect(paidHtml).not.toContain("Order again");
    vi.advanceTimersByTime(RESTAURANT_RECEIPT_DELAY_MS - 1);
    expect(state.payment.phase).toBe("paid");
    vi.advanceTimersByTime(1);
    expect(state.payment.phase).toBe("receipt");
    expect(renderToStaticMarkup(RestaurantScenarioPage())).toContain("Order again");
    cleanups.forEach((cleanup) => cleanup?.());
    state.payment = { phase: "processing", method: "cash" }; state.effects = [];
    RestaurantScenarioPage();
    cleanups = state.effects.map((effect) => effect());
    cleanups.forEach((cleanup) => cleanup?.());
    vi.advanceTimersByTime(RESTAURANT_PAYMENT_DELAY_MS);
    expect(state.payment.phase).toBe("processing");
    state.payment = { phase: "paid", method }; state.effects = [];
    RestaurantScenarioPage();
    cleanups = state.effects.map((effect) => effect());
    cleanups.forEach((cleanup) => cleanup?.());
    vi.advanceTimersByTime(RESTAURANT_RECEIPT_DELAY_MS);
    expect(state.payment.phase).toBe("paid");
  });
  it.each(["en", "es", "de", "tr", "pt", "fr"] as const)("shows meal/drink prices, the correct currency, and an object-sized payment control in %s", (language) => {
    state.language = language;
    const restaurant = restaurantTranslations[language];
    const payment = restaurantPaymentTranslations[language];
    let html = renderToStaticMarkup(RestaurantScenarioPage());
    expect(html).toContain(language === "tr" ? "₺320" : formatRestaurantPrice(1000, language));
    expect(html).not.toContain(language === "tr" ? "€" : "₺");
    click(restaurant.foods.soup); click(restaurant.foods.pasta); click(restaurant.confirmMeal);
    html = renderToStaticMarkup(RestaurantScenarioPage());
    expect(html).toContain(formatRestaurantPrice(language === "tr" ? 5000 : 200, language));
    expect(html).toContain(formatRestaurantPrice(language === "tr" ? 8000 : 300, language));
    click(restaurant.drinks.water); click(restaurant.confirm);
    html = renderToStaticMarkup(RestaurantScenarioPage());
    const total = formatRestaurantPrice(language === "tr" ? 37000 : 1200, language);
    expect(html).toContain(total);
    click(payment.card);
    html = renderToStaticMarkup(RestaurantScenarioPage());
    expect(html).toContain('data-payment-scene="card"');
    expect(html).toContain("restaurant-pos-art");
    const card = elements(RestaurantScenarioPage()).find((element) => element.type === "button" && element.props["aria-label"] === payment.tap);
    expect(card?.props.className).toContain("restaurant-payment-object");
    expect(card?.props.className).not.toContain("restaurant-payment-option");
    click(payment.tap);
    state.payment = restaurantPaymentReducer(state.payment, { type: "complete" });
    state.payment = restaurantPaymentReducer(state.payment, { type: "receipt" });
    html = renderToStaticMarkup(RestaurantScenarioPage());
    expect(html).toContain(total);
    expect(html).toContain(payment.cardLabel);
    expect(html).not.toContain(language === "tr" ? "€" : "₺");
  });
  it.each(["en", "es", "de", "tr", "pt", "fr"] as const)("changes the meal while keeping the chosen drink in %s", (language) => {
    state.language = language;
    const text = restaurantTranslations[language];
    click(text.foods.pasta); click(text.foods.soup); click(text.confirmMeal); click(text.drinks.juice);
    click(text.changeMeal);
    expect(state.current).toMatchObject({ step: "alternative", selected: null, drink: "juice", unavailable: "pasta" });
    const menu = renderToStaticMarkup(RestaurantScenarioPage());
    expect(menu).not.toContain(renderToStaticMarkup(<span>{text.unavailable}</span>).slice(6, -7));
    click(text.foods.salad); click(text.confirmMeal);
    expect(state.current).toMatchObject({ step: "orderConfirmation", selected: "salad", drink: "juice" });
    const html = renderToStaticMarkup(RestaurantScenarioPage());
    const message = text.orderWithDrink.replace("{meal}", text.foods.salad).replace("{drink}", text.drinks.juice);
    expect(html).toContain(renderToStaticMarkup(<span>{message}</span>).slice(6, -7));
    click(text.confirm);
    expect(state.event.mock.calls[state.event.mock.calls.length - 1]).toEqual(["order_confirmed", "salad"]);
    expect(state.current?.step).toBe("success");
  });
  it.each(["water", "juice", "none"] as const)("shows only the chosen drink artwork on order confirmation and completion (%s)", (drink) => {
    for (const step of ["orderConfirmation", "success"] as const) {
      state.current = { ...initialRestaurantState, step, selected: "soup", drink };
      state.payment = { phase: "receipt", method: "card" };
      const html = renderToStaticMarkup(RestaurantScenarioPage());
      expect(html).toContain("Soup");
      if (drink === "none") {
        expect(html).not.toContain("data-drink-illustration");
        expect(html).toContain(step === "success" ? "No drink" : "No, thank you");
      } else {
        expect(html).toContain(`data-drink-illustration="${drink}"`);
        expect(html).not.toContain(`data-drink-illustration="${drink === "water" ? "juice" : "water"}"`);
      }
    }
  });
  it("starts a fresh mounted attempt when ordering again", () => {
    state.wrapperMode = true;
    const first = RestaurantPage();
    first.props.onOrderAgain();
    const second = RestaurantPage();
    expect(second.key).not.toBe(first.key);
    expect(second.type).toBe(RestaurantOrderAttempt);
    state.wrapperMode = false;
    state.current = null;
    state.payment = initialRestaurantPayment;
    const html = renderToStaticMarkup(second);
    expect(html).toContain(restaurantTranslations.en.welcome);
    for (const meal of Object.values(restaurantTranslations.en.foods)) expect(html).toContain(meal);
    expect(html).not.toContain(restaurantTranslations.en.unavailableLabel);
    expect(html).not.toContain(restaurantTranslations.en.orderAgain);
    expect(useFaceTracking).toHaveBeenLastCalledWith("restaurant-ordering", true, state.getSessionId);
  });
  it.each(["en", "es", "de", "tr", "pt", "fr"] as const)("offers a new order and exit only after completion in %s", (language) => {
    state.language = language;
    const text = restaurantTranslations[language];
    expect(renderToStaticMarkup(RestaurantScenarioPage())).not.toContain(text.orderAgain);
    click(text.foods.pasta); click(text.foods.soup); click(text.confirmMeal); click(text.drinks.juice); click(text.confirm);
    finishPayment();
    const html = renderToStaticMarkup(RestaurantScenarioPage());
    expect(html).toContain(renderToStaticMarkup(<span>{text.back}</span>).slice(6, -7));
    click(text.orderAgain);
    expect(state.restart).toHaveBeenCalledOnce();
    expect(state.event.mock.calls.filter(([event]) => event === "order_confirmed")).toHaveLength(1);
  });
  it.each([false, true])("plays completion applause only when sound is enabled and stops it on exit (muted: %s)", (muted) => {
    vi.stubGlobal("localStorage", { getItem: () => String(!muted) });
    state.current = { ...initialRestaurantState, step: "success", selected: "soup", unavailable: "pasta", drink: "none" };
    state.payment = { phase: "receipt", method: "card" };
    RestaurantScenarioPage();
    const cleanup = state.effects.map((effect) => effect()).find((result) => typeof result === "function");
    expect(playSuccessSound).toHaveBeenCalledTimes(muted ? 0 : 1);
    expect(cleanup).toBeTypeOf("function");
    cleanup?.();
    expect(stopSuccessSound).toHaveBeenCalledOnce();
  });
  it("does not play applause while selecting or confirming a meal", () => {
    for (const step of ["menu", "alternative", "confirmation", "drink", "orderConfirmation"] as const) {
      state.current = { ...initialRestaurantState, step, selected: "soup", unavailable: "pasta" };
      state.effects = [];
      RestaurantScenarioPage();
      state.effects.forEach((effect) => effect());
    }
    expect(playSuccessSound).not.toHaveBeenCalled();
  });
  it.each(["en", "es", "de", "tr", "pt", "fr"] as const)("renders preparation without the food menu and uses the new spoken welcome in %s", (language) => {
    state.language = language;
    const html = renderToStaticMarkup(<RestaurantIntroductionPage />);
    for (const name of Object.values(restaurantTranslations[language].foods)) expect(html).not.toContain(name);
    expect(html).toContain('/scenario/restaurant-ordering/run');
    expect(html).toContain("data-spoken-message=");
    expect(html).toContain('data-waiter-state="idle"');
    expect(html.match(/<li(?: |>)/g)).toHaveLength(3);
    expect(html).not.toContain("restaurant-menu");
    const spoken = renderToStaticMarkup(<span>{restaurantTranslations[language].introSpoken}</span>).slice(6, -7);
    expect(html).toContain(spoken);
    expect(html).toContain("restaurant-counter.png");
  });
  it("completes the challenge, menu replay and alternative confirmation with analytics and spoken messages", () => {
    click("Pasta");
    let html = renderToStaticMarkup(RestaurantScenarioPage());
    expect(html).toContain("not available today"); expect(html).not.toContain("failure");
    click("See the menu again");
    html = renderToStaticMarkup(RestaurantScenarioPage()); expect(html).toContain("disabled");
    click("Soup"); expect(renderToStaticMarkup(RestaurantScenarioPage())).toContain("You selected Soup. Is this the meal you would like to order?");
    click("Confirm selection");
    expect(renderToStaticMarkup(RestaurantScenarioPage())).toContain("Would you like something to drink with your meal?");
    expect(state.event.mock.calls.some(([event]) => event === "order_confirmed")).toBe(false);
    click("Water");
    expect(renderToStaticMarkup(RestaurantScenarioPage())).toContain("You chose Soup and Water. Is that correct?");
    click("Yes, place my order");
    html = renderToStaticMarkup(RestaurantScenarioPage()); expect(html).toContain("Your total is €9.00. How would you like to pay?");
    finishPayment();
    expect(renderToStaticMarkup(RestaurantScenarioPage())).toContain("your order is complete");
    expect(state.event.mock.calls).toEqual([["meal_selected", "pasta"], ["menu_reopened"], ["alternative_selected", "soup"], ["order_confirmed", "soup"]]);
    expect(useFaceTracking).toHaveBeenLastCalledWith("restaurant-ordering", false, state.getSessionId);
  });
  it.each(["en", "es", "de", "tr", "pt", "fr"] as const)("keeps visible dialogue and assistant speech identical in every restaurant state in %s", (language) => {
    state.language = language;
    const text = restaurantTranslations[language];
    const states: [RestaurantState, string][] = [
      [initialRestaurantState, text.welcome],
      [{ ...initialRestaurantState, step: "alternative", unavailable: "pasta" }, text.unavailable],
      [{ ...initialRestaurantState, step: "alternative", unavailable: "pasta", fullMenu: true }, text.chooseAgain],
      [{ ...initialRestaurantState, step: "confirmation", unavailable: "pasta", selected: "soup" }, text.selectedMealMessage.replace("{meal}", text.foods.soup)],
      [{ ...initialRestaurantState, step: "drink", unavailable: "pasta", selected: "soup" }, text.drinkQuestion],
      [{ ...initialRestaurantState, step: "orderConfirmation", unavailable: "pasta", selected: "soup", drink: "juice" }, text.orderWithDrink.replace("{meal}", text.foods.soup).replace("{drink}", text.drinks.juice)],
      [{ ...initialRestaurantState, step: "orderConfirmation", unavailable: "pasta", selected: "soup", drink: "none" }, text.orderWithoutDrink.replace("{meal}", text.foods.soup)],
      [{ ...initialRestaurantState, step: "success", unavailable: "pasta", selected: "soup", drink: "none" }, restaurantPaymentTranslations[language].totalQuestion.replace("{total}", formatRestaurantPrice(getRestaurantReceipt("soup", "none", language).totalCents, language))],
    ];
    for (const [current, message] of states) {
      state.current = current;
      const html = renderToStaticMarkup(RestaurantScenarioPage());
      const escaped = renderToStaticMarkup(<span>{message}</span>).slice(6, -7);
      expect(html).toContain(`data-spoken-message="${escaped}"`);
      expect(html).toContain(`aria-live="polite">${escaped}</p>`);
      expect(html).toContain("restaurant-counter.png");
      expect(html).not.toContain("atm-wall-background");
      expect(html).not.toContain("{meal}");
    }
  });
  it.each(["en", "es", "de", "tr", "pt", "fr"] as const)("asks for a meal without repeating the apology after changing a confirmed choice in %s", (language) => {
    state.language = language;
    const text = restaurantTranslations[language];
    click(text.foods.pasta);
    click(text.foods.soup);
    click(text.change);
    const html = renderToStaticMarkup(RestaurantScenarioPage());
    const escaped = renderToStaticMarkup(<span>{text.chooseAgain}</span>).slice(6, -7);
    const apology = renderToStaticMarkup(<span>{text.unavailable}</span>).slice(6, -7);
    expect(html).toContain(`data-spoken-message="${escaped}"`);
    expect(html).toContain(`aria-live="polite">${escaped}</p>`);
    expect(html).not.toContain(apology);
    expect(state.current).toMatchObject({ step: "alternative", fullMenu: true, unavailable: "pasta" });
    click(text.foods.salad);
    click(text.confirmMeal);
    click(text.drinks.none);
    click(text.confirm);
    expect(state.current?.step).toBe("success");
  });
  it.each(["en", "es", "de", "tr", "pt", "fr"] as const)("allows changing a drink and finishing without a drink in %s", (language) => {
    state.language = language;
    const text = restaurantTranslations[language];
    click(text.foods.pasta);
    click(text.foods.soup);
    let html = renderToStaticMarkup(RestaurantScenarioPage());
    expect(html).not.toContain(text.drinkQuestion);
    click(text.confirmMeal);
    html = renderToStaticMarkup(RestaurantScenarioPage());
    for (const label of Object.values(text.drinks)) {
      expect(html).toContain(renderToStaticMarkup(<span>{label}</span>).slice(6, -7));
    }
    click(text.drinks.water);
    click(text.changeDrink);
    expect(state.current).toMatchObject({ step: "drink", selected: "soup", unavailable: "pasta" });
    click(text.drinks.none);
    const message = text.orderWithoutDrink.replace("{meal}", text.foods.soup);
    html = renderToStaticMarkup(RestaurantScenarioPage());
    expect(html).toContain(renderToStaticMarkup(<span>{message}</span>).slice(6, -7));
    click(text.confirm);
    expect(state.current).toMatchObject({ step: "success", drink: "none", selected: "soup" });
    expect(state.event.mock.calls.filter(([event]) => event === "order_confirmed")).toHaveLength(1);
  });
});
