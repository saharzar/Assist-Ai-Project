import type { LanguageCode } from "../i18n";
import { getRestaurantMenuItemPrice, restaurantMenuItems, type RestaurantMenuItem } from "./restaurantMenu";
import { restaurantMenuTranslations } from "./restaurantMenuTranslations";
import { restaurantOrderTranslations } from "./restaurantOrderTranslations";
import { menuCategories, requiredOrderCategories, type MenuCategory, type RestaurantOrder } from "./restaurantState";
import { restaurantTranslations } from "./restaurantTranslations";

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
  return menuCategories.reduce((total, category) => {
      const item = getOrderItem(order, category);
      return total + (item ? getRestaurantMenuItemPrice(item, language) : 0);
    }, 0);
}

export function isOrderComplete(order: RestaurantOrder): boolean {
  return requiredOrderCategories.every((category) => getOrderItem(order, category) !== null);
}
