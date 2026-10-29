"""Small, explicit Restaurant intent and catalog boundary."""

import re
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.services.restaurant_tools import CATALOG, CATEGORIES, MENU_ATTRIBUTES, OrderSnapshot, resolve_menu_item


CompactActionName = Literal[
    "open_menu", "show_category", "show_item", "search_menu", "query_menu", "recommend",
    "add_item", "set_quantity", "decrease_quantity", "remove_item", "replace_item", "get_order", "get_total",
    "review_order", "back_to_menu", "start_payment", "choose_payment", "new_order", "answer_only",
]


class CompactAction(BaseModel):
    model_config = ConfigDict(extra="forbid")
    action: CompactActionName
    item_query: str | None = Field(default=None, max_length=120)
    replacement_query: str | None = Field(default=None, max_length=120)
    category: Literal["mains", "salads", "soups", "desserts", "drinks"] | None = None
    payment_method: Literal["card", "cash"] | None = None
    attribute: Literal["hot", "cold", "chicken", "beef", "fish", "meat", "vegetarian",
                       "sweet", "light", "vegetable", "mushroom", "caffeinated"] | None = None
    quantity: int | None = Field(default=None, ge=1, le=99)


class PendingClarification(BaseModel):
    model_config = ConfigDict(extra="forbid")
    action: Literal["add_item", "remove_item", "replace_item", "describe_item", "set_quantity"]
    item_query: str = Field(min_length=1, max_length=120)
    quantity: int | None = Field(default=None, ge=1, le=99)
    replacement_query: str | None = Field(default=None, max_length=120)
    matches: list[str] = Field(default_factory=list, max_length=5)
    clarify_field: Literal["item", "replacement"] = "item"

    @model_validator(mode="after")
    def known_matches(self):
        if any(item_id not in CATALOG for item_id in self.matches):
            raise ValueError("Unknown clarification item")
        return self


_CATEGORY_WORDS = {
    "mains": ("main dish", "main dishes", "main course", "main courses", "mains", "entree", "entrees", "plato principal", "platos principales", "hauptgericht", "hauptgerichte", "plat principal", "plats principaux", "prato principal", "pratos principais", "ana yemek", "ana yemekler"),
    "salads": ("salad", "salads", "ensalada", "ensaladas", "salat", "salate", "salade", "salades", "salada", "saladas", "salata", "salatalar"),
    "soups": ("soup", "soups", "sopa", "sopas", "suppe", "suppen", "soupe", "soupes", "corba", "çorbalar"),
    "desserts": ("dessert", "desserts", "postre", "postres", "sobremesa", "sobremesas", "tatlı", "tatlılar"),
    "drinks": ("drink", "drinks", "beverage", "beverages", "bebida", "bebidas", "getrank", "getränke", "boisson", "boissons", "icecek", "içecekler"),
}
_SHOW_PREFIXES = ("show", "show me", "see", "see the", "mostrar", "muestra", "zeig", "zeige", "montre", "montrez", "mostre", "goster", "göster")
_DIRECT = {
    "open menu": "open_menu", "open the menu": "open_menu", "show menu": "open_menu",
    "abre el menu": "open_menu", "offne die speisekarte": "open_menu",
    "ouvre le menu": "open_menu", "abra o menu": "open_menu", "menuyu ac": "open_menu",
    "review my order": "review_order", "review order": "review_order", "revisar mi pedido": "review_order",
    "bestellung prufen": "review_order", "verifier ma commande": "review_order",
    "rever meu pedido": "review_order", "siparisimi incele": "review_order",
    "back to menu": "back_to_menu", "go back to menu": "back_to_menu", "volver al menu": "back_to_menu",
    "zuruck zur speisekarte": "back_to_menu", "retour au menu": "back_to_menu",
    "voltar ao menu": "back_to_menu", "menuye geri don": "back_to_menu",
    "what is my total": "get_total", "what's my total": "get_total", "how much is it": "get_total",
    "how much is my order": "get_total", "cuanto es el total": "get_total",
    "wie viel kostet meine bestellung": "get_total", "quel est le total": "get_total",
    "qual e o total": "get_total", "toplam ne kadar": "get_total",
    "what is in my order": "get_order", "what's in my order": "get_order", "show my order": "get_order",
    "que hay en mi pedido": "get_order", "was ist in meiner bestellung": "get_order",
    "qu y a t il dans ma commande": "get_order", "o que esta no meu pedido": "get_order",
    "siparisimde ne var": "get_order",
    "pay by card": "choose_payment", "pay with card": "choose_payment",
    "pay cash": "choose_payment", "pay with cash": "choose_payment",
    "pagar con tarjeta": "choose_payment", "pagar en efectivo": "choose_payment",
    "mit karte zahlen": "choose_payment", "bar zahlen": "choose_payment",
    "payer par carte": "choose_payment", "payer en especes": "choose_payment",
    "pagar com cartao": "choose_payment", "pagar em dinheiro": "choose_payment",
    "kartla ode": "choose_payment", "nakit ode": "choose_payment",
}
_CASH_WORDS = ("cash", "efectivo", "bar", "especes", "dinheiro", "nakit")


