"""Short localized statements derived only from validated Restaurant tool results."""

from app.services.restaurant_tools import CATALOG, CATEGORIES, RestaurantSnapshot, ToolResult, available_alternative, order_summary


TEXT = {
    "en": {"privacy": "For your privacy, don't enter real card or banking information here. This scenario only uses simulated payment.", "unclear": "Could you tell me exactly what you would like to do?", "unavailable": "Sorry, I can't do that right now. You can continue using the menu.", "menu": "Of course. Here is the menu.", "category": "Of course. Here are the {category}.", "item": "Of course. Here is {item}.", "added": "Of course. I've added {item} to your order.", "removed": "Of course. I've removed {item} from your order.", "replaced": "Sure. I've changed {old} to {item}.", "first_main_unavailable": "I'm sorry, {item} isn't available today. Please choose another main dish.", "not_selected": "That item isn't currently in your order.", "main_required": "Please choose a main dish before reviewing your order.", "review": "Let's review your order.", "back": "Of course. You can change your order in the menu.", "payment": "Your order is ready for simulated payment. Please choose card or cash.", "method": "I've selected {method}. Follow the simulated payment steps on screen.", "order": "Your order has {items}.", "empty": "Your order is empty right now.", "total": "Your total is {total}.", "recommend": "You could try {items}. Please check the menu for details.", "diet": "I don't have enough ingredient information to confirm that. I can show you the available dishes.", "not_found": "I don't see that item on today's menu.", "list": "Available choices include {items}.", "generic": "I couldn't make that change. You can use the menu to continue."},
    "es": {"privacy": "Por privacidad, no escribas datos reales de tarjetas o bancos. Este escenario solo simula el pago.", "unclear": "¿Puedes decirme exactamente qué quieres hacer?", "unavailable": "Lo siento, ahora no puedo hacerlo. Puedes seguir usando el menú.", "menu": "Claro. Aquí tienes el menú.", "category": "Claro. Aquí están los {category}.", "item": "Claro. Aquí tienes {item}.", "added": "Claro. He añadido {item} a tu pedido.", "removed": "Claro. He quitado {item} de tu pedido.", "replaced": "Claro. He cambiado {old} por {item}.", "first_main_unavailable": "Lo siento, {item} no está disponible hoy. Elige otro plato principal.", "not_selected": "Ese artículo no está en tu pedido.", "main_required": "Elige un plato principal antes de revisar el pedido.", "review": "Vamos a revisar tu pedido.", "back": "Claro. Puedes cambiar tu pedido en el menú.", "payment": "Tu pedido está listo para el pago simulado. Elige tarjeta o efectivo.", "method": "He elegido {method}. Sigue los pasos del pago simulado en pantalla.", "order": "Tu pedido incluye {items}.", "empty": "Tu pedido está vacío.", "total": "El total es {total}.", "recommend": "Puedes probar {items}. Consulta el menú para ver los detalles.", "diet": "No tengo suficiente información sobre los ingredientes para confirmarlo. Puedo mostrarte los platos disponibles.", "not_found": "No veo ese artículo en el menú de hoy.", "list": "Algunas opciones disponibles son {items}.", "generic": "No pude hacer ese cambio. Puedes continuar desde el menú."},
    "de": {"privacy": "Bitte gib hier keine echten Karten- oder Bankdaten ein. Die Zahlung ist nur eine Simulation.", "unclear": "Kannst du mir genau sagen, was du tun möchtest?", "unavailable": "Entschuldigung, das geht gerade nicht. Du kannst das Menü weiter nutzen.", "menu": "Gern. Hier ist die Speisekarte.", "category": "Gern. Hier sind die {category}.", "item": "Gern. Hier ist {item}.", "added": "Gern. Ich habe {item} zu deiner Bestellung hinzugefügt.", "removed": "Gern. Ich habe {item} aus deiner Bestellung entfernt.", "replaced": "Gern. Ich habe {old} durch {item} ersetzt.", "first_main_unavailable": "Entschuldigung, {item} ist heute nicht verfügbar. Bitte wähle ein anderes Hauptgericht.", "not_selected": "Dieser Artikel ist nicht in deiner Bestellung.", "main_required": "Bitte wähle ein Hauptgericht, bevor du deine Bestellung prüfst.", "review": "Sehen wir uns deine Bestellung an.", "back": "Gern. Du kannst deine Bestellung im Menü ändern.", "payment": "Deine Bestellung ist für die simulierte Zahlung bereit. Wähle Karte oder Bargeld.", "method": "Ich habe {method} ausgewählt. Folge den Schritten der simulierten Zahlung auf dem Bildschirm.", "order": "Deine Bestellung enthält {items}.", "empty": "Deine Bestellung ist noch leer.", "total": "Der Gesamtbetrag ist {total}.", "recommend": "Du könntest {items} probieren. Details stehen im Menü.", "diet": "Ich habe nicht genug Informationen zu den Zutaten, um das zu bestätigen. Ich kann dir verfügbare Gerichte zeigen.", "not_found": "Diesen Artikel sehe ich heute nicht auf der Speisekarte.", "list": "Verfügbare Optionen sind {items}.", "generic": "Ich konnte das nicht ändern. Du kannst im Menü fortfahren."},
    "fr": {"privacy": "Pour protéger vos données, ne saisissez pas de vraies informations bancaires. Le paiement est simulé.", "unclear": "Pouvez-vous préciser ce que vous souhaitez faire ?", "unavailable": "Désolé, je ne peux pas faire cela maintenant. Vous pouvez continuer avec le menu.", "menu": "Bien sûr. Voici le menu.", "category": "Bien sûr. Voici les {category}.", "item": "Bien sûr. Voici {item}.", "added": "Bien sûr. J'ai ajouté {item} à votre commande.", "removed": "Bien sûr. J'ai retiré {item} de votre commande.", "replaced": "Bien sûr. J'ai remplacé {old} par {item}.", "first_main_unavailable": "Désolé, {item} n'est pas disponible aujourd'hui. Choisissez un autre plat principal.", "not_selected": "Cet article n'est pas dans votre commande.", "main_required": "Choisissez un plat principal avant de vérifier votre commande.", "review": "Vérifions votre commande.", "back": "Bien sûr. Vous pouvez modifier votre commande dans le menu.", "payment": "Votre commande est prête pour le paiement simulé. Choisissez carte ou espèces.", "method": "J'ai choisi {method}. Suivez les étapes du paiement simulé à l'écran.", "order": "Votre commande contient {items}.", "empty": "Votre commande est vide pour le moment.", "total": "Le total est de {total}.", "recommend": "Vous pourriez essayer {items}. Consultez le menu pour les détails.", "diet": "Je n'ai pas assez d'informations sur les ingrédients pour le confirmer. Je peux vous montrer les plats disponibles.", "not_found": "Je ne vois pas cet article sur le menu d'aujourd'hui.", "list": "Les choix disponibles comprennent {items}.", "generic": "Je n'ai pas pu faire ce changement. Vous pouvez continuer avec le menu."},
    "pt": {"privacy": "Por privacidade, não introduzas dados reais de cartão ou banco. Este pagamento é apenas simulado.", "unclear": "Podes dizer-me exatamente o que queres fazer?", "unavailable": "Desculpa, não consigo fazer isso agora. Podes continuar com a ementa.", "menu": "Claro. Aqui está a ementa.", "category": "Claro. Aqui estão os {category}.", "item": "Claro. Aqui está {item}.", "added": "Claro. Adicionei {item} ao teu pedido.", "removed": "Claro. Retirei {item} do teu pedido.", "replaced": "Claro. Troquei {old} por {item}.", "first_main_unavailable": "Desculpa, {item} não está disponível hoje. Escolhe outro prato principal.", "not_selected": "Esse artigo não está no teu pedido.", "main_required": "Escolhe um prato principal antes de rever o pedido.", "review": "Vamos rever o teu pedido.", "back": "Claro. Podes alterar o pedido na ementa.", "payment": "O pedido está pronto para o pagamento simulado. Escolhe cartão ou dinheiro.", "method": "Selecionei {method}. Segue os passos do pagamento simulado no ecrã.", "order": "O teu pedido inclui {items}.", "empty": "O teu pedido está vazio.", "total": "O total é {total}.", "recommend": "Podes experimentar {items}. Consulta a ementa para os detalhes.", "diet": "Não tenho informação suficiente sobre os ingredientes para confirmar isso. Posso mostrar-te os pratos disponíveis.", "not_found": "Não vejo esse artigo na ementa de hoje.", "list": "Algumas opções disponíveis são {items}.", "generic": "Não consegui fazer essa alteração. Podes continuar na ementa."},
    "tr": {"privacy": "Gizliliğin için buraya gerçek kart veya banka bilgilerini yazma. Bu senaryoda ödeme yalnızca simülasyondur.", "unclear": "Ne yapmak istediğini açıkça söyleyebilir misin?", "unavailable": "Üzgünüm, bunu şu anda yapamıyorum. Menüyü kullanmaya devam edebilirsin.", "menu": "Elbette. İşte menü.", "category": "Elbette. İşte {category}.", "item": "Elbette. İşte {item}.", "added": "Elbette. {item} siparişine eklendi.", "removed": "Elbette. {item} siparişinden çıkarıldı.", "replaced": "Elbette. {old} yerine {item} seçildi.", "first_main_unavailable": "Üzgünüm, {item} bugün mevcut değil. Lütfen başka bir ana yemek seç.", "not_selected": "Bu ürün şu anda siparişinde yok.", "main_required": "Siparişini incelemeden önce bir ana yemek seç.", "review": "Siparişini inceleyelim.", "back": "Elbette. Siparişini menüden değiştirebilirsin.", "payment": "Siparişin simüle ödeme için hazır. Kart veya nakit seç.", "method": "{method} seçildi. Ekrandaki simüle ödeme adımlarını izle.", "order": "Siparişinde {items} var.", "empty": "Siparişin şu anda boş.", "total": "Toplam tutar {total}.", "recommend": "{items} deneyebilirsin. Ayrıntılar için menüye bak.", "diet": "Bunu doğrulamak için yeterli içerik bilgim yok. Mevcut yemekleri gösterebilirim.", "not_found": "Bu ürünü bugünkü menüde göremiyorum.", "list": "Mevcut seçenekler arasında {items} var.", "generic": "Bu değişikliği yapamadım. Menüden devam edebilirsin."},
}

