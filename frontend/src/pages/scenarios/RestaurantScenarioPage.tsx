import { useEffect, useReducer, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { CircleMinus, LogOut } from "lucide-react";
import { useTranslation } from "../../i18n";
import { restaurantTranslations } from "../../lib/restaurantTranslations";
import { drinks, initialRestaurantState, meals, restaurantReducer, type Meal } from "../../lib/restaurantState";
import { RestaurantStaff, FoodIllustration, DrinkIllustration } from "../../components/restaurant/RestaurantArt";
import restaurantCounter from "../../assets/restaurant-counter.png";
import "../../components/restaurant/restaurant.css";
import { AtmSetupVoiceAssistant } from "../../components/atm/AtmSetupVoiceAssistant";
import { ScenarioAssistantColumn } from "../../components/ScenarioAssistantColumn";
import { AdminFaceTrackingPreview } from "../../components/AdminFaceTrackingPreview";
import { useFaceTracking } from "../../hooks/useFaceTracking";
import { useRestaurantAnalytics } from "../../hooks/useRestaurantAnalytics";
import { playSuccessSound, stopSuccessSound } from "../../services/speechSynthesisService";
import { formatRestaurantPrice, getRestaurantDrinkPrice, getRestaurantMealPrice, getRestaurantReceipt, initialRestaurantPayment, RESTAURANT_PAYMENT_DELAY_MS, RESTAURANT_RECEIPT_DELAY_MS, restaurantPaymentReducer } from "../../lib/restaurantPayment";
import { restaurantPaymentTranslations } from "../../lib/restaurantPaymentTranslations";
import { RestaurantPaymentPanel, restaurantPaymentMessage } from "../../components/restaurant/RestaurantPaymentPanel";

const primary = "inline-flex min-h-14 items-center justify-center rounded-xl bg-[#302992] px-6 py-3 text-base font-bold text-white hover:bg-[#211c72] focus:outline-none focus:ring-4 focus:ring-cyan-300 focus:ring-offset-2";
const secondary = "inline-flex min-h-14 items-center justify-center rounded-xl border-2 border-indigo-200 bg-white px-6 py-3 font-bold text-[#302992] hover:bg-indigo-50 focus:outline-none focus:ring-4 focus:ring-cyan-300 focus:ring-offset-2";

export function RestaurantShell({ message, children, preview, confirmation = false, introHeader }: { message: string; children: ReactNode; preview?: ReactNode; confirmation?: boolean; introHeader?: ReactNode }) {
  const { language } = useTranslation(); const text = restaurantTranslations[language];
  const [speaking, setSpeaking] = useState(false);
  const [listening, setListening] = useState(false);
  const waiterState = speaking ? "speaking" : confirmation ? "success" : listening ? "listening" : "idle";
  return <section className={`restaurant-page min-h-screen px-4 py-5 sm:px-6 ${introHeader ? "restaurant-introduction" : ""}`}>
    <div className="mx-auto grid max-w-[1500px] items-start gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
      <div className="min-w-0">
        {introHeader ?? <header className="mb-4"><p className="text-xs font-bold text-[#087f8c]">ASSIST-AI</p><h1 className="mt-1 font-display text-2xl font-extrabold text-[#1d1a5e]">{text.title}</h1></header>}
        <div className="restaurant-scene">
          <div className="restaurant-environment" aria-hidden="true"><img src={restaurantCounter} alt="" className="restaurant-background" /><img src={restaurantCounter} alt="" className="restaurant-counter-front" /></div>
          <div className="restaurant-staff-zone">
            <div className="restaurant-dialogue"><p className="mb-1 text-xs font-bold text-[#526e6d]">{text.staff}</p><p className="text-base font-semibold leading-7 text-[#1d1a5e]" aria-live="polite">{message}</p></div>
            <RestaurantStaff state={waiterState} className="restaurant-scene-waiter" />
          </div>
          <div className="restaurant-menu" onFocusCapture={() => setListening(true)} onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setListening(false); }} onPointerEnter={() => setListening(true)} onPointerLeave={() => setListening(false)}>
            {children}
          </div>
        </div>
      </div>
      <ScenarioAssistantColumn assistant={<AtmSetupVoiceAssistant language={language} message={message} modeLabel={text.title} speechRequestId={0} onSpeakingChange={setSpeaking} />}>{preview}</ScenarioAssistantColumn>
    </div>
  </section>;
}

export { RestaurantIntroductionPage } from "./RestaurantIntroductionPage";

export function RestaurantScenarioPage() {
  const [attempt, setAttempt] = useState(0);
  return <RestaurantOrderAttempt key={attempt} onOrderAgain={() => setAttempt((current) => current + 1)} />;
}

