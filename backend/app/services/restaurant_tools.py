"""Finite, validated Restaurant actions over the existing static training menu."""

import json
from difflib import get_close_matches
import re
import unicodedata
from pathlib import Path
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator


CATEGORIES = ("mains", "salads", "soups", "desserts", "drinks")
Category = Literal["mains", "salads", "soups", "desserts", "drinks"]
Step = Literal["menuCover", "menu", "alternative", "alternativeCover", "review", "success"]
PaymentPhase = Literal["method", "card", "cash", "processing", "paid", "receipt"]
ActionType = Literal[
    "OPEN_MENU", "SHOW_MENU_CATEGORY", "SHOW_MENU_ITEM", "SELECT_ITEM", "SET_QUANTITY", "REMOVE_ITEM",
    "REVIEW_ORDER", "CHANGE_ORDER", "CONFIRM_ORDER", "CHOOSE_PAYMENT_METHOD", "NEW_ORDER",
]
CATALOG = {item["id"]: item for item in json.loads(
    (Path(__file__).resolve().parent.parent / "data" / "restaurant_catalog.json").read_text(encoding="utf-8")
)["items"]}
MENU_ATTRIBUTES = ("hot", "cold", "chicken", "beef", "fish", "meat", "vegetarian",
                   "sweet", "light", "vegetable", "mushroom", "caffeinated")
PREFERRED_RECOMMENDATIONS = {"mains": ("chicken", "pizza", "rice"),
                             "salads": ("greekSalad", "quinoaSalad", "salad"),
                             "soups": ("lentil", "tomatoSoup", "soup"),
                             "desserts": ("cheesecake", "tiramisu", "cake"),
                             "drinks": ("lemonade", "tea", "coffee")}


class OrderLine(BaseModel):
    model_config = ConfigDict(extra="forbid")
    item_id: str
    quantity: int = Field(ge=1, le=99)


class OrderSnapshot(BaseModel):
    model_config = ConfigDict(extra="forbid")
    mains: str | None = None
    salads: str | None = None
    soups: str | None = None
    desserts: str | None = None
    drinks: str | None = None
    lines: list[OrderLine] = Field(default_factory=list, max_length=47)

    @model_validator(mode="after")
    def valid_items(self):
        for category in CATEGORIES:
            item_id = getattr(self, category)
            if item_id is not None and (item_id not in CATALOG or CATALOG[item_id]["category"] != category):
                raise ValueError("Invalid order item")
        if not self.lines:
            self.lines = [OrderLine(item_id=item_id, quantity=1) for category in CATEGORIES
                          if (item_id := getattr(self, category))]
        if len({line.item_id for line in self.lines}) != len(self.lines):
            raise ValueError("Duplicate order item")
        if any(line.item_id not in CATALOG for line in self.lines):
            raise ValueError("Invalid order line")
        for category in CATEGORIES:
            ids = [line.item_id for line in self.lines if CATALOG[line.item_id]["category"] == category]
            if ids and getattr(self, category) not in ids:
                raise ValueError("Order category and lines disagree")
            if not ids and getattr(self, category) is not None:
                raise ValueError("Order category and lines disagree")
        return self

    def quantity(self, item_id: str) -> int:
        return next((line.quantity for line in self.lines if line.item_id == item_id), 0)

    def set_quantity(self, item_id: str, quantity: int) -> None:
        existing = next((index for index, line in enumerate(self.lines) if line.item_id == item_id), None)
        if existing is None:
            if quantity > 0:
                self.lines.append(OrderLine(item_id=item_id, quantity=quantity))
        elif quantity > 0:
            self.lines[existing] = OrderLine(item_id=item_id, quantity=quantity)
        else:
            self.lines.pop(existing)
        category = CATALOG[item_id]["category"]
        remaining = [line.item_id for line in self.lines if CATALOG[line.item_id]["category"] == category]
        setattr(self, category, remaining[-1] if remaining else None)