def _simple(message: str) -> str:
    from app.services.restaurant_tools import _normalize_name
    return _normalize_name(message)


_DIRECT_NORMALIZED = {_simple(key): value for key, value in _DIRECT.items()}


def fast_path(message: str) -> CompactAction | None:
    normalized = _simple(message)
    action = _DIRECT_NORMALIZED.get(normalized)
    if action == "choose_payment":
        return CompactAction(action=action, payment_method="cash" if any(
            re.search(rf"\b{word}\b", normalized) for word in _CASH_WORDS) else "card")
    if action:
        return CompactAction(action=action)
    for category, words in _CATEGORY_WORDS.items():
        if normalized in (_simple(word) for word in words) or any(
            normalized == _simple(f"{prefix} {word}") for prefix in _SHOW_PREFIXES for word in words):
            return CompactAction(action="show_category", category=category)
    return None


def obvious_payment_method_request(message: str) -> CompactAction | None:
    """Accept short spoken answers to the payment-method question."""
    normalized = _simple(message)
    spoken = {
        "card": ("par carte", "je paie par carte", "avec la carte", "mit karte", "ich zahle mit karte",
                 "con tarjeta", "pago con tarjeta", "com cartao", "pago com cartao", "kartla", "kartla odeyecegim"),
        "cash": ("en especes", "je paie en especes", "bar", "ich zahle bar", "en efectivo",
                 "pago en efectivo", "em dinheiro", "pago em dinheiro", "nakit", "nakit odeyecegim"),
    }
    for method, phrases in spoken.items():
        if normalized in phrases:
            return CompactAction(action="choose_payment", payment_method=method)
    methods = {
        "card": r"card|credit card|debit card|tarjeta|karte|carte|cartao|kart",
        "cash": r"cash|efectivo|bargeld|especes|dinheiro|nakit",
    }
    for method, words in methods.items():
        if re.fullmatch(
            rf"(?:(?:i(?: want| would like| d like)? to |i ll |i will |we ll |we will )?"
            rf"(?:pay |pay with |pay by |use |choose )?|(?:by |with |in ))"
            rf"(?:my |a |the )?(?:{words})(?: please)?",
            normalized,
        ):
            return CompactAction(action="choose_payment", payment_method=method)
    return None


def obvious_confirmation_request(message: str) -> bool:
    """Recognize an explicit decision to confirm the current order."""
    normalized = _simple(message)
    if normalized in CONFIRMATION_PHRASES:
        return True
    # Common spoken forms survive missing Turkish diacritics and minor STT endings.
    if re.fullmatch(r"(?:evet )?(?:siparisimi? |siparisi )?onayla(?:mak istiy(?:orum|om)|yorum|yin|yabilir miyim)?", normalized):
        return True
    if re.fullmatch(r"(?:evet )?(?:siparisim dogru|her sey dogru|her sey tamam|bu sekilde tamam|tamamdir|devam edebiliriz|odemeye gec(?:mek istiyorum|elim))", normalized):
        return True
    return bool(re.fullmatch(
        r"(?:(?:yes|okay|ok) )?(?:(?:i|we) )?(?:confirm|confirm (?:it|my order|the order|our order))"
        r"(?: now| please)?|(?:please )?confirm (?:my|the|our) order(?: now| please)?|"
        r"(?:(?:i am|i m|im|we are|we re) )?ready to (?:confirm (?:my|the|our) order|pay)"
        r"(?: now| please)?|(?:let s |please )?(?:proceed to payment|go to payment|pay now)",
        normalized,
    ))


