import { useCallback, useEffect, useReducer, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { LogOut } from "lucide-react";
import { useTranslation } from "../../i18n";
import { restaurantTranslations } from "../../lib/restaurantTranslations";
import { initialRestaurantState, restaurantReducer, type Meal, type MenuCategory, type RestaurantStep } from "../../lib/restaurantState";
import { getOrderTotalCents } from "../../lib/restaurantOrder";
import { restaurantOrderTranslations } from "../../lib/restaurantOrderTranslations";
import { RestaurantStaff } from "../../components/restaurant/RestaurantArt";
import restaurantCounter from "../../assets/restaurant-counter.png";
import "../../components/restaurant/restaurant.css";
import { AtmSetupVoiceAssistant, type AssistantSpeechOutcome } from "../../components/atm/AtmSetupVoiceAssistant";
import { AdminFaceTrackingPreview } from "../../components/AdminFaceTrackingPreview";
import { useFaceTracking } from "../../hooks/useFaceTracking";
import { useRestaurantAnalytics } from "../../hooks/useRestaurantAnalytics";
import { playSuccessSound, stopSuccessSound } from "../../services/speechSynthesisService";
import { formatRestaurantPrice, initialRestaurantPayment, restaurantPaymentReducer } from "../../lib/restaurantPayment";
import { restaurantPaymentTranslations } from "../../lib/restaurantPaymentTranslations";
import { RestaurantPaymentPanel, restaurantPaymentMessage } from "../../components/restaurant/RestaurantPaymentPanel";
import { RestaurantMenu } from "../../components/restaurant/RestaurantMenu";
import { RestaurantOrderTicket } from "../../components/restaurant/RestaurantOrderTicket";
import { WaiterConversationBar } from "../../components/restaurant/WaiterConversationBar";

export function RestaurantShell({ message, children, orderTray, leaveAction, preview, confirmation = false, introHeader, menuBook = false, receipt = false, review = false, onWaiterMessageSettled }: {
  message: string; children: ReactNode; orderTray?: ReactNode; leaveAction?: ReactNode; preview?: ReactNode; confirmation?: boolean; introHeader?: ReactNode; menuBook?: boolean; receipt?: boolean; review?: boolean;
  onWaiterMessageSettled?: (message: string, outcome: AssistantSpeechOutcome) => void;
}) {
  const { language } = useTranslation(); const text = restaurantTranslations[language]; const orderText = restaurantOrderTranslations[language];
  const [speaking, setSpeaking] = useState(false);
  const [listening, setListening] = useState(false);
  const waiterState = speaking ? "speaking" : confirmation ? "success" : listening ? "listening" : "idle";
  return <section className={`restaurant-page min-h-screen px-4 py-5 sm:px-6 ${introHeader ? "restaurant-introduction" : ""}`}>
    <div className="mx-auto max-w-[1500px]">
      <div className="min-w-0">
        {introHeader ?? <header className="mb-4"><p className="text-xs font-bold text-[#087f8c]">ASSIST-AI</p><h1 className="mt-1 font-display text-2xl font-extrabold text-[#1d1a5e]">{text.title}</h1></header>}
        <div className="restaurant-scene">
          <div className="restaurant-environment" aria-hidden="true"><img src={restaurantCounter} alt="" className="restaurant-background" /><img src={restaurantCounter} alt="" className="restaurant-counter-front" /></div>
          <div className="restaurant-staff-zone">
            <RestaurantStaff state={waiterState} className="restaurant-scene-waiter" />
            <div className="restaurant-dialogue restaurant-waiter-caption">
              <div className="restaurant-dialogue-heading">
                <p className="text-xs font-bold text-[#526e6d]">{text.staff}</p>
                <div className="restaurant-voice-controls"><AtmSetupVoiceAssistant compact scenario="restaurant" language={language} message={message} modeLabel={text.title} speechRequestId={0} speechDelayMs={message === orderText.welcomeCaption ? 650 : 0} onSpeakingChange={setSpeaking} onMessageSettled={onWaiterMessageSettled} /></div>
              </div>
              <p className="restaurant-dialogue-message" aria-live="polite">{message}</p>
            </div>
            <div className="restaurant-social-actions"><WaiterConversationBar language={language} /></div>
          </div>
          <div className={`restaurant-content-zone ${orderTray ? "restaurant-content-with-order" : ""}`}>
            {orderTray && <div className="restaurant-order-area">{orderTray}</div>}
            <div className={`restaurant-menu ${menuBook ? "restaurant-menu-book-stage" : "restaurant-content-surface"}${receipt ? " restaurant-receipt-stage" : ""}${review ? " restaurant-review-stage" : ""}`} onFocusCapture={() => setListening(true)} onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setListening(false); }} onPointerEnter={() => setListening(true)} onPointerLeave={() => setListening(false)}>
              {children}
            </div>
          </div>
        </div>
        {leaveAction && <div className="restaurant-scene-footer">{leaveAction}</div>}
      </div>
      {preview}
    </div>
  </section>;
}

export { RestaurantIntroductionPage } from "./RestaurantIntroductionPage";

export function RestaurantScenarioPage() {
  const [attempt, setAttempt] = useState(0);
  return <RestaurantOrderAttempt key={attempt} restarted={attempt > 0} onOrderAgain={() => setAttempt((current) => current + 1)} />;
}

