"""No live Groq calls: payload and intent checks for the compact waiter."""

import json
import logging

import pytest
from pydantic import SecretStr, ValidationError

from app.core.config import Settings
from app.services.restaurant_compact import CompactAction, PendingClarification, compact_candidates
from app.services.restaurant_llm_service import ModelResponse, ModelToolCall, RestaurantLLMService, compact_schema_for
from app.services.restaurant_tools import CATALOG, RestaurantSnapshot, TOOL_SCHEMAS, resolve_menu_item


def state(*, step="menu", unavailable="pasta", mains=None, drinks=None):
    return RestaurantSnapshot.model_validate({
        "step": step, "category": "mains", "unavailable": unavailable,
        "order": {"mains": mains, "drinks": drinks},
    })


class Provider:
    def __init__(self, action="answer_only", **fields):
        self.action = action
        self.fields = fields
        self.messages = None
        self.tools = None
        self.calls = 0

    def respond(self, messages, model, tools):
        self.calls += 1
        self.messages = messages
        self.tools = tools
        assert model == "qwen/qwen3.8-27b"
        return ModelResponse(None, [ModelToolCall("1", "restaurant_action", json.dumps(
            {"action": self.action, **self.fields}))])


def waiter(provider=None):
    return RestaurantLLMService(Settings(_env_file=None, groq_api_key=SecretStr("")), provider)


def test_zero_call_fast_paths_and_authoritative_total():
    provider = Provider()
    initial = state(step="menuCover", unavailable=None)
    opened = waiter(provider).chat_with_tools("Open the menu.", "en", [], initial)
    assert opened.state.step == "menu"
    assert [action.type for action in opened.actions] == ["OPEN_MENU"]
    desserts = waiter(provider).chat_with_tools("Show me desserts.", "en", [], opened.state)
    assert desserts.state.category == "desserts"
    assert provider.calls == 0


def test_clear_food_requests_do_not_depend_on_model_tool_calls():
    provider = Provider()
    added = waiter(provider).chat_with_tools("Add hamburger", "en", [], state())
    assert added.state.order.mains == "burger"
    assert "Beef burger" in added.reply
    vague = waiter(provider).chat_with_tools("Add something", "en", [], state())
    assert vague.actions == []
    assert "What would you like to add?" in vague.reply
    recommended = waiter(provider).chat_with_tools("What do u recommend to eat?", "en", [], state())
    assert "You could try" in recommended.reply
    assert recommended.actions == []
    assert provider.calls == 0
    polite = waiter(provider).chat_with_tools("Add a hamburger to my order.", "en", [], state())
    assert polite.state.order.mains == "burger"
    assert provider.calls == 0
    total = waiter(provider).chat_with_tools("How much is it?", "en", [], state(mains="pizza", drinks="water"))
    assert "€14.00" in total.reply
    assert provider.calls == 0


def test_single_schema_and_compact_add_request():
    provider = Provider("add_item", item_query="pizza")
    result = waiter(provider).chat_with_tools("I think you should add pizza", "en", [], state())
    assert result.state.order.mains == "pizza"
    assert len(provider.tools) == 1
    payload = json.dumps({"messages": provider.messages, "tools": provider.tools})
    assert len(payload.encode()) < 4000
    assert "restaurant_action" in payload
    assert "menu_index" not in payload
    assert "descriptions" not in payload
    assert "image" not in payload.lower()
    assert "soniox" not in payload.lower()
    assert "yaw" not in payload.lower()
    assert "GROQ_API_KEY" not in payload
    assert "Mushroom risotto" not in payload


def test_action_availability_changes_with_step():
    menu = compact_schema_for(state())
    payment = compact_schema_for(state(step="success", mains="pizza"))
    actions = lambda schema: schema[0]["function"]["parameters"]["properties"]["action"]["enum"]
    assert "add_item" in actions(menu)
    assert "add_item" not in actions(payment)
    assert "choose_payment" in actions(payment)


