import { CheckCircle2, LogOut, RotateCcw } from "lucide-react";
import { Link } from "react-router-dom";
import type { LanguageCode } from "../../i18n";
import { formatRestaurantPrice, getRestaurantReceipt, type RestaurantPaymentAction, type RestaurantPaymentState } from "../../lib/restaurantPayment";
import { restaurantPaymentTranslations, type RestaurantPaymentText } from "../../lib/restaurantPaymentTranslations";
import { getOrderItem, getOrderItemName, getOrderTotalCents } from "../../lib/restaurantOrder";
import { getRestaurantMenuItemPrice } from "../../lib/restaurantMenu";
import { menuCategories, type Drink, type Meal, type RestaurantOrder } from "../../lib/restaurantState";
import { restaurantTranslations } from "../../lib/restaurantTranslations";
import { PaymentMethodIllustration, PaymentTerminalIllustration, PaymentCardIllustration, CashPaymentIllustration } from "./RestaurantPaymentArt";

export function restaurantPaymentMessage(state: RestaurantPaymentState, text: RestaurantPaymentText, total: string) {
  if (state.phase === "method") return text.totalQuestion.replace("{total}", total);
  if (state.phase === "card") return text.cardInstruction;
  if (state.phase === "cash") return text.cashInstruction;
  if (state.phase === "processing") return text.processing;
  if (state.phase === "paid") return state.method === "card" ? text.cardSuccess : text.cashSuccess;
  return text.complete;
}

export function RestaurantPaymentPanel({ payment, meal, drink, order, language, onAction, onOrderAgain }: {
  payment: RestaurantPaymentState; meal?: Meal; drink?: Drink; order?: RestaurantOrder; language: LanguageCode;
  onAction: (action: RestaurantPaymentAction) => void; onOrderAgain: () => void;
}) {
  const text = restaurantPaymentTranslations[language];
  const restaurant = restaurantTranslations[language];
  const receipt = getRestaurantReceipt(meal ?? "pasta", drink ?? "none", language);
  const money = (cents: number) => formatRestaurantPrice(cents, language);
  const total = money(order ? getOrderTotalCents(order, language) : receipt.totalCents);
  const legacyOrderLines = <>
    <div className="flex justify-between gap-4"><dt>{restaurant.foods[meal ?? "pasta"]}</dt><dd className="shrink-0 font-semibold">{money(receipt.mealCents)}</dd></div>
    <div className="flex justify-between gap-4"><dt>{drink === "none" || !drink ? text.noDrink : restaurant.drinks[drink]}</dt><dd className="shrink-0 font-semibold">{money(receipt.drinkCents)}</dd></div>
    <div className="flex justify-between gap-4 border-t border-slate-200 pt-3 text-lg font-bold"><dt>{text.total}</dt><dd>{total}</dd></div>
  </>;
  const orderLines = order ? <>
    {menuCategories.flatMap((category) => {
      const item = getOrderItem(order, category);
      if (!item) return [];
      const name = getOrderItemName(order, category, language)!;
      return [<div key={category} className="restaurant-payment-order-line"><dt>{name}</dt><dd>{money(getRestaurantMenuItemPrice(item, language))}</dd></div>];
    })}
    <div className="restaurant-payment-order-total"><dt>{text.total}</dt><dd>{total}</dd></div>
  </> : legacyOrderLines;
  const paying = payment.phase === "processing" || payment.phase === "paid";
  return <div className="restaurant-payment">
    {payment.phase === "method" && <>
      <div className="restaurant-payment-intro"><span>{text.total}</span><strong>{total}</strong><p>{text.question}</p></div>
      <div className="restaurant-payment-methods">
        <button type="button" className="restaurant-payment-choice restaurant-payment-choice-card" aria-label={text.card} onClick={() => onAction({ type: "method", method: "card" })}><PaymentMethodIllustration method="card" currencySymbol={language === "tr" ? "₺" : "€"} /><span>{text.cardLabel}</span></button>
        <button type="button" className="restaurant-payment-choice restaurant-payment-choice-cash" aria-label={text.cash} onClick={() => onAction({ type: "method", method: "cash" })}><PaymentMethodIllustration method="cash" currencySymbol={language === "tr" ? "₺" : "€"} /><span>{text.cashLabel}</span></button>
      </div>
    </>}
    {(payment.phase === "card" || payment.phase === "cash" || paying) && <>
      <p className="mb-2 text-center text-lg font-bold">{text.total}: {total}</p>
      <div className="restaurant-payment-counter" data-payment-scene={payment.method}>
        {payment.method === "card" ? <>
          <div className="restaurant-pos"><PaymentTerminalIllustration label={payment.phase === "processing" ? text.processingLabel : payment.phase === "paid" ? text.paid : total} approved={payment.phase === "paid"} /></div>
          <button type="button" className={`restaurant-payment-object restaurant-card-object ${paying ? "restaurant-card-tap" : ""}`} aria-label={text.tap} disabled={paying} onClick={() => onAction({ type: "pay" })}><PaymentCardIllustration /><span className="restaurant-object-label">{text.tap}</span></button>
        </> : <>
          <div className="restaurant-cashier-tray" aria-hidden="true" />
          <button type="button" className={`restaurant-payment-object restaurant-cash-object ${paying ? "restaurant-cash-give" : ""}`} aria-label={text.give} disabled={paying} onClick={() => onAction({ type: "pay" })}><CashPaymentIllustration amount={total} /><span className="restaurant-object-label">{text.give}</span></button>
        </>}
      </div>
      {paying && <p role="status" className="restaurant-payment-status">{payment.phase === "paid" && <CheckCircle2 className="restaurant-receipt-check text-teal-700" aria-hidden="true" />}{payment.phase === "processing" ? text.processingLabel : restaurantPaymentMessage(payment, text, total)}</p>}
    </>}
    {payment.phase === "receipt" && <>
      <section className="restaurant-receipt" aria-label={text.receipt}>
        <header><span>ASSIST-AI</span><span className="restaurant-receipt-paid"><CheckCircle2 className="restaurant-receipt-check" aria-hidden="true" />{text.paid}</span></header>
        <dl className="restaurant-payment-receipt-lines">
          {orderLines}
          <div className="restaurant-receipt-method"><dt>{text.paymentMethod}</dt><dd>{payment.method === "card" ? text.cardLabel : text.cashLabel}</dd></div>
        </dl>
      </section>
      <div className="restaurant-receipt-actions">
        <button type="button" className="restaurant-payment-primary" onClick={onOrderAgain}><RotateCcw className="restaurant-receipt-check" aria-hidden="true" />{restaurant.orderAgain}</button>
        <Link to="/scenarios" className="restaurant-payment-exit"><LogOut className="restaurant-receipt-check" aria-hidden="true" />{restaurant.back}</Link>
      </div>
    </>}
  </div>;
}