# Keep acknowledgements tied to the action instead of repeating one opener.
ACTION_COPY = {
    "en": {"menu": "Here is our menu.", "category": "Here are our {category}.", "category_items": "We have {items}.", "category_items_alt": "You can choose from {items}.",
           "item": "Here is {item}.", "added": "I've added {item} to your order.",
           "removed": "I've removed {item} from your order.", "back": "You can change your order in the menu.",
           "main_required": "You still need a main dish before we review your order. Would you like to see the main dishes?"},
    "fr": {"menu": "Voici notre menu.", "category": "Voici nos {category}.", "category_items": "Nous avons {items}.", "category_items_alt": "Vous pouvez choisir parmi {items}.",
           "item": "Voici {item}.", "added": "J'ai ajouté {item} à votre commande.",
           "removed": "J'ai retiré {item} de votre commande.", "back": "Vous pouvez modifier votre commande dans le menu.",
           "main_required": "Il vous faut encore un plat principal avant de revoir votre commande. Voulez-vous voir les plats principaux ?"},
    "de": {"menu": "Hier ist unsere Speisekarte.", "category": "Hier sind unsere {category}.", "category_items": "Wir haben {items}.", "category_items_alt": "Zur Auswahl stehen {items}.",
           "item": "Hier ist {item}.", "added": "Ich habe {item} zu deiner Bestellung hinzugefügt.",
           "removed": "Ich habe {item} aus deiner Bestellung entfernt.", "back": "Du kannst deine Bestellung in der Speisekarte ändern.",
           "main_required": "Vor der Bestellübersicht brauchst du noch ein Hauptgericht. Möchtest du die Hauptgerichte sehen?"},
    "es": {"menu": "Aquí está el menú.", "category": "Aquí están nuestros {category}.", "category_items": "Tenemos {items}.", "category_items_alt": "Puedes elegir entre {items}.",
           "item": "Aquí tienes {item}.", "added": "He añadido {item} a tu pedido.",
           "removed": "He quitado {item} de tu pedido.", "back": "Puedes cambiar tu pedido en el menú.",
           "main_required": "Aún necesitas un plato principal antes de revisar tu pedido. ¿Quieres ver los platos principales?"},
    "pt": {"menu": "Aqui está a ementa.", "category": "Aqui estão os nossos {category}.", "category_items": "Temos {items}.", "category_items_alt": "Podes escolher entre {items}.",
           "item": "Aqui está {item}.", "added": "Adicionei {item} ao teu pedido.",
           "removed": "Retirei {item} do teu pedido.", "back": "Podes alterar o pedido na ementa.",
           "main_required": "Ainda precisas de um prato principal antes de rever o pedido. Queres ver os pratos principais?"},
    "tr": {"menu": "İşte menümüz.", "category": "{category} burada.", "category_items": "{items} var.", "category_items_alt": "{items} arasından seçebilirsin.",
           "item": "İşte {item}.", "added": "{item} siparişine eklendi.",
           "removed": "{item} siparişinden çıkarıldı.", "back": "Siparişini menüden değiştirebilirsin.",
           "main_required": "Siparişini incelemeden önce bir ana yemek seçmelisin. Ana yemekleri görmek ister misin?"},
}
for _language, _copy in ACTION_COPY.items():
    TEXT[_language].update(_copy)

