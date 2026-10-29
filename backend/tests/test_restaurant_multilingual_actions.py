"""Action and state regressions for natural restaurant speech in every language."""

import pytest

from app.core.config import Settings
from app.services.restaurant_llm_service import ModelResponse, RestaurantLLMService
from app.services.restaurant_tools import OrderSnapshot, RestaurantSnapshot, order_summary


class NoProvider:
    def respond(self, *_):
        return ModelResponse(content="Would you like me to add it?", tool_calls=[])


def waiter():
    return RestaurantLLMService(Settings(), provider=NoProvider())


def state(step="menuCover", *, lines=None):
    lines = lines or []
    by_category = {"mains": None, "salads": None, "soups": None, "desserts": None, "drinks": None}
    from app.services.restaurant_tools import CATALOG
    for line in lines:
        by_category[CATALOG[line["item_id"]]["category"]] = line["item_id"]
    return RestaurantSnapshot(step=step, category="mains", unavailable="chicken",
                              order=OrderSnapshot(**by_category, lines=lines))


LANGUAGES = [
    ("en", "Can I see the menu?", "Do you have desserts?", "I want two pizzas.", "Remove one pizza.", "Add one pizza.", "Review my order.", "What have I ordered?"),
    ("de", "Ich möchte die Speisekarte sehen.", "Haben Sie Desserts?", "Ich möchte zwei Pizzen.", "Entferne eine Pizza.", "Ich möchte eine Pizza.", "Ich möchte meine Bestellung prüfen.", "Was ist in meiner Bestellung?"),
    ("fr", "Je voudrais voir le menu.", "Quels desserts avez-vous ?", "Je voudrais deux pizzas.", "Retire une pizza.", "Je voudrais une pizza.", "Je veux revoir ma commande.", "Montrez-moi ma commande."),
    ("es", "Quiero ver el menú.", "¿Tienen postres?", "Quiero dos pizzas.", "Quitar una pizza.", "Quiero una pizza.", "Quiero revisar mi pedido.", "¿Qué hay en mi pedido?"),
    ("pt", "Quero ver o menu.", "Vocês têm sobremesas?", "Quero duas pizzas.", "Retirar uma pizza.", "Quero uma pizza.", "Quero rever o meu pedido.", "O que está no meu pedido?"),
    ("tr", "Menüyü görmek istiyorum.", "Tatlıları gösterir misiniz?", "İki pizza istiyorum.", "Bir pizzayı çıkar.", "Bir pizza istiyorum.", "Siparişimi gözden geçirmek istiyorum.", "Siparişimde ne var?"),
]


@pytest.mark.parametrize("language,menu,category,add,remove,add_one,review,question", LANGUAGES)
def test_language_actions_change_real_state(language, menu, category, add, remove, add_one, review, question):
    service = waiter()
    opened = service.chat_with_tools(menu, language, [], state())
    assert opened.state.step == "menu"
    assert "OPEN_MENU" in [action.type for action in opened.actions]
    desserts = service.chat_with_tools(category, language, [], opened.state)
    assert desserts.state.category == "desserts"
    assert any(action.type == "SHOW_MENU_CATEGORY" for action in desserts.actions)
    ordered = service.chat_with_tools(add, language, [], desserts.state)
    assert ordered.state.order.quantity("pizza") == 2
    assert any(action.type == "SELECT_ITEM" for action in ordered.actions)
    reduced = service.chat_with_tools(remove, language, [], ordered.state)
    assert reduced.state.order.quantity("pizza") == 1
    assert any(action.type == "SET_QUANTITY" for action in reduced.actions)
    restored = service.chat_with_tools(add_one, language, [], reduced.state)
    assert restored.state.order.quantity("pizza") == 2
    assert any(action.type == "SELECT_ITEM" for action in restored.actions)
    asked = service.chat_with_tools(question, language, [], restored.state)
    assert asked.actions == []
    assert ("two Pizzas" if language == "en" else "2 Pizza") in asked.reply
    reviewed = service.chat_with_tools(review, language, [], restored.state)
    assert reviewed.state.step == "review"
    assert any(action.type == "REVIEW_ORDER" for action in reviewed.actions)
    assert ("two Pizzas" if language == "en" else "2 Pizza") in reviewed.reply
    assert ("₺760" if language == "tr" else "€24.00") in reviewed.reply


def test_french_caesar_and_exact_review_total():
    service = waiter()
    initial = state("menu", lines=[{"item_id": "pizza", "quantity": 2},
                                   {"item_id": "water", "quantity": 3}])
    added = service.chat_with_tools("Je veux commander une salade César.", "fr", [], initial)
    assert added.state.order.quantity("caesar") == 1
    assert any(action.type == "SELECT_ITEM" and action.item_id == "caesar" for action in added.actions)
    assert "ajouté" in added.reply
    reviewed = service.chat_with_tools("Je veux revoir ma commande.", "fr", [], added.state)
    assert reviewed.state.step == "review"
    assert all(f"{count} {name}" in reviewed.reply for name, count in
               [("Pizza", 2), ("Eau", 3), ("Salade César", 1)])
    assert order_summary(reviewed.state, "fr")["total_cents"] == 3950
    assert "€39.50" in reviewed.reply


def test_quantity_edits_are_validated_and_do_not_overwrite():
    service = waiter()
    initial = state("menu", lines=[{"item_id": "pizza", "quantity": 1}])
    more = service.chat_with_tools("Add another pizza.", "en", [], initial)
    assert more.state.order.quantity("pizza") == 2
    set_three = service.chat_with_tools("Make that three pizzas.", "en", [], more.state)
    assert set_three.state.order.quantity("pizza") == 3
    changed = service.chat_with_tools("Change the two pizzas to three.", "en", [], more.state)
    assert changed.state.order.quantity("pizza") == 3
    less = service.chat_with_tools("Remove one pizza.", "en", [], set_three.state)
    assert less.state.order.quantity("pizza") == 2
    gone = service.chat_with_tools("Remove the pizzas.", "en", [], less.state)
    assert gone.state.order.quantity("pizza") == 0
    assert gone.state.order.mains is None


def test_category_word_does_not_steal_item_order_or_availability_question():
    service = waiter()
    initial = state("menu")
    ordered = service.chat_with_tools("Two Caesar salads please.", "en", [], initial)
    assert ordered.state.order.quantity("caesar") == 2
    assert any(action.type == "SELECT_ITEM" for action in ordered.actions)
    asked = service.chat_with_tools("Do you have salads?", "en", [], initial)
    assert asked.state.order.lines == []
    assert asked.state.category == "salads"


def test_invalid_quantity_does_not_add_one_instead():
    service = waiter()
    outcome = service.chat_with_tools("I need 100 waters", "en", [], state("menu"))
    assert outcome.actions == []
    assert outcome.state.order.lines == []
    assert "1 to 99" in outcome.reply


def test_unknown_item_and_interest_do_not_mutate():
    service = waiter()
    initial = state("menu")
    assert service.chat_with_tools("Add unicorn soup", "en", [], initial).actions == []
    assert service.chat_with_tools("Pizza looks good", "en", [], initial).actions == []


def test_turkish_and_french_category_regressions():
    service = waiter()
    for language, phrase in [("tr", "Tatlıları gösterir misiniz?"),
                             ("fr", "Quels desserts avez-vous ?")]:
        outcome = service.chat_with_tools(phrase, language, [], state())
        assert outcome.state.step == "menu"
        assert outcome.state.category == "desserts"
        assert [action.type for action in outcome.actions] == ["OPEN_MENU", "SHOW_MENU_CATEGORY"]