class RestaurantSnapshot(BaseModel):
    model_config = ConfigDict(extra="forbid")
    step: Step
    category: Category
    unavailable: str | None = None
    order: OrderSnapshot
    payment_phase: PaymentPhase = "method"
    payment_method: Literal["card", "cash"] | None = None

    @model_validator(mode="after")
    def valid_state(self):
        if self.unavailable is not None and (
            self.unavailable not in CATALOG or CATALOG[self.unavailable]["category"] != "mains"
        ):
            raise ValueError("Invalid unavailable item")
        if self.unavailable is not None and self.order.quantity(self.unavailable):
            raise ValueError("Unavailable item cannot be selected")
        if self.unavailable is None and (self.order.mains is not None or self.step in ("alternative", "alternativeCover")):
            raise ValueError("Invalid main-dish progression")
        if self.step in ("review", "success") and not has_main_dish(self.order):
            raise ValueError("A main dish is required for this step")
        if self.step != "success" and self.payment_phase != "method":
            raise ValueError("Invalid payment progression")
        if (self.payment_phase == "method") != (self.payment_method is None):
            raise ValueError("Invalid payment method progression")
        if self.payment_phase in ("card", "cash") and self.payment_method != self.payment_phase:
            raise ValueError("Invalid payment state")
        return self


class ApprovedAction(BaseModel):
    type: ActionType
    category: Category | None = None
    item_id: str | None = None
    method: Literal["card", "cash"] | None = None
    quantity: int | None = None


class ToolResult(BaseModel):
    ok: bool
    reason: str | None = None
    data: dict | None = None


def item_summary(item_id: str, language: str, unavailable: str | None) -> dict:
    item = CATALOG[item_id]
    currency = "TRY" if language == "tr" else "EUR"
    return {
        "id": item_id, "category": item["category"], "name": item["names"][language],
        "description": item["descriptions"][language], "price_cents": item["prices"][currency],
        "currency": currency, "available": item_id != unavailable,
    }


def order_summary(snapshot: RestaurantSnapshot, language: str) -> dict:
    selected = [{**item_summary(line.item_id, language, snapshot.unavailable), "quantity": line.quantity}
                for line in snapshot.order.lines]
    return {"items": selected, "total_cents": sum(item["price_cents"] * item["quantity"] for item in selected),
            "currency": "TRY" if language == "tr" else "EUR"}


def has_main_dish(order: OrderSnapshot) -> bool:
    return any(line.quantity > 0 and CATALOG[line.item_id]["category"] == "mains" for line in order.lines)


def menu_matches(category: str | None, attribute: str | None, unavailable: str | None) -> list[str]:
    if category is not None and category not in CATEGORIES:
        return []
    if attribute is not None and attribute not in MENU_ATTRIBUTES:
        return []
    return [item_id for item_id, item in CATALOG.items() if item_id != unavailable
            and (category is None or item["category"] == category)
            and (attribute is None or attribute in item["tags"])]


def available_alternative(item_id: str, unavailable: str | None) -> str | None:
    """Prefer a real available peer with shared food attributes; tie-break by menu order."""
    if item_id not in CATALOG:
        return None
    target = CATALOG[item_id]
    candidates = [candidate for candidate in menu_matches(target["category"], None, unavailable)
                  if candidate != item_id]
    if not candidates:
        return None
    weights = {"chicken": 8, "beef": 8, "fish": 8, "mushroom": 6, "meat": 3,
               "vegetable": 2, "sweet": 2, "light": 1, "hot": 1, "cold": 1, "savory": 1}
    target_tags = set(target["tags"])
    return max(candidates, key=lambda candidate: sum(weights.get(tag, 1) for tag in
               target_tags.intersection(CATALOG[candidate]["tags"])))


