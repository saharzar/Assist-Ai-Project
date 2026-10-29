import type { LanguageCode } from "../../i18n";
import { UtensilsCrossed } from "lucide-react";
import { getRestaurantMenuItemPrice, restaurantMenuItems } from "../../lib/restaurantMenu";
import { getRestaurantMenuImage } from "../../lib/restaurantMenuImages";
import { getOrderLines, getOrderItemName, getOrderTotalCents, isOrderComplete } from "../../lib/restaurantOrder";
import { restaurantOrderTranslations } from "../../lib/restaurantOrderTranslations";
import { formatRestaurantPrice } from "../../lib/restaurantPayment";
import { type MenuCategory, type RestaurantOrder } from "../../lib/restaurantState";

export function RestaurantOrderTicket({ order, language, onRemove, onReview, review = false }: {
  order: RestaurantOrder; language: LanguageCode; onRemove?: (category: MenuCategory, id: string) => void;
  onReview?: () => void; review?: boolean;
}) {
  const text = restaurantOrderTranslations[language];
  const selected = getOrderLines(order).flatMap((line) => {
    const item = restaurantMenuItems.find((entry) => entry.id === line.item_id);
    return item ? [{ category: item.category, item, name: getOrderItemName({ ...order, [item.category]: item.id }, item.category, language)!, quantity: line.quantity }] : [];
  });
  const total = formatRestaurantPrice(getOrderTotalCents(order, language), language);
  return <section className={`restaurant-order-ticket ${review ? "restaurant-order-review" : ""}`} aria-label={text.title}>
    <h3>{text.title}</h3>
    {selected.length === 0 && <div className="restaurant-order-empty" role="status"><UtensilsCrossed aria-hidden="true" size={30} strokeWidth={1.4} /><span>{text.noItems}</span></div>}
    {selected.length > 0 && <ul className="restaurant-order-selected-items">
      {selected.map(({ category, item, name, quantity }) => <li key={item.id} className="restaurant-order-selected-item">
        <img src={getRestaurantMenuImage(item.id)} alt="" className="restaurant-order-thumbnail" loading="lazy" decoding="async" />
        <span className="restaurant-order-item-copy"><strong>{name} ×{quantity}</strong><span>{formatRestaurantPrice(getRestaurantMenuItemPrice(item, language) * quantity, language)}</span></span>
        {!review && onRemove && <button type="button" className="restaurant-order-remove" aria-label={text.remove.replace("{item}", name)} onClick={() => onRemove(category, item.id)}>×</button>}
      </li>)}
    </ul>}
    <div className="restaurant-order-ticket-footer">
      <p><span>{text.total}</span><strong>{total}</strong></p>
      {!review && onReview && <button type="button" className="restaurant-order-review-button" disabled={!isOrderComplete(order)} onClick={onReview}>{text.review}</button>}
    </div>
  </section>;
}
