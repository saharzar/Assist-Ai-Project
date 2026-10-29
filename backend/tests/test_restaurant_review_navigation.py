"""State-aware spoken progression through review in all supported languages."""

import pytest

from app.core.config import Settings
from app.services.restaurant_llm_service import RestaurantLLMService
from app.services.restaurant_tools import OrderLine, OrderSnapshot, RestaurantSnapshot


class NoProvider:
    def respond(self, *_):
        raise AssertionError("Navigation should use validated local actions")


def ask(message, language, *, step="menu", main=True):
    lines = [OrderLine(item_id="pizza", quantity=2)] if main else []
    lines.append(OrderLine(item_id="coffee", quantity=1))
    state = RestaurantSnapshot(step=step, category="mains", unavailable="pasta" if main else None,
                               order=OrderSnapshot(mains="pizza" if main else None, drinks="coffee", lines=lines))
    return RestaurantLLMService(Settings(), provider=NoProvider()).chat_with_tools(message, language, [], state)


NAVIGATION = [
    ("en", "I want to pay.", "I would like to confirm my order.", "I'm done.", "Show me my order."),
    ("fr", "Je veux payer.", "Je voudrais confirmer ma commande.", "J'ai fini.", "Je voudrais voir ma commande."),
    ("de", "Ich möchte bezahlen.", "Ich möchte die Bestellung bestätigen.", "Ich bin fertig.", "Zeigen Sie mir meine Bestellung."),
    ("es", "Quiero pagar.", "Quiero confirmar mi pedido.", "Ya he terminado.", "Muéstrame mi pedido."),
    ("pt", "Quero pagar.", "Quero confirmar o meu pedido.", "Terminei.", "Mostre-me o meu pedido."),
    ("tr", "Ödemek istiyorum.", "Siparişimi onaylamak istiyorum.", "Bitirdim.", "Siparişimi göster."),
]


@pytest.mark.parametrize("language,pay,confirm,done,inspect", NAVIGATION)
def test_navigation_opens_review_first_with_real_order(language, pay, confirm, done, inspect):
    for phrase in (pay, confirm, done, inspect):
        outcome = ask(phrase, language)
        assert outcome.state.step == "review", (language, phrase, outcome.reply)
        assert [action.type for action in outcome.actions] == ["REVIEW_ORDER"]
        assert "Pizza" in outcome.reply or "pizza" in outcome.reply
        assert ("₺845" if language == "tr" else "€27.00") in outcome.reply


@pytest.mark.parametrize("language,pay,confirm,done,inspect", NAVIGATION)
def test_review_confirmation_advances_but_order_inspection_does_not(language, pay, confirm, done, inspect):
    for phrase in (pay, confirm, done):
        outcome = ask(phrase, language, step="review")
        assert outcome.state.step == "success", (language, phrase, outcome.reply)
        assert outcome.state.payment_phase == "method"
        assert [action.type for action in outcome.actions] == ["CONFIRM_ORDER"]
    queried = ask(inspect, language, step="review")
    assert queried.state.step == "review"
    assert queried.actions == []
    assert "Pizza" in queried.reply or "pizza" in queried.reply


@pytest.mark.parametrize("language,pay,confirm,done,inspect", NAVIGATION)
def test_navigation_without_main_opens_mains(language, pay, confirm, done, inspect):
    for phrase in (pay, confirm, done, inspect):
        outcome = ask(phrase, language, main=False)
        assert outcome.state.step == "menu"
        assert outcome.state.category == "mains"
        assert [action.type for action in outcome.actions] == ["SHOW_MENU_CATEGORY"]
        assert outcome.reply


@pytest.mark.parametrize("language,phrase", [
    ("en", "I want to remove one pizza."),
    ("fr", "Je veux retirer une pizza."),
    ("de", "Ich möchte eine Pizza entfernen."),
    ("es", "Quiero quitar una pizza."),
    ("pt", "Quero remover uma pizza."),
    ("tr", "Bir pizzayı çıkarmak istiyorum."),
])
def test_review_edit_takes_priority_over_progress(language, phrase):
    outcome = ask(phrase, language, step="review")
    assert outcome.state.step in ("menu", "alternative", "review")
    assert outcome.state.order.quantity("pizza") == 1
    assert not any(action.type == "CONFIRM_ORDER" for action in outcome.actions)


@pytest.mark.parametrize("language,phrases", [
    ("en", ("Can we continue?", "That's everything.", "What's in my order?", "I want to order now.")),
    ("fr", ("On peut continuer ?", "C'est tout.", "Qu'est-ce que j'ai commandé ?", "Je suis prêt à payer.")),
    ("de", ("Wir können weitermachen.", "Das ist alles.", "Was habe ich bestellt?", "Ich bin bereit zu bezahlen.")),
    ("es", ("Podemos continuar.", "Eso es todo.", "¿Qué he pedido?", "Estoy listo para pagar.")),
    ("pt", ("Podemos continuar?", "É tudo.", "O que pedi?", "Estou pronto para pagar.")),
    ("tr", ("Devam edebiliriz.", "Bu kadar.", "Ne sipariş ettim?", "Ödemeye hazırım.")),
])
def test_natural_variations_open_review(language, phrases):
    for phrase in phrases:
        outcome = ask(phrase, language)
        assert outcome.state.step == "review", (language, phrase, outcome.reply)
        assert [action.type for action in outcome.actions] == ["REVIEW_ORDER"]


@pytest.mark.parametrize("phrase", ["Everything is correct.", "Looks good.", "That's my order.", "Proceed."])
def test_review_progress_variations_confirm(phrase):
    outcome = ask(phrase, "en", step="review")
    assert outcome.state.step == "success"
    assert [action.type for action in outcome.actions] == ["CONFIRM_ORDER"]


def test_payment_method_does_not_return_to_review():
    paid = ask("I want to pay.", "en", step="review")
    chosen = RestaurantLLMService(Settings(), provider=NoProvider()).chat_with_tools(
        "I want to pay by card.", "en", [], paid.state)
    assert chosen.state.step == "success"
    assert chosen.state.payment_phase == "card"
    assert [action.type for action in chosen.actions] == ["CHOOSE_PAYMENT_METHOD"]