CONFIRMATION_PHRASES = {_simple(phrase) for phrase in (
    "I confirm my order", "confirm my order", "yes that's my order", "that's correct", "everything looks good",
    "I'm happy with my order", "this is fine", "I'm ready to pay", "I want to continue", "let's continue",
    "I'm done", "that's all", "I think that's everything", "I'm good", "that's all for me", "we can continue",
    "I'm finished choosing", "let's pay", "can we pay now", "I'd like to pay",
    "Je confirme ma commande", "Je confirme", "Oui c'est bon", "La commande est correcte", "Tout est correct",
    "Ça me va", "C'est tout", "J'ai terminé", "Je veux continuer", "Je suis prêt à payer", "On peut continuer",
    "Ich bestätige meine Bestellung", "Die Bestellung stimmt", "Das ist richtig", "Das passt", "Ich bin fertig",
    "Ich möchte bezahlen", "Weiter bitte", "Confirmo mi pedido", "El pedido está bien", "Está correcto",
    "Eso es todo", "He terminado", "Quiero pagar", "Podemos continuar", "Confirmo o meu pedido",
    "O pedido está correto", "Está tudo certo", "É só isso", "Terminei", "Quero pagar", "Podemos continuar",
    "Siparişimi onaylıyorum", "Siparişim doğru", "Evet doğru", "Her şey tamam", "Bu kadar", "Bitirdim",
    "Ödemeye geçmek istiyorum", "Ödemeye hazırım", "Devam edebiliriz",
)}


NEW_ORDER_PHRASES = {_simple(phrase) for phrase in (
    "I want to order again", "I want another order", "Can I order again", "Let's order again", "I want to start again",
    "I'd like to eat again", "New order please", "Can we start over", "Let's order from the beginning again",
    "Je veux commander encore une fois", "Je veux commander une autre fois", "Je voudrais commander à nouveau",
    "Je veux faire une nouvelle commande", "Je veux recommencer", "Nouvelle commande", "Je voudrais commander encore",
    "Ich möchte noch einmal bestellen", "Ich möchte erneut bestellen", "Eine neue Bestellung bitte", "Ich möchte von vorne anfangen",
    "Quiero pedir otra vez", "Quiero hacer otro pedido", "Quiero volver a pedir", "Un nuevo pedido",
    "Quero pedir novamente", "Quero fazer outro pedido", "Quero começar de novo", "Um novo pedido",
    "Tekrar sipariş vermek istiyorum", "Yeniden sipariş vermek istiyorum", "Yeni bir sipariş vermek istiyorum",
    "Baştan başlamak istiyorum",
)}


def semantic_new_order_request(message: str) -> bool:
    return _simple(message) in NEW_ORDER_PHRASES


def obvious_progress_request(message: str) -> Literal["start", "review"] | None:
    """Keep order-navigation phrases out of food-item matching."""
    normalized = _simple(message)
    if re.fullmatch(
        r"(?:(?:i want|i would like|i d like|i need) to |(?:can|could|would) you |please )?"
        r"(?:review|check|see|show) (?:my|the|our) order(?: please)?",
        normalized,
    ) or re.fullmatch(
        r"(?:(?:i am|i m|im|i have|i ve|we are|we re|we have|we ve) )?(?:done|finished)"
        r"(?: (?:with )?(?:choosing|selecting|ordering|my order|the order|our order))?(?: now| please)?",
        normalized,
    ) or re.fullmatch(r"(?:that s|thats|that is|this is) (?:all|everything)(?: for now)?", normalized) or re.fullmatch(
        r"(?:(?:i am|i m|im|we are|we re) )?ready to (?:review|place|confirm) (?:my|the|our) order(?: now| please)?",
        normalized,
    ):
        return "review"
    if re.fullmatch(
        r"(?:(?:i want|i would like|i d like|i need) to |(?:can|could) i |"
        r"(?:i am|i m|im|we are|we re) ready to )"
        r"(?:order|place (?:my|the|our) order)(?: now| please)?",
        normalized,
    ):
        return "start"
    return None


def obvious_food_request(message: str) -> tuple[str, str | None] | None:
    """Only unambiguous short requests; nuanced wording still goes to Qwen."""
    normalized = _simple(message)
    add = re.fullmatch(
        r"(?:(?:please|can you|can u|could you|could u|would you|can you please|can u please|could you please|could u please|i want to|i would like to) )?add (.+)",
        normalized,
    ) or re.fullmatch(
        r"(?:i want to order|i would like to order|can i order|could i order|i want|i would like|i d like|i ll have|i will have|i ll take|i will take|can i have|could i have|may i have|can i get|could i get|give me) (.+)",
        normalized,
    )
    if add:
        query = re.sub(r"(?: to (?:(?:my|the) )?order| for me| please| as well| too)+$", "", add.group(1))
        if re.match(r"(?:to )?(?:remove|delete|change|edit|replace|switch|swap|modify|update|take off|take out)\b", query):
            return None
        if query in {"to order", "my order", "the order"} or query.startswith(
            ("to review", "to check", "to see", "to pay", "to place")
        ):
            return None
        if query in {"something", "something else", "anything", "something to eat", "a meal", "another dish", "food", "some food"}:
            return ("ask_item", None)
        if len(query) <= 120 and len(query.split()) <= 5 and not re.search(r"\b(and|or|plus|with|instead|about|know)\b", query):
            return ("add_item", query)
    simple_recommendation = ("compare" not in normalized and len(normalized.split()) <= 18 and bool(re.search(
        r"\b(recommend\w*|suggest\w*|recommendation|suggestion)\b|"
        r"\bwhat (?:should|could) i (?:eat|order|choose|get)\b", normalized)))
    if simple_recommendation and not re.search(r"\b(add|remove|replace|change|don t|do not)\b", normalized):
        item_names = {_simple(item["names"]["en"]) for item in CATALOG.values()}
        if not any(re.search(rf"\b{re.escape(item_name)}\b", normalized) for item_name in item_names) and not re.search(
            r"\b(hamburger|hamburgers|burger)\b", normalized
        ):
            return ("recommend", mentioned_category(message) or "mains")
    return None


