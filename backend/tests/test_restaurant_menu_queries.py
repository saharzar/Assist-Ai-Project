"""Real catalog filtering, recommendations, and navigation in waiter conversation."""

import pytest

from app.core.config import Settings
from app.services.restaurant_llm_service import RestaurantLLMService
from app.services.restaurant_tools import CATALOG, OrderSnapshot, RestaurantSnapshot


class NoProvider:
    def respond(self, *_):
        raise AssertionError("Common menu question should use validated catalog facts")


def service():
    return RestaurantLLMService(Settings(), provider=NoProvider())


def state(step="menuCover", category="mains", unavailable="pasta"):
    return RestaurantSnapshot(step=step, category=category, unavailable=unavailable,
                              order=OrderSnapshot())


def assert_category(outcome, category):
    assert outcome.state.step in ("menu", "alternative")
    assert outcome.state.category == category
    assert any(action.type == "SHOW_MENU_CATEGORY" and action.category == category for action in outcome.actions)


def test_drink_recommendation_opens_drinks_with_real_available_items():
    outcome = service().chat_with_tools("What do you recommend for drinks?", "en", [], state())
    assert_category(outcome, "drinks")
    assert "Lemonade" in outcome.reply
    assert "recommend" in outcome.reply
    assert all(item_id in CATALOG for item_id in [action.item_id for action in outcome.actions
                                                  if action.type == "SHOW_MENU_ITEM"])


def test_menu_request_opens_and_explains_real_categories():
    outcome = service().chat_with_tools("Bring me the menu.", "en", [], state())
    assert outcome.state.step == "menu"
    assert any(action.type == "OPEN_MENU" for action in outcome.actions)
    assert all(word in outcome.reply for word in ("main dishes", "salads", "soups", "desserts", "drinks"))
    assert len(outcome.reply) > len("Of course.")


def test_hot_drinks_filter_excludes_cold_drinks():
    outcome = service().chat_with_tools("Do you have something hot to drink?", "en", [], state())
    assert_category(outcome, "drinks")
    assert all(name in outcome.reply for name in ("Tea", "Coffee", "Hot chocolate"))
    assert all(name not in outcome.reply for name in ("Water", "Orange juice", "Apple juice"))


def test_chicken_and_meat_queries_use_real_tags_and_navigate():
    chicken = service().chat_with_tools("Do you have anything with chicken?", "en", [], state())
    assert_category(chicken, "mains")
    assert all(name in chicken.reply for name in ("Grilled chicken", "Chicken wrap", "Chicken salad"))
    assert "I can recommend a dish" not in chicken.reply
    meat = service().chat_with_tools("Do you have anything with meat?", "en", [], state())
    assert_category(meat, "mains")
    assert "Beef burger" in meat.reply
    assert "Grilled steak" in meat.reply


def test_unavailable_main_is_not_added_and_suggests_similar_available_peer():
    initial = state(unavailable=None)
    outcome = service().chat_with_tools("I'd like the grilled chicken.", "en", [], initial)
    assert outcome.state.unavailable == "chicken"
    assert outcome.state.order.quantity("chicken") == 0
    assert outcome.state.step == "alternative"
    assert outcome.state.category == "mains"
    assert "Chicken wrap" in outcome.reply
    assert "isn't available" in outcome.reply
    assert "chicken" not in [line.item_id for line in outcome.state.order.lines]


def test_dessert_recommendation_opens_desserts():
    outcome = service().chat_with_tools("What dessert do you recommend?", "en", [], state())
    assert_category(outcome, "desserts")
    assert "Cheesecake" in outcome.reply


def test_common_preference_and_follow_up_questions_use_catalog_and_navigation():
    soup = service().chat_with_tools("What soup should I get?", "en", [], state())
    assert_category(soup, "soups")
    assert "recommend" in soup.reply
    cold = service().chat_with_tools("I want something cold.", "en", [], state())
    assert_category(cold, "drinks")
    assert "Lemonade" in cold.reply
    assert "Hot chocolate" not in cold.reply
    light = service().chat_with_tools("Do you have something simple?", "en", [], state())
    assert light.actions
    assert "I can recommend a dish" not in light.reply
    popular = service().chat_with_tools("What do people usually order?", "en", [], state())
    assert_category(popular, "mains")
    assert "recommend" in popular.reply
    coffee = service().chat_with_tools("Do you have coffee?", "en", [], state())
    assert_category(coffee, "drinks")
    assert "Coffee" in coffee.reply


def test_drink_follow_up_keeps_drinks_visible_and_filters_hot_items():
    initial = state("menu", "drinks")
    outcome = service().chat_with_tools("Do you have anything hot?", "en", [], initial)
    assert_category(outcome, "drinks")
    assert all(name in outcome.reply for name in ("Tea", "Coffee", "Hot chocolate"))
    assert "Orange juice" not in outcome.reply


@pytest.mark.parametrize("language,hot,chicken", [
    ("en", "Do you have hot drinks?", "Do you have anything with chicken?"),
    ("fr", "Qu'est-ce que vous avez comme boisson chaude ?", "Vous avez quelque chose avec du poulet ?"),
    ("de", "Haben Sie heiße Getränke?", "Haben Sie etwas mit Hähnchen?"),
    ("es", "¿Tienen bebidas calientes?", "¿Tienen algo con pollo?"),
    ("pt", "Tem bebidas quentes?", "Tem alguma coisa com frango?"),
    ("tr", "Sıcak içecek var mı?", "Tavuklu bir şey var mı?"),
])
def test_multilingual_attribute_queries_change_category_and_filter(language, hot, chicken):
    drinks = service().chat_with_tools(hot, language, [], state())
    assert_category(drinks, "drinks")
    assert all(CATALOG[item_id]["names"][language] in drinks.reply for item_id in ("tea", "coffee", "hotChocolate"))
    assert all(CATALOG[item_id]["names"][language] not in drinks.reply for item_id in
               ("orangeJuice", "appleJuice"))
    poultry = service().chat_with_tools(chicken, language, [], state())
    assert_category(poultry, "mains")
    assert CATALOG["wrap"]["names"][language] in poultry.reply


def test_german_dessert_recommendation_and_current_category_context():
    german = service().chat_with_tools("Was empfehlen Sie als Dessert?", "de", [], state())
    assert_category(german, "desserts")
    assert CATALOG["cheesecake"]["names"]["de"] in german.reply
    current = service().chat_with_tools("What do you recommend?", "en", [], state("menu", "desserts"))
    assert_category(current, "desserts")
    assert "Cheesecake" in current.reply


@pytest.mark.parametrize("language,question", [
    ("en", "What drink do you recommend?"),
    ("fr", "Quelle boisson recommandez-vous ?"),
    ("de", "Welches Getränk empfehlen Sie?"),
    ("es", "¿Qué bebida recomienda?"),
    ("pt", "Que bebida recomenda?"),
    ("tr", "Hangi içeceği önerirsiniz?"),
])
def test_category_recommendations_work_in_each_language(language, question):
    outcome = service().chat_with_tools(question, language, [], state())
    assert_category(outcome, "drinks")
    assert CATALOG["lemonade"]["names"][language] in outcome.reply
    assert any(action.type == "SHOW_MENU_ITEM" and action.item_id == "lemonade" for action in outcome.actions)