CATEGORY_NAMES = {
    "en": {"mains": "main dishes", "salads": "salads", "soups": "soups", "desserts": "desserts", "drinks": "drinks"},
    "es": {"mains": "platos principales", "salads": "ensaladas", "soups": "sopas", "desserts": "postres", "drinks": "bebidas"},
    "de": {"mains": "Hauptgerichte", "salads": "Salate", "soups": "Suppen", "desserts": "Desserts", "drinks": "Getränke"},
    "fr": {"mains": "plats principaux", "salads": "salades", "soups": "soupes", "desserts": "desserts", "drinks": "boissons"},
    "pt": {"mains": "pratos principais", "salads": "saladas", "soups": "sopas", "desserts": "sobremesas", "drinks": "bebidas"},
    "tr": {"mains": "ana yemekler", "salads": "salatalar", "soups": "çorbalar", "desserts": "tatlılar", "drinks": "içecekler"},
}

MENU_EXPLANATION = {
    "en": "Here is our menu. We have {categories}. What would you like to see?",
    "de": "Hier ist unsere Speisekarte. Wir haben {categories}. Was möchtest du dir ansehen?",
    "fr": "Voici notre menu. Nous avons {categories}. Que souhaitez-vous voir ?",
    "es": "Aquí está el menú. Tenemos {categories}. ¿Qué te gustaría ver?",
    "pt": "Aqui está o menu. Temos {categories}. O que gostarias de ver?",
    "tr": "İşte menümüz. {categories} var. Neye bakmak istersin?",
}
MENU_EXPLANATION_ALT = {
    "en": "Let me show you the menu. We have {categories}. Where would you like to start?",
    "de": "Schau dir die Speisekarte an. Wir haben {categories}. Womit möchtest du anfangen?",
    "fr": "Je vous montre le menu. Nous avons {categories}. Par quoi souhaitez-vous commencer ?",
    "es": "Te muestro el menú. Tenemos {categories}. ¿Por dónde te gustaría empezar?",
    "pt": "Vou mostrar-te a ementa. Temos {categories}. Por onde queres começar?",
    "tr": "Menüyü göstereyim. {categories} var. Nereden başlamak istersin?",
}
EDIT_ORDER_REPLIES = {
    "en": ("What would you like to add, remove or change?", "Sure. What would you like to change?", "What would you like to update in your order?"),
    "fr": ("Que souhaitez-vous ajouter, retirer ou modifier ?", "Bien sûr. Que souhaitez-vous changer ?", "Que voulez-vous modifier dans votre commande ?"),
    "de": ("Was möchtest du hinzufügen, entfernen oder ändern?", "Gerne. Was möchtest du ändern?", "Was möchtest du an deiner Bestellung ändern?"),
    "es": ("¿Qué quieres añadir, quitar o cambiar?", "Claro. ¿Qué quieres cambiar?", "¿Qué te gustaría modificar en tu pedido?"),
    "pt": ("O que queres adicionar, retirar ou alterar?", "Claro. O que gostarias de mudar?", "O que queres alterar no teu pedido?"),
    "tr": ("Ne eklemek, çıkarmak veya değiştirmek istersin?", "Olur. Neyi değiştirmek istersin?", "Siparişinde neyi değiştirmek istersin?"),
}
QUERY_REPLY = {
    "en": "Yes. We have {items}.", "de": "Ja. Wir haben {items}.",
    "fr": "Oui. Nous avons {items}.", "es": "Sí. Tenemos {items}.",
    "pt": "Sim. Temos {items}.", "tr": "Evet. {items} var.",
}
RECOMMEND_REPLY = {
    "en": "I'd recommend {item}. We also have {others}.",
    "de": "Ich würde {item} empfehlen. Wir haben auch {others}.",
    "fr": "Je vous recommande {item}. Nous avons aussi {others}.",
    "es": "Te recomiendo {item}. También tenemos {others}.",
    "pt": "Recomendo {item}. Também temos {others}.",
    "tr": "{item} öneririm. Ayrıca {others} var.",
}
RECOMMEND_ONE = {
    "en": "I'd recommend {item}.", "de": "Ich würde {item} empfehlen.",
    "fr": "Je vous recommande {item}.", "es": "Te recomiendo {item}.",
    "pt": "Recomendo {item}.", "tr": "{item} öneririm.",
}
RECOMMEND_ALT_REPLY = {
    "en": "You might like {item}. Another option is {others}.",
    "de": "{item} wäre eine gute Wahl. Wir haben auch {others}.",
    "fr": "{item} pourrait vous plaire. Nous avons aussi {others}.",
    "es": "Quizá te guste {item}. Otra opción es {others}.",
    "pt": "Talvez gostes de {item}. Outra opção é {others}.",
    "tr": "{item} iyi bir seçenek olabilir. Ayrıca {others} var.",
}
RECOMMEND_ALT_ONE = {
    "en": "You might like {item}.", "de": "{item} wäre eine gute Wahl.",
    "fr": "{item} pourrait vous plaire.", "es": "Quizá te guste {item}.",
    "pt": "Talvez gostes de {item}.", "tr": "{item} iyi bir seçenek olabilir.",
}
ADDED_ALT = {
    "en": "All right, I've added {item} to your order.",
    "de": "Alles klar, {item} ist jetzt in deiner Bestellung.",
    "fr": "Très bien, j'ai ajouté {item} à votre commande.",
    "es": "Perfecto, he añadido {item} a tu pedido.",
    "pt": "Está bem, adicionei {item} ao teu pedido.",
    "tr": "Tamam, {item} siparişine eklendi.",
}
NO_ATTRIBUTE_MATCH = {
    "en": "I'm sorry, we don't have a matching option available right now.",
    "de": "Leider haben wir gerade keine passende Option verfügbar.",
    "fr": "Je suis désolée, nous n'avons pas d'option correspondante pour le moment.",
    "es": "Lo siento, ahora no tenemos una opción que corresponda.",
    "pt": "Desculpa, não temos uma opção correspondente neste momento.",
    "tr": "Üzgünüm, şu anda buna uygun bir seçenek yok.",
}
UNAVAILABLE_ALTERNATIVE = {
    "en": "I'm sorry, {item} isn't available right now. You could try {alternative} instead.",
    "de": "Tut mir leid, {item} ist gerade nicht verfügbar. Du könntest stattdessen {alternative} probieren.",
    "fr": "Désolée, {item} n'est pas disponible pour le moment. Vous pourriez essayer {alternative} à la place.",
    "es": "Lo siento, {item} no está disponible ahora. Podrías probar {alternative} en su lugar.",
    "pt": "Desculpa, {item} não está disponível agora. Podes experimentar {alternative} em vez disso.",
    "tr": "Üzgünüm, {item} şu anda yok. Onun yerine {alternative} deneyebilirsin.",
}