TOOLS = [
    ("get_menu", "Get the current authoritative menu", {}),
    ("get_menu_items", "Get items in one menu category", {"category": {"type": "string", "enum": list(CATEGORIES)}}),
    ("get_current_order", "Get the exact selected order", {}),
    ("get_order_total", "Get the exact order total", {}),
    ("open_menu", "Open the existing physical menu", {}),
    ("show_menu_category", "Open and show a menu category", {"category": {"type": "string", "enum": list(CATEGORIES)}}),
    ("show_menu_item", "Open, focus, and show a real menu item", {"item_id": {"type": "string", "enum": list(CATALOG)}}),
    ("add_order_item", "Add an explicitly requested item by ID", {"item_id": {"type": "string", "enum": list(CATALOG)}, "quantity": {"type": "integer"}}),
    ("set_order_quantity", "Set the total quantity of a selected item", {"item_id": {"type": "string", "enum": list(CATALOG)}, "quantity": {"type": "integer"}}),
    ("decrease_order_quantity", "Remove a number of units of a selected item", {"item_id": {"type": "string", "enum": list(CATALOG)}, "quantity": {"type": "integer"}}),
    ("remove_order_item", "Remove a selected item by ID", {"item_id": {"type": "string", "enum": list(CATALOG)}}),
    ("replace_order_item", "Replace a selected item with an available item", {
        "old_item_id": {"type": "string", "enum": list(CATALOG)}, "new_item_id": {"type": "string", "enum": list(CATALOG)}}),
    ("review_order", "Move to the existing order review when a main is selected", {}),
    ("go_back_to_menu", "Return from review to the existing menu", {}),
    ("start_payment", "Confirm the reviewed order and show simulated payment", {}),
    ("start_new_order", "Start a fresh order from a completed receipt", {}),
    ("choose_payment_method", "Choose a simulated payment method", {"method": {"type": "string", "enum": ["card", "cash"]}}),
]
TOOL_SCHEMAS = [
    {"type": "function", "function": {
        "name": "restaurant_action",
        "description": "Choose one restaurant action. Pass food as user words, never as an ID.",
        "parameters": {"type": "object", "properties": {
            "action": {"type": "string", "enum": [
                "open_menu", "show_category", "show_item", "search_menu", "query_menu", "recommend",
                "add_item", "set_quantity", "decrease_quantity", "remove_item", "replace_item", "get_order", "get_total",
                "review_order", "back_to_menu", "start_payment", "choose_payment", "answer_only"]},
            "item_query": {"type": "string"}, "replacement_query": {"type": "string"},
            "category": {"type": "string", "enum": list(CATEGORIES)},
            "attribute": {"type": "string", "enum": list(MENU_ATTRIBUTES)},
            "payment_method": {"type": "string", "enum": ["card", "cash"]},
            "quantity": {"type": "integer", "minimum": 1, "maximum": 99},
        }, "required": ["action"], "additionalProperties": False},
    }}
]
ARGUMENT_KEYS = {name: set(properties) for name, _, properties in TOOLS}


def _normalize_name(value: str) -> str:
    value = "".join(char for char in unicodedata.normalize("NFKD", value.casefold())
                    if not unicodedata.combining(char))
    value = value.replace("ı", "i")
    value = re.sub(r"[^\w\s]", " ", value)
    return " ".join(value.split())


CATALOG_LAST_TOKENS = {_normalize_name(label).split()[-1] for item in CATALOG.values()
                       for label in item["names"].values()}


def _singular(value: str) -> str:
    irregular = {"pizzen": "pizza", "pizzas": "pizza", "waters": "water", "eaux": "eau"}
    def token(word: str) -> str:
        if word in irregular:
            return irregular[word]
        for suffix in ("dan", "den", "tan", "ten", "yi", "yu", "ni", "nu", "i", "u"):
            if word.endswith(suffix) and word[:-len(suffix)] in CATALOG_LAST_TOKENS:
                return word[:-len(suffix)]
        return word[:-1] if len(word) > 3 and word.endswith("s") else word
    return " ".join(token(word) for word in value.split())


