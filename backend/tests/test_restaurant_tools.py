"""Phase 2 Restaurant tool validation, projection, and model isolation."""

import json

import httpx
import pytest
from pydantic import SecretStr, ValidationError

from app.core.config import Settings
from app.services.restaurant_llm_service import (
    MAX_TOOL_CALLS, GroqRestaurantLLMProvider, ModelResponse, ModelToolCall,
    RestaurantLLMFailure, RestaurantLLMService,
)
from app.services.restaurant_tools import (
    CATALOG, TOOL_SCHEMAS, RestaurantSnapshot, RestaurantToolEngine, order_summary,
)


def snapshot(*, step="menu", unavailable="pasta", mains=None, drinks=None, payment_phase="method", payment_method=None):
    return RestaurantSnapshot.model_validate({
        "step": step, "category": "mains", "unavailable": unavailable,
        "order": {"mains": mains, "salads": None, "soups": None, "desserts": None, "drinks": drinks},
        "payment_phase": payment_phase, "payment_method": payment_method,
    })


def call(name, **args):
    mapping = {
        "get_menu": "search_menu", "get_menu_items": "search_menu",
        "get_current_order": "get_order", "get_order_total": "get_total",
        "open_menu": "open_menu", "show_menu_category": "show_category",
        "show_menu_item": "show_item", "add_order_item": "add_item",
        "remove_order_item": "remove_item", "replace_order_item": "replace_item",
        "review_order": "review_order", "go_back_to_menu": "back_to_menu",
        "start_payment": "start_payment", "choose_payment_method": "choose_payment",
    }
    if name not in mapping:
        return ModelToolCall("local-call", name, json.dumps(args))
    compact = {"action": mapping[name]}
    for old, new in (("item_id", "item_query"), ("old_item_id", "item_query"),
                     ("new_item_id", "replacement_query")):
        if old in args:
            item_id = args[old]
            compact[new] = CATALOG[item_id]["names"]["en"] if item_id in CATALOG else item_id
    if "category" in args:
        compact["category"] = args["category"]
    if "method" in args:
        compact["payment_method"] = args["method"]
    return ModelToolCall("local-call", "restaurant_action", json.dumps(compact))


class StubProvider:
    def __init__(self, calls, content=None):
        self.calls = calls
        self.content = content
        self.messages = None

    def respond(self, messages, model, tools):
        self.messages = messages
        assert model == "qwen/qwen3.8-27b"
        assert len(tools) == 1
        return ModelResponse(self.content, self.calls)


def service(provider):
    return RestaurantLLMService(Settings(_env_file=None, groq_api_key=SecretStr("")), provider)


def test_catalog_has_stable_ids_localized_names_prices_and_no_unverified_dietary_flags():
    assert len(CATALOG) >= 40
    assert CATALOG["pizza"]["category"] == "mains"
    assert CATALOG["pizza"]["prices"]["EUR"] == 1200
    assert CATALOG["pizza"]["prices"]["TRY"] == 38000
    assert all(set(item["names"]) == {"en", "es", "de", "tr", "pt", "fr"} for item in CATALOG.values())
    assert all("vegetarian" not in item and "allergens" not in item for item in CATALOG.values())
    assert {tool["function"]["name"] for tool in TOOL_SCHEMAS} == {"restaurant_action"}


def test_menu_navigation_and_item_focus_actions():
    engine = RestaurantToolEngine(snapshot(step="menuCover", unavailable=None), "en")
    assert engine.run("open_menu", {}).ok
    assert engine.snapshot.step == "menu"
    assert engine.run("show_menu_category", {"category": "desserts"}).ok
    assert engine.run("show_menu_item", {"item_id": "cheesecake"}).ok
    assert [(action.type, action.category, action.item_id) for action in engine.actions] == [
        ("OPEN_MENU", None, None), ("SHOW_MENU_CATEGORY", "desserts", None),
        ("SHOW_MENU_CATEGORY", "desserts", None), ("SHOW_MENU_ITEM", None, "cheesecake"),
    ]
    assert engine.run("show_menu_item", {"item_id": "unicornSoup"}).reason == "unknown_item"
    assert engine.run("show_menu_category", {"category": "invalid"}).reason == "invalid_category"


