import type { MenuExtra } from "./restaurantMenu";
import type { Meal } from "./restaurantState";

const imageUrls = import.meta.glob("../assets/restaurant-food/**/*.png", { eager: true, query: "?url", import: "default" }) as Record<string, string>;

const imageFiles: Record<Meal | MenuExtra, string> = {
  pasta: "main_dishes/01_pasta.png",
  chicken: "main_dishes/02_grilled_chicken.png",
  pizza: "main_dishes/03_pizza.png",
  rice: "main_dishes/04_vegetable_rice_bowl.png",
  burger: "main_dishes/05_beef_burger.png",
  fish: "main_dishes/06_grilled_fish.png",
  steak: "main_dishes/07_grilled_steak.png",
  wrap: "main_dishes/08_chicken_wrap.png",
  lasagna: "main_dishes/09_lasagna.png",
  risotto: "main_dishes/10_mushroom_risotto.png",
  salad: "salads/01_salad.png",
  caesar: "salads/02_caesar_salad.png",
  tomatoCucumber: "salads/03_tomato_and_cucumber_salad.png",
  greekSalad: "salads/04_greek_salad.png",
  tunaSalad: "salads/05_tuna_salad.png",
  quinoaSalad: "salads/06_quinoa_salad.png",
  chickenSalad: "salads/07_chicken_salad.png",
  avocadoSalad: "salads/08_avocado_salad.png",
  pastaSalad: "salads/09_pasta_salad.png",
  soup: "soups/01_soup.png",
  lentil: "soups/02_lentil_soup.png",
  vegetableSoup: "soups/03_vegetable_soup.png",
  tomatoSoup: "soups/04_tomato_soup.png",
  mushroomSoup: "soups/05_mushroom_soup.png",
  chickenSoup: "soups/06_chicken_soup.png",
  pumpkinSoup: "soups/07_pumpkin_soup.png",
  minestrone: "soups/08_minestrone.png",
  broccoliSoup: "soups/09_broccoli_soup.png",
  cake: "desserts/01_chocolate_cake.png",
  cheesecake: "desserts/02_cheesecake.png",
  fruit: "desserts/03_fruit_bowl.png",
  iceCream: "desserts/04_ice_cream.png",
  applePie: "desserts/05_apple_pie.png",
  tiramisu: "desserts/06_tiramisu.png",
  brownie: "desserts/07_chocolate_brownie.png",
  pudding: "desserts/08_vanilla_pudding.png",
  fruitTart: "desserts/09_fruit_tart.png",
  water: "drinks/01_water.png",
  orangeJuice: "drinks/02_orange_juice.png",
  appleJuice: "drinks/03_apple_juice.png",
  tea: "drinks/04_tea.png",
  lemonade: "drinks/05_lemonade.png",
  coffee: "drinks/06_coffee.png",
  sparklingWater: "drinks/07_sparkling_water.png",
  icedTea: "drinks/08_iced_tea.png",
  hotChocolate: "drinks/09_hot_chocolate.png",
  milkshake: "drinks/10_milkshake.png",
};

export function getRestaurantMenuImage(id: Meal | MenuExtra): string {
  return imageUrls[`../assets/restaurant-food/${imageFiles[id]}`];
}
