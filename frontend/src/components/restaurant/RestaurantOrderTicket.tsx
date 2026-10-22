import type { LanguageCode } from "../../i18n";
import { UtensilsCrossed } from "lucide-react";
import { getRestaurantMenuItemPrice } from "../../lib/restaurantMenu";
import { getRestaurantMenuImage } from "../../lib/restaurantMenuImages";
import { getOrderItem, getOrderItemName, getOrderTotalCents, isOrderComplete } from "../../lib/restaurantOrder";
import { restaurantOrderTranslations } from "../../lib/restaurantOrderTranslations";
import { formatRestaurantPrice } from "../../lib/restaurantPayment";
import { menuCategories, type MenuCategory, type RestaurantOrder } from "../../lib/restaurantState";

export function RestaurantOrderTicket({ order, language, onRemove, onReview, review = false }: {
  order: RestaurantOrder; language: LanguageCode; onRemove?: (category: MenuCategory) => void;
  onReview?: () => void; review?: boolean;
}) {
  const text = restaurantOrderTranslations[language];
  const selected = menuCategories.flatMap((category) => {
    const item = getOrderItem(order, category);
    return item ? [{ category, item, name: getOrderItemName(order, category, language)! }] : [];
  });
  const total = formatRestaurantPrice(getOrderTotalCents(order, language), language);
  return <section className={`restaurant-order-ticket ${review ? "restaurant-order-review" : ""}`} aria-label={text.title}>
    <h3>{text.title}</h3>
    {selected.length === 0 && <div className="restaurant-order-empty" role="status"><UtensilsCrossed aria-hidden="true" size={30} strokeWidth={1.4} /><span>{text.noItems}</span></div>}
    {selected.length > 0 && <ul className="restaurant-order-selected-items">
      {selected.map(({ category, item, name }) => <li key={category} className="restaurant-order-selected-item">
        <img src={getRestaurantMenuImage(item.id)} alt="" className="restaurant-order-thumbnail" loading="lazy" decoding="async" />
        <span className="restaurant-order-item-copy"><strong>{name}</strong><span>{formatRestaurantPrice(getRestaurantMenuItemPrice(item, language), language)}</span></span>
        {!review && onRemove && <button type="button" className="restaurant-order-remove" aria-label={text.remove.replace("{item}", name)} onClick={() => onRemove(category)}>×</button>}
      </li>)}
    </ul>}
    <div className="restaurant-order-ticket-footer">
      <p><span>{text.total}</span><strong>{total}</strong></p>
      {!review && onReview && <button type="button" className="restaurant-order-review-button" disabled={!isOrderComplete(order)} onClick={onReview}>{text.review}</button>}
    </div>
  </section>;
}