def obvious_order_change(message: str, *, review: bool = False) -> CompactAction | None:
    """Route explicit remove and replace requests through the validated order engine."""
    normalized = _simple(message)
    prefix = (r"(?:(?:please|can you|can u|could you|could u|would you|can you please|could you please|"
              r"i want to|i would like to|i d like to|i need to|let me) )?")
    if review and re.fullmatch(prefix + r"(?:change|edit|modify|update|adjust)(?: (?:my|the|our))?"
                               r"(?: order| something| an? item| an? dish)?(?: please)?", normalized):
        return CompactAction(action="back_to_menu")
    replace = re.fullmatch(prefix + r"(?:replace|change|switch|swap|edit) (.+?) (?:with|for|to|into) (.+)", normalized)
    if replace:
        old = re.sub(r"^(?:the|my|our) ", "", replace.group(1))
        new = re.sub(r"(?: in (?:my|the) order| please| instead)+$", "", replace.group(2))
        if old and new and len(old) <= 120 and len(new) <= 120 and not re.search(r"\b(and|or|plus)\b", old + " " + new):
            return CompactAction(action="replace_item", item_query=old, replacement_query=new)
    remove = re.fullmatch(prefix + r"(?:remove|delete|take off|take out|drop) (.+)", normalized)
    if remove:
        query = re.sub(r"(?: from (?:my|the) order| please| for me)+$", "", remove.group(1))
        if query and len(query) <= 120 and not re.search(r"\b(and|or|plus)\b", query):
            return CompactAction(action="remove_item", item_query=None if query in {
                "it", "that", "something", "an item", "a dish", "one item", "anything"} else query)
    if review and re.fullmatch(prefix + r"(?:remove|delete|take off|take out)(?: something| an? item)?(?: please)?", normalized):
        return CompactAction(action="remove_item")
    if review:
        change = re.fullmatch(prefix + r"(?:replace|change|switch|swap|edit) (.+)", normalized)
        if change and not re.search(r"\b(and|or|plus)\b", change.group(1)):
            return CompactAction(action="replace_item", item_query=change.group(1))
    return None


def obvious_menu_request(message: str, language: str) -> CompactAction | None:
    normalized = _simple(message)
    if normalized in {"what is on the menu", "what s on the menu", "can i see the menu", "show me the menu"}:
        return CompactAction(action="open_menu")
    item = re.fullmatch(r"(?:show me|show|do you have|is there) (.+)", normalized)
    if item:
        query = re.sub(r"(?: please| on the menu)+$", "", item.group(1))
        if resolve_menu_item(query, language)["status"] == "found":
            return CompactAction(action="show_item", item_query=query)
    category = mentioned_category(message)
    if category and re.search(r"\b(?:what|which|show|list|have|available)\b", normalized) and not re.search(
        r"\b(?:add|remove|replace|change|recommend|suggest)\b", normalized
    ):
        return CompactAction(action="search_menu", category=category)
    return None


def resolve_action_item(query: str, language: str, order: OrderSnapshot | None = None,
                        category: str | None = None) -> dict:
    return resolve_menu_item(query, language, category=category, selected=order)


def compact_candidates(category: str, language: str, unavailable: str | None, limit: int = 5) -> list[list[str]]:
    if category not in CATEGORIES:
        return []
    return [[item_id, item["names"][language]] for item_id, item in CATALOG.items()
            if item["category"] == category and item_id != unavailable][:limit]


