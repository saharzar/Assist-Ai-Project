"""Finite, validated Restaurant actions over the existing static training menu."""

import json
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
    "OPEN_MENU", "SHOW_MENU_CATEGORY", "SHOW_MENU_ITEM", "SELECT_ITEM", "REMOVE_ITEM",
    "REVIEW_ORDER", "CHANGE_ORDER", "CONFIRM_ORDER", "CHOOSE_PAYMENT_METHOD",
]
CATALOG = {item["id"]: item for item in json.loads(
    (Path(__file__).resolve().parent.parent / "data" / "restaurant_catalog.json").read_text(encoding="utf-8")
)["items"]}


class OrderSnapshot(BaseModel):
    model_config = ConfigDict(extra="forbid")
    mains: str | None = None
    salads: str | None = None
    soups: str | None = None
    desserts: str | None = None
    drinks: str | None = None

    @model_validator(mode="after")
    def valid_items(self):
        for category in CATEGORIES:
            item_id = getattr(self, category)
            if item_id is not None and (item_id not in CATALOG or CATALOG[item_id]["category"] != category):
                raise ValueError("Invalid order item")
        return self


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
        if self.unavailable is not None and self.order.mains == self.unavailable:
            raise ValueError("Unavailable item cannot be selected")
        if self.unavailable is None and (self.order.mains is not None or self.step in ("alternative", "alternativeCover")):
            raise ValueError("Invalid main-dish progression")
        if self.step in ("review", "success") and self.order.mains is None:
            raise ValueError("Main dish is required for this step")
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
    selected = [item_summary(item_id, language, snapshot.unavailable)
                for category in CATEGORIES if (item_id := getattr(snapshot.order, category))]
    return {"items": selected, "total_cents": sum(item["price_cents"] for item in selected),
            "currency": "TRY" if language == "tr" else "EUR"}


TOOLS = [
    ("get_menu", "Get the current authoritative menu", {}),
    ("get_menu_items", "Get items in one menu category", {"category": {"type": "string", "enum": list(CATEGORIES)}}),
    ("get_current_order", "Get the exact selected order", {}),
    ("get_order_total", "Get the exact order total", {}),
    ("open_menu", "Open the existing physical menu", {}),
    ("show_menu_category", "Open and show a menu category", {"category": {"type": "string", "enum": list(CATEGORIES)}}),
    ("show_menu_item", "Open, focus, and show a real menu item", {"item_id": {"type": "string", "enum": list(CATALOG)}}),
    ("add_order_item", "Add an explicitly requested item by ID", {"item_id": {"type": "string", "enum": list(CATALOG)}}),
    ("remove_order_item", "Remove a selected item by ID", {"item_id": {"type": "string", "enum": list(CATALOG)}}),
    ("replace_order_item", "Replace a selected item with an available item", {
        "old_item_id": {"type": "string", "enum": list(CATALOG)}, "new_item_id": {"type": "string", "enum": list(CATALOG)}}),
    ("review_order", "Move to the existing order review when a main is selected", {}),
    ("go_back_to_menu", "Return from review to the existing menu", {}),
    ("start_payment", "Confirm the reviewed order and show simulated payment", {}),
    ("choose_payment_method", "Choose a simulated payment method", {"method": {"type": "string", "enum": ["card", "cash"]}}),
]
TOOL_SCHEMAS = [
    {"type": "function", "function": {
        "name": "restaurant_action",
        "description": "Choose one restaurant action. Pass food as user words, never as an ID.",
        "parameters": {"type": "object", "properties": {
            "action": {"type": "string", "enum": [
                "open_menu", "show_category", "show_item", "search_menu", "recommend",
                "add_item", "remove_item", "replace_item", "get_order", "get_total",
                "review_order", "back_to_menu", "start_payment", "choose_payment", "answer_only"]},
            "item_query": {"type": "string"}, "replacement_query": {"type": "string"},
            "category": {"type": "string", "enum": list(CATEGORIES)},
            "payment_method": {"type": "string", "enum": ["card", "cash"]},
        }, "required": ["action"], "additionalProperties": False},
    }}
]
ARGUMENT_KEYS = {name: set(properties) for name, _, properties in TOOLS}


def _normalize_name(value: str) -> str:
    value = "".join(char for char in unicodedata.normalize("NFKD", value.casefold())
                    if not unicodedata.combining(char))
    value = re.sub(r"[^\w\s]", " ", value)
    return " ".join(value.split())


