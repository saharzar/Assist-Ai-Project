"""Main-dish progression and conversational wording regressions."""

import pytest
from pydantic import ValidationError

from app.core.config import Settings
from app.services.restaurant_llm_service import RestaurantLLMService, _intent_allowed
from app.services.restaurant_compact import semantic_order_request
from app.services.restaurant_tools import CATALOG, OrderLine, OrderSnapshot, RestaurantSnapshot, RestaurantToolEngine, resolve_menu_item


def test_order_snapshot_keeps_line_position_when_quantity_changes():
    order = OrderSnapshot(
        mains="pizza", drinks="water", desserts="cake",
        lines=[OrderLine(item_id="pizza", quantity=1), OrderLine(item_id="chicken", quantity=1),
               OrderLine(item_id="water", quantity=1), OrderLine(item_id="cake", quantity=1)],
    )
    original = [line.item_id for line in order.lines]
    order.set_quantity("pizza", 2)
    order.set_quantity("chicken", 5)
    assert [line.item_id for line in order.lines] == original
    assert [line.quantity for line in order.lines] == [2, 5, 1, 1]
    order.set_quantity("pizza", 0)
    order.set_quantity("pizza", 1)
    assert [line.item_id for line in order.lines] == ["chicken", "water", "cake", "pizza"]


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
    assert outcome.state.step in ("menu", "alternative")
    assert outcome.state.category == "mains"
    assert not any(action.type in ("REVIEW_ORDER", "CONFIRM_ORDER") for action in outcome.actions)
    assert any(action.type == "SHOW_MENU_CATEGORY" and action.category == "mains" for action in outcome.actions)
    assert outcome.reply.endswith("?")


@pytest.mark.parametrize("language,phrase", [
    ("en", "Show me the soups."), ("fr", "Je veux voir les soupes."),
    ("de", "Zeigen Sie mir die Suppen."), ("es", "Quiero ver las sopas."),
    ("pt", "Quero ver as sopas."), ("tr", "Çorbaları göster."),
])
def test_category_navigation_changes_real_state_in_all_languages(language, phrase):
    outcome = service().chat_with_tools(phrase, language, [], state())
    assert outcome.state.step == "menu"
    assert outcome.state.category == "soups"
    assert any(action.type == "SHOW_MENU_CATEGORY" and action.category == "soups" for action in outcome.actions)
    assert outcome.reply != ""


@pytest.mark.parametrize("language,phrase", [
    ("en", "I confirm my order."), ("fr", "Je confirme ma commande."),
    ("de", "Ich bestätige meine Bestellung."), ("es", "Confirmo mi pedido."),
    ("pt", "Confirmo o meu pedido."), ("tr", "Siparişimi onaylıyorum."),
])
def test_review_confirmation_opens_payment_in_all_languages(language, phrase):
    outcome = service().chat_with_tools(phrase, language, [], state(("pizza", 1), step="review"))
    assert outcome.state.step == "success"
    assert outcome.state.payment_phase == "method"
    assert [action.type for action in outcome.actions] == ["CONFIRM_ORDER"]
    assert outcome.reply


@pytest.mark.parametrize("language,phrase", [
    ("en", "I'm ready to pay."), ("fr", "Je suis prêt à payer."),
    ("de", "Ich möchte bezahlen."), ("es", "Quiero pagar."),
    ("pt", "Quero pagar."), ("tr", "Ödemeye hazırım."),
])
def test_ready_to_pay_is_step_aware(language, phrase):
    reviewed = service().chat_with_tools(phrase, language, [], state(("pizza", 1), step="review"))
    assert reviewed.state.step == "success"
    browsing = service().chat_with_tools(phrase, language, [], state(("pizza", 1), step="menu"))
    assert browsing.state.step == "review"
    assert not any(action.type == "CONFIRM_ORDER" for action in browsing.actions)


@pytest.mark.parametrize("language,phrase", [
    ("en", "I want to order again."), ("fr", "Je veux commander une autre fois."),
    ("de", "Ich möchte noch einmal bestellen."), ("es", "Quiero pedir otra vez."),
    ("pt", "Quero pedir novamente."), ("tr", "Tekrar sipariş vermek istiyorum."),
])
def test_completed_receipt_new_order_resets_state_in_all_languages(language, phrase):
    previous = state(("pizza", 1), ("coffee", 1), step="success")
    previous.payment_phase = "receipt"
    previous.payment_method = "card"
    outcome = service().chat_with_tools(phrase, language, [], previous)
    assert [action.type for action in outcome.actions] == ["NEW_ORDER"]
    assert outcome.state.step == "menuCover"
    assert outcome.state.order.lines == []
    assert outcome.state.payment_phase == "method"
    assert outcome.state.payment_method is None
    assert outcome.reply