def test_order_add_replace_remove_and_required_main_rule():
    engine = RestaurantToolEngine(snapshot(), "en")
    assert engine.run("add_order_item", {"item_id": "pizza"}).ok
    assert engine.snapshot.order.mains == "pizza"
    assert engine.run("add_order_item", {"item_id": "water"}).ok
    assert order_summary(engine.snapshot, "en")["total_cents"] == 1400
    assert engine.run("replace_order_item", {"old_item_id": "pizza", "new_item_id": "chicken"}).ok
    assert engine.snapshot.order.mains == "chicken"
    assert engine.run("remove_order_item", {"item_id": "water"}).ok
    assert engine.snapshot.order.drinks is None
    assert engine.run("remove_order_item", {"item_id": "water"}).reason == "not_selected"
    assert engine.run("review_order", {}).ok
    assert engine.snapshot.step == "review"
    assert engine.run("go_back_to_menu", {}).ok
    assert engine.snapshot.order.mains == "chicken"
    assert engine.run("remove_order_item", {"item_id": "chicken"}).ok
    assert engine.run("review_order", {}).reason == "main_required"


def test_first_main_unavailable_and_cross_category_replacement():
    engine = RestaurantToolEngine(snapshot(step="menuCover", unavailable=None), "en")
    result = engine.run("add_order_item", {"item_id": "pasta"})
    assert result.reason == "first_main_unavailable"
    assert engine.snapshot.step == "alternative"
    assert engine.snapshot.order.mains is None
    assert engine.run("add_order_item", {"item_id": "pasta"}).reason == "item_unavailable"
    assert engine.run("add_order_item", {"item_id": "pizza"}).ok
    assert engine.run("add_order_item", {"item_id": "lentil"}).ok
    assert engine.run("replace_order_item", {"old_item_id": "lentil", "new_item_id": "caesar"}).ok
    assert engine.snapshot.order.soups is None
    assert engine.snapshot.order.salads == "caesar"
    assert engine.run("replace_order_item", {"old_item_id": "steak", "new_item_id": "chicken"}).reason == "not_selected"


def test_replacing_an_optional_item_with_first_main_uses_unavailability_rule():
    engine = RestaurantToolEngine(snapshot(step="menu", unavailable=None), "en")
    assert engine.run("add_order_item", {"item_id": "lentil"}).ok
    result = engine.run("replace_order_item", {"old_item_id": "lentil", "new_item_id": "pizza"})
    assert result.reason == "first_main_unavailable"
    assert engine.snapshot.order.soups is None
    assert engine.snapshot.order.mains is None
    assert engine.snapshot.unavailable == "pizza"


def test_review_and_payment_reject_premature_or_invalid_transitions():
    engine = RestaurantToolEngine(snapshot(), "en")
    assert engine.run("review_order", {}).reason == "main_required"
    assert engine.run("start_payment", {}).reason == "review_required"
    assert engine.run("choose_payment_method", {"method": "card"}).reason == "payment_unavailable"
    assert engine.run("choose_payment_method", {"method": "crypto"}).reason == "invalid_payment_method"
    engine.run("add_order_item", {"item_id": "pizza"})
    assert engine.run("review_order", {}).ok
    assert engine.run("start_payment", {}).ok
    assert engine.snapshot.step == "success"
    assert engine.run("choose_payment_method", {"method": "cash"}).ok
    assert engine.snapshot.payment_phase == "cash"
    assert engine.snapshot.payment_method == "cash"
    assert engine.run("choose_payment_method", {"method": "card"}).reason == "payment_unavailable"


def test_payment_request_guides_to_review_and_clear_method_can_confirm_review():
    engine = RestaurantToolEngine(snapshot(mains="pizza"), "en")
    result = engine.run("start_payment", {})
    assert result.reason == "review_required"
    assert engine.snapshot.step == "review"
    assert [action.type for action in engine.actions] == ["REVIEW_ORDER"]
    assert engine.run("choose_payment_method", {"method": "card"}).ok
    assert engine.snapshot.step == "success"
    assert engine.snapshot.payment_phase == "card"
    assert [action.type for action in engine.actions][-2:] == ["CONFIRM_ORDER", "CHOOSE_PAYMENT_METHOD"]


