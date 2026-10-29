import { Children, isValidElement, type ReactElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RestaurantIntroductionPage, RestaurantOrderAttempt, RestaurantScenarioPage as RestaurantPage, RestaurantShell } from "./RestaurantScenarioPage";
import { RestaurantStaff } from "../../components/restaurant/RestaurantArt";
import { RestaurantMenu } from "../../components/restaurant/RestaurantMenu";
import { RestaurantOrderTicket } from "../../components/restaurant/RestaurantOrderTicket";
import { WaiterConversationBar } from "../../components/restaurant/WaiterConversationBar";
import { RestaurantPaymentPanel } from "../../components/restaurant/RestaurantPaymentPanel";
import { AtmSetupVoiceAssistant } from "../../components/atm/AtmSetupVoiceAssistant";
import { initialRestaurantState, restaurantReducer, type MenuCategory, type RestaurantAction, type RestaurantState } from "../../lib/restaurantState";
import { restaurantTranslations } from "../../lib/restaurantTranslations";
import { restaurantMenuItems } from "../../lib/restaurantMenu";
import { restaurantMenuTranslations } from "../../lib/restaurantMenuTranslations";
import { restaurantOrderTranslations } from "../../lib/restaurantOrderTranslations";
import { getShortRestaurantMenuDescription } from "../../lib/restaurantMenuDescriptions";
import { getOrderTotalCents } from "../../lib/restaurantOrder";
import { useFaceTracking } from "../../hooks/useFaceTracking";
import { playSuccessSound, stopSuccessSound } from "../../services/speechSynthesisService";
import type { LanguageCode } from "../../i18n";
import { formatRestaurantPrice, initialRestaurantPayment, restaurantPaymentReducer, type RestaurantPaymentAction, type RestaurantPaymentState } from "../../lib/restaurantPayment";
import { restaurantPaymentTranslations } from "../../lib/restaurantPaymentTranslations";
import { chatWithRestaurantWaiter } from "../../services/restaurantWaiterChatService";
import { restaurantWaiterSnapshot } from "../../services/restaurantWaiterChatService";

const state = vi.hoisted(() => ({ current: null as RestaurantState | null, payment: { phase: "method", method: null } as RestaurantPaymentState, language: "en" as LanguageCode, event: vi.fn(), restart: vi.fn(), wrapperMode: false, voiceMode: false, chatMode: false, chatHooks: [] as unknown[], chatHookIndex: 0, chatRefs: [] as { current: unknown }[], chatRefIndex: 0, speaking: false, voiceHook: 0, attempt: 0, getSessionId: () => "restaurant-attempt", effects: [] as (() => void | (() => void))[] }));
vi.mock("react", async (original) => {
  const react = await original<typeof import("react")>();
  return { ...react,
    useState: (initial: unknown) => state.chatMode
      ? (() => { const index = state.chatHookIndex++; if (index >= state.chatHooks.length) state.chatHooks[index] = initial; return [state.chatHooks[index], (value: unknown) => { state.chatHooks[index] = typeof value === "function" ? (value as (current: unknown) => unknown)(state.chatHooks[index]) : value; }]; })()
      : state.wrapperMode && typeof initial === "number"
      ? [state.attempt, (update: (current: number) => number) => { state.attempt = update(state.attempt); }]
      : state.voiceMode
        ? typeof initial === "boolean" && state.voiceHook++ === 0 ? [state.speaking, (value: boolean) => { state.speaking = value; }] : [initial, vi.fn()]
        : [initial, vi.fn()],
    useReducer: (_reducer: unknown, initial: RestaurantState | RestaurantPaymentState) => "phase" in initial
      ? [state.payment, (action: RestaurantPaymentAction) => { state.payment = restaurantPaymentReducer(state.payment, action); }]
      : [state.current ?? initial, (action: RestaurantAction) => { state.current = restaurantReducer(state.current ?? initial, action); }],
    useRef: (initial: unknown) => state.chatMode
      ? (() => { const index = state.chatRefIndex++; if (!state.chatRefs[index]) state.chatRefs[index] = { current: initial }; return state.chatRefs[index]; })()
      : { current: null }, useEffect: (effect: () => void | (() => void)) => { state.effects.push(effect); },
    useCallback: (callback: unknown) => callback,
  };
});
vi.mock("react-router-dom", () => ({ Link: ({ to, children }: { to: string; children: ReactNode }) => <a href={to}>{children}</a> }));
vi.mock("../../i18n", () => ({ useTranslation: () => ({ language: state.language }) }));
vi.mock("../../hooks/useRestaurantAnalytics", () => ({ useRestaurantAnalytics: () => ({ event: state.event, getSessionId: state.getSessionId }) }));
vi.mock("../../hooks/useFaceTracking", () => ({ useFaceTracking: vi.fn(() => ({ getPreviewFrame: () => null })) }));
vi.mock("../../services/speechSynthesisService", () => ({ playSuccessSound: vi.fn(), stopSuccessSound: vi.fn() }));
vi.mock("../../services/restaurantWaiterChatService", async (importOriginal) => ({
  ...await importOriginal<typeof import("../../services/restaurantWaiterChatService")>(),
  chatWithRestaurantWaiter: vi.fn(),
}));
vi.mock("../../components/AdminFaceTrackingPreview", () => ({ AdminFaceTrackingPreview: () => null }));
vi.mock("../../components/atm/AtmSetupVoiceAssistant", () => ({ AtmSetupVoiceAssistant: ({ message }: { message: string }) => <aside data-spoken-message={message} /> }));
vi.mock("../../components/ScenarioStartButton", () => ({ ScenarioStartButton: ({ to, children }: { to: string; children: ReactNode }) => <a href={to}>{children}</a> }));