def test_french_payment_choice_and_missing_main_are_validated():
    current = state(("pizza", 1), step="success")
    outcome = service().chat_with_tools("En espèces.", "fr", [], current)
    assert outcome.state.payment_phase == "cash"
    assert [action.type for action in outcome.actions] == ["CHOOSE_PAYMENT_METHOD"]
    denied = service().chat_with_tools("Je confirme ma commande.", "fr", [], state(("water", 1)))
    assert_main_required(denied)


@pytest.mark.parametrize("language,phrase,method", [
    ("en", "I'll pay by card.", "card"), ("fr", "En espèces.", "cash"),
    ("de", "Ich zahle mit Karte.", "card"), ("es", "Pago en efectivo.", "cash"),
    ("pt", "Pago com cartão.", "card"), ("tr", "Nakit ödeyeceğim.", "cash"),
])
def test_payment_choice_uses_real_payment_state_in_all_languages(language, phrase, method):
    outcome = service().chat_with_tools(phrase, language, [], state(("pizza", 1), step="success"))
    assert outcome.state.payment_phase == method
    assert [action.type for action in outcome.actions] == ["CHOOSE_PAYMENT_METHOD"]


@pytest.mark.parametrize("language,phrase", [
    ("en", "What about drinks?"), ("fr", "Et les boissons ?"),
    ("de", "Und die Getränke?"), ("es", "¿Y las bebidas?"),
    ("pt", "E as bebidas?"), ("tr", "İçecekler?"),
])
def test_short_category_follow_up_opens_drinks_in_all_languages(language, phrase):
    outcome = service().chat_with_tools(phrase, language, [], state(step="menu", category="soups"))
    assert outcome.state.category == "drinks"
    assert any(action.type == "SHOW_MENU_CATEGORY" and action.category == "drinks" for action in outcome.actions)


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


def test_generic_review_edit_preserves_order_and_asks_one_question():
    current = state(("pizza", 1), ("water", 1), step="review")
    outcome = service().chat_with_tools("I want to add something else.", "en", [], current)
    assert outcome.state.step == "menu" or outcome.state.step == "alternative"
    assert outcome.state.order.quantity("pizza") == 1
    assert outcome.state.order.quantity("water") == 1
    assert [action.type for action in outcome.actions] == ["CHANGE_ORDER"]
    assert outcome.reply.count("?") == 1


def test_review_adds_two_coffees_directly_and_opens_drinks():
    current = state(("pizza", 1), step="review")
    outcome = service().chat_with_tools("I want to add two coffees.", "en", [], current)
    assert outcome.state.step == "alternative"
    assert outcome.state.category == "drinks"
    assert outcome.state.order.quantity("pizza") == 1
    assert outcome.state.order.quantity("coffee") == 2
    assert [action.type for action in outcome.actions] == ["CHANGE_ORDER", "SHOW_MENU_CATEGORY", "SELECT_ITEM"]
    assert "coffee" in outcome.reply.lower() and "?" not in outcome.reply


def test_removing_last_main_from_review_blocks_future_review():
    current = state(("pizza", 1), ("water", 1), step="review")
    removed = service().chat_with_tools("I want to remove the pizza.", "en", [], current)
    assert removed.state.order.quantity("pizza") == 0
    assert removed.state.order.quantity("water") == 1
    assert removed.state.step == "alternative"
    blocked = service().chat_with_tools("Review my order.", "en", [], removed.state)
    assert_main_required(blocked)


def test_compound_review_edit_uses_real_quantities_and_updated_review_summary():
    current = state(("pizza", 1), ("coffee", 1), step="review")
    edited = service().chat_with_tools("Add another pizza and remove the coffee.", "en", [], current)
    assert edited.state.order.quantity("pizza") == 2
    assert edited.state.order.quantity("coffee") == 0
    reviewed = service().chat_with_tools("Review my order.", "en", [], edited.state)
    assert reviewed.state.step == "review"
    assert "€24.00" in reviewed.reply
    assert "coffee" not in reviewed.reply.lower()


