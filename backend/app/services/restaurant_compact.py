"""Small, explicit Restaurant intent and catalog boundary."""

import re
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.services.restaurant_tools import CATALOG, CATEGORIES, MENU_ATTRIBUTES, OrderSnapshot, resolve_menu_item


CompactActionName = Literal[
    "open_menu", "show_category", "show_item", "search_menu", "query_menu", "recommend",
    "add_item", "set_quantity", "decrease_quantity", "remove_item", "replace_item", "get_order", "get_total",
    "review_order", "back_to_menu", "start_payment", "choose_payment", "answer_only",
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
    action: Literal["add_item", "remove_item", "replace_item", "describe_item"]
    item_query: str = Field(min_length=1, max_length=120)
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
    return bool(re.fullmatch(
        r"(?:(?:yes|okay|ok) )?(?:(?:i|we) )?(?:confirm|confirm (?:it|my order|the order|our order))"
        r"(?: now| please)?|(?:please )?confirm (?:my|the|our) order(?: now| please)?|"
        r"(?:(?:i am|i m|im|we are|we re) )?ready to (?:confirm (?:my|the|our) order|pay)"
        r"(?: now| please)?|(?:let s |please )?(?:proceed to payment|go to payment|pay now)",
        normalized,
    ))


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
    if item["status"] == "found" and re.search(r"\b(show|see|open|montre|zeig|mostrar|goster)\w*\b", normalized):
        return CompactAction(action="show_item", item_query=CATALOG[item["item_id"]]["names"][language])
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
        return None
    item_id = any_match["item_id"]
    item_query = CATALOG[item_id]["names"][language]
    # Only explicit ordering or quantity language is permitted to mutate the cart.
    if selected_match["status"] == "found" and re.search(
        r"\b(remove|delete|retir|enlev|supprim|quitar|eliminar|entfern|weg|remover|tirar|cikar|sil)\w*\b", normalized
    ):
        quantity = requested_quantity(message)
        return CompactAction(action="decrease_quantity" if quantity or " one " in f" {normalized} " else "remove_item",
                             item_query=item_query, quantity=quantity or 1)
    if selected_match["status"] == "found" and re.search(
        r"\b(make|set|change|only|just|passe|mettre|seulement|nur|mach|cambia|deja|apenas|so|yap|olsun)\w*\b", normalized
    ) and requested_quantity(message):
        return CompactAction(action="set_quantity", item_query=item_query, quantity=requested_quantity(message, last=True))
    if re.search(r"\b(another|one more|more|encore|weiter|otro|otra|mais|daha)\b", normalized) and selected.quantity(item_id):
        return CompactAction(action="add_item", item_query=item_query, quantity=requested_quantity(message) or 1)
    if re.search(
        r"\b(want|like|take|have|get|give|add|order|need|please|veux|voudrais|commander|prends|ajout|"
        r"mochte|moechte|bestellen|nehme|bitte|fuge|anade|quiero|quisiera|dame|pedir|agrega|quero|gostaria|"
        r"pedido|adicion|istiyorum|alabilir|ekle|siparis)\w*\b", normalized
    ):
        return CompactAction(action="add_item", item_query=item_query, quantity=requested_quantity(message) or 1)
    return None


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