def resolve_menu_item(query: str, language: str, category: str | None = None,
                      selected: OrderSnapshot | None = None) -> dict:
    """Resolve user words to catalog IDs; never trust an ID proposed by the model."""
    if not isinstance(query, str) or not query.strip() or len(query) > 120:
        return {"status": "not_found"}
    needle = _normalize_name(query)
    # Speech often mixes a localized food name with an English catalog word.
    localized_aliases = {
        "tavuk wrap": _normalize_name(CATALOG["wrap"]["names"]["tr"]),
        "sezar salata": _normalize_name(CATALOG["caesar"]["names"]["tr"]),
    }
    for spoken, catalog_name in localized_aliases.items():
        needle = re.sub(rf"\b{re.escape(spoken)}\b", catalog_name, needle)
    articles = {"the", "a", "an", "my", "our", "el", "la", "los", "las", "le", "les", "un", "une", "der", "die", "das", "o", "os", "as", "bir"}
    words = needle.split()
    stripped = " ".join(words[1:]) if words and words[0] in articles else needle
    aliases = {"hamburger": "burger", "hamburgers": "burger", "hamburguesa": "burger",
               "hamburguesas": "burger", "hamburguer": "burger"}
    alias_id = aliases.get(stripped)
    if alias_id and (category is None or CATALOG[alias_id]["category"] == category) and (
        selected is None or selected.quantity(alias_id) > 0
    ):
        return {"status": "found", "item_id": alias_id}
    candidates = []
    for item_id, item in CATALOG.items():
        if category and item["category"] != category:
            continue
        if selected is not None and selected.quantity(item_id) == 0:
            continue
        names = {_normalize_name(item["names"][code]) for code in item["names"]}
        if stripped in names:
            candidates.append(item_id)
    if not candidates:
        # Prefer the longest complete localized name contained in natural learner speech.
        # This avoids resolving "salade César" to the generic "Salade".
        spans = []
        source = f" {_singular(needle)} "
        for item_id, item in CATALOG.items():
            if category and item["category"] != category:
                continue
            if selected is not None and selected.quantity(item_id) == 0:
                continue
            names = {_singular(_normalize_name(label)) for label in item["names"].values()}
            for label in names:
                if len(label) >= 4 and f" {label} " in source:
                    if len(label.split()) == 1:
                        before = source.split(f" {label} ", 1)[0].split()
                        if before and before[-1] not in {
                            "a", "an", "the", "la", "le", "die", "der", "das", "el", "los", "las", "one", "two", "three", "four", "five", "1", "2", "3", "4", "5",
                            "un", "une", "deux", "trois", "eine", "ein", "zwei", "drei", "uno", "una", "dos",
                            "uma", "um", "duas", "dua", "dois", "bir", "iki", "uc", "dort", "tane", "want", "like", "have", "take",
                            "get", "add", "order", "need", "me", "for", "commander", "veux", "voudrais",
                            "mochte", "quiero", "quero", "istiyorum", "ben", "please", "another", "autre", "otra", "outro", "outra", "more", "daha",
                            "many", "combien", "cuantos", "quantos", "viele", "kac", "de",
                            "show", "ajoute", "ajouter", "fuge", "anade", "adiciona", "ekle",
                            "remove", "retirez", "retirer", "entferne", "quita", "quitar", "remova", "remover", "cikar"}:
                            continue
                    spans.append((len(label), item_id))
        if spans:
            best = max(length for length, _ in spans)
            candidates = list(dict.fromkeys(item_id for length, item_id in spans if length == best))
    if not candidates:
        terms = [word for word in needle.split() if word not in articles]
        if len(terms) != 1:
            # Minor spelling variation only when there is one clear catalog name.
            choices = { _singular(_normalize_name(label)): item_id
                       for item_id, item in CATALOG.items() for label in item["names"].values()
                       if (category is None or item["category"] == category)
                       and (selected is None or selected.quantity(item_id))}
            close = get_close_matches(_singular(stripped), choices, n=2, cutoff=0.88)
            return {"status": "found", "item_id": choices[close[0]]} if len(close) == 1 else {"status": "not_found"}
        for item_id, item in CATALOG.items():
            if category and item["category"] != category:
                continue
            if selected is not None and selected.quantity(item_id) == 0:
                continue
            names = {_normalize_name(item["names"][code]) for code in item["names"]}
            if any(_singular(terms[0]) in _singular(name).split() for name in names):
                candidates.append(item_id)
    if len(candidates) == 1:
        return {"status": "found", "item_id": candidates[0]}
    if candidates:
        return {"status": "ambiguous", "matches": candidates[:5]}
    return {"status": "not_found"}