@pytest.mark.parametrize("language,phrase", [
    ("en", "I want to change my order."),
    ("fr", "Je veux modifier ma commande."),
    ("de", "Ich möchte meine Bestellung ändern."),
    ("es", "Quiero cambiar mi pedido."),
    ("pt", "Quero alterar o meu pedido."),
    ("tr", "Siparişimi değiştirmek istiyorum."),
])
def test_review_edit_request_works_in_all_languages(language, phrase):
    current = state(("pizza", 1), step="review")
    outcome = service().chat_with_tools(phrase, language, [], current)
    assert outcome.state.step == "alternative"
    assert outcome.state.order.quantity("pizza") == 1
    assert [action.type for action in outcome.actions] == ["CHANGE_ORDER"]
    assert outcome.reply.endswith("?")


def test_generic_edit_reply_rotates_without_llm_call():
    current = state(("pizza", 1), step="review")
    first = service().chat_with_tools("I want to change my order.", "en", [], current)
    second = service().chat_with_tools("I want to change my order.", "en",
                                       [{"role": "assistant", "content": first.reply}], current)
    third = service().chat_with_tools("I want to change my order.", "en",
                                      [{"role": "assistant", "content": second.reply}], current)
    assert len({first.reply, second.reply, third.reply}) == 3


@pytest.mark.parametrize("language,phrase", [
    ("en", "I want another pizza."),
    ("fr", "Je veux une autre pizza."),
    ("de", "Ich möchte noch eine Pizza."),
    ("es", "Quiero otra pizza."),
    ("pt", "Quero outra pizza."),
    ("tr", "Bir pizza daha istiyorum."),
])
def test_review_adds_another_main_directly_in_all_languages(language, phrase):
    current = state(("pizza", 1), step="review")
    outcome = service().chat_with_tools(phrase, language, [], current)
    assert outcome.state.step == "alternative"
    assert outcome.state.category == "mains"
    assert outcome.state.order.quantity("pizza") == 2


@pytest.mark.parametrize("language,phrase,category", [
    ("en", "I forgot a dessert.", "desserts"),
    ("fr", "J'ai oublié une boisson.", "drinks"),
    ("de", "Ich habe ein Getränk vergessen.", "drinks"),
    ("es", "Me falta una bebida.", "drinks"),
    ("pt", "Esqueci-me de uma bebida.", "drinks"),
    ("tr", "İçecek eklemeyi unuttum.", "drinks"),
])
def test_review_missing_category_opens_it_without_losing_order(language, phrase, category):
    current = state(("pizza", 1), step="review")
    outcome = service().chat_with_tools(phrase, language, [], current)
    assert outcome.state.step == "alternative"
    assert outcome.state.category == category
    assert outcome.state.order.quantity("pizza") == 1
    assert [action.type for action in outcome.actions] == ["CHANGE_ORDER", "SHOW_MENU_CATEGORY"]


def test_french_review_can_add_two_coffees_without_clarification():
    current = state(("pizza", 1), step="review")
    outcome = service().chat_with_tools("Je voudrais deux cafés de plus.", "fr", [], current)
    assert outcome.state.category == "drinks"
    assert outcome.state.order.quantity("coffee") == 2
    assert "?" not in outcome.reply


def test_review_quantity_language_uses_same_order_lines():
    current = state(("pizza", 2), ("coffee", 1), step="review")
    decreased = service().chat_with_tools("I want to remove one pizza.", "en", [], current)
    assert decreased.state.order.quantity("pizza") == 1
    increased = service().chat_with_tools("I want two more coffees.", "en", [], decreased.state)
    assert increased.state.order.quantity("coffee") == 3


