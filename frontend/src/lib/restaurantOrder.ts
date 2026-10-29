import type { LanguageCode } from "../i18n";
import { getRestaurantMenuItemPrice, restaurantMenuItems, type RestaurantMenuItem } from "./restaurantMenu";
import { restaurantMenuTranslations } from "./restaurantMenuTranslations";
import { restaurantOrderTranslations } from "./restaurantOrderTranslations";
import { menuCategories, type MenuCategory, type RestaurantOrder } from "./restaurantState";
import { restaurantTranslations } from "./restaurantTranslations";
import { formatRestaurantPrice } from "./restaurantPayment";

export function getOrderLines(order: RestaurantOrder) {
  return order.lines.length ? order.lines : menuCategories.flatMap((category) =>
    order[category] && order[category] !== "none" ? [{ item_id: order[category]!, quantity: 1 }] : []);
}

export function getOrderItem(order: RestaurantOrder, category: MenuCategory): RestaurantMenuItem | null {
  const id = order[category];
  return restaurantMenuItems.find((item) => item.category === category && item.id === id) ?? null;
}

export function getOrderItemName(order: RestaurantOrder, category: MenuCategory, language: LanguageCode): string | null {
  const id = order[category];
  if (id === "none" && category === "drinks") return restaurantOrderTranslations[language].noDrink;
  const item = getOrderItem(order, category);
  if (!item) return null;
  return item.meal ? restaurantTranslations[language].foods[item.meal] : restaurantMenuTranslations[language].extras[item.id as keyof typeof restaurantMenuTranslations.en.extras];
}

export function getOrderTotalCents(order: RestaurantOrder, language: LanguageCode): number {
  return getOrderLines(order).reduce((total, line) => {
    const item = restaurantMenuItems.find((entry) => entry.id === line.item_id);
    return total + (item ? getRestaurantMenuItemPrice(item, language) * line.quantity : 0);
  }, 0);
}

export function isOrderComplete(order: RestaurantOrder): boolean {
  return getOrderLines(order).some((line) => line.quantity > 0 &&
    restaurantMenuItems.some((item) => item.id === line.item_id && item.category === "mains"));
}

const reviewPhrases: Record<LanguageCode, [string, string, string]> = {
  en: ["Your order: ", ". Total: ", ". Please check it."],
  de: ["Deine Bestellung: ", ". Gesamtbetrag: ", ". Bitte prüfe sie."],
  fr: ["Votre commande : ", ". Total : ", ". Vérifiez-la, s'il vous plaît."],
  es: ["Tu pedido: ", ". Total: ", ". Revísalo, por favor."],
  pt: ["O teu pedido: ", ". Total: ", ". Confirma, por favor."],
  tr: ["Siparişin: ", ". Toplam: ", ". Lütfen kontrol et."],
};

export function getOrderReviewSpeech(order: RestaurantOrder, language: LanguageCode): string {
  const parts = getOrderLines(order).flatMap((line) => {
    const item = restaurantMenuItems.find((entry) => entry.id === line.item_id);
    if (!item) return [];
    const name = getOrderItemName({ ...order, [item.category]: item.id }, item.category, language)!;
    if (language !== "en") return [`${line.quantity} ${name}`];
    const count = ({ 1: "one", 2: "two", 3: "three", 4: "four", 5: "five" } as Record<number, string>)[line.quantity] ?? String(line.quantity);
    const plural = line.quantity === 1 || name.toLowerCase().endsWith("fish") ? name
      : name + (/(?:s|sh|ch)$/i.test(name) ? "es" : "s");
    return [`${count} ${plural}`];
  });
  if (!parts.length) return restaurantOrderTranslations[language].noItems;
  const [start, middle, end] = reviewPhrases[language];
  return `${start}${parts.join(", ")}${middle}${formatRestaurantPrice(getOrderTotalCents(order, language), language)}${end}`;
}
