import { Children, isValidElement, type ReactElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RestaurantIntroductionPage, RestaurantOrderAttempt, RestaurantScenarioPage as RestaurantPage } from "./RestaurantScenarioPage";
import { initialRestaurantState, restaurantReducer, type RestaurantAction, type RestaurantState } from "../../lib/restaurantState";
import { restaurantTranslations } from "../../lib/restaurantTranslations";
import { useFaceTracking } from "../../hooks/useFaceTracking";
import { playSuccessSound, stopSuccessSound } from "../../services/speechSynthesisService";
import type { LanguageCode } from "../../i18n";
const state = vi.hoisted(() => ({ current: null as RestaurantState | null, language: "en" as LanguageCode, event: vi.fn(), restart: vi.fn(), wrapperMode: false, attempt: 0, getSessionId: () => "restaurant-attempt", effects: [] as (() => void | (() => void))[] }));
vi.mock("react", async (original) => {
  const react = await original<typeof import("react")>();
  return { ...react,
  useState: (initial: unknown) => state.wrapperMode && typeof initial === "number"
    ? [state.attempt, (update: (current: number) => number) => { state.attempt = update(state.attempt); }]
    : react.useState(initial),
  useReducer: (_reducer: unknown, initial: RestaurantState) => [state.current ?? initial, (action: RestaurantAction) => { state.current = restaurantReducer(state.current ?? initial, action); }],
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
  return [node as ReactElement<Record<string, unknown>>, ...Children.toArray(node.props.children).flatMap(elements)];
}
function RestaurantScenarioPage() { return RestaurantOrderAttempt({ onOrderAgain: state.restart }); }
function click(label: string) {
  const element = elements(RestaurantScenarioPage()).find((node) => node.type === "button" && renderToStaticMarkup(node).includes(label));
  expect(element).toBeDefined(); (element!.props.onClick as () => void)();
}
beforeEach(() => { vi.clearAllMocks(); state.current = initialRestaurantState; state.language = "en"; state.effects = []; state.wrapperMode = false; state.attempt = 0; });
afterEach(() => { vi.unstubAllGlobals(); });

describe("restaurant scenario UI", () => {
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
      const html = renderToStaticMarkup(RestaurantScenarioPage());
      expect(html).toContain("Soup");
      if (drink === "none") {
        expect(html).not.toContain("data-drink-illustration");
        expect(html).toContain("No, thank you");
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
    const html = renderToStaticMarkup(RestaurantScenarioPage());
    expect(html).toContain(renderToStaticMarkup(<span>{text.leave}</span>).slice(6, -7));
    click(text.orderAgain);
    expect(state.restart).toHaveBeenCalledOnce();
    expect(state.event.mock.calls.filter(([event]) => event === "order_confirmed")).toHaveLength(1);
  });
  it.each([false, true])("plays completion applause only when sound is enabled and stops it on exit (muted: %s)", (muted) => {
    vi.stubGlobal("localStorage", { getItem: () => String(!muted) });
    state.current = { ...initialRestaurantState, step: "success", selected: "soup", unavailable: "pasta" };
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
    click("Yes, this meal");
    expect(renderToStaticMarkup(RestaurantScenarioPage())).toContain("Would you like something to drink with your meal?");
    expect(state.event.mock.calls.some(([event]) => event === "order_confirmed")).toBe(false);
    click("Water");
    expect(renderToStaticMarkup(RestaurantScenarioPage())).toContain("You chose Soup and Water. Is that correct?");
    click("Yes, place my order");
    html = renderToStaticMarkup(RestaurantScenarioPage()); expect(html).toContain("placed successfully");
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
      [{ ...initialRestaurantState, step: "success", unavailable: "pasta", selected: "soup" }, text.success],
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
