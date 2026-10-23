"""Short localized statements derived only from validated Restaurant tool results."""

from app.services.restaurant_tools import CATALOG, RestaurantSnapshot, ToolResult, order_summary


TEXT = {
    "en": {"privacy": "For your privacy, don't enter real card or banking information here. This scenario only uses simulated payment.", "unclear": "Could you tell me exactly what you would like to do?", "unavailable": "Sorry, I can't do that right now. You can continue using the menu.", "menu": "Of course. Here is the menu.", "category": "Of course. Here are the {category}.", "item": "Of course. Here is {item}.", "added": "Of course. I've added {item} to your order.", "removed": "Of course. I've removed {item} from your order.", "replaced": "Sure. I've changed {old} to {item}.", "first_main_unavailable": "I'm sorry, {item} isn't available today. Please choose another main dish.", "not_selected": "That item isn't currently in your order.", "main_required": "Please choose a main dish before reviewing your order.", "review": "Let's review your order.", "back": "Of course. You can change your order in the menu.", "payment": "Your order is ready for simulated payment. Please choose card or cash.", "method": "I've selected {method}. Follow the simulated payment steps on screen.", "order": "Your order has {items}.", "empty": "Your order is empty right now.", "total": "Your total is {total}.", "recommend": "You could try {items}. Please check the menu for details.", "diet": "I don't have enough ingredient information to confirm that. I can show you the available dishes.", "not_found": "I don't see that item on today's menu.", "list": "Available choices include {items}.", "generic": "I couldn't make that change. You can use the menu to continue."},
    "es": {"privacy": "Por privacidad, no escribas datos reales de tarjetas o bancos. Este escenario solo simula el pago.", "unclear": "¿Puedes decirme exactamente qué quieres hacer?", "unavailable": "Lo siento, ahora no puedo hacerlo. Puedes seguir usando el menú.", "menu": "Claro. Aquí tienes el menú.", "category": "Claro. Aquí están los {category}.", "item": "Claro. Aquí tienes {item}.", "added": "Claro. He añadido {item} a tu pedido.", "removed": "Claro. He quitado {item} de tu pedido.", "replaced": "Claro. He cambiado {old} por {item}.", "first_main_unavailable": "Lo siento, {item} no está disponible hoy. Elige otro plato principal.", "not_selected": "Ese artículo no está en tu pedido.", "main_required": "Elige un plato principal antes de revisar el pedido.", "review": "Vamos a revisar tu pedido.", "back": "Claro. Puedes cambiar tu pedido en el menú.", "payment": "Tu pedido está listo para el pago simulado. Elige tarjeta o efectivo.", "method": "He elegido {method}. Sigue los pasos del pago simulado en pantalla.", "order": "Tu pedido incluye {items}.", "empty": "Tu pedido está vacío.", "total": "El total es {total}.", "recommend": "Puedes probar {items}. Consulta el menú para ver los detalles.", "diet": "No tengo suficiente información sobre los ingredientes para confirmarlo. Puedo mostrarte los platos disponibles.", "not_found": "No veo ese artículo en el menú de hoy.", "list": "Algunas opciones disponibles son {items}.", "generic": "No pude hacer ese cambio. Puedes continuar desde el menú."},
    "de": {"privacy": "Bitte gib hier keine echten Karten- oder Bankdaten ein. Die Zahlung ist nur eine Simulation.", "unclear": "Kannst du mir genau sagen, was du tun möchtest?", "unavailable": "Entschuldigung, das geht gerade nicht. Du kannst das Menü weiter nutzen.", "menu": "Gern. Hier ist die Speisekarte.", "category": "Gern. Hier sind die {category}.", "item": "Gern. Hier ist {item}.", "added": "Gern. Ich habe {item} zu deiner Bestellung hinzugefügt.", "removed": "Gern. Ich habe {item} aus deiner Bestellung entfernt.", "replaced": "Gern. Ich habe {old} durch {item} ersetzt.", "first_main_unavailable": "Entschuldigung, {item} ist heute nicht verfügbar. Bitte wähle ein anderes Hauptgericht.", "not_selected": "Dieser Artikel ist nicht in deiner Bestellung.", "main_required": "Bitte wähle ein Hauptgericht, bevor du deine Bestellung prüfst.", "review": "Sehen wir uns deine Bestellung an.", "back": "Gern. Du kannst deine Bestellung im Menü ändern.", "payment": "Deine Bestellung ist für die simulierte Zahlung bereit. Wähle Karte oder Bargeld.", "method": "Ich habe {method} ausgewählt. Folge den Schritten der simulierten Zahlung auf dem Bildschirm.", "order": "Deine Bestellung enthält {items}.", "empty": "Deine Bestellung ist noch leer.", "total": "Der Gesamtbetrag ist {total}.", "recommend": "Du könntest {items} probieren. Details stehen im Menü.", "diet": "Ich habe nicht genug Informationen zu den Zutaten, um das zu bestätigen. Ich kann dir verfügbare Gerichte zeigen.", "not_found": "Diesen Artikel sehe ich heute nicht auf der Speisekarte.", "list": "Verfügbare Optionen sind {items}.", "generic": "Ich konnte das nicht ändern. Du kannst im Menü fortfahren."},
    "fr": {"privacy": "Pour protéger vos données, ne saisissez pas de vraies informations bancaires. Le paiement est simulé.", "unclear": "Pouvez-vous préciser ce que vous souhaitez faire ?", "unavailable": "Désolé, je ne peux pas faire cela maintenant. Vous pouvez continuer avec le menu.", "menu": "Bien sûr. Voici le menu.", "category": "Bien sûr. Voici les {category}.", "item": "Bien sûr. Voici {item}.", "added": "Bien sûr. J'ai ajouté {item} à votre commande.", "removed": "Bien sûr. J'ai retiré {item} de votre commande.", "replaced": "Bien sûr. J'ai remplacé {old} par {item}.", "first_main_unavailable": "Désolé, {item} n'est pas disponible aujourd'hui. Choisissez un autre plat principal.", "not_selected": "Cet article n'est pas dans votre commande.", "main_required": "Choisissez un plat principal avant de vérifier votre commande.", "review": "Vérifions votre commande.", "back": "Bien sûr. Vous pouvez modifier votre commande dans le menu.", "payment": "Votre commande est prête pour le paiement simulé. Choisissez carte ou espèces.", "method": "J'ai choisi {method}. Suivez les étapes du paiement simulé à l'écran.", "order": "Votre commande contient {items}.", "empty": "Votre commande est vide pour le moment.", "total": "Le total est de {total}.", "recommend": "Vous pourriez essayer {items}. Consultez le menu pour les détails.", "diet": "Je n'ai pas assez d'informations sur les ingrédients pour le confirmer. Je peux vous montrer les plats disponibles.", "not_found": "Je ne vois pas cet article sur le menu d'aujourd'hui.", "list": "Les choix disponibles comprennent {items}.", "generic": "Je n'ai pas pu faire ce changement. Vous pouvez continuer avec le menu."},
    "pt": {"privacy": "Por privacidade, não introduzas dados reais de cartão ou banco. Este pagamento é apenas simulado.", "unclear": "Podes dizer-me exatamente o que queres fazer?", "unavailable": "Desculpa, não consigo fazer isso agora. Podes continuar com a ementa.", "menu": "Claro. Aqui está a ementa.", "category": "Claro. Aqui estão os {category}.", "item": "Claro. Aqui está {item}.", "added": "Claro. Adicionei {item} ao teu pedido.", "removed": "Claro. Retirei {item} do teu pedido.", "replaced": "Claro. Troquei {old} por {item}.", "first_main_unavailable": "Desculpa, {item} não está disponível hoje. Escolhe outro prato principal.", "not_selected": "Esse artigo não está no teu pedido.", "main_required": "Escolhe um prato principal antes de rever o pedido.", "review": "Vamos rever o teu pedido.", "back": "Claro. Podes alterar o pedido na ementa.", "payment": "O pedido está pronto para o pagamento simulado. Escolhe cartão ou dinheiro.", "method": "Selecionei {method}. Segue os passos do pagamento simulado no ecrã.", "order": "O teu pedido inclui {items}.", "empty": "O teu pedido está vazio.", "total": "O total é {total}.", "recommend": "Podes experimentar {items}. Consulta a ementa para os detalhes.", "diet": "Não tenho informação suficiente sobre os ingredientes para confirmar isso. Posso mostrar-te os pratos disponíveis.", "not_found": "Não vejo esse artigo na ementa de hoje.", "list": "Algumas opções disponíveis são {items}.", "generic": "Não consegui fazer essa alteração. Podes continuar na ementa."},
    "tr": {"privacy": "Gizliliğin için buraya gerçek kart veya banka bilgilerini yazma. Bu senaryoda ödeme yalnızca simülasyondur.", "unclear": "Ne yapmak istediğini açıkça söyleyebilir misin?", "unavailable": "Üzgünüm, bunu şu anda yapamıyorum. Menüyü kullanmaya devam edebilirsin.", "menu": "Elbette. İşte menü.", "category": "Elbette. İşte {category}.", "item": "Elbette. İşte {item}.", "added": "Elbette. {item} siparişine eklendi.", "removed": "Elbette. {item} siparişinden çıkarıldı.", "replaced": "Elbette. {old} yerine {item} seçildi.", "first_main_unavailable": "Üzgünüm, {item} bugün mevcut değil. Lütfen başka bir ana yemek seç.", "not_selected": "Bu ürün şu anda siparişinde yok.", "main_required": "Siparişini incelemeden önce bir ana yemek seç.", "review": "Siparişini inceleyelim.", "back": "Elbette. Siparişini menüden değiştirebilirsin.", "payment": "Siparişin simüle ödeme için hazır. Kart veya nakit seç.", "method": "{method} seçildi. Ekrandaki simüle ödeme adımlarını izle.", "order": "Siparişinde {items} var.", "empty": "Siparişin şu anda boş.", "total": "Toplam tutar {total}.", "recommend": "{items} deneyebilirsin. Ayrıntılar için menüye bak.", "diet": "Bunu doğrulamak için yeterli içerik bilgim yok. Mevcut yemekleri gösterebilirim.", "not_found": "Bu ürünü bugünkü menüde göremiyorum.", "list": "Mevcut seçenekler arasında {items} var.", "generic": "Bu değişikliği yapamadım. Menüden devam edebilirsin."},
}