def mentioned_category(message: str) -> str | None:
    normalized = _simple(message)
    turkish = {"mains": r"\bana yemek\w*", "salads": r"\bsalata\w*", "soups": r"\bcorba\w*",
               "desserts": r"\btatl[ıi]\w*", "drinks": r"\bicece[kg]\w*"}
    for category, pattern in turkish.items():
        if re.search(pattern, normalized):
            return category
    for category, words in _CATEGORY_WORDS.items():
        if any(re.search(rf"\b{re.escape(_simple(word))}\b", normalized) for word in words):
            return category
    return None


def semantic_review_request(message: str) -> bool:
    normalized = _simple(message)
    if normalized in {"ich bin fertig", "ich habe fertig", "je veux voir ma commande",
                      "je voudrais voir ma commande", "siparisimi kontrol etmek istiyorum",
                      "siparisimi kontrol et", "quero rever o meu pedido"}:
        return True
    if re.fullmatch(r"(?:i think )?(?:i am|i m|im|we are|we re) ready|(?:i think )?(?:i am|i m|im|we are|we re) done|"
                    r"(?:i want|i d like|i would like) to continue", normalized):
        return True
    return bool(re.search(r"\b(review|revoir|rever|revisar|verifier|prufen|incele|gözden|gozden)\w*\b",
                          normalized) and re.search(r"\b(order|commande|pedido|bestellung|siparis\w*)\b", normalized))


# Broad intent cues cover natural spoken variations; the current scenario step decides
# whether proceeding means inspecting an order or confirming an inspected one.
_NAVIGATION_CUES = {
    "en": (r"\b(order\w*|choosing)\b", r"\b(see|show|check|review|ordered|have i ordered|what s in)\b",
           r"\b(confirm|pay|payment|proceed|continue|ready|done|finished|that s all|that s everything|that s my order|nothing else|don t want anything else|everything looks good|everything is correct)\b"),
    "fr": (r"\bcommande\b", r"\b(voir|montre\w*|verifi\w*|revoir|command\w*)\b",
           r"\b(confirm\w*|payer|paiement|continu\w*|suite|pret\w*|termin\w*|fini|c est tout|rien d autre)\b"),
    "de": (r"\b(bestellung|bestellt)\b", r"\b(sehen|zeig\w*|pruf\w*|uberpruf\w*|bestellt|was ist)\b",
           r"\b(bestatig\w*|bezahl\w*|zahl\w*|weiter\w*|bereit|fertig|das ist alles|nichts mehr|passt)\b"),
    "es": (r"\bpedido\b", r"\b(ver|muestra\w*|revisa\w*|comproba\w*|he pedido|que hay)\b",
           r"\b(confirm\w*|pagar|pago|continu\w*|seguir|listo|termin\w*|eso es todo|nada mas|esta bien)\b"),
    "pt": (r"\b(pedido|pedi)\b", r"\b(ver|mostr\w*|rever|verifica\w*|pedi|o que esta)\b",
           r"\b(confirm\w*|pagar|pagamento|continu\w*|seguir|pronto|terminei|e tudo|mais nada|esta correto)\b"),
    "tr": (r"\bsiparis\w*\b", r"\b(gor\w*|goster\w*|kontrol\w*|gozden\w*|ettim|ne var)\b",
           r"\b(onay\w*|ode\w*|odeme\w*|devam\w*|hazir\w*|bitir\w*|bitti|bu kadar|baska bir sey istemiyorum|dogru)\b"),
}


def semantic_navigation_request(message: str, language: str, step: str) -> CompactAction | None:
    """Resolve order inspection and progress against the current page."""
    if step not in ("menuCover", "alternativeCover", "menu", "alternative", "review"):
        return None
    normalized = _simple(message)
    order_pattern, inspect_pattern, proceed_pattern = _NAVIGATION_CUES[language]
    order = bool(re.search(order_pattern, normalized))
    inspect = bool(re.search(inspect_pattern, normalized))
    proceed = bool(re.search(proceed_pattern, normalized))
    if step == "review" and normalized in ("looks good", "sounds good"):
        proceed = True
    # A food item or category still belongs to ordering, even when the sentence
    # contains words such as "want" or "order".
    if step == "review":
        if proceed:
            return CompactAction(action="start_payment")
        if order and inspect:
            return CompactAction(action="get_order")
        return None
    if proceed or (order and inspect) or (language == "en" and re.search(r"\b(order now|place my order|place the order)\b", normalized)):
        return CompactAction(action="review_order")
    return None