export function RestaurantOrderAttempt({ onOrderAgain, restarted = false }: { onOrderAgain: () => void; restarted?: boolean }) {
  const { language } = useTranslation(); const text = restaurantTranslations[language];
  const orderText = restaurantOrderTranslations[language];
  const [state, dispatch] = useReducer(restaurantReducer, initialRestaurantState);
  const [payment, dispatchPayment] = useReducer(restaurantPaymentReducer, initialRestaurantPayment);
  const paymentText = restaurantPaymentTranslations[language];
  // UI browsing and review remain within the existing backend confirmation phase.
  const analyticsStep: RestaurantStep = state.step === "review" || state.step === "drink" || state.step === "drinkCover" || state.step === "orderConfirmation" ? "confirmation"
    : state.step === "menuCover" ? "menu" : state.step === "alternativeCover" ? "alternative" : state.step;
  const analytics = useRestaurantAnalytics(language, analyticsStep);
  const active = state.step !== "success";
  const tracking = useFaceTracking("restaurant-ordering", active, analytics.getSessionId);
  useEffect(() => {
    if (state.step !== "success" || payment.phase !== "receipt") return;
    if (localStorage.getItem("assist_ai_sound_enabled") !== "false") playSuccessSound();
    return stopSuccessSound;
  }, [state.step, payment.phase]);
  const onWaiterMessageSettled = useCallback((spokenMessage: string) => {
    if (state.step !== "success") return;
    if (payment.phase === "processing" && spokenMessage === paymentText.processing) dispatchPayment({ type: "complete" });
    if (payment.phase === "paid" && spokenMessage === (payment.method === "card" ? paymentText.cardSuccess : paymentText.cashSuccess)) dispatchPayment({ type: "receipt" });
  }, [state.step, payment.phase, payment.method, paymentText]);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { heading.current?.focus(); }, [state.step, payment.phase]);
  const orderTotal = formatRestaurantPrice(getOrderTotalCents(state.order, language), language);
  const message = state.step === "success" ? restaurantPaymentMessage(payment, paymentText, orderTotal)
    : state.step === "review" ? orderText.reviewCaption
    : state.unavailable && !state.fullMenu ? orderText.unavailableCaption
    : state.step === "alternative" && state.selected ? orderText.replacementCaption
    : state.step === "menu" || state.step === "alternative" ? orderText.menuOpenGuidance
    : restarted && state.step === "menuCover" ? orderText.orderAgainCaption
    : orderText.welcomeCaption;
  const menuBook = state.step === "menuCover" || state.step === "menu" || state.step === "alternative" || state.step === "alternativeCover";
  const openBook = state.step === "menu" || state.step === "alternative";
  const select = (category: MenuCategory, id: string) => {
    if (category === "mains") analytics.event(state.unavailable ? "alternative_selected" : "meal_selected", id as Meal);
    dispatch({ type: "selectItem", category, id });
  };
  return <RestaurantShell message={message} menuBook={menuBook} review={state.step === "review"} receipt={state.step === "success" && payment.phase === "receipt"} onWaiterMessageSettled={onWaiterMessageSettled} orderTray={openBook ? <RestaurantOrderTicket order={state.order} language={language} onRemove={(category) => dispatch({ type: "removeItem", category })} onReview={() => dispatch({ type: "reviewOrder" })} /> : undefined} leaveAction={state.step !== "success" ? <Link to="/scenarios" className="restaurant-leave-link inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white/90 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-cyan-300 focus:ring-offset-2"><LogOut className="restaurant-exit-icon h-5 w-5 shrink-0" aria-hidden="true" />{text.leave}</Link> : undefined} confirmation={state.step === "success"} preview={<AdminFaceTrackingPreview active={active} scenario="restaurant-ordering" getFrame={tracking.getPreviewFrame} compactPopup />}>
    {menuBook && <>
      <RestaurantMenu state={state} language={language} dispatch={dispatch} onSelect={select} headingRef={heading} />
    </>}
    {state.step === "review" && <>
      <h2 ref={heading} tabIndex={-1} className="mb-4 text-xl font-bold text-[#1d1a5e] focus:outline-none">{orderText.review}</h2>
      <RestaurantOrderTicket order={state.order} language={language} review />
      <div className="restaurant-review-actions">
        <button type="button" className="restaurant-action-secondary" onClick={() => { analytics.event("menu_reopened"); dispatch({ type: "changeOrder" }); }}>{orderText.change}</button>
        <button type="button" className="restaurant-action-primary" onClick={() => { analytics.event("order_confirmed", state.order.mains as Meal); dispatch({ type: "confirmOrder" }); }}>{orderText.confirm}</button>
      </div>
    </>}
    {state.step === "success" && <>
      <h2 ref={heading} tabIndex={-1} className="mb-4 text-xl font-bold text-[#1d1a5e] focus:outline-none">{payment.phase === "receipt" ? paymentText.receipt : paymentText.heading}</h2>
      <RestaurantPaymentPanel payment={payment} order={state.order} language={language} onAction={dispatchPayment} onOrderAgain={onOrderAgain} />
    </>}
  </RestaurantShell>;
}
