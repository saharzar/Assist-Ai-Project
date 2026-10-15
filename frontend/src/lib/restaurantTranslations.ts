import type { LanguageCode } from "../i18n";
import type { Drink, Meal, RestaurantStep } from "./restaurantState";
type RestaurantText = {
  introWelcome: string; introSupport: string; introSteps: string; introReady: string;
  introSpoken: string; introAlternative: string;
  title: string; intro: string; start: string; back: string; staff: string; menu: string;
  welcome: string; unavailable: string; alternatives: string; showMenu: string; unavailableLabel: string;
  confirmation: string; selectedMealMessage: string; orderFor: string; confirm: string; change: string; success: string; finish: string;
  choose: string; practice: string; steps: Record<RestaurantStep, string>; foods: Record<Meal, string>;
  alternativeHeading: string; successHeading: string; chooseAgain: string; leave: string;
  drinkQuestion: string; drinkHeading: string; drinks: Record<Drink, string>;
  confirmMeal: string; completeOrder: string; orderWithDrink: string; orderWithoutDrink: string; changeChoice: string;
  orderAgain: string;
  changeMeal: string; changeDrink: string;
};
export const restaurantTranslations: Record<LanguageCode, RestaurantText> = {
  en: {
    orderAgain: "Order again",
    changeMeal: "Change meal", changeDrink: "Change drink",
    drinkQuestion: "Would you like something to drink with your meal?", drinkHeading: "Choose a drink", drinks: { water: "Water", juice: "Juice", none: "No, thank you" },
    confirmMeal: "Yes, this meal", completeOrder: "Check your order", orderWithDrink: "You chose {meal} and {drink}. Is that correct?", orderWithoutDrink: "You chose {meal} with no drink. Is that correct?", changeChoice: "Change my choice",
    introSpoken: "Welcome to the restaurant. You will practice ordering a meal. If your first choice is not available, that’s okay. You can choose another meal. I will guide you step by step. Start when you are ready.", introAlternative: "Choose another option if needed",
    introWelcome: "Welcome to the restaurant", introSupport: "Before you start, take a moment to look at the menu. The assistant will guide you.", introSteps: "What you will do", introReady: "Take your time. Start when you are ready.",
    title: "Restaurant Ordering", intro: "You will practice ordering a meal at a restaurant.\nIf your first choice is not available, that’s okay.\nYou can choose another meal, and the assistant will guide you step by step.",
    start: "Start ordering", back: "Back to scenarios", leave: "Leave the restaurant", staff: "Restaurant staff", menu: "Menu",
    welcome: "Welcome. Please take a moment to look at the menu. When you are ready, choose the meal you would like to order.", unavailable: "I'm sorry, this meal is not available today. That's okay. You can choose another meal from the menu.",
    alternatives: "Choose another meal", showMenu: "See the menu again", unavailableLabel: "Not available today",
    confirmation: "Is this the meal you would like to order?", selectedMealMessage: "You selected {meal}. Is this the meal you would like to order?", orderFor: "Your meal:", confirm: "Yes, place my order", change: "Choose a different meal",
    success: "Your order has been placed successfully. Thank you. Your meal will be prepared shortly.", finish: "Back to scenarios", choose: "Choose a meal", practice: "This is practice. No real order will be placed.",
    alternativeHeading: "Other meals to try", successHeading: "Thank you for your order", chooseAgain: "Please select the meal you would like to order.",
    steps: { menu: "Choose a meal", alternative: "Choose another meal", confirmation: "Confirm your order", success: "Order placed" },
    foods: { pasta: "Pasta", chicken: "Grilled chicken", salad: "Salad", soup: "Soup" },
  },
  es: {
    orderAgain: "Pedir de nuevo",
    changeMeal: "Cambiar comida", changeDrink: "Cambiar bebida",
    drinkQuestion: "¿Te gustaría tomar algo con tu comida?", drinkHeading: "Elige una bebida", drinks: { water: "Agua", juice: "Zumo", none: "No, gracias" },
    confirmMeal: "Sí, esta comida", completeOrder: "Revisa tu pedido", orderWithDrink: "Has elegido {meal} y {drink}. ¿Es correcto?", orderWithoutDrink: "Has elegido {meal} sin bebida. ¿Es correcto?", changeChoice: "Cambiar mi elección",
    introSpoken: "Te damos la bienvenida al restaurante. Vas a practicar cómo pedir una comida. Si tu primera opción no está disponible, no pasa nada. Puedes elegir otra comida. Te guiaré paso a paso. Empieza cuando estés preparado.", introAlternative: "Elegir otra opción si es necesario",
    introWelcome: "Te damos la bienvenida al restaurante", introSupport: "Antes de empezar, tómate un momento para mirar el menú. El asistente te guiará.", introSteps: "Qué vas a hacer", introReady: "Tómate tu tiempo. Empieza cuando estés preparado.",
    title: "Pedir en un restaurante", intro: "Vas a practicar cómo pedir una comida en un restaurante.\nSi tu primera opción no está disponible, no pasa nada.\nPuedes elegir otra comida y el asistente te guiará paso a paso.",
    start: "Empezar el pedido", back: "Volver a los escenarios", leave: "Salir del restaurante", staff: "Personal del restaurante", menu: "Menú",
    welcome: "Te damos la bienvenida. Por favor, tómate un momento para mirar el menú. Cuando estés preparado, elige la comida que te gustaría pedir.", unavailable: "Lo siento, esta comida no está disponible hoy. No pasa nada. Puedes elegir otra comida del menú.",
    alternatives: "Elige otra comida", showMenu: "Ver el menú de nuevo", unavailableLabel: "No disponible hoy",
    confirmation: "¿Es esta la comida que te gustaría pedir?", selectedMealMessage: "Has elegido {meal}. ¿Es esta la comida que te gustaría pedir?", orderFor: "Tu comida:", confirm: "Sí, hacer mi pedido", change: "Elegir otra comida",
    success: "Tu pedido se ha realizado correctamente. Gracias. Tu comida se preparará en breve.", finish: "Volver a los escenarios", choose: "Elige una comida", practice: "Esto es una práctica. No se hará ningún pedido real.",
    alternativeHeading: "Otras comidas para elegir", successHeading: "Gracias por tu pedido", chooseAgain: "Elige la comida que te gustaría pedir.",
    steps: { menu: "Elegir una comida", alternative: "Elegir otra comida", confirmation: "Confirmar el pedido", success: "Pedido realizado" },
    foods: { pasta: "Pasta", chicken: "Pollo a la parrilla", salad: "Ensalada", soup: "Sopa" },
  },
  de: {
    orderAgain: "Noch einmal bestellen",
    changeMeal: "Essen ändern", changeDrink: "Getränk ändern",
    drinkQuestion: "Möchtest du etwas zu deinem Essen trinken?", drinkHeading: "Getränk wählen", drinks: { water: "Wasser", juice: "Saft", none: "Nein, danke" },
    confirmMeal: "Ja, dieses Essen", completeOrder: "Bestellung prüfen", orderWithDrink: "Du hast {meal} und {drink} gewählt. Ist das richtig?", orderWithoutDrink: "Du hast {meal} ohne Getränk gewählt. Ist das richtig?", changeChoice: "Meine Auswahl ändern",
    introSpoken: "Willkommen im Restaurant. Du übst, ein Essen zu bestellen. Wenn deine erste Wahl nicht verfügbar ist, ist das in Ordnung. Du kannst ein anderes Essen wählen. Ich begleite dich Schritt für Schritt. Starte, wenn du bereit bist.", introAlternative: "Bei Bedarf eine andere Option wählen",
    introWelcome: "Willkommen im Restaurant", introSupport: "Nimm dir vor dem Start einen Moment, um die Speisekarte anzusehen. Der Assistent begleitet dich.", introSteps: "Das wirst du tun", introReady: "Nimm dir Zeit. Starte, wenn du bereit bist.",
    title: "Im Restaurant bestellen", intro: "Du übst, in einem Restaurant ein Essen zu bestellen.\nWenn deine erste Wahl nicht verfügbar ist, ist das in Ordnung.\nDu kannst ein anderes Essen wählen. Der Assistent begleitet dich Schritt für Schritt.",
    start: "Bestellung starten", back: "Zurück zu den Szenarien", leave: "Restaurant verlassen", staff: "Restaurantpersonal", menu: "Speisekarte",
    welcome: "Willkommen. Bitte nimm dir einen Moment, um die Speisekarte anzusehen. Wenn du bereit bist, wähle das Essen, das du bestellen möchtest.", unavailable: "Es tut mir leid, dieses Essen ist heute nicht verfügbar. Das ist in Ordnung. Du kannst ein anderes Essen von der Speisekarte wählen.",
    alternatives: "Wähle ein anderes Essen", showMenu: "Speisekarte erneut ansehen", unavailableLabel: "Heute nicht verfügbar",
    confirmation: "Ist das das Essen, das du bestellen möchtest?", selectedMealMessage: "Du hast {meal} ausgewählt. Ist das das Essen, das du bestellen möchtest?", orderFor: "Dein Essen:", confirm: "Ja, mein Essen bestellen", change: "Ein anderes Essen wählen",
    success: "Deine Bestellung wurde aufgenommen. Vielen Dank. Dein Essen wird in Kürze zubereitet.", finish: "Zurück zu den Szenarien", choose: "Wähle ein Essen", practice: "Dies ist eine Übung. Es wird kein echtes Essen bestellt.",
    alternativeHeading: "Andere Gerichte zur Auswahl", successHeading: "Vielen Dank für deine Bestellung", chooseAgain: "Bitte wähle das Essen, das du bestellen möchtest.",
    steps: { menu: "Essen wählen", alternative: "Anderes Essen wählen", confirmation: "Bestellung bestätigen", success: "Bestellung aufgenommen" },
    foods: { pasta: "Pasta", chicken: "Gegrilltes Hähnchen", salad: "Salat", soup: "Suppe" },
  },
  tr: {
    orderAgain: "Yeniden sipariş ver",
    changeMeal: "Yemeği değiştir", changeDrink: "İçeceği değiştir",
    drinkQuestion: "Yemeğinin yanında bir şey içmek ister misin?", drinkHeading: "İçecek seç", drinks: { water: "Su", juice: "Meyve suyu", none: "Hayır, teşekkürler" },
    confirmMeal: "Evet, bu yemek", completeOrder: "Siparişini kontrol et", orderWithDrink: "{meal} ve {drink} seçtin. Doğru mu?", orderWithoutDrink: "İçeceksiz {meal} seçtin. Doğru mu?", changeChoice: "Seçimimi değiştir",
    introSpoken: "Restorana hoş geldin. Yemek sipariş etmeyi deneyeceksin. İlk seçtiğin yemek yoksa sorun değil. Başka bir yemek seçebilirsin. Sana adım adım yol göstereceğim. Hazır olduğunda başla.", introAlternative: "Gerekirse başka bir seçenek seç",
    introWelcome: "Restorana hoş geldin", introSupport: "Başlamadan önce menüye bakmak için biraz zaman ayırabilirsin. Asistan sana yol gösterecek.", introSteps: "Neler yapacaksın?", introReady: "Acele etme. Hazır olduğunda başla.",
    title: "Restoranda Sipariş Verme", intro: "Bir restoranda yemek sipariş etmeyi deneyeceksin.\nİlk seçtiğin yemek yoksa sorun değil.\nBaşka bir yemek seçebilirsin. Asistan sana adım adım yol gösterecek.",
    start: "Siparişe başla", back: "Senaryolara dön", leave: "Restorandan ayrıl", staff: "Restoran çalışanı", menu: "Menü",
    welcome: "Hoş geldin. Lütfen menüye bakmak için biraz zaman ayır. Hazır olduğunda sipariş etmek istediğin yemeği seç.", unavailable: "Üzgünüm, bu yemek bugün yok. Sorun değil. Menüden başka bir yemek seçebilirsin.",
    alternatives: "Başka bir yemek seç", showMenu: "Menüyü tekrar gör", unavailableLabel: "Bugün yok",
    confirmation: "Sipariş etmek istediğin yemek bu mu?", selectedMealMessage: "{meal} seçtin. Sipariş etmek istediğin yemek bu mu?", orderFor: "Yemeğin:", confirm: "Evet, siparişimi ver", change: "Başka bir yemek seç",
    success: "Siparişin alındı. Teşekkürler. Yemeğin birazdan hazırlanacak.", finish: "Senaryolara dön", choose: "Bir yemek seç", practice: "Bu bir alıştırmadır. Gerçek bir sipariş verilmez.",
    alternativeHeading: "Seçebileceğin diğer yemekler", successHeading: "Siparişin için teşekkürler", chooseAgain: "Lütfen sipariş etmek istediğin yemeği seç.",
    steps: { menu: "Yemek seç", alternative: "Başka bir yemek seç", confirmation: "Siparişini onayla", success: "Sipariş alındı" },
    foods: { pasta: "Makarna", chicken: "Izgara tavuk", salad: "Salata", soup: "Çorba" },
  },
  pt: {
    orderAgain: "Fazer outro pedido",
    changeMeal: "Alterar refeição", changeDrink: "Alterar bebida",
    drinkQuestion: "Gostarias de beber alguma coisa com a tua refeição?", drinkHeading: "Escolhe uma bebida", drinks: { water: "Água", juice: "Sumo", none: "Não, obrigado" },
    confirmMeal: "Sim, esta refeição", completeOrder: "Confere o teu pedido", orderWithDrink: "Escolheste {meal} e {drink}. Está correto?", orderWithoutDrink: "Escolheste {meal} sem bebida. Está correto?", changeChoice: "Alterar a minha escolha",
    introSpoken: "Bem-vindo ao restaurante. Vais praticar como pedir uma refeição. Se a tua primeira escolha não estiver disponível, não há problema. Podes escolher outra refeição. Vou guiar-te passo a passo. Começa quando estiveres preparado.", introAlternative: "Escolher outra opção se necessário",
    introWelcome: "Bem-vindo ao restaurante", introSupport: "Antes de começar, reserva um momento para ver a ementa. O assistente vai guiar-te.", introSteps: "O que vais fazer", introReady: "Não tenhas pressa. Começa quando estiveres preparado.",
    title: "Pedido em restaurante", intro: "Vais praticar como pedir uma refeição num restaurante.\nSe a tua primeira escolha não estiver disponível, não há problema.\nPodes escolher outra refeição e o assistente vai guiar-te passo a passo.",
    start: "Começar o pedido", back: "Voltar aos cenários", leave: "Sair do restaurante", staff: "Funcionário do restaurante", menu: "Ementa",
    welcome: "Bem-vindo. Por favor, reserva um momento para ver a ementa. Quando estiveres preparado, escolhe a refeição que gostarias de pedir.", unavailable: "Desculpa, esta refeição não está disponível hoje. Não há problema. Podes escolher outra refeição da ementa.",
    alternatives: "Escolhe outra refeição", showMenu: "Ver a ementa novamente", unavailableLabel: "Indisponível hoje",
    confirmation: "É esta a refeição que gostarias de pedir?", selectedMealMessage: "Escolheste {meal}. É esta a refeição que gostarias de pedir?", orderFor: "A tua refeição:", confirm: "Sim, fazer o meu pedido", change: "Escolher outra refeição",
    success: "O teu pedido foi registado. Obrigado. A tua refeição será preparada em breve.", finish: "Voltar aos cenários", choose: "Escolhe uma refeição", practice: "Isto é uma prática. Não será feito nenhum pedido real.",
    alternativeHeading: "Outras refeições à escolha", successHeading: "Obrigado pelo teu pedido", chooseAgain: "Escolhe a refeição que gostarias de pedir.",
    steps: { menu: "Escolher uma refeição", alternative: "Escolher outra refeição", confirmation: "Confirmar o pedido", success: "Pedido registado" },
    foods: { pasta: "Massa", chicken: "Frango grelhado", salad: "Salada", soup: "Sopa" },
  },
  fr: {
    orderAgain: "Commander à nouveau",
    changeMeal: "Changer de repas", changeDrink: "Changer de boisson",
    drinkQuestion: "Aimerais-tu boire quelque chose avec ton repas ?", drinkHeading: "Choisis une boisson", drinks: { water: "Eau", juice: "Jus de fruits", none: "Non, merci" },
    confirmMeal: "Oui, ce repas", completeOrder: "Vérifie ta commande", orderWithDrink: "Tu as choisi {meal} et {drink}. Est-ce correct ?", orderWithoutDrink: "Tu as choisi {meal} sans boisson. Est-ce correct ?", changeChoice: "Changer mon choix",
    introSpoken: "Bienvenue au restaurant. Tu vas t’entraîner à commander un repas. Si ton premier choix n’est pas disponible, ce n’est pas grave. Tu peux choisir un autre repas. Je te guiderai étape par étape. Commence quand tu es prêt.", introAlternative: "Choisir une autre option si nécessaire",
    introWelcome: "Bienvenue au restaurant", introSupport: "Avant de commencer, prends un moment pour regarder le menu. L'assistant te guidera.", introSteps: "Ce que tu vas faire", introReady: "Prends ton temps. Commence quand tu es prêt.",
    title: "Commander au restaurant", intro: "Tu vas t’entraîner à commander un repas au restaurant.\nSi ton premier choix n’est pas disponible, ce n’est pas grave.\nTu peux choisir un autre repas et l’assistant te guidera étape par étape.",
    start: "Commencer la commande", back: "Retour aux scénarios", leave: "Quitter le restaurant", staff: "Personnel du restaurant", menu: "Menu",
    welcome: "Bienvenue. Prends un moment pour regarder le menu, s'il te plaît. Quand tu es prêt, choisis le repas que tu aimerais commander.", unavailable: "Désolé, ce repas n'est pas disponible aujourd'hui. Ce n'est pas grave. Tu peux choisir un autre repas du menu.",
    alternatives: "Choisis un autre repas", showMenu: "Revoir le menu", unavailableLabel: "Indisponible aujourd'hui",
    confirmation: "Est-ce le repas que tu aimerais commander ?", selectedMealMessage: "Tu as choisi « {meal} ». Est-ce le repas que tu aimerais commander ?", orderFor: "Ton repas :", confirm: "Oui, passer ma commande", change: "Choisir un autre repas",
    success: "Ta commande a bien été enregistrée. Merci. Ton repas sera préparé dans un instant.", finish: "Retour aux scénarios", choose: "Choisis un repas", practice: "Ceci est un exercice. Aucune vraie commande ne sera passée.",
    alternativeHeading: "D'autres repas au choix", successHeading: "Merci pour ta commande", chooseAgain: "Choisis le repas que tu aimerais commander.",
    steps: { menu: "Choisir un repas", alternative: "Choisir un autre repas", confirmation: "Confirmer la commande", success: "Commande enregistrée" },
    foods: { pasta: "Pâtes", chicken: "Poulet grillé", salad: "Salade", soup: "Soupe" },
  },
};