CLARIFICATION_TEXT = {
    "en": {"clarify": "Which one do you mean: {items}?", "confirm_add": "Would you like me to add {item}?", "cancelled": "Okay, I won't change your order.", "ask_item": "What would you like to add? You can choose a main dish, salad, soup, dessert, or drink."},
    "es": {"clarify": "¿Cuál quieres decir: {items}?", "confirm_add": "¿Quieres que añada {item}?", "cancelled": "De acuerdo, no cambiaré tu pedido.", "ask_item": "¿Qué quieres añadir? Puedes elegir un plato principal, ensalada, sopa, postre o bebida."},
    "de": {"clarify": "Welches meinst du: {items}?", "confirm_add": "Soll ich {item} hinzufügen?", "cancelled": "Okay, ich ändere deine Bestellung nicht.", "ask_item": "Was möchtest du hinzufügen? Du kannst ein Hauptgericht, einen Salat, eine Suppe, ein Dessert oder ein Getränk wählen."},
    "fr": {"clarify": "Lequel voulez-vous dire : {items} ?", "confirm_add": "Voulez-vous que j'ajoute {item} ?", "cancelled": "D'accord, je ne changerai pas votre commande.", "ask_item": "Que souhaitez-vous ajouter ? Vous pouvez choisir un plat principal, une salade, une soupe, un dessert ou une boisson."},
    "pt": {"clarify": "Qual deles quer dizer: {items}?", "confirm_add": "Quer que eu adicione {item}?", "cancelled": "Está bem, não vou alterar o pedido.", "ask_item": "O que deseja adicionar? Pode escolher um prato principal, salada, sopa, sobremesa ou bebida."},
    "tr": {"clarify": "Hangisini kastediyorsunuz: {items}?", "confirm_add": "{item} eklememi ister misiniz?", "cancelled": "Tamam, siparişinizi değiştirmeyeceğim.", "ask_item": "Ne eklemek istersiniz? Ana yemek, salata, çorba, tatlı veya içecek seçebilirsiniz."},
}
for _language, _messages in CLARIFICATION_TEXT.items():
    TEXT[_language].update(_messages)