def test_invalid_snapshot_and_arbitrary_tool_are_rejected():
    with pytest.raises(ValidationError):
        snapshot(mains="not-a-meal")
    engine = RestaurantToolEngine(snapshot(), "en")
    assert engine.run("delete_all_users", {}).reason == "unsupported_tool"
    assert engine.run("add_order_item", {"item_id": "pizza", "price": 0}).reason == "invalid_arguments"
    assert engine.run("add_order_item", {"item_id": "not-a-meal"}).reason == "unknown_item"
    assert engine.actions == []


def test_model_tool_calls_are_guarded_and_bounded():
    provider = StubProvider([call("add_order_item", item_id="pizza")])
    waiter = service(provider)
    ambiguous = waiter.chat_with_tools("Pizza looks good.", "en", [], snapshot())
    assert ambiguous.actions == []
    assert ambiguous.state.order.mains is None
    added = waiter.chat_with_tools("Add pizza.", "en", [], snapshot())
    assert added.state.order.mains == "pizza"
    assert [action.type for action in added.actions] == ["SELECT_ITEM"]
    assert "yaw" not in json.dumps(provider.messages)
    assert "camera" not in json.dumps(provider.messages).lower()
    assert "soniox" not in json.dumps(provider.messages).lower()
    overflow = service(StubProvider([call("open_menu") for _ in range(MAX_TOOL_CALLS + 1)]))
    assert overflow.chat_with_tools("Please open the menu for me", "en", [], snapshot()).actions == []
    malformed = service(StubProvider([ModelToolCall("id", "add_order_item", "{")]))
    assert malformed.chat_with_tools("I think you should add pizza", "en", [], snapshot()).actions == []
    unsupported = service(StubProvider([call("delete_all_users")]))
    assert unsupported.chat_with_tools("Hi", "en", [], snapshot()).actions == []
    unknown = service(StubProvider([call("add_order_item", item_id="sushi")]))
    missing = unknown.chat_with_tools("Add sushi", "en", [], snapshot())
    assert missing.actions == []
    assert "don't see" in missing.reply


def test_model_cannot_advance_review_or_payment_without_user_intent():
    reviewed = snapshot(step="review", mains="pizza")
    payment_model = service(StubProvider([call("start_payment")]))
    assert payment_model.chat_with_tools("Hello", "en", [], reviewed).actions == []
    paid = payment_model.chat_with_tools("I want to pay", "en", [], reviewed)
    assert [action.type for action in paid.actions] == ["CONFIRM_ORDER"]
    method_model = service(StubProvider([call("choose_payment_method", method="card")]))
    payment_screen = snapshot(step="success", mains="pizza")
    assert method_model.chat_with_tools("Hello", "en", [], payment_screen).actions == []
    assert [action.type for action in method_model.chat_with_tools("Card please", "en", [], payment_screen).actions] == ["CHOOSE_PAYMENT_METHOD"]


def test_single_compact_navigation_tool_uses_existing_menu():
    provider = StubProvider([call("show_menu_item", item_id="cheesecake")])
    outcome = service(provider).chat_with_tools("Open desserts and show cheesecake", "en", [],
                                                snapshot(step="menuCover", unavailable=None))
    assert outcome.state.step == "menu"
    assert outcome.state.category == "desserts"
    assert outcome.actions[-1].type == "SHOW_MENU_ITEM"
    assert outcome.actions[-1].item_id == "cheesecake"
    assert len(outcome.actions) <= 8


def test_sensitive_payment_input_never_reaches_provider():
    provider = StubProvider([])
    outcome = service(provider).chat_with_tools("Here is my card number 4111 1111 1111 1111", "en", [], snapshot())
    assert outcome.actions == []
    assert "don't enter real card" in outcome.reply
    assert provider.messages is None