export function RestaurantOrderAttempt({ onOrderAgain }: { onOrderAgain: () => void }) {
  const { language } = useTranslation(); const text = restaurantTranslations[language];
  const [state, dispatch] = useReducer(restaurantReducer, initialRestaurantState);
  const [payment, dispatchPayment] = useReducer(restaurantPaymentReducer, initialRestaurantPayment);
  const paymentText = restaurantPaymentTranslations[language];
  // Keep the added frontend steps within the existing backend confirmation phase.
  const analyticsStep = state.step === "drink" || state.step === "orderConfirmation" ? "confirmation" : state.step;
  const analytics = useRestaurantAnalytics(language, analyticsStep);
  const active = state.step !== "success";
  const tracking = useFaceTracking("restaurant-ordering", active, analytics.getSessionId);
  useEffect(() => {
    if (state.step !== "success" || payment.phase !== "receipt") return;
    if (localStorage.getItem("assist_ai_sound_enabled") !== "false") playSuccessSound();
    return stopSuccessSound;
  }, [state.step, payment.phase]);
  useEffect(() => {
    if (state.step !== "success" || (payment.phase !== "processing" && payment.phase !== "paid")) return;
    const timer = window.setTimeout(() => dispatchPayment({ type: payment.phase === "processing" ? "complete" : "receipt" }), payment.phase === "processing" ? RESTAURANT_PAYMENT_DELAY_MS : RESTAURANT_RECEIPT_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [state.step, payment.phase]);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { heading.current?.focus(); }, [state.step, state.fullMenu, payment.phase]);
  const orderMessage = (state.drink === "none" ? text.orderWithoutDrink : text.orderWithDrink)
    .replace("{meal}", state.selected ? text.foods[state.selected] : "")
    .replace("{drink}", state.drink ? text.drinks[state.drink] : "");
  const orderTotal = formatRestaurantPrice(state.selected ? getRestaurantReceipt(state.selected, state.drink ?? "none", language).totalCents : 0, language);
  const message = state.step === "menu" ? text.welcome : state.step === "alternative" ? (state.fullMenu ? text.chooseAgain : text.unavailable)
    : state.step === "confirmation" ? text.selectedMealMessage.replace("{meal}", text.foods[state.selected!])
    : state.step === "drink" ? text.drinkQuestion : state.step === "orderConfirmation" ? orderMessage : restaurantPaymentMessage(payment, paymentText, orderTotal);
  const stepHeading = state.step === "drink" ? text.drinkHeading : state.step === "orderConfirmation" ? text.completeOrder
    : state.step === "alternative" ? text.alternativeHeading : state.step === "success"
      ? payment.phase === "receipt" ? paymentText.receipt : payment.phase === "method" ? paymentText.heading : payment.phase === "card" ? paymentText.card : payment.phase === "cash" ? paymentText.cash : restaurantPaymentMessage(payment, paymentText, orderTotal)
      : text.steps[state.step];
  const orderContents = state.selected && <>
    <div className="flex items-end justify-center gap-4 sm:gap-8">
      <div className="min-w-0 flex-1 max-w-48">
        <FoodIllustration meal={state.selected} /><p className="text-lg font-bold text-[#1d1a5e]">{text.foods[state.selected]}</p>
        <p className="mt-1 font-semibold text-slate-600">{formatRestaurantPrice(getRestaurantMealPrice(state.selected, language), language)}</p>
        {state.step === "orderConfirmation" && <button type="button" className={`${secondary} mt-4 w-full`} onClick={() => { analytics.event("menu_reopened"); dispatch({ type: "changeMeal" }); }}>{text.changeMeal}</button>}
      </div>
      {state.drink && (state.drink !== "none" || state.step === "orderConfirmation") && <div className="min-w-0 flex-1 max-w-48">
        {state.drink !== "none" ? <DrinkIllustration drink={state.drink} /> : <div className="h-[94px]" aria-hidden="true" />}
        <p className="text-lg font-bold text-[#1d1a5e]">{text.drinks[state.drink]}</p>
        <p className="mt-1 font-semibold text-slate-600">{formatRestaurantPrice(getRestaurantDrinkPrice(state.drink, language), language)}</p>
        {state.step === "orderConfirmation" && <button type="button" className={`${secondary} mt-4 w-full`} onClick={() => dispatch({ type: "changeDrink" })}>{text.changeDrink}</button>}
      </div>}
    </div>
    {state.drink === "none" && state.step !== "orderConfirmation" && <p className="mt-2 font-semibold text-slate-700">{text.drinks.none}</p>}
  </>;
  const choose = (meal: Meal) => {
    if (meal === state.unavailable) return;
    analytics.event(state.step === "menu" ? "meal_selected" : "alternative_selected", meal);
    dispatch({ type: "choose", meal });
  };
  return <RestaurantShell message={message} confirmation={state.step === "confirmation" || state.step === "success"} preview={<AdminFaceTrackingPreview active={active} scenario="restaurant-ordering" getFrame={tracking.getPreviewFrame} />}>
    <h2 ref={heading} tabIndex={-1} className="mb-5 rounded-lg text-xl font-bold text-[#1d1a5e] focus:outline-none">{stepHeading}</h2>
    {(state.step === "menu" || state.step === "alternative") && <>
      {state.unavailable && <p className="mb-4 rounded-xl bg-[#f3f7f6] px-4 py-3 font-medium text-slate-700">{text.foods[state.unavailable]} · {text.unavailableLabel}</p>}
      <div className="grid grid-cols-2 gap-3" aria-label={state.step === "menu" ? text.menu : text.alternatives}>
        {meals.filter((meal) => state.fullMenu || meal !== state.unavailable).map((meal) => <button key={meal} type="button" disabled={meal === state.unavailable} onClick={() => choose(meal)}
          className="restaurant-food-option rounded-2xl border-2 border-indigo-100 bg-white p-3 text-center text-base font-bold text-[#302992] hover:border-[#302992] focus:outline-none focus:ring-4 focus:ring-cyan-300 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-500">
          <FoodIllustration meal={meal} /><span>{text.foods[meal]}</span><span className="mt-1 block text-sm font-semibold text-slate-600">{formatRestaurantPrice(getRestaurantMealPrice(meal, language), language)}</span>{meal === state.unavailable && <span className="mt-2 block text-sm font-medium">{text.unavailableLabel}</span>}
        </button>)}
      </div>
    </>}
    {state.step === "confirmation" && <>
      <div className="rounded-2xl border border-indigo-100 p-4 text-center"><FoodIllustration meal={state.selected!} /><p className="text-lg font-bold text-[#302992]">{text.foods[state.selected!]}</p></div>
      <div className="mt-5 flex flex-wrap gap-6"><button type="button" className={primary} onClick={() => dispatch({ type: "confirm" })}>{text.confirmMeal}</button><button type="button" className={secondary} onClick={() => { analytics.event("menu_reopened"); dispatch({ type: "change" }); }}>{text.change}</button></div>
    </>}
    {state.step === "drink" && <div className="grid grid-cols-2 gap-3 sm:grid-cols-3" aria-label={text.drinkHeading}>
      {drinks.map((drink) => {
        return <button key={drink} type="button" onClick={() => dispatch({ type: "chooseDrink", drink })}
          className={`restaurant-food-option flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-indigo-100 bg-white p-4 text-center text-base font-bold text-[#302992] focus:outline-none focus:ring-4 focus:ring-cyan-300 ${drink === "none" ? "col-span-2 sm:col-span-1" : ""}`}>
          {drink === "none" ? <CircleMinus className="restaurant-drink-icon" strokeWidth={1.5} aria-hidden="true" /> : <DrinkIllustration drink={drink} />}<span>{text.drinks[drink]}</span><span className="text-sm font-semibold text-slate-600">{formatRestaurantPrice(getRestaurantDrinkPrice(drink, language), language)}</span>
        </button>;
      })}
    </div>}
    {state.step === "orderConfirmation" && <>
      <div className="rounded-2xl border border-indigo-100 bg-white p-4 text-center">{orderContents}</div>
      <button type="button" className={`${primary} mt-5 w-full`} onClick={() => { analytics.event("order_confirmed", state.selected!); dispatch({ type: "placeOrder" }); }}>{text.confirm}</button>
    </>}
    {state.step === "success" && <RestaurantPaymentPanel payment={payment} meal={state.selected!} drink={state.drink!} language={language} onAction={dispatchPayment} onOrderAgain={onOrderAgain} />}
    {state.step !== "success" && <div className={`mt-6 flex flex-col gap-6 sm:flex-row sm:flex-wrap sm:items-center ${state.step === "orderConfirmation" ? "border-t border-indigo-100 pt-5 sm:justify-end" : "sm:justify-between"}`}>
      {state.step === "alternative" && !state.fullMenu && <button type="button" className={primary} onClick={() => { analytics.event("menu_reopened"); dispatch({ type: "menu" }); }}>{text.showMenu}</button>}
      <Link to="/scenarios" className="inline-flex min-h-14 items-center justify-center gap-2 rounded-xl border-2 border-amber-300 bg-amber-50 px-6 py-3 text-base font-bold text-amber-950 hover:border-amber-400 hover:bg-amber-100 focus:outline-none focus:ring-4 focus:ring-cyan-300 focus:ring-offset-2"><LogOut className="restaurant-exit-icon h-5 w-5 shrink-0" aria-hidden="true" />{text.leave}</Link>
    </div>}
  </RestaurantShell>;
}