REPLACEMENT_QUESTION = {
    "en": "What would you like instead?",
    "es": "¿Qué te gustaría elegir en su lugar?",
    "de": "Was möchtest du stattdessen?",
    "fr": "Que souhaitez-vous à la place ?",
    "pt": "O que gostarias de escolher em vez disso?",
    "tr": "Onun yerine ne istersin?",
}
for _language, _question in REPLACEMENT_QUESTION.items():
    TEXT[_language]["ask_replacement"] = _question

HELP_TEXT = {
    "en": "I can recommend a dish, add or remove an item, show your order, or tell you the total. What would you like to try?",
    "es": "Puedo recomendar un plato, añadir o quitar un artículo, mostrar tu pedido o decirte el total. ¿Qué te gustaría hacer?",
    "de": "Ich kann ein Gericht empfehlen, etwas hinzufügen oder entfernen, deine Bestellung zeigen oder den Gesamtbetrag nennen. Was möchtest du tun?",
    "fr": "Je peux recommander un plat, ajouter ou retirer un article, afficher votre commande ou donner le total. Que souhaitez-vous faire ?",
    "pt": "Posso recomendar um prato, adicionar ou retirar um item, mostrar o teu pedido ou dizer o total. O que gostarias de fazer?",
    "tr": "Bir yemek önerebilir, ürün ekleyip çıkarabilir, siparişini gösterebilir veya toplamı söyleyebilirim. Ne yapmak istersin?",
}
RECOMMENDATION_QUESTION = {
    "en": "Which one would you like?", "es": "¿Cuál te gustaría?",
    "de": "Welches möchtest du?", "fr": "Lequel souhaitez-vous ?",
    "pt": "Qual gostarias de escolher?", "tr": "Hangisini istersin?",
}
for _language, _message in HELP_TEXT.items():
    TEXT[_language]["unclear"] = _message