@pytest.mark.parametrize("phrase,item,quantity", [
    ("Lazanya almak istiyorum.", "lasagna", 1), ("Lazanya istiyorum.", "lasagna", 1),
    ("Bir lazanya istiyorum.", "lasagna", 1), ("Bir tane lazanya istiyorum.", "lasagna", 1),
    ("Lazanya alabilir miyim?", "lasagna", 1), ("Lazanya alayım.", "lasagna", 1),
    ("Lazanya sipariş etmek istiyorum.", "lasagna", 1), ("Lazanya sipariş vereceğim.", "lasagna", 1),
    ("Lazanya ekler misiniz?", "lasagna", 1), ("Lazanya ekle.", "lasagna", 1),
    ("Ben lazanya istiyorum.", "lasagna", 1), ("Bana bir lazanya.", "lasagna", 1),
    ("Bir lazanya lütfen.", "lasagna", 1), ("İki lazanya istiyorum.", "lasagna", 2),
    ("İki tane lazanya istiyorum.", "lasagna", 2), ("2 tane lazanya istiyorum.", "lasagna", 2),
    ("İki pizza istiyorum.", "pizza", 2), ("İki tane pizza alabilir miyim?", "pizza", 2),
    ("İki pizza ekle.", "pizza", 2), ("Bana iki pizza.", "pizza", 2),
])
def test_turkish_order_phrases_resolve_to_add_and_mutate(phrase, item, quantity):
    action = semantic_order_request(phrase, "tr", OrderSnapshot())
    assert action is not None and action.action == "add_item"
    assert resolve_menu_item(action.item_query, "tr")["item_id"] == item
    assert action.quantity == quantity
    current = state(step="menu")
    current.unavailable = "pasta"
    outcome = service().chat_with_tools(phrase, "tr", [], current)
    assert outcome.state.order.quantity(item) == quantity
    assert any(change.type == "SELECT_ITEM" for change in outcome.actions)
    assert "çıkarıldı" not in outcome.reply


@pytest.mark.parametrize("phrase,expected", [
    ("Lazanyayı çıkar.", "remove_item"), ("Lazanyayı siparişimden çıkar.", "remove_item"),
    ("Lazanyayı kaldır.", "remove_item"), ("Lazanyayı sil.", "remove_item"),
    ("Lazanyayı istemiyorum.", "remove_item"), ("Lazanyadan vazgeçtim.", "remove_item"),
    ("Lazanyayı iptal et.", "remove_item"), ("Bir lazanyayı çıkar.", "decrease_quantity"),
])
def test_turkish_removal_requires_removal_meaning(phrase, expected):
    current = state(("lasagna", 2), step="menu")
    action = semantic_order_request(phrase, "tr", current.order)
    assert action is not None and action.action == expected
    outcome = service().chat_with_tools(phrase, "tr", [], current)
    assert outcome.state.order.quantity("lasagna") == (1 if expected == "decrease_quantity" else 0)


def test_canonical_validation_rejects_reversed_turkish_model_actions():
    current = state(("lasagna", 1), step="menu")
    assert not _intent_allowed("Lazanya almak istiyorum.", [], "tr", "remove_order_item",
                               {"item_id": "lasagna"}, current)
    assert not _intent_allowed("Lazanyayı çıkar.", [], "tr", "add_order_item",
                               {"item_id": "lasagna"}, current)


@pytest.mark.parametrize("phrase,existing,expected", [
    ("Bir pizza daha.", 2, 3), ("Bir tane daha pizza.", 2, 3),
    ("İki pizza daha.", 2, 4), ("pizzayı iki yap", 1, 2),
    ("pizza sayısını üç yap", 1, 3), ("iki tane olsun", 1, 2),
])
def test_turkish_quantity_follows_cart_context(phrase, existing, expected):
    outcome = service().chat_with_tools(phrase, "tr", [], state(("pizza", existing), step="menu"))
    assert outcome.state.order.quantity("pizza") == expected


@pytest.mark.parametrize("phrase,item,quantity", [
    ("üç kahve", "coffee", 3), ("üç tane kahve", "coffee", 3),
    ("iki pizza", "pizza", 2), ("2 tane pizza", "pizza", 2),
])
def test_short_turkish_numbered_food_request_adds_item(phrase, item, quantity):
    current = state(step="menu")
    current.unavailable = "pasta"
    outcome = service().chat_with_tools(phrase, "tr", [], current)
    assert outcome.state.order.quantity(item) == quantity


def test_ambiguous_turkish_quantity_asks_which_item_then_sets_it():
    current = state(("pizza", 1), ("coffee", 1), step="menu")
    question = service().chat_with_tools("İki tane olsun.", "tr", [], current)
    assert question.state.order.quantity("pizza") == 1
    assert question.state.order.quantity("coffee") == 1
    assert question.pending is not None
    assert question.pending.action == "set_quantity" and question.pending.quantity == 2
    assert question.reply.count("?") == 1
    resolved = service().chat_with_tools("Kahve.", "tr", [], current, question.pending)
    assert resolved.state.order.quantity("coffee") == 2
    assert resolved.state.order.quantity("pizza") == 1