NUMBER_WORDS = {
    "one": 1, "two": 2, "three": 3, "four": 4, "five": 5,
    "un": 1, "une": 1, "deux": 2, "trois": 3, "quatre": 4, "cinq": 5,
    "ein": 1, "eine": 1, "zwei": 2, "drei": 3, "vier": 4, "funf": 5,
    "uno": 1, "una": 1, "dos": 2, "tres": 3, "cuatro": 4, "cinco": 5,
    "um": 1, "uma": 1, "dois": 2, "duas": 2, "quatro": 4,
    "bir": 1, "iki": 2, "uc": 3, "dort": 4, "bes": 5,
}


def requested_quantity(message: str, *, last: bool = False) -> int | None:
    words = _simple(message).split()
    found = []
    for word in words:
        if word.isdecimal() and 1 <= int(word) <= 99:
            found.append(int(word))
        if word in NUMBER_WORDS:
            found.append(NUMBER_WORDS[word])
    return (found[-1] if last else found[0]) if found else None


def semantic_menu_request(message: str, language: str) -> CompactAction | None:
    normalized = _simple(message)
    if re.search(r"\b(recommend|suggest|compare|empfehl|conseill|suger|oner)\w*\b", normalized):
        return None
    category = mentioned_category(message)
    item = resolve_menu_item(message, language)
    browse_words = ("show", "see", "look", "open", "montre", "voir", "zeig", "sehen",
                    "ver", "muestra", "mostre", "goster", "gorme")
    if item["status"] == "found" and re.search(r"\b(show|see|open|montre|zeig|mostrar|goster)\w*\b", normalized):
        return CompactAction(action="show_item", item_query=CATALOG[item["item_id"]]["names"][language])
    if category and (any(word.startswith(term) for word in normalized.split() for term in browse_words) or
                     normalized in {"et les boissons", "et les soupes", "und die getranke", "y las bebidas",
                                    "e as bebidas", "icecekler", "and soups", "what about drinks"}):
        if not re.search(r"\b(add|ajout|agreg|anad|adicion|ekle|remove|retir|enlev|quitar|remov|cikar)\w*\b", normalized):
            return CompactAction(action="show_category", category=category)
    if category and not re.search(r"\b(add|order|take|want|like|remove|change|replace|ajout|command|prendr|veux|voudrais|"
                                  r"bestell|mocht|quier|pedir|adicion|quero|siparis|istiyorum)\b", normalized):
        return CompactAction(action="show_category", category=category)
    if item["status"] == "found" and re.search(
        r"\b(do you have|have you got|is there|avez vous|vous avez|haben sie|hay|tienen|tem|var mi)\b",
        normalized,
    ):
        return CompactAction(action="show_item", item_query=CATALOG[item["item_id"]]["names"][language])
    menu_words = ("menu", "speisekarte", "ementa", "menyu")
    if any(word in normalized for word in menu_words) and not re.search(r"\b(add|remove|change|pay|price|cost)\b", normalized):
        return CompactAction(action="open_menu")
    if normalized in {"yes", "yes please", "oui", "oui s il vous plait", "ja", "ja bitte", "si", "sim", "evet", "evet lutfen"}:
        return CompactAction(action="open_menu")
    if normalized in {"what do you have", "what food do you have", "qu est ce que vous avez", "was haben sie",
                      "que tienen", "o que voces tem", "neler var"}:
        return CompactAction(action="open_menu")
    return None