function elements(node: ReactNode): ReactElement<Record<string, unknown>>[] {
  if (!isValidElement<{ children?: ReactNode }>(node)) return [];
  const current = node as ReactElement<Record<string, unknown>>;
  if (node.type === RestaurantPaymentPanel) return [current, ...elements(RestaurantPaymentPanel(node.props as Parameters<typeof RestaurantPaymentPanel>[0]))];
  if (node.type === RestaurantMenu) return [current, ...elements(RestaurantMenu(node.props as Parameters<typeof RestaurantMenu>[0]))];
  if (node.type === RestaurantOrderTicket) return [current, ...elements(RestaurantOrderTicket(node.props as Parameters<typeof RestaurantOrderTicket>[0]))];
  if (node.type === RestaurantShell) return [current, ...elements(current.props.orderTray as ReactNode), ...Children.toArray(node.props.children).flatMap(elements)];
  return [current, ...Children.toArray(node.props.children).flatMap(elements)];
}
function page() { return RestaurantOrderAttempt({ onOrderAgain: state.restart }); }
function html() { return renderToStaticMarkup(page()); }
function click(label: string) {
  const button = elements(page()).find((node) => node.type === "button" && (node.props["aria-label"] === label || renderToStaticMarkup(node).includes(label)));
  expect(button, label).toBeDefined();
  (button!.props.onClick as () => void)();
}
function select(category: MenuCategory, id: string) {
  if (state.current?.step === "menuCover") state.current = restaurantReducer(state.current, { type: "openMenu" });
  if (state.current?.category !== category) state.current = restaurantReducer(state.current!, { type: "category", category });
  const item = restaurantMenuItems.find((entry) => entry.category === category && entry.id === id);
  expect(item).toBeDefined();
  const name = item!.meal ? restaurantTranslations[state.language].foods[item!.meal] : restaurantMenuTranslations[state.language].extras[id as keyof typeof restaurantMenuTranslations.en.extras];
  const button = elements(page()).find((node) => node.type === "button" && String(node.props.className).includes("restaurant-menu-item") && renderToStaticMarkup(node).includes(name));
  expect(button, name).toBeDefined();
  (button!.props.onClick as () => void)();
}
function makeComplete() { select("mains", "pasta"); select("mains", "pizza"); select("drinks", "water"); }
beforeEach(() => { vi.clearAllMocks(); state.current = initialRestaurantState; state.payment = initialRestaurantPayment; state.language = "en"; state.effects = []; state.wrapperMode = false; state.voiceMode = false; state.chatMode = false; state.chatHooks = []; state.chatHookIndex = 0; state.chatRefs = []; state.chatRefIndex = 0; state.speaking = false; state.voiceHook = 0; state.attempt = 0; });
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