@pytest.mark.parametrize("phrase", [
    "Siparişimi onaylamak istiyorum.", "Siparişimi onaylıyorum.", "Siparişi onayla.",
    "Siparişim doğru.", "Evet, siparişim doğru.", "Her şey doğru.", "Her şey tamam.",
    "Bu şekilde tamam.", "Tamamdır.", "Devam edebiliriz.",
    "Ödemeye geçmek istiyorum.", "Ödemeye geçelim.", "siparisimi onaylamak istiyom",
])
def test_turkish_review_confirmation_changes_payment_state(phrase):
    outcome = service().chat_with_tools(phrase, "tr", [], state(("pizza", 1), step="review"))
    assert outcome.state.step == "success"
    assert outcome.state.payment_phase == "method"
    assert [action.type for action in outcome.actions] == ["CONFIRM_ORDER"]


@pytest.mark.parametrize("utterance,language", [
    ("Sezar salata", "tr"), ("Sezar salatası", "tr"),
    ("tavuk dürüm", "tr"), ("tavuk wrap", "tr"), ("ızgara tavuk", "tr"),
])
def test_turkish_localized_food_aliases(utterance, language):
    assert resolve_menu_item(utterance, language)["status"] == "found"


@pytest.mark.parametrize("language,one,two,remove", [
    ("en", "I want pizza.", "I want two pizzas.", "Remove the pizza."),
    ("fr", "Je voudrais une pizza.", "Je voudrais deux pizzas.", "Retirez la pizza."),
    ("de", "Ich möchte eine Pizza.", "Ich möchte zwei Pizzen.", "Entferne die Pizza."),
    ("es", "Quiero una pizza.", "Quiero dos pizzas.", "Quita la pizza."),
    ("pt", "Quero uma pizza.", "Quero duas pizzas.", "Remove a pizza."),
    ("tr", "Bir pizza istiyorum.", "İki pizza istiyorum.", "Pizzayı çıkar."),
])
def test_six_language_canonical_add_quantity_remove_matrix(language, one, two, remove):
    first = semantic_order_request(one, language, OrderSnapshot())
    second = semantic_order_request(two, language, OrderSnapshot())
    assert first is not None and first.action == "add_item" and first.quantity == 1
    assert second is not None and second.action == "add_item" and second.quantity == 2
    assert resolve_menu_item(second.item_query, language)["item_id"] == "pizza"
    current = state(step="menu")
    current.unavailable = "pasta"
    added = service().chat_with_tools(two, language, [], current)
    assert added.state.order.quantity("pizza") == 2
    removed = service().chat_with_tools(remove, language, [], added.state)
    assert removed.state.order.quantity("pizza") == 0


@pytest.mark.parametrize("language,phrase", [
    ("en", "Do you have hot drinks?"), ("fr", "Avez-vous des boissons chaudes ?"),
    ("de", "Haben Sie warme Getränke?"), ("es", "¿Tienen bebidas calientes?"),
    ("pt", "Tem bebidas quentes?"), ("tr", "Sıcak içecekler var mı?"),
])
def test_six_language_attribute_question_opens_matching_category(language, phrase):
    outcome = service().chat_with_tools(phrase, language, [], state(step="menu"))
    assert outcome.state.category == "drinks"
    assert any(action.type == "SHOW_MENU_CATEGORY" and action.category == "drinks" for action in outcome.actions)
    assert outcome.state.order.lines == []


def test_turkish_category_request_and_receipt_restart_change_state():
    category = service().chat_with_tools("Çorbaları görmek istiyorum.", "tr", [], state(step="menu"))
    assert category.state.category == "soups"
    assert any(action.type == "SHOW_MENU_CATEGORY" for action in category.actions)
    completed = state(("pizza", 1), step="success")
    completed.payment_phase = "receipt"
    restarted = service().chat_with_tools("Tekrar sipariş vermek istiyorum.", "tr", [], completed)
    assert restarted.state.step == "menuCover"
    assert restarted.state.order.lines == []
    assert [action.type for action in restarted.actions] == ["NEW_ORDER"]