def semantic_order_request(message: str, language: str, selected: OrderSnapshot) -> CompactAction | None:
    normalized = _simple(message)
    if re.search(r"\b(?:i think you should|you should|perhaps you could|maybe you could)\b", normalized):
        return None
    if re.search(r"\b(do you have|what .* do you have|is there|are there|vous avez|avez vous|haben sie|"
                 r"tienen|voces tem|var mi|neler var)\b", normalized):
        return None
    selected_match = resolve_menu_item(message, language, selected=selected)
    any_match = resolve_menu_item(message, language)
    if any_match["status"] != "found":
        # A short follow-up may omit the item only when the cart gives one clear referent.
        if len(selected.lines) == 1:
            context_item = selected.lines[0].item_id
            context_query = CATALOG[context_item]["names"][language]
            quantity = requested_quantity(message)
            if quantity and re.fullmatch(r"(?:(?:actually |i ll |i will |can i |could i )?(?:make that |set it to |take |have |get )?)?(?:one|two|three|four|five|bir|iki|uc|dort|bes|\d+)", normalized):
                return CompactAction(action="set_quantity", item_query=context_query, quantity=quantity)
            if quantity and re.fullmatch(r"(?:bir|iki|uc|dort|bes|\d+) tane olsun", normalized):
                return CompactAction(action="set_quantity", item_query=context_query, quantity=quantity)
            if re.fullmatch(r"(?:another one|one more|can i get another one|bir tane daha)", normalized):
                return CompactAction(action="add_item", item_query=context_query, quantity=1)
            if re.fullmatch(r"(?:i don t want this anymore|i changed my mind|bunu istemiyorum|vazgectim)", normalized):
                return CompactAction(action="remove_item", item_query=context_query)
        return None
    item_id = any_match["item_id"]
    item_query = CATALOG[item_id]["names"][language]
    # Only explicit ordering or quantity language is permitted to mutate the cart.
    if selected_match["status"] == "found" and re.search(
        r"\b(remove|delete|retir|enlev|supprim|quit|eliminar|entfern|weg|remover|tirar|cikar|kaldir|sil|iptal|vazgec|istemiyorum)\w*\b", normalized
    ):
        quantity = requested_quantity(message)
        return CompactAction(action="decrease_quantity" if quantity or " one " in f" {normalized} " else "remove_item",
                             item_query=item_query, quantity=quantity or 1)
    if selected_match["status"] == "found" and re.search(
        r"\b(make|set|change|only|just|passe|mettre|seulement|nur|mach|cambia|deja|apenas|so|yap|olsun)\w*\b", normalized
    ) and requested_quantity(message):
        return CompactAction(action="set_quantity", item_query=item_query, quantity=requested_quantity(message, last=True))
    if re.search(r"\b(another|one more|more|encore|autre|noch|weiter|otro|otra|mais|daha)\b", normalized) and selected.quantity(item_id):
        return CompactAction(action="add_item", item_query=item_query, quantity=requested_quantity(message) or 1)
    if selected.quantity(item_id) and re.search(r"\b(sayisini|make|set|change|yap|olsun)\w*\b", normalized) and requested_quantity(message):
        return CompactAction(action="set_quantity", item_query=item_query, quantity=requested_quantity(message, last=True))
    quantity = requested_quantity(message)
    if quantity:
        bare_item = " ".join(word for word in normalized.split()
                             if word not in NUMBER_WORDS and not word.isdecimal() and word not in {"tane", "daha"})
        if bare_item and resolve_menu_item(bare_item, language).get("item_id") == item_id:
            return CompactAction(action="add_item", item_query=item_query, quantity=quantity)
    if re.search(
        r"\b(want|like|take|have|get|give|add|order|need|please|veux|voudrais|commander|prends|ajout|"
        r"mochte|moechte|bestellen|nehme|bitte|fuge|anade|quiero|quisiera|dame|pedir|agrega|quero|gostaria|"
        r"pedido|adicion|istiyorum|istiyom|almak|alayim|alabilir|ekle|ekler|siparis|bana|lutfen)\w*\b", normalized
    ):
        return CompactAction(action="add_item", item_query=item_query, quantity=requested_quantity(message) or 1)
    return None


EDIT_TERMS = {
    "en": ("change", "edit", "modify", "adjust", "add", "remove", "forgot", "another", "else", "quantity", "back"),
    "fr": ("modifi", "chang", "ajout", "enlev", "retir", "oubli", "autre", "quantit", "retour"),
    "de": ("ander", "hinzufug", "entfern", "vergess", "noch", "zuruck", "menge"),
    "es": ("cambi", "anad", "agreg", "quit", "falt", "otra", "volver", "cantidad"),
    "pt": ("alter", "adicion", "acrescent", "remov", "esqueci", "outra", "voltar", "quantidade"),
    "tr": ("degistir", "ekle", "cikar", "unutt", "daha", "geri", "miktar"),
}


def semantic_edit_request(message: str, language: str) -> CompactAction | None:
    """Recognize an edit request without inventing an item or mutating the order."""
    words = _simple(message).split()
    if not any(word.startswith(term) for word in words for term in EDIT_TERMS[language]):
        return None
    category = mentioned_category(message)
    return CompactAction(action="show_category", category=category) if category else CompactAction(action="back_to_menu")


def semantic_compound_order_request(message: str, language: str,
                                    selected: OrderSnapshot) -> list[CompactAction] | None:
    """Handle two explicit item changes in one utterance using the same validated actions."""
    connectors = {"en": "and", "fr": "et", "de": "und", "es": "y", "pt": "e", "tr": "ve"}
    parts = re.split(rf"\b{connectors[language]}\b", _simple(message), maxsplit=1)
    if len(parts) != 2:
        return None
    actions = [semantic_order_request(part.strip(), language, selected) for part in parts]
    allowed = {"add_item", "remove_item", "decrease_quantity", "set_quantity"}
    return actions if all(action is not None and action.action in allowed for action in actions) else None