class RestaurantToolEngine:
    """Validate model-selected tools and project outcomes before UI reducers run."""

    def __init__(self, snapshot: RestaurantSnapshot, language: str):
        self.snapshot = snapshot.model_copy(deep=True)
        self.language = language
        self.actions: list[ApprovedAction] = []

    def _action(self, kind: ActionType, **fields):
        self.actions.append(ApprovedAction(type=kind, **fields))

    def _open(self):
        if self.snapshot.step == "review":
            self.snapshot.step = "alternative" if self.snapshot.unavailable else "menu"
            self._action("CHANGE_ORDER")
        if self.snapshot.step in ("menuCover", "alternativeCover"):
            self.snapshot.step = "menu" if self.snapshot.step == "menuCover" else "alternative"
            self._action("OPEN_MENU")

    def _category(self, category: str):
        if self.snapshot.step == "review":
            self.snapshot.step = "alternative" if self.snapshot.unavailable else "menu"
            self._action("CHANGE_ORDER")
        self._open()
        if self.snapshot.step not in ("menu", "alternative"):
            return ToolResult(ok=False, reason="menu_unavailable")
        self.snapshot.category = category
        self._action("SHOW_MENU_CATEGORY", category=category)
        return ToolResult(ok=True, data={"category": category})

    def query_menu(self, category: str | None, attribute: str | None, recommend: bool = False) -> ToolResult:
        if category is not None and category not in CATEGORIES:
            return ToolResult(ok=False, reason="invalid_category")
        if attribute is not None and attribute not in MENU_ATTRIBUTES:
            return ToolResult(ok=False, reason="invalid_attribute")
        matches = menu_matches(category, attribute, self.snapshot.unavailable)
        if category is None:
            counts = {group: sum(CATALOG[item_id]["category"] == group for item_id in matches)
                      for group in CATEGORIES}
            category = max(CATEGORIES, key=lambda group: counts[group]) if matches else self.snapshot.category
        opened = self._category(category)
        if not opened.ok:
            return opened
        chosen = None
        if matches:
            preferred = PREFERRED_RECOMMENDATIONS[category] if recommend and attribute is None else ()
            chosen = next((item_id for item_id in preferred if item_id in matches), None)
            if chosen is None:
                chosen = next((item_id for item_id in matches if CATALOG[item_id]["category"] == category), matches[0])
            if CATALOG[chosen]["category"] == category:
                self._action("SHOW_MENU_ITEM", item_id=chosen)
        return ToolResult(ok=True, data={"items": [item_summary(item_id, self.language, self.snapshot.unavailable)
                                                   for item_id in matches], "category": category,
                                          "recommended": chosen, "attribute": attribute})

    def run(self, name: str, args: dict) -> ToolResult:
        if name not in ARGUMENT_KEYS:
            return ToolResult(ok=False, reason="unsupported_tool")
        if name == "add_order_item" and isinstance(args, dict) and set(args) == {"item_id"}:
            args = {**args, "quantity": 1}
        if not isinstance(args, dict) or set(args) != ARGUMENT_KEYS[name]:
            return ToolResult(ok=False, reason="invalid_arguments")
        for key, value in args.items():
            if key == "quantity":
                if type(value) is not int or not 1 <= value <= 99:
                    return ToolResult(ok=False, reason="invalid_quantity")
                continue
            if not isinstance(value, str):
                return ToolResult(ok=False, reason="invalid_arguments")
            if key == "category" and value not in CATEGORIES:
                return ToolResult(ok=False, reason="invalid_category")
            if key in ("item_id", "old_item_id", "new_item_id") and value not in CATALOG:
                return ToolResult(ok=False, reason="unknown_item")
            if key == "method" and value not in ("card", "cash"):
                return ToolResult(ok=False, reason="invalid_payment_method")

        if name == "get_menu":
            return ToolResult(ok=True, data={"items": [item_summary(item_id, self.language, self.snapshot.unavailable)
                                                       for item_id in CATALOG]})
        if name == "get_menu_items":
            return ToolResult(ok=True, data={"items": [item_summary(item_id, self.language, self.snapshot.unavailable)
                                                       for item_id, item in CATALOG.items() if item["category"] == args["category"]]})
        if name == "get_current_order":
            return ToolResult(ok=True, data=order_summary(self.snapshot, self.language))
        if name == "get_order_total":
            summary = order_summary(self.snapshot, self.language)
            return ToolResult(ok=True, data={"total_cents": summary["total_cents"], "currency": summary["currency"]})
        if name == "open_menu":
            self._open()
            return ToolResult(ok=self.snapshot.step in ("menu", "alternative"),
                              reason=None if self.snapshot.step in ("menu", "alternative") else "menu_unavailable")
        if name == "show_menu_category":
            return self._category(args["category"])
        if name == "show_menu_item":
            item_id = args["item_id"]
            result = self._category(CATALOG[item_id]["category"])
            if not result.ok:
                return result
            self._action("SHOW_MENU_ITEM", item_id=item_id)
            return ToolResult(ok=True, data={"item": item_summary(item_id, self.language, self.snapshot.unavailable)})
        if name in ("add_order_item", "set_order_quantity", "decrease_order_quantity", "remove_order_item", "replace_order_item"):
            return self._change_order(name, args)
        if name == "review_order":
            if not has_main_dish(self.snapshot.order):
                self._category("mains")
                return ToolResult(ok=False, reason="main_required")
            if self.snapshot.step not in ("menuCover", "alternativeCover", "menu", "alternative"):
                return ToolResult(ok=False, reason="review_unavailable")
            self.snapshot.step = "review"
            self._action("REVIEW_ORDER")
            return ToolResult(ok=True, data=order_summary(self.snapshot, self.language))
        if name == "go_back_to_menu":
            if self.snapshot.step != "review":
                return ToolResult(ok=False, reason="not_in_review")
            self.snapshot.step = "alternative" if self.snapshot.unavailable else "menu"
            self._action("CHANGE_ORDER")
            return ToolResult(ok=True)
        if name == "start_payment":
            if not has_main_dish(self.snapshot.order):
                self._category("mains")
                return ToolResult(ok=False, reason="main_required")
            if self.snapshot.step in ("menu", "alternative"):
                self.snapshot.step = "review"
                self._action("REVIEW_ORDER")
                return ToolResult(ok=False, reason="review_required")
            if self.snapshot.step != "review":
                return ToolResult(ok=False, reason="review_required")
            self.snapshot.step = "success"
            self.snapshot.payment_phase = "method"
            self._action("CONFIRM_ORDER")
            return ToolResult(ok=True, data={"payment_phase": "method"})
        if name == "start_new_order":
            if self.snapshot.step != "success" or self.snapshot.payment_phase not in ("paid", "receipt"):
                return ToolResult(ok=False, reason="order_not_complete")
            self.snapshot = RestaurantSnapshot(step="menuCover", category="mains", order=OrderSnapshot())
            self._action("NEW_ORDER")
            return ToolResult(ok=True)
        if name == "choose_payment_method":
            if not has_main_dish(self.snapshot.order):
                self._category("mains")
                return ToolResult(ok=False, reason="main_required")
            if self.snapshot.step == "review":
                self.snapshot.step = "success"
                self.snapshot.payment_phase = "method"
                self._action("CONFIRM_ORDER")
            if self.snapshot.step != "success" or self.snapshot.payment_phase != "method":
                return ToolResult(ok=False, reason="payment_unavailable")
            self.snapshot.payment_phase = args["method"]
            self.snapshot.payment_method = args["method"]
            self._action("CHOOSE_PAYMENT_METHOD", method=args["method"])
            return ToolResult(ok=True, data={"payment_phase": self.snapshot.payment_phase})
        return ToolResult(ok=False, reason="unsupported_tool")

    def _change_order(self, name: str, args: dict) -> ToolResult:
        was_review = self.snapshot.step == "review"
        if name in ("remove_order_item", "set_order_quantity", "decrease_order_quantity"):
            item_id = args["item_id"]
            if not self.snapshot.order.quantity(item_id):
                return ToolResult(ok=False, reason="not_selected")
        if name == "replace_order_item":
            old_id, new_id = args["old_item_id"], args["new_item_id"]
            if not self.snapshot.order.quantity(old_id):
                return ToolResult(ok=False, reason="not_selected")
            if new_id == self.snapshot.unavailable:
                return ToolResult(ok=False, reason="item_unavailable")
        if name == "add_order_item" and args["item_id"] == self.snapshot.unavailable:
            self._category("mains")
            return ToolResult(ok=False, reason="item_unavailable")
        if self.snapshot.step == "review":
            self.snapshot.step = "alternative" if self.snapshot.unavailable else "menu"
            self._action("CHANGE_ORDER")
        if self.snapshot.step in ("menuCover", "alternativeCover"):
            self._open()
        if self.snapshot.step not in ("menu", "alternative"):
            return ToolResult(ok=False, reason="order_locked")
        if name == "add_order_item":
            item_id = args["item_id"]
            quantity = args["quantity"]
            category = CATALOG[item_id]["category"]
            if was_review:
                self._category(category)
            if category == "mains" and self.snapshot.unavailable is None:
                self.snapshot.unavailable = item_id
                self.snapshot.step = "alternative"
                self.snapshot.category = "mains"
                self._action("SELECT_ITEM", category="mains", item_id=item_id, quantity=quantity)
                return ToolResult(ok=False, reason="first_main_unavailable", data={"item": item_summary(item_id, self.language, item_id)})
            current = self.snapshot.order.quantity(item_id)
            if current + quantity > 99:
                return ToolResult(ok=False, reason="invalid_quantity")
            self.snapshot.order.set_quantity(item_id, current + quantity)
            self._action("SELECT_ITEM", category=category, item_id=item_id, quantity=quantity)
            return ToolResult(ok=True, data=order_summary(self.snapshot, self.language))
        if name in ("set_order_quantity", "decrease_order_quantity"):
            item_id, amount = args["item_id"], args["quantity"]
            if was_review:
                self._category(CATALOG[item_id]["category"])
            current = self.snapshot.order.quantity(item_id)
            desired = amount if name == "set_order_quantity" else max(0, current - amount)
            self.snapshot.order.set_quantity(item_id, desired)
            self._action("SET_QUANTITY", category=CATALOG[item_id]["category"], item_id=item_id,
                         quantity=desired)
            return ToolResult(ok=True, data=order_summary(self.snapshot, self.language))
        if name == "remove_order_item":
            item_id = args["item_id"]
            category = CATALOG[item_id]["category"]
            if was_review:
                self._category(category)
            self.snapshot.order.set_quantity(item_id, 0)
            self._action("REMOVE_ITEM", category=category, item_id=item_id)
            return ToolResult(ok=True, data=order_summary(self.snapshot, self.language))
        old_id, new_id = args["old_item_id"], args["new_item_id"]
        old_category, new_category = CATALOG[old_id]["category"], CATALOG[new_id]["category"]
        if old_category != new_category:
            self.snapshot.order.set_quantity(old_id, 0)
            self._action("REMOVE_ITEM", category=old_category, item_id=old_id)
        elif old_id != new_id:
            self.snapshot.order.set_quantity(old_id, 0)
            self._action("REMOVE_ITEM", category=old_category, item_id=old_id)
        if new_category == "mains" and self.snapshot.unavailable is None:
            self.snapshot.unavailable = new_id
            self.snapshot.step = "alternative"
            self.snapshot.category = "mains"
            self._action("SELECT_ITEM", category="mains", item_id=new_id)
            return ToolResult(ok=False, reason="first_main_unavailable", data={"item": item_summary(new_id, self.language, new_id)})
        self.snapshot.order.set_quantity(new_id, 1)
        self._action("SELECT_ITEM", category=new_category, item_id=new_id)
        return ToolResult(ok=True, data=order_summary(self.snapshot, self.language))