describe("restaurant book and order", () => {
  it.each(["en", "es", "de", "tr", "pt", "fr"] as const)("has complete, concise waiter guidance in %s", (language) => {
    const order = restaurantOrderTranslations[language];
    const payment = restaurantPaymentTranslations[language];
    for (const line of [order.welcomeCaption, order.menuOpenGuidance, order.unavailableCaption, order.replacementCaption, order.reviewCaption, order.orderAgainCaption, payment.cardInstruction, payment.cashInstruction, payment.processing, payment.cardSuccess, payment.cashSuccess, payment.complete]) {
      expect(line.trim().length).toBeGreaterThan(15);
    }
    expect(payment.totalQuestion).toContain("{total}");
    for (const line of [order.welcomeCaption, order.menuOpenGuidance, order.unavailableCaption, order.replacementCaption, order.reviewCaption, order.orderAgainCaption, payment.totalQuestion, payment.cardInstruction, payment.cashInstruction, payment.processing, payment.cardSuccess, payment.cashSuccess, payment.complete]) {
      expect(line).not.toMatch(/[—–]/);
      expect(line).not.toContain("That works.");
      expect(line).not.toContain("Everything looks good.");
    }
  });
  it("starts with the cover, waiter guidance, disabled conversation controls, and leave action", () => {
    const markup = html();
    expect(restaurantOrderTranslations.en.welcomeCaption).toBe("Hello, welcome! Would you like to see our menu?");
    expect(markup).toContain('aria-label="Open menu"');
    expect(markup).toContain('class="restaurant-dialogue restaurant-waiter-caption"');
    expect(markup).toContain('class="restaurant-conversation-bar"');
    expect(markup).toContain('disabled=""');
    expect(markup).toContain(`aria-label="${restaurantOrderTranslations.en.microphoneLabel}"`);
    expect(markup).toContain('class="restaurant-social-actions"');
    expect(markup).toContain('class="restaurant-scene-footer"');
    expect(markup).toContain('class="restaurant-voice-controls"');
    expect(markup).toContain('aria-label="Send"');
    expect(markup).not.toContain('class="restaurant-order-ticket');
    expect(markup).not.toContain(restaurantOrderTranslations.en.empty);
    expect(markup).not.toContain("Review order");
    expect(markup).toContain(`data-spoken-message="${restaurantOrderTranslations.en.welcomeCaption.replace(/'/g, "&#x27;")}"`);
    expect(markup).toContain('href="/scenarios"');
    expect((markup.match(/class="restaurant-background"/g) ?? []).length).toBe(1);
    expect((markup.match(/class="restaurant-counter-front"/g) ?? []).length).toBe(1);
    expect((markup.match(/restaurant-scene-waiter/g) ?? []).length).toBe(1);
    expect(state.current?.order).toEqual({ mains: null, salads: null, soups: null, desserts: null, drinks: null, lines: [] });
  });
  it("opens and closes a two-page book with all five categories", () => {
    click("Open menu");
    let markup = html();
    expect(markup).toContain('class="restaurant-scene"');
    expect(markup).toContain('class="restaurant-content-zone restaurant-content-with-order"');
    expect(markup).toContain('class="restaurant-order-area"');
    expect(markup).toContain(restaurantOrderTranslations.en.noItems);
    expect(markup).toContain(restaurantOrderTranslations.en.menuOpenGuidance);
    expect(restaurantOrderTranslations.en.menuOpenGuidance).toBe("Here is our menu. We have main dishes, salads, soups, desserts, and drinks. Take your time and have a look through the different categories.");
    expect(markup).toContain('class="restaurant-social-actions"');
    expect((markup.match(/class="restaurant-background"/g) ?? []).length).toBe(1);
    expect((markup.match(/restaurant-scene-waiter/g) ?? []).length).toBe(1);
    expect(markup).toContain("restaurant-menu-left-page");
    expect(markup).toContain("restaurant-menu-right-page");
    for (const label of Object.values(restaurantMenuTranslations.en.categories)) expect(markup).toContain(label);
    expect(markup).toContain(getShortRestaurantMenuDescription("en", "pasta"));
    expect(markup).toContain('class="restaurant-menu-item-image"');
    expect(markup).toContain('role="region" tabindex="0"');
    expect(markup).not.toContain("Freshly prepared");
    expect(markup).not.toContain("Prepared on request");
    click("Salads");
    expect(state.current).toMatchObject({ step: "menu", category: "salads" });
    markup = html();
    expect(markup).toContain(getShortRestaurantMenuDescription("en", "caesar"));
    expect(markup).not.toContain(getShortRestaurantMenuDescription("en", "pasta"));
    click("Close menu"); expect(state.current?.step).toBe("menuCover");
    click("Open menu"); expect(state.current).toMatchObject({ step: "menu", category: "salads" });
  });
  it.each(["mains", "salads", "soups", "desserts", "drinks"] as const)("renders all %s choices in the selected category", (category) => {
    click("Open menu"); click(restaurantMenuTranslations.en.categories[category]);
    const markup = html();
    for (const item of restaurantMenuItems.filter((entry) => entry.category === category)) expect(markup).toContain(getShortRestaurantMenuDescription("en", item.id));
    expect((markup.match(/class="restaurant-menu-item restaurant-menu-selectable/g) ?? []).length).toBe(restaurantMenuItems.filter((entry) => entry.category === category).length);
    expect(state.current?.step).toBe("menu");
  });
  it("keeps optional items and drinks when the first main becomes unavailable", () => {
    select("salads", "salad"); select("soups", "lentil"); select("desserts", "cake"); select("drinks", "tea");
    expect(state.current?.order).toMatchObject({ salads: "salad", soups: "lentil", desserts: "cake", drinks: "tea", mains: null });
    select("mains", "pasta");
    expect(state.current).toMatchObject({ step: "alternative", category: "mains", unavailable: "pasta" });
    expect(state.current?.order).toMatchObject({ mains: null, salads: "salad", soups: "lentil", desserts: "cake", drinks: "tea" });
    expect(html()).toContain(restaurantOrderTranslations.en.unavailableCaption.replace(/'/g, "&#x27;"));
    expect(restaurantOrderTranslations.en.unavailableCaption).toBe("I'm sorry, that meal isn't available today. No problem. You can choose another main dish from the menu. Take your time.");
    const disabled = elements(page()).find((node) => node.type === "button" && String(node.props.className).includes("restaurant-menu-item") && renderToStaticMarkup(node).includes(">Pasta</span>"));
    expect(disabled?.props.disabled).toBe(true);
    select("mains", "pizza");
    expect(state.current?.order.mains).toBe("pizza");
    expect(html()).toContain(restaurantOrderTranslations.en.replacementCaption.replace(/'/g, "&#x27;"));
    expect(html()).toContain('aria-pressed="true"');
    expect(html()).toContain('class="restaurant-order-thumbnail"');
  });
  it("keeps multiple items within a category, removes selections, and updates the total", () => {
    makeComplete();
    select("salads", "salad");
    select("salads", "caesar");
    expect(state.current?.order.salads).toBe("caesar");
    expect(getOrderTotalCents(state.current!.order, "en")).toBe(1200 + 200 + 800 + 950);
    expect(html()).toContain("€31.50");
    click(restaurantOrderTranslations.en.remove.replace("{item}", "Caesar salad"));
    expect(state.current?.order.salads).toBe("salad");
    expect(getOrderTotalCents(state.current!.order, "en")).toBe(2200);
    click(restaurantOrderTranslations.en.remove.replace("{item}", "Pizza"));
    expect(state.current?.order.mains).toBeNull();
    const review = elements(page()).find((node) => node.type === "button" && renderToStaticMarkup(node).includes("Review order"));
    expect(review?.props.disabled).toBe(true);
  });
  it("shows only selected image tiles and permits every optional category", () => {
    click("Open menu");
    const openMarkup = html();
    expect(openMarkup).toContain('class="restaurant-order-ticket');
    expect(openMarkup).toContain(restaurantOrderTranslations.en.noItems);
    select("salads", "salad");
    expect(html()).toContain('class="restaurant-order-area"');
    expect(html()).toContain('class="restaurant-content-zone restaurant-content-with-order"');
    expect(html()).not.toContain(restaurantOrderTranslations.en.noItems);
    expect(html()).toContain('class="restaurant-order-thumbnail"');
    expect(html()).not.toContain(restaurantOrderTranslations.en.empty);
    for (const [category, id] of [["soups", "tomatoSoup"], ["desserts", "cake"], ["drinks", "water"]] as const) select(category, id);
    expect(elements(page()).find((node) => node.type === "button" && renderToStaticMarkup(node).includes("Review order"))?.props.disabled).toBe(true);
    select("mains", "pasta"); select("mains", "pizza");
    expect((html().match(/class="restaurant-order-thumbnail"/g) ?? []).length).toBe(5);
    click(restaurantOrderTranslations.en.remove.replace("{item}", "Water"));
    expect(state.current?.order.drinks).toBeNull();
    expect((html().match(/class="restaurant-order-thumbnail"/g) ?? []).length).toBe(4);
    expect(html()).not.toContain(restaurantOrderTranslations.en.empty);
  });
  it("keeps the waiter and menu positions when the first item is selected", () => {
    click("Open menu");
    const before = html();
    select("salads", "salad");
    const after = html();
    for (const markup of [before, after]) {
      expect(markup).toContain('class="restaurant-scene"');
      expect(markup).toContain('class="restaurant-content-zone restaurant-content-with-order"');
      expect(markup).toContain('class="restaurant-order-area"');
      expect(markup).toContain('class="restaurant-menu restaurant-menu-book-stage"');
      expect((markup.match(/restaurant-scene-waiter/g) ?? []).length).toBe(1);
    }
  });
  it("enables waiter text chat while keeping the microphone disabled", () => {
    const onChange = vi.fn(); const onSend = vi.fn();
    const props = { language: "en" as const, value: "Hello", pending: false, onChange, onSend };
    const controls = elements(WaiterConversationBar(props));
    const input = controls.find((node) => node.type === "input");
    const buttons = controls.filter((node) => node.type === "button");
    expect(input?.props.disabled).toBe(false);
    expect(buttons).toHaveLength(2);
    expect(buttons[0].props.disabled).toBe(true);
    expect(buttons[1].props.disabled).toBe(false);
    expect(input?.props.onChange).toBeTypeOf("function");
    (input?.props.onChange as (event: { target: { value: string } }) => void)({ target: { value: "Thanks" } });
    expect(onChange).toHaveBeenCalledWith("Thanks");
    const form = controls.find((node) => node.type === "form");
    (form?.props.onSubmit as (event: { preventDefault: () => void }) => void)({ preventDefault: vi.fn() });
    expect(onSend).toHaveBeenCalledOnce();
    expect(renderToStaticMarkup(<WaiterConversationBar {...props} pending />)).toContain(restaurantOrderTranslations.en.conversationThinking);
    expect(renderToStaticMarkup(<WaiterConversationBar {...props} value=" " />)).toContain('disabled=""');
    expect(renderToStaticMarkup(<WaiterConversationBar {...props} />)).toContain('aria-label="Send"');
    for (const language of ["en", "es", "de", "tr", "pt", "fr"] as const) {
      expect(renderToStaticMarkup(<WaiterConversationBar {...props} language={language} />)).toContain(restaurantOrderTranslations[language].conversationLabel);
    }
  });
  it("marks the requested item for subtle focus inside the existing menu", () => {
    const focusedState = { ...initialRestaurantState, step: "menu" as const, category: "desserts" as const };
    const markup = renderToStaticMarkup(<RestaurantMenu state={focusedState} language="en" dispatch={vi.fn()} onSelect={vi.fn()} headingRef={{ current: null }} focusItemId="cheesecake" />);
    expect(markup).toContain('class="restaurant-menu-items"');
    expect(markup).toContain('data-menu-item-id="cheesecake"');
    expect(markup).toContain("restaurant-menu-item-chat-focus");
    expect(markup).toContain("Cheesecake");
  });
  it("displays a chat reply in the waiter area without changing spoken guidance", async () => {
    state.chatMode = true;
    const shell = () => { state.chatHookIndex = 0; state.chatRefIndex = 0; return RestaurantShell({ message: "Welcome", children: "Menu" }); };
    const bar = () => elements(shell()).find((node) => node.type === WaiterConversationBar)!;
    vi.mocked(chatWithRestaurantWaiter).mockResolvedValue({ reply: "Happy to help.", actions: [], state: restaurantWaiterSnapshot(initialRestaurantState, initialRestaurantPayment) });
    (bar().props.onChange as (value: string) => void)("Hello");
    await (bar().props.onSend as () => Promise<void>)();
    const markup = renderToStaticMarkup(shell());
    expect(markup).toContain('class="restaurant-dialogue-message"');
    expect(markup).toContain("Happy to help.");
    expect(markup).toContain('data-spoken-message="Happy to help."');
    expect(markup).toContain("Menu");
    expect(chatWithRestaurantWaiter).toHaveBeenCalledWith({ message: "Hello", language: "en", history: [], state: restaurantWaiterSnapshot(initialRestaurantState, initialRestaurantPayment), pending: null }, expect.any(AbortSignal));
  });
  it("sends a compact pending clarification on the next waiter turn", async () => {
    state.chatMode = true;
    const shell = () => { state.chatHookIndex = 0; state.chatRefIndex = 0; return RestaurantShell({ message: "Welcome", children: "Menu" }); };
    const bar = () => elements(shell()).find((node) => node.type === WaiterConversationBar)!;
    const snapshot = restaurantWaiterSnapshot(initialRestaurantState, initialRestaurantPayment);
    const pending = { action: "add_item" as const, item_query: "pizza", replacement_query: null, matches: [], clarify_field: "item" as const };
    vi.mocked(chatWithRestaurantWaiter)
      .mockResolvedValueOnce({ reply: "Would you like me to add Pizza?", actions: [], state: snapshot, pending })
      .mockResolvedValueOnce({ reply: "Okay.", actions: [], state: snapshot, pending: null });
    (bar().props.onChange as (value: string) => void)("Pizza looks good");
    await (bar().props.onSend as () => Promise<void>)();
    (bar().props.onChange as (value: string) => void)("Yes");
    await (bar().props.onSend as () => Promise<void>)();
    expect(chatWithRestaurantWaiter).toHaveBeenLastCalledWith(expect.objectContaining({
      message: "Yes", pending,
    }), expect.any(AbortSignal));
  });
  it("shows a translated chat fallback while leaving the menu usable", async () => {
    state.chatMode = true;
    state.language = "fr";
    const shell = () => { state.chatHookIndex = 0; state.chatRefIndex = 0; return RestaurantShell({ message: "Bienvenue", children: "Menu" }); };
    const bar = () => elements(shell()).find((node) => node.type === WaiterConversationBar)!;
    vi.mocked(chatWithRestaurantWaiter).mockRejectedValue(new Error("offline"));
    (bar().props.onChange as (value: string) => void)("Bonjour");
    await (bar().props.onSend as () => Promise<void>)();
    const markup = renderToStaticMarkup(shell());
    expect(markup).toContain(restaurantOrderTranslations.fr.conversationUnavailable);
    expect(markup).toContain('data-spoken-message="Bienvenue"');
    expect(markup).toContain("Menu");
  });
  it("can review and confirm with only an available main dish", () => {
    select("mains", "pasta"); select("mains", "pizza");
    expect(state.current?.order).toMatchObject({ mains: "pizza", salads: null, soups: null, desserts: null, drinks: null });
    const review = elements(page()).find((node) => node.type === "button" && renderToStaticMarkup(node).includes("Review order"));
    expect(review?.props.disabled).toBe(false);
    click("Review order");
    expect((html().match(/class="restaurant-order-thumbnail"/g) ?? []).length).toBe(1);
    expect(html()).toContain("Your order: one Pizza. Total: €12.00. Please check it.");
    expect(html()).toContain('class="restaurant-menu restaurant-content-surface restaurant-review-stage"');
    expect(html()).toContain('class="restaurant-action-secondary"');
    expect(html()).toContain('class="restaurant-action-primary"');
    expect(html()).not.toContain(restaurantOrderTranslations.en.empty);
    click("Confirm order");
    expect(state.current?.step).toBe("success");
    expect(html()).toContain('class="restaurant-menu restaurant-content-surface"');
    expect(html()).not.toContain('class="restaurant-order-thumbnail"');
    expect(html()).toContain('class="restaurant-payment-intro"');
    expect(html()).toContain("€12.00");
    expect(html()).toContain(restaurantPaymentTranslations.en.cardLabel);
    expect(html()).toContain(restaurantPaymentTranslations.en.cashLabel);
    expect(html()).not.toContain(restaurantOrderTranslations.en.empty);
  });
  it("reviews selected images before payment", () => {
    select("drinks", "water");
    expect(elements(page()).find((node) => node.type === "button" && renderToStaticMarkup(node).includes("Review order"))?.props.disabled).toBe(true);
    select("mains", "pasta"); select("mains", "pizza");
    expect(elements(page()).find((node) => node.type === "button" && renderToStaticMarkup(node).includes("Review order"))?.props.disabled).toBe(false);
    click("Review order");
    expect(state.current?.step).toBe("review");
    expect(html()).toContain("Pizza");
    expect(html()).toContain("Water");
    expect(html()).toContain('class="restaurant-order-thumbnail"');
    expect(html()).not.toContain(restaurantOrderTranslations.en.empty);
    click("Change order");
    expect(state.current).toMatchObject({ step: "alternative", order: { mains: "pizza", drinks: "water" } });
    click("Review order"); click("Confirm order");
    expect(state.current?.step).toBe("success");
    expect(html()).toContain(restaurantPaymentTranslations.en.cardLabel);
    expect(html()).not.toContain('class="restaurant-order-thumbnail"');
    expect(html()).not.toContain('class="restaurant-payment-order-line"');
  });
  it("allows a main without a drink and prices optional food in lira", () => {
    state.language = "tr";
    select("mains", "pasta"); select("mains", "pizza"); select("salads", "salad");
    expect(state.current?.order.drinks).toBeNull();
    expect(getOrderTotalCents(state.current!.order, "tr")).toBe(38000 + 26000);
    expect(html()).toContain(formatRestaurantPrice(64000, "tr"));
    click(restaurantOrderTranslations.tr.review); click(restaurantOrderTranslations.tr.confirm);
    expect(html()).toContain(formatRestaurantPrice(64000, "tr"));
  });
  it.each(["card", "cash"] as const)("keeps the %s payment interaction and receipt with every selected category", (method) => {
    makeComplete(); select("salads", "salad"); select("desserts", "cake");
    click("Review order"); click("Confirm order");
    const text = restaurantPaymentTranslations.en;
    click(text[method]);
    expect(html()).toContain((method === "card" ? text.cardInstruction : text.cashInstruction).replace(/'/g, "&#x27;"));
    click(method === "card" ? text.tap : text.give);
    expect(state.payment.phase).toBe("processing");
    state.payment = restaurantPaymentReducer(state.payment, { type: "complete" });
    state.payment = restaurantPaymentReducer(state.payment, { type: "receipt" });
    const markup = html();
    expect(markup).toContain(text.paid);
    expect(markup).toContain("Pizza");
    expect(markup).toContain("Salad");
    expect(markup).toContain("Chocolate cake");
    expect(markup).toContain("Water");
    expect(markup).toContain("€28.00");
    expect(markup).toContain('class="restaurant-payment-order-line"');
    expect((markup.match(/class="restaurant-payment-order-line"/g) ?? []).length).toBe(4);
    expect(markup).not.toContain("restaurant-receipt-food-image");
    expect(markup).not.toContain('class="restaurant-order-thumbnail"');
    expect(markup).toContain('class="restaurant-menu restaurant-content-surface restaurant-receipt-stage"');
    expect(markup).toContain(text.paymentMethod);
    expect(markup).toContain(text.complete);
    expect(markup).not.toContain(restaurantOrderTranslations.en.empty);
    click(restaurantTranslations.en.orderAgain);
    expect(state.restart).toHaveBeenCalledOnce();
  });
  it("keeps the same waiter container through menu, review, payment, and receipt", () => {
    const check = () => {
      const markup = html();
      expect((markup.match(/restaurant-scene-waiter/g) ?? []).length).toBe(1);
      expect(markup).toContain('class="restaurant-staff-zone"');
      expect(markup).toContain('class="restaurant-content-zone');
      expect(markup).toContain('class="restaurant-conversation-bar"');
    };
    check(); click("Open menu"); check();
    select("mains", "pasta"); select("mains", "pizza");
    click("Review order"); check();
    click("Confirm order"); check();
    expect(html()).toContain(restaurantPaymentTranslations.en.totalQuestion.replace("{total}", "€12.00"));
    expect(html()).toContain(restaurantPaymentTranslations.en.question);
    expect(html()).not.toContain('class="restaurant-payment-order-line"');
    click(restaurantPaymentTranslations.en.card);
    check(); expect(html()).toContain(restaurantPaymentTranslations.en.cardInstruction); click(restaurantPaymentTranslations.en.tap);
    expect(html()).toContain(restaurantPaymentTranslations.en.processing);
    state.payment = restaurantPaymentReducer(state.payment, { type: "complete" });
    expect(html()).toContain(restaurantPaymentTranslations.en.cardSuccess);
    state.payment = restaurantPaymentReducer(state.payment, { type: "receipt" });
    check();
    expect(html()).toContain(restaurantPaymentTranslations.en.complete);
  });
  it("resets the full order on a new mounted attempt", () => {
    state.wrapperMode = true;
    const first = RestaurantPage();
    first.props.onOrderAgain();
    const second = RestaurantPage();
    expect(second.key).not.toBe(first.key);
    state.current = null;
    expect(renderToStaticMarkup(second)).toContain('aria-label="Open menu"');
    expect(renderToStaticMarkup(second)).not.toContain('class="restaurant-order-ticket');
  });
  it.each(["en", "es", "de", "tr", "pt", "fr"] as const)("uses translated item descriptions and ticket labels in %s", (language) => {
    state.language = language;
    click(restaurantMenuTranslations[language].open);
    expect(html()).toContain(getShortRestaurantMenuDescription(language, "pasta"));
    select("salads", "salad");
    expect(html()).toContain(restaurantOrderTranslations[language].title);
    expect(html()).not.toContain(restaurantOrderTranslations[language].empty);
  });
  it("keeps the assistant speech callback, waiter states, and CV tracking", () => {
    state.voiceMode = true;
    function shell(confirmation = false) {
      state.voiceHook = 0;
      const nodes = elements(RestaurantShell({ message: "Welcome", children: "Menu", confirmation }));
      return { waiter: nodes.find((node) => node.type === RestaurantStaff)!, voice: nodes.find((node) => node.type === AtmSetupVoiceAssistant)! };
    }
    expect(shell().waiter.props.state).toBe("idle");
    const change = shell().voice.props.onSpeakingChange as (value: boolean) => void;
    change(true); expect(shell().waiter.props.state).toBe("speaking");
    change(false); expect(shell().waiter.props.state).toBe("idle");
    change(true); expect(shell(true).waiter.props.state).toBe("speaking");
    change(false); expect(shell(true).waiter.props.state).toBe("success");
    state.voiceMode = false;
    page(); expect(useFaceTracking).toHaveBeenLastCalledWith("restaurant-ordering", true, state.getSessionId);
    state.current = { ...initialRestaurantState, step: "success", order: { ...initialRestaurantState.order, mains: "pizza", drinks: "water" } };
    page(); expect(useFaceTracking).toHaveBeenLastCalledWith("restaurant-ordering", false, state.getSessionId);
  });
  it("keeps the preparation screen separate", () => {
    const markup = renderToStaticMarkup(<RestaurantIntroductionPage />);
    expect(markup).toContain("/scenario/restaurant-ordering/run");
    expect(markup).not.toContain("restaurant-order-ticket");
  });
  it("waits for actual waiter playback completion before each automatic payment transition", () => {
    state.current = { ...initialRestaurantState, step: "success", order: { ...initialRestaurantState.order, mains: "pizza", drinks: "water" } };
    state.payment = { phase: "processing", method: "card" };
    expect(state.payment.phase).toBe("processing");
    let settle = page().props.onWaiterMessageSettled as (message: string, outcome: string) => void;
    settle("unrelated speech", "ended");
    expect(state.payment.phase).toBe("processing");
    settle(restaurantPaymentTranslations.en.processing, "ended");
    expect(state.payment.phase).toBe("paid");
    settle = page().props.onWaiterMessageSettled as (message: string, outcome: string) => void;
    settle(restaurantPaymentTranslations.en.cardSuccess, "ended");
    expect(state.payment.phase).toBe("receipt");
    state.payment = { phase: "processing", method: "cash" };
    settle = page().props.onWaiterMessageSettled as (message: string, outcome: string) => void;
    settle(restaurantPaymentTranslations.en.processing, "stopped");
    expect(state.payment.phase).toBe("paid");
  });
  it("plays and stops completion sound at the receipt", () => {
    vi.stubGlobal("localStorage", { getItem: () => "true" });
    state.current = { ...initialRestaurantState, step: "success", order: { ...initialRestaurantState.order, mains: "pizza", drinks: "water" } };
    state.payment = { phase: "receipt", method: "card" };
    page(); const cleanup = state.effects.map((effect) => effect()).find((result) => typeof result === "function");
    expect(playSuccessSound).toHaveBeenCalledOnce(); cleanup?.(); expect(stopSuccessSound).toHaveBeenCalledOnce();
  });
});