def resolve_menu_item(query: str, language: str, category: str | None = None,
                      selected: OrderSnapshot | None = None) -> dict:
    """Resolve user words to catalog IDs; never trust an ID proposed by the model."""
    if not isinstance(query, str) or not query.strip() or len(query) > 120:
        return {"status": "not_found"}
    needle = _normalize_name(query)
    articles = {"the", "a", "an", "el", "la", "los", "las", "le", "les", "un", "une", "der", "die", "das", "o", "os", "as", "bir"}
    words = needle.split()
    stripped = " ".join(words[1:]) if words and words[0] in articles else needle
    aliases = {"hamburger": "burger", "hamburgers": "burger", "hamburguesa": "burger",
               "hamburguesas": "burger", "hamburguer": "burger"}
    alias_id = aliases.get(stripped)
    if alias_id and (category is None or CATALOG[alias_id]["category"] == category) and (
        selected is None or getattr(selected, CATALOG[alias_id]["category"]) == alias_id
    ):
        return {"status": "found", "item_id": alias_id}
    candidates = []
    for item_id, item in CATALOG.items():
        if category and item["category"] != category:
            continue
        if selected is not None and getattr(selected, item["category"]) != item_id:
            continue
        names = {_normalize_name(item["names"][code]) for code in item["names"]}
        if stripped in names:
            candidates.append(item_id)
    if not candidates:
        terms = [word for word in needle.split() if word not in articles]
        if len(terms) != 1:
            return {"status": "not_found"}
        for item_id, item in CATALOG.items():
            if category and item["category"] != category:
                continue
            if selected is not None and getattr(selected, item["category"]) != item_id:
                continue
            names = {_normalize_name(item["names"][code]) for code in item["names"]}
            if any(terms[0] in name.split() for name in names):
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

    def run(self, name: str, args: dict) -> ToolResult:
        if name not in ARGUMENT_KEYS:
            return ToolResult(ok=False, reason="unsupported_tool")
        if not isinstance(args, dict) or set(args) != ARGUMENT_KEYS[name]:
            return ToolResult(ok=False, reason="invalid_arguments")
        for key, value in args.items():
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
        if name in ("add_order_item", "remove_order_item", "replace_order_item"):
            return self._change_order(name, args)
        if name == "review_order":
            if not self.snapshot.order.mains:
                return ToolResult(ok=False, reason="main_required")
            if self.snapshot.step not in ("menu", "alternative"):
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
            if self.snapshot.step in ("menu", "alternative") and self.snapshot.order.mains:
                self.snapshot.step = "review"
                self._action("REVIEW_ORDER")
                return ToolResult(ok=False, reason="review_required")
            if self.snapshot.step != "review" or not self.snapshot.order.mains:
                return ToolResult(ok=False, reason="review_required")
            self.snapshot.step = "success"
            self.snapshot.payment_phase = "method"
            self._action("CONFIRM_ORDER")
            return ToolResult(ok=True, data={"payment_phase": "method"})
        if name == "choose_payment_method":
            if self.snapshot.step == "review" and self.snapshot.order.mains:
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
        if name == "remove_order_item":
            item_id = args["item_id"]
            if getattr(self.snapshot.order, CATALOG[item_id]["category"]) != item_id:
                return ToolResult(ok=False, reason="not_selected")
        if name == "replace_order_item":
            old_id, new_id = args["old_item_id"], args["new_item_id"]
            if getattr(self.snapshot.order, CATALOG[old_id]["category"]) != old_id:
                return ToolResult(ok=False, reason="not_selected")
            if new_id == self.snapshot.unavailable:
                return ToolResult(ok=False, reason="item_unavailable")
        if name == "add_order_item" and args["item_id"] == self.snapshot.unavailable:
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
            category = CATALOG[item_id]["category"]
            if category == "mains" and self.snapshot.unavailable is None:
                self.snapshot.unavailable = item_id
                self.snapshot.step = "alternative"
                self.snapshot.category = "mains"
                self.snapshot.order.mains = None
                self._action("SELECT_ITEM", category="mains", item_id=item_id)
                return ToolResult(ok=False, reason="first_main_unavailable", data={"item": item_summary(item_id, self.language, item_id)})
            setattr(self.snapshot.order, category, item_id)
            self._action("SELECT_ITEM", category=category, item_id=item_id)
            return ToolResult(ok=True, data=order_summary(self.snapshot, self.language))
        if name == "remove_order_item":
            item_id = args["item_id"]
            category = CATALOG[item_id]["category"]
            setattr(self.snapshot.order, category, None)
            self._action("REMOVE_ITEM", category=category)
            return ToolResult(ok=True, data=order_summary(self.snapshot, self.language))
        old_id, new_id = args["old_item_id"], args["new_item_id"]
        old_category, new_category = CATALOG[old_id]["category"], CATALOG[new_id]["category"]
        if old_category != new_category:
            setattr(self.snapshot.order, old_category, None)
            self._action("REMOVE_ITEM", category=old_category)
        if new_category == "mains" and self.snapshot.unavailable is None:
            self.snapshot.unavailable = new_id
            self.snapshot.step = "alternative"
            self.snapshot.category = "mains"
            self.snapshot.order.mains = None
            self._action("SELECT_ITEM", category="mains", item_id=new_id)
            return ToolResult(ok=False, reason="first_main_unavailable", data={"item": item_summary(new_id, self.language, new_id)})
        setattr(self.snapshot.order, new_category, new_id)
        self._action("SELECT_ITEM", category=new_category, item_id=new_id)
        return ToolResult(ok=True, data=order_summary(self.snapshot, self.language))