CATEGORY_NAMES = {
    "en": {"mains": "main dishes", "salads": "salads", "soups": "soups", "desserts": "desserts", "drinks": "drinks"},
    "es": {"mains": "platos principales", "salads": "ensaladas", "soups": "sopas", "desserts": "postres", "drinks": "bebidas"},
    "de": {"mains": "Hauptgerichte", "salads": "Salate", "soups": "Suppen", "desserts": "Desserts", "drinks": "Getränke"},
    "fr": {"mains": "plats principaux", "salads": "salades", "soups": "soupes", "desserts": "desserts", "drinks": "boissons"},
    "pt": {"mains": "pratos principais", "salads": "saladas", "soups": "sopas", "desserts": "sobremesas", "drinks": "bebidas"},
    "tr": {"mains": "ana yemekler", "salads": "salatalar", "soups": "çorbalar", "desserts": "tatlılar", "drinks": "içecekler"},
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

def say(language: str, key: str, **values: str) -> str:
    return TEXT[language][key].format(**values)


def name(item_id: str, language: str) -> str:
    return CATALOG[item_id]["names"][language]


def total_text(snapshot: RestaurantSnapshot, language: str) -> str:
    cents = order_summary(snapshot, language)["total_cents"]
    return f"₺{cents // 100}" if language == "tr" else f"€{cents / 100:.2f}"


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
                 snapshot: RestaurantSnapshot, user_message: str) -> str:
    if not result.ok:
        reason = result.reason or "generic"
        if reason == "review_required":
            return say(language, "review" if snapshot.step == "review" else "main_required")
        if reason == "first_main_unavailable":
            return say(language, reason, item=name(args.get("item_id") or args["new_item_id"], language))
        if reason in ("not_selected", "main_required", "ambiguous_intent", "unknown_item", "item_unavailable"):
            return say(language, {"ambiguous_intent": "unclear", "unknown_item": "not_found",
                                  "item_unavailable": "unavailable"}.get(reason, reason))
        return say(language, "generic")
    if tool == "open_menu":
        return say(language, "menu")
    if tool == "show_menu_category":
        return say(language, "category", category=CATEGORY_NAMES[language][args["category"]])
    if tool == "show_menu_item":
        return say(language, "item", item=name(args["item_id"], language))
    if tool == "add_order_item":
        return say(language, "added", item=name(args["item_id"], language))
    if tool == "remove_order_item":
        return say(language, "removed", item=name(args["item_id"], language))
    if tool == "replace_order_item":
        return say(language, "replaced", old=name(args["old_item_id"], language), item=name(args["new_item_id"], language))
    if tool == "get_current_order":
        items = [item["name"] for item in order_summary(snapshot, language)["items"]]
        return say(language, "order", items=", ".join(items)) if items else say(language, "empty")
    if tool == "get_order_total":
        return say(language, "total", total=total_text(snapshot, language))
    if tool == "review_order":
        return say(language, "review")
    if tool == "go_back_to_menu":
        return say(language, "back")
    if tool == "start_payment":
        return say(language, "payment")
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
