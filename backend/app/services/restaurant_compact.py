"""Small, explicit Restaurant intent and catalog boundary."""

import re
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.services.restaurant_tools import CATALOG, CATEGORIES, OrderSnapshot, resolve_menu_item


CompactActionName = Literal[
    "open_menu", "show_category", "show_item", "search_menu", "recommend",
    "add_item", "remove_item", "replace_item", "get_order", "get_total",
    "review_order", "back_to_menu", "start_payment", "choose_payment", "answer_only",
]


class CompactAction(BaseModel):
    model_config = ConfigDict(extra="forbid")
    action: CompactActionName
    item_query: str | None = Field(default=None, max_length=120)
    replacement_query: str | None = Field(default=None, max_length=120)
    category: Literal["mains", "salads", "soups", "desserts", "drinks"] | None = None
    payment_method: Literal["card", "cash"] | None = None


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
    simple_recommendation = (len(normalized.split()) <= 18 and bool(re.search(
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
    for category, words in _CATEGORY_WORDS.items():
        if any(re.search(rf"\b{re.escape(_simple(word))}\b", normalized) for word in words):
            return category
    return None
