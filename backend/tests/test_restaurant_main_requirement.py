"""Main-dish progression and conversational wording regressions."""

import pytest
from pydantic import ValidationError

from app.core.config import Settings
from app.services.restaurant_llm_service import RestaurantLLMService
from app.services.restaurant_tools import CATALOG, OrderLine, OrderSnapshot, RestaurantSnapshot, RestaurantToolEngine


class NoProvider:
    def respond(self, *_):
        raise AssertionError("Common Restaurant requests should use validated local actions")


def service():
    return RestaurantLLMService(Settings(), provider=NoProvider())


def state(*items, step="menuCover", category="mains"):
    lines = [OrderLine(item_id=item_id, quantity=quantity) for item_id, quantity in items]
    by_category = {key: None for key in ("mains", "salads", "soups", "desserts", "drinks")}
    for item_id, _ in items:
        by_category[CATALOG[item_id]["category"]] = item_id
    return RestaurantSnapshot(step=step, category=category,
                              unavailable="pasta" if by_category["mains"] else None,
                              order=OrderSnapshot(**by_category, lines=lines))


def assert_main_required(outcome):
    assert outcome.state.step == "menu"
    assert outcome.state.category == "mains"
    assert not any(action.type in ("REVIEW_ORDER", "CONFIRM_ORDER") for action in outcome.actions)
    assert any(action.type == "SHOW_MENU_CATEGORY" and action.category == "mains" for action in outcome.actions)
    assert outcome.reply.endswith("?")


@pytest.mark.parametrize("items,phrase", [
    (("water", 1), "Review my order."),
    (("cheesecake", 1), "I'm ready."),
    (("caesar", 1), "Review my order."),
    (("lentil", 1), "Review my order."),
    (("cheesecake", 1), "Please confirm my order."),
])
def test_side_only_orders_cannot_advance(items, phrase):
    outcome = service().chat_with_tools(phrase, "en", [], state(items))
    assert_main_required(outcome)


def test_multiple_optional_items_still_need_main_and_backend_rejects_payment():
    current = state(("cheesecake", 1), ("coffee", 2), step="menu")
    engine = RestaurantToolEngine(current, "en")
    assert engine.run("review_order", {}).reason == "main_required"
    assert engine.run("start_payment", {}).reason == "main_required"
    assert engine.snapshot.category == "mains"
    with pytest.raises(ValidationError):
        RestaurantSnapshot.model_validate({**current.model_dump(), "step": "review"})


def test_main_dish_allows_review_and_preserves_quantities():
    current = state(("pizza", 2), ("coffee", 1), step="menu")
    outcome = service().chat_with_tools("Review my order.", "en", [], current)
    assert outcome.state.step == "review"
    assert any(action.type == "REVIEW_ORDER" for action in outcome.actions)
    assert "pizza" in outcome.reply.lower()
    assert "coffee" in outcome.reply.lower()


@pytest.mark.parametrize("language,phrase,expected", [
    ("en", "Review my order.", "main dish"),
    ("fr", "Je veux voir ma commande.", "plat principal"),
    ("de", "Ich bin fertig.", "Hauptgericht"),
    ("es", "Quiero revisar mi pedido.", "plato principal"),
    ("pt", "Quero rever o meu pedido.", "prato principal"),
    ("tr", "Siparişimi kontrol etmek istiyorum.", "ana yemek"),
])
def test_review_requires_main_in_every_language(language, phrase, expected):
    outcome = service().chat_with_tools(phrase, language, [], state(("water", 1), step="menu"))
    assert_main_required(outcome)
    assert expected in outcome.reply


@pytest.mark.parametrize("phrase", [
    "What do you recommend today?",
    "What do you recommend from this menu?",
    "What would you recommend?",
    "What would you choose?",
])
def test_general_recommendation_opens_mains_and_names_available_item(phrase):
    outcome = service().chat_with_tools(phrase, "en", [], state())
    assert outcome.state.category == "mains"
    assert outcome.state.step == "menu"
    focused = [action.item_id for action in outcome.actions if action.type == "SHOW_MENU_ITEM"]
    assert focused and all(CATALOG[item_id]["category"] == "mains" for item_id in focused)
    assert CATALOG[focused[0]]["names"]["en"] in outcome.reply
    assert "special" not in outcome.reply.lower()
    assert "I can recommend a dish" not in outcome.reply


def test_general_recommendation_uses_open_category_and_varies_from_previous_reply():
    current = state(step="menu", category="drinks")
    first = service().chat_with_tools("What do you recommend?", "en", [], current)
    assert first.state.category == "drinks"
    assert "Lemonade" in first.reply
    again = service().chat_with_tools("What do you recommend?", "en",
                                      [{"role": "assistant", "content": first.reply}], first.state)
    assert again.state.category == "drinks"
    assert "Lemonade" in again.reply
    assert again.reply != first.reply


@pytest.mark.parametrize("language,phrase", [
    ("en", "What do you recommend today?"),
    ("fr", "Que recommandez-vous aujourd'hui ?"),
    ("de", "Was empfehlen Sie heute?"),
    ("es", "¿Qué recomienda hoy?"),
    ("pt", "O que recomenda hoje?"),
    ("tr", "Bugün ne önerirsiniz?"),
])
def test_general_recommendation_is_real_and_localized_in_every_language(language, phrase):
    outcome = service().chat_with_tools(phrase, language, [], state())
    assert outcome.state.category == "mains"
    focused = [action.item_id for action in outcome.actions if action.type == "SHOW_MENU_ITEM"]
    assert focused and CATALOG[focused[0]]["names"][language] in outcome.reply


def test_common_dialogue_does_not_repeat_one_acknowledgement():
    current = state()
    replies = []
    for phrase in ("Bring me the menu.", "Show me drinks.", "Recommend a drink.", "Add coffee."):
        history = [{"role": "assistant", "content": replies[-1]}] if replies else []
        outcome = service().chat_with_tools(phrase, "en", history, current)
        replies.append(outcome.reply)
        current = outcome.state
    assert current.order.quantity("coffee") == 1
    assert len({reply.split(".", 1)[0] for reply in replies}) > 1
    assert not any(reply.startswith("Of course.") for reply in replies)


def test_repeating_menu_or_category_request_changes_the_opener():
    first = service().chat_with_tools("Bring me the menu.", "en", [], state())
    second = service().chat_with_tools("Bring me the menu.", "en",
                                       [{"role": "assistant", "content": first.reply}], first.state)
    assert first.reply != second.reply
    drinks = service().chat_with_tools("Show me drinks.", "en", [], second.state)
    drinks_again = service().chat_with_tools("Show me drinks.", "en",
                                             [{"role": "assistant", "content": drinks.reply}], drinks.state)
    assert drinks.reply != drinks_again.reply
