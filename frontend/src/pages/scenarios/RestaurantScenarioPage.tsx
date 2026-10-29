import { useCallback, useEffect, useReducer, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { LogOut } from "lucide-react";
import { useTranslation } from "../../i18n";
import { restaurantTranslations } from "../../lib/restaurantTranslations";
import { initialRestaurantState, restaurantReducer, type Meal, type MenuCategory, type RestaurantStep } from "../../lib/restaurantState";
import { getOrderReviewSpeech, getOrderTotalCents } from "../../lib/restaurantOrder";
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
import { chatWithRestaurantWaiter, type RestaurantWaiterTurn, type RestaurantPendingClarification } from "../../services/restaurantWaiterChatService";
import { restaurantWaiterSnapshot, type RestaurantWaiterAction, type RestaurantWaiterSnapshot } from "../../services/restaurantWaiterChatService";
import { previewRestaurantWaiterActions, sameRestaurantSnapshot } from "../../lib/restaurantWaiterActions";

export function RestaurantShell({ message, menuComment, children, orderTray, leaveAction, preview, confirmation = false, introHeader, menuBook = false, receipt = false, review = false, onWaiterMessageSettled, waiterContext, onApprovedActions }: {
  message: string; children: ReactNode; orderTray?: ReactNode; leaveAction?: ReactNode; preview?: ReactNode; confirmation?: boolean; introHeader?: ReactNode; menuBook?: boolean; receipt?: boolean; review?: boolean;
  menuComment?: { text: string; id: number } | null;
  onWaiterMessageSettled?: (message: string, outcome: AssistantSpeechOutcome) => void;
  waiterContext?: RestaurantWaiterSnapshot;
  onApprovedActions?: (actions: RestaurantWaiterAction[], projected: RestaurantWaiterSnapshot, expected: RestaurantWaiterSnapshot) => boolean;
}) {
  const { language } = useTranslation(); const text = restaurantTranslations[language]; const orderText = restaurantOrderTranslations[language];
  const [speaking, setSpeaking] = useState(false);
  const [listening, setListening] = useState(false);
  const [chatDraft, setChatDraft] = useState("");
  const [chatReply, setChatReply] = useState<{ text: string; state: RestaurantWaiterSnapshot; spoken: boolean } | null>(null);
  const [chatSpeechRequestId, setChatSpeechRequestId] = useState(0);
  const [stopSpeechRequestId, setStopSpeechRequestId] = useState(0);
  const [chatPending, setChatPending] = useState(false);
  const [waitingForSpeech, setWaitingForSpeech] = useState(false);
  const chatHistory = useRef<RestaurantWaiterTurn[]>([]);
  const pendingClarification = useRef<{ value: RestaurantPendingClarification; state: RestaurantWaiterSnapshot } | null>(null);
  const chatRequest = useRef<AbortController | null>(null);
  const chatBusy = useRef(false);
  const contextRef = useRef(waiterContext ?? restaurantWaiterSnapshot(initialRestaurantState, initialRestaurantPayment));
  contextRef.current = waiterContext ?? contextRef.current;
  useEffect(() => {
    chatRequest.current?.abort();
    chatBusy.current = false;
    setChatPending(false);
    setWaitingForSpeech(false);
    setChatReply(null);
    pendingClarification.current = null;
  }, [language]);
  useEffect(() => { chatHistory.current = []; }, [language]);
  useEffect(() => () => chatRequest.current?.abort(), []);
  const sendChat = async (voiceMessage?: string) => {
    const messageToSend = (voiceMessage ?? chatDraft).trim();
    if (!messageToSend || chatBusy.current) return;
    const request = new AbortController();
    const requestState = { ...contextRef.current, order: { ...contextRef.current.order } };
    chatRequest.current = request;
    chatBusy.current = true;
    setChatPending(true);
    try {
      const pending = pendingClarification.current && sameRestaurantSnapshot(pendingClarification.current.state, requestState)
        ? pendingClarification.current.value : null;
      const result = await chatWithRestaurantWaiter({ message: messageToSend, language, history: chatHistory.current.slice(-4), state: requestState, pending }, request.signal);
      if (request.signal.aborted) return;
      if (!sameRestaurantSnapshot(contextRef.current, requestState) ||
          (result.actions.length ? !onApprovedActions?.(result.actions, result.state, requestState)
            : !sameRestaurantSnapshot(result.state, requestState))) {
        setChatReply({ text: orderText.conversationUnavailable, state: requestState, spoken: false });
        return;
      }
      pendingClarification.current = result.pending ? { value: result.pending, state: result.state } : null;
      chatHistory.current = [...chatHistory.current, { role: "user" as const, content: messageToSend }, { role: "assistant" as const, content: result.reply }].slice(-4);
      setChatReply({ text: result.reply, state: result.state, spoken: true });
      setWaitingForSpeech(true);
      setChatSpeechRequestId((current) => current + 1);
      if (voiceMessage === undefined) setChatDraft("");
    } catch {
      if (!request.signal.aborted) setChatReply({ text: orderText.conversationUnavailable, state: requestState, spoken: false });
    } finally {
      if (chatRequest.current === request) {
        chatRequest.current = null;
        chatBusy.current = false;
        setChatPending(false);
      }
    }
  };
  const activeChatReply = chatReply && sameRestaurantSnapshot(chatReply.state, contextRef.current) ? chatReply : null;
  const spokenMessage = activeChatReply?.spoken ? activeChatReply.text : activeChatReply ? message : menuComment?.text ?? message;
  const displayedMessage = activeChatReply?.text ?? menuComment?.text ?? message;
  const waiterState = speaking ? "speaking" : confirmation ? "success" : listening ? "listening" : "idle";
  return <section className={`restaurant-page min-h-screen px-4 py-5 sm:px-6 ${introHeader ? "restaurant-introduction" : ""}`}>
    <div className="mx-auto max-w-[1500px]">
      <div className="min-w-0">
        {introHeader ?? <header className="restaurant-scenario-header"><div><p className="text-xs font-bold text-[#087f8c]">ASSIST-AI</p><h1 className="mt-1 font-display text-2xl font-extrabold text-[#1d1a5e]">{text.title}</h1></div>{leaveAction}</header>}
        <div className="restaurant-scene">
          <div className="restaurant-environment" aria-hidden="true"><img src={restaurantCounter} alt="" className="restaurant-background" /><img src={restaurantCounter} alt="" className="restaurant-counter-front" /></div>
          <div className="restaurant-staff-zone">
            <RestaurantStaff state={waiterState} className="restaurant-scene-waiter" />
            <div className="restaurant-dialogue restaurant-waiter-caption">
              <div className="restaurant-dialogue-heading">
                <p className="text-xs font-bold text-[#526e6d]">{text.staff}</p>
                <div className="restaurant-voice-controls"><AtmSetupVoiceAssistant compact scenario="restaurant" streamAudio={Boolean(activeChatReply?.spoken)} language={language} message={spokenMessage} modeLabel={text.title} speechRequestId={chatSpeechRequestId + (menuComment?.id ?? 0)} stopRequestId={stopSpeechRequestId} speechDelayMs={!activeChatReply && message === orderText.welcomeCaption ? 650 : 0} onSpeakingChange={setSpeaking} onMessageSettled={(settledMessage, outcome) => { setWaitingForSpeech(false); onWaiterMessageSettled?.(settledMessage, outcome); }} /></div>
              </div>
              <p className="restaurant-dialogue-message" aria-live="polite">{displayedMessage}</p>
            </div>
            <div className="restaurant-social-actions"><WaiterConversationBar language={language} value={chatDraft} pending={chatPending} speaking={speaking || waitingForSpeech} onInterruptWaiter={() => { setStopSpeechRequestId((current) => current + 1); setSpeaking(false); setWaitingForSpeech(false); }} onChange={setChatDraft} onSend={() => { void sendChat(); }} onVoiceSubmit={sendChat} /></div>
          </div>
          <div className={`restaurant-content-zone ${orderTray ? "restaurant-content-with-order" : ""}`}>
            {orderTray && <div className="restaurant-order-area">{orderTray}</div>}
            <div className={`restaurant-menu ${menuBook ? "restaurant-menu-book-stage" : "restaurant-content-surface"}${receipt ? " restaurant-receipt-stage" : ""}${review ? " restaurant-review-stage" : ""}`} onFocusCapture={() => setListening(true)} onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setListening(false); }} onPointerEnter={() => setListening(true)} onPointerLeave={() => setListening(false)}>
              {children}
            </div>
          </div>
        </div>
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
  const [focusItemId, setFocusItemId] = useState<string | null>(null);
  const [menuComment, setMenuComment] = useState<{ text: string; id: number } | null>(null);
  const menuSelectionCount = useRef(0);
  const menuCommentCount = useRef(0);
  const lastMenuCommentAt = useRef(0);
  const latest = useRef({ state, payment });
  latest.current = { state, payment };
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
    : state.step === "review" ? getOrderReviewSpeech(state.order, language)
    : state.unavailable && !state.fullMenu ? orderText.unavailableCaption
    : state.step === "alternative" && state.selected ? orderText.replacementCaption
    : state.step === "menu" || state.step === "alternative" ? orderText.menuOpenGuidance
    : restarted && state.step === "menuCover" ? orderText.orderAgainCaption
    : orderText.welcomeCaption;
  const menuBook = state.step === "menuCover" || state.step === "menu" || state.step === "alternative" || state.step === "alternativeCover";
  const openBook = state.step === "menu" || state.step === "alternative";
  useEffect(() => { if (!menuBook) setMenuComment(null); }, [menuBook]);
  const select = (category: MenuCategory, id: string) => {
    setFocusItemId(null);
    if (category === "mains") analytics.event(state.unavailable ? "alternative_selected" : "meal_selected", id as Meal);
    dispatch({ type: "selectItem", category, id });
    // The first main dish is deliberately unavailable in this exercise.
    // Let the existing explanation play before commenting on actual choices.
    if (category === "mains" && state.unavailable === null) { setMenuComment(null); return; }
    if (category !== "mains" && state.unavailable && !state.order.mains) return;
    if (state.order[category] === id) return;
    menuSelectionCount.current += 1;
    const now = Date.now();
    if (menuSelectionCount.current !== 1 && (menuSelectionCount.current % 2 !== 0 || now - lastMenuCommentAt.current < 6500)) return;
    lastMenuCommentAt.current = now;
    const commentNumber = menuCommentCount.current++;
    setMenuComment({ text: orderText.menuChoiceComments[commentNumber % orderText.menuChoiceComments.length], id: commentNumber + 1 });
  };
  const onApprovedActions = (actions: RestaurantWaiterAction[], projected: RestaurantWaiterSnapshot, expected: RestaurantWaiterSnapshot) => {
    const current = latest.current;
    const diagnose = (success: boolean, stepAfter: string) => {
      if (import.meta.env.DEV) console.debug("restaurant_frontend_action", { stepBefore: current.state.step,
        actions: actions.map((action) => action.type), validationSuccess: success, stepAfter });
    };
    if (!sameRestaurantSnapshot(restaurantWaiterSnapshot(current.state, current.payment), expected)) {
      diagnose(false, current.state.step); return false;
    }
    if (actions.length === 1 && actions[0].type === "NEW_ORDER") {
      if (current.state.step !== "success" || !["paid", "receipt"].includes(current.payment.phase) ||
          !sameRestaurantSnapshot(projected, restaurantWaiterSnapshot(initialRestaurantState, initialRestaurantPayment))) {
        diagnose(false, current.state.step); return false;
      }
      diagnose(true, "menuCover");
      onOrderAgain();
      return true;
    }
    const preview = previewRestaurantWaiterActions(current.state, current.payment, actions);
    if (!preview || !sameRestaurantSnapshot(preview.snapshot, projected)) {
      diagnose(false, current.state.step); return false;
    }
    diagnose(true, preview.snapshot.step);
    preview.restaurantActions.forEach(dispatch);
    preview.paymentActions.forEach(dispatchPayment);
    setFocusItemId(preview.focusItemId);
    return true;
  };
  const updateLineQuantity = (category: MenuCategory, id: string, quantity: number) => {
    dispatch({ type: "setQuantity", category, id, quantity });
  };
  const removeOrderLine = (category: MenuCategory, id: string) => {
    dispatch({ type: "removeItem", category, id });
  };
  return <RestaurantShell message={message} menuComment={openBook ? menuComment : null} waiterContext={restaurantWaiterSnapshot(state, payment)} onApprovedActions={onApprovedActions} menuBook={menuBook} review={state.step === "review"} receipt={state.step === "success" && payment.phase === "receipt"} onWaiterMessageSettled={onWaiterMessageSettled} orderTray={openBook ? <RestaurantOrderTicket order={state.order} language={language} onRemove={removeOrderLine} onQuantityChange={updateLineQuantity} onReview={() => dispatch({ type: "reviewOrder" })} /> : undefined} leaveAction={<Link to="/scenarios" className="restaurant-leave-link" aria-label={text.leave}><LogOut className="restaurant-exit-icon h-5 w-5 shrink-0" aria-hidden="true" />{text.leave}</Link>} confirmation={state.step === "success"} preview={<AdminFaceTrackingPreview active={active} scenario="restaurant-ordering" getFrame={tracking.getPreviewFrame} compactPopup />}>
    {menuBook && <>
      <RestaurantMenu state={state} language={language} dispatch={dispatch} onSelect={select} headingRef={heading} focusItemId={focusItemId} onManualNavigate={() => setFocusItemId(null)} />
    </>}
    {state.step === "review" && <>
      <h2 ref={heading} tabIndex={-1} className="mb-4 text-xl font-bold text-[#1d1a5e] focus:outline-none">{orderText.review}</h2>
      <RestaurantOrderTicket order={state.order} language={language} review onRemove={removeOrderLine} onQuantityChange={updateLineQuantity} />
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
