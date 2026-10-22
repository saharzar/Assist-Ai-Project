import type { LanguageCode } from "../i18n";
import type { MenuExtra } from "./restaurantMenu";
import type { MenuCategory } from "./restaurantState";

type MenuText = { coverTitle: string; open: string; close: string; categories: Record<MenuCategory, string>; extras: Record<MenuExtra, string> };

export const restaurantMenuTranslations: Record<LanguageCode, MenuText> = {
  en: { coverTitle: "Restaurant menu", open: "Open menu", close: "Close menu",
    categories: { mains: "Main Dishes", salads: "Salads", soups: "Soups", desserts: "Desserts", drinks: "Drinks" },
    extras: { cake: "Chocolate cake", cheesecake: "Cheesecake", fruit: "Fruit bowl", iceCream: "Ice cream", applePie: "Apple pie", tiramisu: "Tiramisu", brownie: "Chocolate brownie", pudding: "Vanilla pudding", fruitTart: "Fruit tart", water: "Water", orangeJuice: "Orange juice", appleJuice: "Apple juice", tea: "Tea", lemonade: "Lemonade", coffee: "Coffee", sparklingWater: "Sparkling water", icedTea: "Iced tea", hotChocolate: "Hot chocolate", milkshake: "Milkshake" } },
  es: { coverTitle: "Menú del restaurante", open: "Abrir menú", close: "Cerrar menú",
    categories: { mains: "Platos principales", salads: "Ensaladas", soups: "Sopas", desserts: "Postres", drinks: "Bebidas" },
    extras: { cake: "Pastel de chocolate", cheesecake: "Tarta de queso", fruit: "Bol de fruta", iceCream: "Helado", applePie: "Tarta de manzana", tiramisu: "Tiramisú", brownie: "Brownie de chocolate", pudding: "Pudin de vainilla", fruitTart: "Tarta de frutas", water: "Agua", orangeJuice: "Zumo de naranja", appleJuice: "Zumo de manzana", tea: "Té", lemonade: "Limonada", coffee: "Café", sparklingWater: "Agua con gas", icedTea: "Té helado", hotChocolate: "Chocolate caliente", milkshake: "Batido" } },
  de: { coverTitle: "Speisekarte", open: "Speisekarte öffnen", close: "Speisekarte schließen",
    categories: { mains: "Hauptgerichte", salads: "Salate", soups: "Suppen", desserts: "Desserts", drinks: "Getränke" },
    extras: { cake: "Schokoladenkuchen", cheesecake: "Käsekuchen", fruit: "Obstschale", iceCream: "Eiscreme", applePie: "Apfelkuchen", tiramisu: "Tiramisu", brownie: "Schokoladenbrownie", pudding: "Vanillepudding", fruitTart: "Obsttarte", water: "Wasser", orangeJuice: "Orangensaft", appleJuice: "Apfelsaft", tea: "Tee", lemonade: "Limonade", coffee: "Kaffee", sparklingWater: "Sprudelwasser", icedTea: "Eistee", hotChocolate: "Heiße Schokolade", milkshake: "Milchshake" } },
  tr: { coverTitle: "Restoran menüsü", open: "Menüyü aç", close: "Menüyü kapat",
    categories: { mains: "Ana yemekler", salads: "Salatalar", soups: "Çorbalar", desserts: "Tatlılar", drinks: "İçecekler" },
    extras: { cake: "Çikolatalı kek", cheesecake: "Cheesecake", fruit: "Meyve kasesi", iceCream: "Dondurma", applePie: "Elmalı turta", tiramisu: "Tiramisu", brownie: "Çikolatalı brownie", pudding: "Vanilyalı puding", fruitTart: "Meyveli tart", water: "Su", orangeJuice: "Portakal suyu", appleJuice: "Elma suyu", tea: "Çay", lemonade: "Limonata", coffee: "Kahve", sparklingWater: "Maden suyu", icedTea: "Soğuk çay", hotChocolate: "Sıcak çikolata", milkshake: "Milkshake" } },
  pt: { coverTitle: "Ementa do restaurante", open: "Abrir a ementa", close: "Fechar a ementa",
    categories: { mains: "Pratos principais", salads: "Saladas", soups: "Sopas", desserts: "Sobremesas", drinks: "Bebidas" },
    extras: { cake: "Bolo de chocolate", cheesecake: "Cheesecake", fruit: "Taça de fruta", iceCream: "Gelado", applePie: "Tarte de maçã", tiramisu: "Tiramisù", brownie: "Brownie de chocolate", pudding: "Pudim de baunilha", fruitTart: "Tarte de fruta", water: "Água", orangeJuice: "Sumo de laranja", appleJuice: "Sumo de maçã", tea: "Chá", lemonade: "Limonada", coffee: "Café", sparklingWater: "Água com gás", icedTea: "Chá gelado", hotChocolate: "Chocolate quente", milkshake: "Batido" } },
  fr: { coverTitle: "Menu du restaurant", open: "Ouvrir le menu", close: "Fermer le menu",
    categories: { mains: "Plats principaux", salads: "Salades", soups: "Soupes", desserts: "Desserts", drinks: "Boissons" },
    extras: { cake: "Gâteau au chocolat", cheesecake: "Cheesecake", fruit: "Bol de fruits", iceCream: "Glace", applePie: "Tarte aux pommes", tiramisu: "Tiramisu", brownie: "Brownie au chocolat", pudding: "Pudding à la vanille", fruitTart: "Tarte aux fruits", water: "Eau", orangeJuice: "Jus d’orange", appleJuice: "Jus de pomme", tea: "Thé", lemonade: "Limonade", coffee: "Café", sparklingWater: "Eau gazeuse", icedTea: "Thé glacé", hotChocolate: "Chocolat chaud", milkshake: "Milkshake" } },
};