def test_payment_details_in_recent_history_are_redacted_before_provider():
    provider = StubProvider([], "Hello.")
    service(provider).chat_with_tools("Hello", "en", [
        {"role": "user", "content": "My card number is 4111 1111 1111 1111"},
        {"role": "assistant", "content": "Please do not share that."},
    ], snapshot())
    assert "4111" not in json.dumps(provider.messages)
    assert "[payment details removed]" in json.dumps(provider.messages)


@pytest.mark.parametrize("language,message", [
    ("de", "Füge Pizza hinzu"), ("fr", "Ajoute Pizza"), ("es", "Añade pizza"),
    ("pt", "Adiciona pizza"), ("tr", "Pizza ekle"),
])
def test_clear_add_intent_works_in_all_other_restaurant_languages(language, message):
    provider = StubProvider([call("add_order_item", item_id="pizza")])
    outcome = service(provider).chat_with_tools(message, language, [], snapshot())
    assert outcome.state.order.mains == "pizza"
    assert [action.type for action in outcome.actions] == ["SELECT_ITEM"]


def test_recommendations_use_only_real_available_items_and_no_diet_claims():
    provider = StubProvider([call("get_menu_items", category="mains")])
    outcome = service(provider).chat_with_tools("Recommend a main dish", "en", [], snapshot())
    assert "pasta" not in outcome.reply.lower()  # unavailable in this scenario
    assert sum(name.lower() in outcome.reply.lower() for name in ("grilled chicken", "pizza", "vegetable rice bowl", "beef burger")) <= 3
    dietary = service(provider).chat_with_tools("I need a gluten-free meal", "en", [], snapshot())
    assert "don't have enough ingredient information" in dietary.reply
    no_tool = service(StubProvider([], "This is gluten-free.")).chat_with_tools("I need a gluten-free meal", "en", [], snapshot())
    assert "gluten-free" not in no_tool.reply


def test_order_and_total_answers_use_verified_state():
    state = snapshot(mains="pizza", drinks="water")
    order = service(StubProvider([call("get_current_order")])).chat_with_tools("What did I order?", "en", [], state)
    assert "Pizza" in order.reply and "Water" in order.reply
    total = service(StubProvider([call("get_order_total")])).chat_with_tools("How much is it?", "en", [], state)
    assert "€14.00" in total.reply
    turkish = service(StubProvider([call("get_order_total")])).chat_with_tools("Toplam ne kadar?", "tr", [], state)
    assert "₺" in turkish.reply


def test_groq_tool_response_and_failure_paths_use_mock_transport():
    requests = []

    def success(request):
        requests.append(request)
        return httpx.Response(200, json={"choices": [{"message": {"content": None, "tool_calls": [{
            "id": "call_1", "type": "function", "function": {"name": "restaurant_action", "arguments": "{\"action\":\"open_menu\"}"},
        }]}}]})

    provider = GroqRestaurantLLMProvider("configured-for-test", httpx.MockTransport(success))
    response = provider.respond([{"role": "user", "content": "Open menu"}], "qwen/qwen3.8-27b", TOOL_SCHEMAS)
    assert response.tool_calls[0].name == "restaurant_action"
    body = json.loads(requests[0].content)
    assert body["max_completion_tokens"] == 240
    assert body["tools"] == TOOL_SCHEMAS
    assert body["tool_choice"] == "auto"
    assert body["reasoning_effort"] == "none"

    for status, expected in [(429, "rate_limit"), (400, "upstream"), (401, "upstream"), (500, "upstream")]:
        failing = GroqRestaurantLLMProvider("configured-for-test", httpx.MockTransport(lambda _: httpx.Response(status)))
        with pytest.raises(RestaurantLLMFailure) as failure:
            failing.respond([], "qwen/qwen3.8-27b", TOOL_SCHEMAS)
        assert failure.value.kind == expected
        assert failure.value.upstream_status == (None if status == 429 else status)

    def timeout(request):
        raise httpx.ReadTimeout("private transport detail", request=request)

    failing = GroqRestaurantLLMProvider("configured-for-test", httpx.MockTransport(timeout))
    with pytest.raises(RestaurantLLMFailure) as failure:
        failing.respond([], "qwen/qwen3.8-27b", TOOL_SCHEMAS)
    assert failure.value.kind == "timeout"
    assert "private transport detail" not in str(failure.value)
