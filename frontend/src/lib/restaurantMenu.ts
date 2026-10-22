import { getRestaurantMealPrice } from "./restaurantPayment";
import type { Meal, MenuCategory } from "./restaurantState";

export const menuExtras = ["cake", "cheesecake", "fruit", "iceCream", "applePie", "tiramisu", "brownie", "pudding", "fruitTart", "water", "orangeJuice", "appleJuice", "tea", "lemonade", "coffee", "sparklingWater", "icedTea", "hotChocolate", "milkshake"] as const;
export type MenuExtra = typeof menuExtras[number];
export type RestaurantMenuItem = { id: Meal | MenuExtra; category: MenuCategory; meal?: Meal; euroCents?: number; tryCents?: number };

/** Static training menu. Meal prices remain in restaurantPayment; browse-only prices live here. */
export const restaurantMenuItems: readonly RestaurantMenuItem[] = [
  { id: "pasta", category: "mains", meal: "pasta" },
  { id: "chicken", category: "mains", meal: "chicken" },
  { id: "pizza", category: "mains", meal: "pizza" },
  { id: "rice", category: "mains", meal: "rice" },
  { id: "burger", category: "mains", meal: "burger" },
  { id: "fish", category: "mains", meal: "fish" },
  { id: "steak", category: "mains", meal: "steak" },
  { id: "wrap", category: "mains", meal: "wrap" },
  { id: "lasagna", category: "mains", meal: "lasagna" },
  { id: "risotto", category: "mains", meal: "risotto" },
  { id: "salad", category: "salads", meal: "salad" },
  { id: "caesar", category: "salads", meal: "caesar" },
  { id: "tomatoCucumber", category: "salads", meal: "tomatoCucumber" },
  { id: "greekSalad", category: "salads", meal: "greekSalad" },
  { id: "tunaSalad", category: "salads", meal: "tunaSalad" },
  { id: "quinoaSalad", category: "salads", meal: "quinoaSalad" },
  { id: "chickenSalad", category: "salads", meal: "chickenSalad" },
  { id: "avocadoSalad", category: "salads", meal: "avocadoSalad" },
  { id: "pastaSalad", category: "salads", meal: "pastaSalad" },
  { id: "soup", category: "soups", meal: "soup" },
  { id: "lentil", category: "soups", meal: "lentil" },
  { id: "vegetableSoup", category: "soups", meal: "vegetableSoup" },
  { id: "tomatoSoup", category: "soups", meal: "tomatoSoup" },
  { id: "mushroomSoup", category: "soups", meal: "mushroomSoup" },
  { id: "chickenSoup", category: "soups", meal: "chickenSoup" },
  { id: "pumpkinSoup", category: "soups", meal: "pumpkinSoup" },
  { id: "minestrone", category: "soups", meal: "minestrone" },
  { id: "broccoliSoup", category: "soups", meal: "broccoliSoup" },
  { id: "cake", category: "desserts", euroCents: 600, tryCents: 19000 },
  { id: "cheesecake", category: "desserts", euroCents: 650, tryCents: 21000 },
  { id: "fruit", category: "desserts", euroCents: 500, tryCents: 16000 },
  { id: "iceCream", category: "desserts", euroCents: 550, tryCents: 18000 },
  { id: "applePie", category: "desserts", euroCents: 600, tryCents: 19000 },
  { id: "tiramisu", category: "desserts", euroCents: 700, tryCents: 22000 },
  { id: "brownie", category: "desserts", euroCents: 550, tryCents: 18000 },
  { id: "pudding", category: "desserts", euroCents: 500, tryCents: 16000 },
  { id: "fruitTart", category: "desserts", euroCents: 650, tryCents: 21000 },
  { id: "water", category: "drinks", euroCents: 200, tryCents: 5000 },
  { id: "orangeJuice", category: "drinks", euroCents: 300, tryCents: 8000 },
  { id: "appleJuice", category: "drinks", euroCents: 300, tryCents: 8000 },
  { id: "tea", category: "drinks", euroCents: 250, tryCents: 7000 },
  { id: "lemonade", category: "drinks", euroCents: 350, tryCents: 9000 },
  { id: "coffee", category: "drinks", euroCents: 300, tryCents: 8500 },
  { id: "sparklingWater", category: "drinks", euroCents: 250, tryCents: 6500 },
  { id: "icedTea", category: "drinks", euroCents: 350, tryCents: 9000 },
  { id: "hotChocolate", category: "drinks", euroCents: 400, tryCents: 11000 },
  { id: "milkshake", category: "drinks", euroCents: 500, tryCents: 14000 },
];

export function getRestaurantMenuItemPrice(item: RestaurantMenuItem, language: string): number {
  if (item.meal) return getRestaurantMealPrice(item.meal, language);
  return language === "tr" ? item.tryCents ?? 0 : item.euroCents ?? 0;
}