def test_remove_resolves_against_selected_order_and_unknown_item_is_safe():
    provider = Provider("remove_item", item_query="pizza")
    removed = waiter(provider).chat_with_tools("Remove pizza.", "en", [], state(mains="pizza"))
    assert removed.state.order.mains is None
    assert [action.type for action in removed.actions] == ["REMOVE_ITEM"]
    missing = waiter(Provider("add_item", item_query="unicorn soup")).chat_with_tools(
        "Add unicorn soup", "en", [], state())
    assert missing.actions == []
    assert missing.state.order.mains is None


def test_recommendation_context_contains_only_bounded_category_candidates():
    provider = Provider("recommend", category="desserts")
    result = waiter(provider).chat_with_tools("Could you compare desserts and recommend one?", "en", [], state())
    context = provider.messages[0]["content"]
    assert "candidates" in context
    assert "Cheesecake" in context
    assert "Grilled chicken" not in context
    assert len(compact_candidates("desserts", "en", "pasta")) <= 5
    assert "Cheesecake" in result.reply


def test_ambiguous_item_and_pending_choice_or_confirmation():
    provider = Provider("add_item", item_query="chicken")
    ambiguous = waiter(provider).chat_with_tools("Add chicken", "en", [], state())
    assert ambiguous.actions == []
    assert ambiguous.pending and len(ambiguous.pending.matches) > 1
    assert waiter(provider).chat_with_tools("Yes", "en", [], state(), ambiguous.pending).actions == []
    selected = waiter(provider).chat_with_tools("Grilled chicken", "en", [], state(), ambiguous.pending)
    assert selected.state.order.mains == "chicken"
    assert provider.calls == 0
    praise = waiter(Provider("add_item", item_query="pizza")).chat_with_tools("Pizza looks good", "en", [], state())
    assert praise.actions == [] and praise.pending
    confirmed = waiter(provider).chat_with_tools("Yes", "en", [], state(), praise.pending)
    assert confirmed.state.order.mains == "pizza"


def test_resolver_and_action_enum_reject_invention():
    assert resolve_menu_item("orange juice", "en")["status"] == "found"
    assert resolve_menu_item("the chicken", "en")["status"] == "ambiguous"
    assert resolve_menu_item("made-up dish", "en")["status"] == "not_found"
    with pytest.raises(ValidationError):
        CompactAction(action="delete_all_users")
    with pytest.raises(ValidationError):
        PendingClarification(action="add_item", item_query="pizza", matches=["fake-id"])
    assert len(TOOL_SCHEMAS) == 1


def test_huge_history_is_bounded_and_sensitive_history_is_redacted():
    provider = Provider()
    history = [{"role": "user" if index % 2 else "assistant", "content": "x" * 1200}
               for index in range(30)]
    history[-1]["content"] = "My card number is 4111 1111 1111 1111"
    waiter(provider).chat_with_tools("Hello", "en", history, state())
    payload = json.dumps(provider.messages)
    assert len(provider.messages) <= 6
    assert len(payload.encode()) < 10000
    assert "4111" not in payload
    assert "[payment details removed]" in payload


def test_usage_logs_only_numeric_counts_and_finite_action(caplog):
    provider = Provider("add_item", item_query="pizza")
    provider.last_usage = (1840, 47, 1887)
    with caplog.at_level(logging.INFO):
        waiter(provider).chat_with_tools("I think you should add pizza", "en", [], state())
    logs = caplog.text
    assert "restaurant_llm.input_tokens=1840" in logs
    assert "restaurant_llm.output_tokens=47" in logs
    assert "restaurant_llm.total_tokens=1887" in logs
    assert "restaurant_llm.action=add_item" in logs
    assert "you should add pizza" not in logs
    assert "GROQ_API_KEY" not in logs


def test_six_language_fast_path_and_private_catalog_resolution():
    for language, text in (("en", "Open the menu"), ("es", "Abre el menú"),
                           ("de", "Öffne die Speisekarte"), ("fr", "Ouvre le menu"),
                           ("pt", "Abra o menu"), ("tr", "Menüyü aç")):
        result = waiter().chat_with_tools(text, language, [], state(step="menuCover", unavailable=None))
        assert result.state.step == "menu"
    assert all("images" not in item for item in CATALOG.values())