INVALID_QUANTITY = {
    "en": "Please choose a quantity from 1 to 99.",
    "de": "Bitte wähle eine Menge von 1 bis 99.",
    "fr": "Veuillez choisir une quantité entre 1 et 99.",
    "es": "Elige una cantidad entre 1 y 99, por favor.",
    "pt": "Escolhe uma quantidade entre 1 e 99, por favor.",
    "tr": "Lütfen 1 ile 99 arasında bir miktar seç.",
}
for _language, _message in INVALID_QUANTITY.items():
    TEXT[_language]["invalid_quantity"] = _message

def say(language: str, key: str, **values: str) -> str:
    return TEXT[language][key].format(**values)


def name(item_id: str, language: str) -> str:
    return CATALOG[item_id]["names"][language]


def total_text(snapshot: RestaurantSnapshot, language: str) -> str:
    cents = order_summary(snapshot, language)["total_cents"]
    return f"₺{cents // 100}" if language == "tr" else f"€{cents / 100:.2f}"


def order_lines_text(snapshot: RestaurantSnapshot, language: str) -> str:
    return ", ".join(quantity_text(item["name"], item["quantity"], language)
                    for item in order_summary(snapshot, language)["items"])


def quantity_text(item_name: str, quantity: int, language: str) -> str:
    if language == "en":
        number = {1: "one", 2: "two", 3: "three", 4: "four", 5: "five"}.get(quantity, str(quantity))
        plural = item_name if quantity == 1 or item_name.lower().endswith("fish") else (
            item_name + "es" if item_name.lower().endswith(("s", "sh", "ch")) else item_name + "s")
        return f"{number} {plural}"
    if language == "tr":
        number = {1: "bir", 2: "iki", 3: "üç", 4: "dört", 5: "beş"}.get(quantity, str(quantity))
        return f"{number} {item_name.lower()}"
    return f"{quantity} {item_name}"