# The catalog tags and these normalized food terms share one canonical filter set.
# The model can also select the same filters through the compact tool schema.
ATTRIBUTE_TERMS = {
    "hot": ("hot", "warm", "chaud", "caliente", "quente", "sicak", "heiss", "heiss", "heis"),
    "cold": ("cold", "chilled", "iced", "froid", "frais", "frio", "fria", "gelado", "gelada", "soguk", "kalt"),
    "chicken": ("chicken", "poulet", "hahnchen", "hahn", "pollo", "frango", "tavuk"),
    "beef": ("beef", "boeuf", "rind", "res", "ternera", "vaca", "sığır", "sigir", "dana"),
    "fish": ("fish", "poisson", "fisch", "pescado", "peixe", "balik", "tuna", "thon", "tonno", "atum"),
    "meat": ("meat", "viande", "fleisch", "carne", "etli", "et"),
    "vegetarian": ("vegetarian", "vegetarien", "vegetarisch", "vegetariano", "vegetariana", "vejetaryen", "etsiz"),
    "sweet": ("sweet", "sucre", "doux", "dulce", "doce", "tatli", "suss"),
    "light": ("light", "lighter", "leger", "leicht", "ligero", "leve", "hafif", "healthy", "saudavel", "simple"),
    "vegetable": ("vegetable", "vegetables", "legume", "gemuse", "verdura", "vegetal", "sebze"),
    "mushroom": ("mushroom", "champignon", "pilz", "seta", "cogumelo", "mantar"),
    "caffeinated": ("caffeine", "cafeine", "koffein", "cafeina", "kafein"),
}
assert set(ATTRIBUTE_TERMS) == set(MENU_ATTRIBUTES)

RECOMMEND_TERMS = ("recommend", "suggest", "good", "choose", "popular", "empfehl", "gut", "wahl",
                   "conseill", "recommand", "bon", "choisir", "recomiend", "suger", "bueno", "elegir",
                   "recomend", "sugir", "bom", "escolh", "oner", "tavsiye", "iyi", "sec")


def semantic_food_query(message: str, current_category: str) -> CompactAction | None:
    normalized = _simple(message)
    words = normalized.split()
    if re.search(r"\b(add|remove|delete|replace|change|ajout|retir|enlev|entfern|anad|agreg|quitar|"
                 r"adicion|remov|ekle|cikar)\w*\b", normalized) and not any(
                     word in words for word in ("something", "anything", "quelque", "etwas", "algo", "alguma", "bir")):
        return None
    if re.search(r"\b(looks good|sounds good|looks tasty|seems good)\b", normalized):
        return None
    category = mentioned_category(message)
    attribute = None
    if any(phrase in normalized for phrase in ("without meat", "no meat", "dont want meat", "don t want meat",
                                              "sans viande", "ohne fleisch", "sin carne", "sem carne", "etsiz")):
        attribute = "vegetarian"
    else:
        for candidate, terms in ATTRIBUTE_TERMS.items():
            if any(any(word.startswith(term) if len(term) >= 3 else word == term for word in words) for term in terms):
                attribute = candidate
                break
    if attribute is None and any(phrase in normalized for phrase in
                                 ("not something heavy", "nothing heavy", "not too heavy")):
        attribute = "light"
    recommend = any(any(word.startswith(term) for word in words) for term in RECOMMEND_TERMS)
    recommend = recommend or normalized in {"what should i get", "what should i eat", "what would you choose",
                                             "what is good here", "whats good here", "any recommendations"}
    recommend = recommend or ("should" in words and any(word in words for word in ("get", "choose", "eat", "order")))
    recommend = recommend or any(phrase in normalized for phrase in
                                  ("people usually order", "people normally order", "most people order"))
    if attribute == "sweet" and category == "desserts" and not recommend and not any(
        word in words for word in ("something", "anything", "quelque", "etwas", "algo", "alguma", "bir")):
        attribute = None
    if not attribute and not recommend:
        return None
    # A generic preference such as "light" should point to a real, relevant section.
    if attribute == "sweet" and category is None:
        category = "desserts"
    if attribute == "cold" and category is None:
        category = "drinks"
    if attribute == "hot" and category is None and current_category == "drinks":
        category = "drinks"
    if attribute in ("hot", "cold") and category is None and any(word in words for word in
                                                                  ("drink", "drinks", "boisson", "boissons", "getranke",
                                                                   "bebida", "bebidas", "icecek", "icecekler")):
        category = "drinks"
    if recommend and category is None and attribute is None:
        category = current_category
    return CompactAction(action="recommend" if recommend else "query_menu", category=category,
                         attribute=attribute)