REVIEW_SUMMARY = {
    "en": "Your order is {items}. Your total is {total}. Please check it.",
    "de": "Deine Bestellung: {items}. Gesamtbetrag: {total}. Bitte prüfe sie.",
    "fr": "Votre commande : {items}. Le total est de {total}. Vérifiez-la, s'il vous plaît.",
    "es": "Tu pedido: {items}. El total es {total}. Revísalo, por favor.",
    "pt": "O teu pedido: {items}. O total é {total}. Confirma, por favor.",
    "tr": "Siparişin: {items}. Toplam {total}. Lütfen kontrol et.",
}


def available_menu_items(result: ToolResult, user_message: str) -> list[dict]:
    items = [item for item in (result.data["items"] if result.data else []) if item["available"]]
    query = user_message.lower()
    families = {"chicken": ("chicken", "pollo", "poulet", "hähn", "hahn", "tavuk", "frango"),
                "mushroom": ("mushroom", "seta", "champignon", "pilz", "mantar", "cogumelo")}
    for family, words in families.items():
        if any(word in query for word in words):
            return [item for item in items if family in CATALOG[item["id"]]["names"]["en"].lower() or
                    family in CATALOG[item["id"]]["descriptions"]["en"].lower()]
    return items


def result_reply(language: str, tool: str, args: dict, result: ToolResult,
                 snapshot: RestaurantSnapshot, user_message: str, previous_reply: str = "") -> str:
    if not result.ok:
        reason = result.reason or "generic"
        if reason == "review_required":
            return (REVIEW_SUMMARY[language].format(items=order_lines_text(snapshot, language),
                                                     total=total_text(snapshot, language))
                    if snapshot.step == "review" else say(language, "main_required"))
        if reason in ("first_main_unavailable", "item_unavailable"):
            item_id = args.get("item_id") or args["new_item_id"]
            alternative = available_alternative(item_id, snapshot.unavailable)
            if alternative:
                return UNAVAILABLE_ALTERNATIVE[language].format(item=name(item_id, language),
                                                                 alternative=name(alternative, language))
            return say(language, "first_main_unavailable", item=name(item_id, language))
        if reason in ("not_selected", "main_required", "ambiguous_intent", "unknown_item", "invalid_quantity"):
            return say(language, {"ambiguous_intent": "unclear", "unknown_item": "not_found",
                                  }.get(reason, reason))
        return say(language, "generic")
    if tool == "open_menu":
        base_prefix = MENU_EXPLANATION[language].split("{categories}", 1)[0]
        template = MENU_EXPLANATION_ALT if previous_reply.startswith(base_prefix) else MENU_EXPLANATION
        return template[language].format(categories=", ".join(CATEGORY_NAMES[language][group]
                                                                for group in CATEGORIES))
    if tool == "query_menu":
        items = (result.data or {}).get("items", [])
        if not items:
            return NO_ATTRIBUTE_MATCH[language]
        names = [item["name"] for item in items]
        if args.get("recommend"):
            chosen_id = (result.data or {}).get("recommended")
            chosen = next((item for item in items if item["id"] == chosen_id), items[0])
            others = [item for item in items if item["id"] != chosen["id"]]
            chosen_tags = set(CATALOG[chosen["id"]]["tags"])
            others.sort(key=lambda item: len(chosen_tags.intersection(CATALOG[item["id"]]["tags"])), reverse=True)
            opener = RECOMMEND_REPLY[language].split("{item}", 1)[0]
            repeated = (previous_reply.startswith(opener) if opener else
                        previous_reply.startswith(f"{chosen['name']} öneririm")) and bool(previous_reply)
            if others:
                template = RECOMMEND_ALT_REPLY if repeated else RECOMMEND_REPLY
                return template[language].format(item=chosen["name"],
                                                 others=", ".join(item["name"] for item in others[:2]))
            template = RECOMMEND_ALT_ONE if repeated else RECOMMEND_ONE
            return template[language].format(item=chosen["name"])
        return QUERY_REPLY[language].format(items=", ".join(names[:4]))
    if tool == "show_menu_category":
        return say(language, "category", category=CATEGORY_NAMES[language][args["category"]])
    if tool == "show_menu_item":
        return say(language, "item", item=name(args["item_id"], language))
    if tool == "add_order_item":
        item = quantity_text(name(args["item_id"], language), args["quantity"], language)
        if language == "tr":
            return f"Tamam, {item} ekledim." if args["quantity"] > 1 else f"{name(args['item_id'], language)} siparişine eklendi."
        if args["quantity"] > 1 or CATALOG[args["item_id"]]["category"] == "mains":
            return ADDED_ALT[language].format(item=item)
        return say(language, "added", item=item)
    if tool in ("set_order_quantity", "decrease_order_quantity"):
        quantity = snapshot.order.quantity(args["item_id"])
        if quantity == 0:
            return say(language, "removed", item=name(args["item_id"], language))
        return say(language, "added", item=quantity_text(name(args["item_id"], language), quantity, language))
    if tool == "remove_order_item":
        return say(language, "removed", item=name(args["item_id"], language))
    if tool == "replace_order_item":
        return say(language, "replaced", old=name(args["old_item_id"], language), item=name(args["new_item_id"], language))
    if tool == "get_current_order":
        items = order_lines_text(snapshot, language)
        return say(language, "order", items=items) if items else say(language, "empty")
    if tool == "get_order_total":
        return say(language, "total", total=total_text(snapshot, language))
    if tool == "review_order":
        return REVIEW_SUMMARY[language].format(items=order_lines_text(snapshot, language),
                                               total=total_text(snapshot, language))
    if tool == "go_back_to_menu":
        options = EDIT_ORDER_REPLIES[language]
        return options[(options.index(previous_reply) + 1) % len(options)] if previous_reply in options else options[0]
    if tool == "start_payment":
        return say(language, "payment")
    if tool == "start_new_order":
        return {
            "en": "Let's start a new order. Would you like to see the menu?",
            "fr": "Commençons une nouvelle commande. Voulez-vous voir le menu ?",
            "de": "Beginnen wir eine neue Bestellung. Möchtest du die Speisekarte sehen?",
            "es": "Empecemos un nuevo pedido. ¿Quieres ver el menú?",
            "pt": "Vamos começar um novo pedido. Queres ver a ementa?",
            "tr": "Yeni bir siparişe başlayalım. Menüyü görmek ister misin?",
        }[language]
    if tool == "choose_payment_method":
        methods = {"card": {"en": "card", "es": "tarjeta", "de": "Karte", "fr": "la carte", "pt": "cartão", "tr": "kart"},
                   "cash": {"en": "cash", "es": "efectivo", "de": "Bargeld", "fr": "les espèces", "pt": "dinheiro", "tr": "nakit"}}
        return say(language, "method", method=methods[args["method"]][language])
    if tool in ("get_menu", "get_menu_items"):
        if any(word in user_message.lower() for word in ("gluten", "vegetarian", "vegan", "meat-free", "no meat", "sans viande", "sin carne", "sem carne", "fleischfrei", "etsiz", "glutensiz", "light", "leicht", "ligero", "léger", "leve", "hafif")):
            return say(language, "diet")
        items = available_menu_items(result, user_message)
        names = [item["name"] for item in items]
        if not names:
            return say(language, "unavailable")
        recommend = any(word in user_message.lower() for word in ("recommend", "suggest", "recom", "empfehl", "conseill", "suger", "öner"))
        if recommend:
            choices = ", ".join(item["name"] for item in items[:2])
            reply = say(language, "recommend", items=choices)
            return reply + (" " + RECOMMENDATION_QUESTION[language] if snapshot.step != "success" else "")
        return say(language, "list", items=", ".join(names[:3]))
    return say(language, "generic")
