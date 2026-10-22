"""Small, backend-only provider boundary for Restaurant waiter text chat."""

import json
import logging
import re
import unicodedata
from dataclasses import dataclass
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
from typing import Any, Protocol

import httpx

from app.core.config import Settings
from app.services.restaurant_compact import (CompactAction, PendingClarification, compact_candidates,
                                             fast_path, mentioned_category, obvious_food_request,
                                             obvious_confirmation_request, obvious_menu_request, obvious_order_change,
                                             obvious_progress_request,
                                             resolve_action_item)
from app.services.restaurant_tools import (
    CATALOG, TOOL_SCHEMAS, ApprovedAction, RestaurantSnapshot, RestaurantToolEngine,
)
from app.services.restaurant_waiter_reply import CATEGORY_NAMES, available_menu_items, name, result_reply, say


GROQ_CHAT_URL = "https://api.groq.com/openai/v1/chat/completions"
RESTAURANT_LLM_TIMEOUT_SECONDS = 12.0
MAX_WAITER_REPLY_LENGTH = 1000

LANGUAGE_NAMES = {
    "en": "English", "es": "Spanish", "de": "German", "tr": "Turkish",
    "pt": "Portuguese", "fr": "French",
}

WAITER_SYSTEM_PROMPT = (
    "You are a calm, warm, professional restaurant waiter helping an autistic adult practice ordering. "
    "Reply in the requested language with one to three short sentences and one question at a time. "
    "Use restaurant_action for menu facts or changes. Pass the user's food words in item_query, never an ID. "
    "Application state and validated actions are authoritative. Never invent menu items, prices, availability, "
    "ingredients, allergens, order or payment results. Never claim a change succeeded before validation. "
    "Praise such as 'pizza looks good' is not permission to add it; ask for confirmation. "
    "Never request real payment credentials. Do not use visual or speech metadata."
)
# Uvicorn's configured logger makes numeric diagnostics visible in the backend terminal.
logger = logging.getLogger("uvicorn.error")
MAX_CONTEXT_BYTES = 8000
BASE_ACTIONS = ("show_category", "show_item", "search_menu", "recommend", "get_order", "get_total", "answer_only")


def compact_schema_for(state: RestaurantSnapshot) -> list[dict]:
    if state.step in ("menuCover", "alternativeCover", "menu", "alternative"):
        allowed = (*BASE_ACTIONS, "open_menu", "add_item", "remove_item", "replace_item",
                   "review_order", "start_payment", "choose_payment")
    elif state.step == "review":
        allowed = (*BASE_ACTIONS, "back_to_menu", "add_item", "remove_item", "replace_item",
                   "start_payment", "choose_payment")
    else:
        allowed = (*BASE_ACTIONS, "choose_payment")
    schema = json.loads(json.dumps(TOOL_SCHEMAS[0]))
    schema["function"]["parameters"]["properties"]["action"]["enum"] = list(allowed)
    return [schema]

MAX_TOOL_CALLS = 1
SENSITIVE_PAYMENT = re.compile(
    r"(?:\b(?:\d[ -]?){12,19}\b|\b(?:cvv|cvc|pin|card number|credit card number|bank password|expiry|expiration)\b)",
    re.IGNORECASE,
)
UNVERIFIED_ORDER_CHANGE = re.compile(
    r"\b(?:i(?:['’]?ll| will|['’]?ve| have)|we(?:['’]?ll| will|['’]?ve| have))\b"
    r".{0,60}\b(?:add|added|remove|removed|change|changed|replace|replaced|select|selected)\b"
    r"|\b(?:added|removed|changed|replaced|selected|confirmed)\b.{0,60}\b(?:order|meal|dish|item)\b"
    r"|\b(?:order|meal)\b.{0,60}\bconfirmed\b",
    re.IGNORECASE,
)


@dataclass(frozen=True)
class ModelToolCall:
    id: str
    name: str
    arguments: str


@dataclass(frozen=True)
class ModelResponse:
    content: str | None
    tool_calls: list[ModelToolCall]


@dataclass(frozen=True)
class RestaurantChatOutcome:
    reply: str
    actions: list[ApprovedAction]
    state: RestaurantSnapshot
    pending: PendingClarification | None = None


class RestaurantLLMFailure(Exception):
    def __init__(self, kind: str, retry_after_seconds: int | None = None,
                 upstream_status: int | None = None):
        super().__init__(kind)
        self.kind = kind
        self.retry_after_seconds = retry_after_seconds
        self.upstream_status = upstream_status


class RestaurantLLMProvider(Protocol):
    def complete(self, messages: list[dict[str, str]], model: str) -> str: ...

    def respond(self, messages: list[dict[str, str]], model: str, tools: list[dict]) -> ModelResponse: ...


def _retry_after_seconds(value: str | None) -> int | None:
    if not value:
        return None
    if value.isascii() and value.isdecimal():
        return min(int(value), 86400)
    try:
        retry_at = parsedate_to_datetime(value)
        if retry_at.tzinfo is None:
            retry_at = retry_at.replace(tzinfo=timezone.utc)
        return max(0, min(86400, int((retry_at - datetime.now(timezone.utc)).total_seconds())))
    except (TypeError, ValueError, OverflowError):
        return None


class GroqRestaurantLLMProvider:
    def __init__(self, api_key: str, transport: httpx.BaseTransport | None = None):
        self._api_key = api_key
        self._transport = transport
        self.last_usage: tuple[int, int, int] | None = None

    def _request(self, payload: dict[str, Any]) -> dict:
        self.last_usage = None
        try:
            with httpx.Client(timeout=RESTAURANT_LLM_TIMEOUT_SECONDS, follow_redirects=False,
                              transport=self._transport) as client:
                response = client.post(
                    GROQ_CHAT_URL,
                    headers={"Authorization": f"Bearer {self._api_key}"},
                    json=payload,
                )
        except httpx.TimeoutException:
            raise RestaurantLLMFailure("timeout") from None
        except httpx.RequestError:
            raise RestaurantLLMFailure("network") from None

        if response.status_code == 429:
            raise RestaurantLLMFailure("rate_limit", _retry_after_seconds(response.headers.get("Retry-After")))
        if response.status_code != 200:
            raise RestaurantLLMFailure("upstream", upstream_status=response.status_code)
        try:
            body = response.json()
            usage = body.get("usage", {})
            if isinstance(usage, dict) and all(isinstance(usage.get(key), int) for key in
                                                  ("prompt_tokens", "completion_tokens", "total_tokens")):
                self.last_usage = (usage["prompt_tokens"], usage["completion_tokens"], usage["total_tokens"])
            return body["choices"][0]["message"]
        except (ValueError, TypeError, KeyError, IndexError):
            raise RestaurantLLMFailure("malformed") from None

    def complete(self, messages: list[dict[str, str]], model: str) -> str:
        payload = self._request({"model": model, "messages": messages, "max_completion_tokens": 256})
        reply = payload.get("content")
        if not isinstance(reply, str) or not reply.strip():
            raise RestaurantLLMFailure("malformed")
        return reply.strip()[:MAX_WAITER_REPLY_LENGTH]

    def respond(self, messages: list[dict[str, str]], model: str, tools: list[dict]) -> ModelResponse:
        payload = self._request({
            "model": model, "messages": messages, "tools": tools, "tool_choice": "auto",
            "reasoning_effort": "none", "max_completion_tokens": 240,
        })
        content = payload.get("content")
        calls = payload.get("tool_calls") or []
        if (content is not None and not isinstance(content, str)) or not isinstance(calls, list):
            raise RestaurantLLMFailure("malformed")
        parsed = []
        for call in calls:
            try:
                call_id = call["id"]
                name = call["function"]["name"]
                arguments = call["function"]["arguments"]
            except (TypeError, KeyError):
                raise RestaurantLLMFailure("malformed") from None
            if not all(isinstance(value, str) for value in (call_id, name, arguments)):
                raise RestaurantLLMFailure("malformed")
            parsed.append(ModelToolCall(call_id[:128], name[:128], arguments[:4000]))
        if not parsed and (not content or not content.strip()):
            raise RestaurantLLMFailure("malformed")
        return ModelResponse(content.strip()[:MAX_WAITER_REPLY_LENGTH] if content else None, parsed)


class RestaurantLLMService:
    def __init__(self, settings: Settings, provider: RestaurantLLMProvider | None = None):
        self._model = settings.restaurant_llm_model
        key = settings.groq_api_key.get_secret_value()
        self._provider = provider or (
            GroqRestaurantLLMProvider(key) if settings.restaurant_llm_provider == "groq" and key else None
        )

    def chat(self, message: str, language: str, history: list[dict[str, str]]) -> str:
        if self._provider is None:
            raise RestaurantLLMFailure("unavailable")
        messages = [
            {"role": "system", "content": WAITER_SYSTEM_PROMPT + f"Reply in {LANGUAGE_NAMES[language]}."},
            *history,
            {"role": "user", "content": message},
        ]
        return self._provider.complete(messages, self._model)

    def _menu_answer(self, message: str, language: str, history: list[dict[str, str]],
                     state: RestaurantSnapshot, item_ids: list[str] | None = None) -> RestaurantChatOutcome:
        """Let Groq phrase a reply using only the real menu, without granting it order actions."""
        if self._provider is None:
            raise RestaurantLLMFailure("unavailable")
        category = mentioned_category(message)
        named = item_ids if item_ids is not None else [
            item_id for item_id in CATALOG if _item_mentioned(message, language, item_id)]
        currency = "TRY" if language == "tr" else "EUR"
        if named:
            facts = [{"name": CATALOG[item_id]["names"][language],
                      "description": CATALOG[item_id]["descriptions"][language],
                      "price_cents": CATALOG[item_id]["prices"][currency],
                      "currency": currency, "available": item_id != state.unavailable}
                     for item_id in named[:5]]
        else:
            categories = [category] if category else list(CATEGORY_NAMES[language])
            facts = [{"category": CATEGORY_NAMES[language][group], "items": [
                {"name": item["names"][language], "available": item_id != state.unavailable,
                 **({"description": item["descriptions"][language],
                     "price_cents": item["prices"][currency], "currency": currency} if category else {})}
                for item_id, item in CATALOG.items() if item["category"] == group]}
                for group in categories]
        safe_history = [{"role": turn["role"], "content": (
            "[payment details removed]" if SENSITIVE_PAYMENT.search(turn["content"]) else turn["content"][:250])}
            for turn in history[-4:]]
        system = ("You are a warm, professional restaurant waiter helping an autistic adult practice ordering. "
                  f"Reply in {LANGUAGE_NAMES[language]} with one to three short, natural sentences and one question at a time. "
                  "Answer the user's menu question conversationally using only the authoritative facts below. "
                  "For a broad question, mention a few varied examples and ask which category interests them. "
                  "If the guest repeats a question, offer different verified examples or more detail instead of repeating yourself. "
                  "If recommending from a short list, describe those choices and ask which the guest prefers. "
                  "Do not list the entire menu unless asked. Do not invent prices, descriptions, ingredients or availability. "
                  "Do not claim an item was added or removed. Menu facts: "
                  + json.dumps(facts, ensure_ascii=False, separators=(",", ":")))
        reply = self._provider.complete([{"role": "system", "content": system}, *safe_history,
                                         {"role": "user", "content": message}], self._model)
        if UNVERIFIED_ORDER_CHANGE.search(reply):
            return RestaurantChatOutcome(say(language, "unclear"), [], state)
        return RestaurantChatOutcome(reply[:MAX_WAITER_REPLY_LENGTH], [], state)

    def chat_with_tools(self, message: str, language: str, history: list[dict[str, str]],
                        state: RestaurantSnapshot,
                        pending: PendingClarification | None = None) -> RestaurantChatOutcome:
        if SENSITIVE_PAYMENT.search(message):
            return RestaurantChatOutcome(say(language, "privacy"), [], state)
        if pending:
            folded = _fold(message).strip(" .!?؟")
            if folded in ("no", "no gracias", "nein", "non", "nao", "hayir"):
                return RestaurantChatOutcome(say(language, "cancelled"), [], state)
            if pending.matches:
                ordinal = {
                    "first": 0, "the first one": 0, "1": 0, "number one": 0,
                    "second": 1, "the second one": 1, "2": 1, "number two": 1,
                    "third": 2, "the third one": 2, "3": 2, "number three": 2,
                }.get(folded)
                if ordinal is None:
                    selected_position = re.fullmatch(
                        r"(?:add|choose|take|i want|i ll take) (?:the )?(first|second|third)(?: one)?", folded
                    )
                    if selected_position:
                        ordinal = {"first": 0, "second": 1, "third": 2}[selected_position.group(1)]
                choice = ({"status": "found", "item_id": pending.matches[ordinal]}
                          if ordinal is not None and ordinal < len(pending.matches)
                          else resolve_action_item(message, language))
                if choice["status"] == "found" and choice["item_id"] in pending.matches:
                    selected_query = name(choice["item_id"], language)
                    action = CompactAction(action=pending.action,
                                           item_query=selected_query if pending.clarify_field == "item"
                                           else pending.item_query,
                                           replacement_query=selected_query if pending.clarify_field == "replacement"
                                           else pending.replacement_query)
                    return self._execute(action, message, language, state, trusted=True)
                if folded in ("yes", "si", "oui", "ja", "sim", "evet"):
                    return self._clarify(language, state, pending)
            elif folded in ("yes", "si", "oui", "ja", "sim", "evet"):
                return self._execute(CompactAction(action=pending.action, item_query=pending.item_query,
                                                   replacement_query=pending.replacement_query),
                                     message, language, state, trusted=True)
        if _dietary_request(message):
            return RestaurantChatOutcome(say(language, "diet"), [], state)
        if _is_menu_question(message):
            return self._menu_answer(message, language, history, state)
        if obvious_confirmation_request(message):
            logger.info("restaurant_llm.fast_path=true action=start_payment")
            if state.step == "success":
                return RestaurantChatOutcome(say(language, "payment"), [], state)
            return self._execute(CompactAction(action="start_payment"), message, language, state, trusted=True)
        progress = obvious_progress_request(message)
        if progress:
            logger.info("restaurant_llm.fast_path=true action=%s", "review_order" if progress == "review" else "start_order")
            if progress == "start" and not state.order.mains:
                return self._execute(CompactAction(action="open_menu"), message, language, state, trusted=True)
            if state.step in ("review", "success"):
                return self._execute(CompactAction(action="get_order"), message, language, state, trusted=True)
            return self._execute(CompactAction(action="review_order"), message, language, state, trusted=True)
        direct = fast_path(message)
        if direct:
            logger.info("restaurant_llm.fast_path=true action=%s", direct.action)
            return self._execute(direct, message, language, state, trusted=True)
        change = obvious_order_change(message)
        if change:
            logger.info("restaurant_llm.fast_path=true action=%s", change.action)
            return self._execute(change, message, language, state, trusted=True)
        obvious = obvious_food_request(message)
        if obvious:
            kind, value = obvious
            logger.info("restaurant_llm.fast_path=true action=%s", kind)
            if kind == "ask_item":
                return RestaurantChatOutcome(say(language, "ask_item"), [], state)
            action = CompactAction(action=kind, item_query=value if kind == "add_item" else None,
                                   category=value if kind == "recommend" else None)
            return self._execute(action, message, language, state, trusted=True)
        menu_request = obvious_menu_request(message, language)
        if menu_request:
            logger.info("restaurant_llm.fast_path=true action=%s", menu_request.action)
            return self._execute(menu_request, message, language, state, trusted=True)
        if self._provider is None:
            raise RestaurantLLMFailure("unavailable")
        context = {"step": state.step, "category": state.category}
        selected = {category: getattr(state.order, category) for category in ("mains", "salads", "soups", "desserts", "drinks")
                    if getattr(state.order, category)}
        if selected:
            context["order"] = selected
        if state.unavailable:
            context["unavailable"] = state.unavailable
        if state.step == "success":
            context["payment"] = state.payment_phase
        if re.search(r"recommend|suggest|recom|empfehl|conseill|suger|oner", _fold(message)):
            category = mentioned_category(message) or state.category
            context["candidates"] = compact_candidates(category, language, state.unavailable)
        safe_history = [{"role": turn["role"], "content": (
            "[payment details removed]" if SENSITIVE_PAYMENT.search(turn["content"]) else turn["content"][:250])}
            for turn in history[-4:]]
        system = WAITER_SYSTEM_PROMPT + f" Language: {LANGUAGE_NAMES[language]}. Context: " + json.dumps(
            context, ensure_ascii=False, separators=(",", ":"))
        messages = [{"role": "system", "content": system}, *safe_history, {"role": "user", "content": message}]
        tools = compact_schema_for(state)
        def size() -> int:
            return len(json.dumps({"messages": messages, "tools": tools}, ensure_ascii=False).encode("utf-8"))
        while size() > MAX_CONTEXT_BYTES and safe_history:
            safe_history.pop(0)
            messages = [{"role": "system", "content": system}, *safe_history, {"role": "user", "content": message}]
        if size() > MAX_CONTEXT_BYTES and "candidates" in context:
            del context["candidates"]
            system = WAITER_SYSTEM_PROMPT + f" Language: {LANGUAGE_NAMES[language]}. Context: " + json.dumps(
                context, ensure_ascii=False, separators=(",", ":"))
            messages[0]["content"] = system
        if size() > MAX_CONTEXT_BYTES:
            raise RestaurantLLMFailure("payload_too_large")
        model = self._provider.respond(messages, self._model, tools)
        usage = getattr(self._provider, "last_usage", None)
        if usage:
            logger.info("restaurant_llm.input_tokens=%d restaurant_llm.output_tokens=%d "
                        "restaurant_llm.total_tokens=%d restaurant_llm.fast_path=false",
                        usage[0], usage[1], usage[2])
            if usage[0] > 4000:
                logger.warning("Restaurant LLM prompt unexpectedly large input_tokens=%d", usage[0])
        if len(model.tool_calls) != MAX_TOOL_CALLS:
            if not model.tool_calls and _needs_authoritative_menu_fact(message) and not _is_order_change_request(message):
                return self._menu_answer(message, language, history, state)
            if model.tool_calls or _looks_like_action_request(message):
                return RestaurantChatOutcome(say(language, "unclear"), [], state)
            if model.content and UNVERIFIED_ORDER_CHANGE.search(model.content):
                return RestaurantChatOutcome(say(language, "unclear"), [], state)
            return RestaurantChatOutcome(model.content or say(language, "unclear"), [], state)
        call = model.tool_calls[0]
        if call.name != "restaurant_action":
            return RestaurantChatOutcome(say(language, "unclear"), [], state)
        try:
            action = CompactAction.model_validate(json.loads(call.arguments))
        except (ValueError, TypeError):
            return RestaurantChatOutcome(say(language, "unclear"), [], state)
        if action.action not in tools[0]["function"]["parameters"]["properties"]["action"]["enum"]:
            return RestaurantChatOutcome(say(language, "unclear"), [], state)
        logger.info("restaurant_llm.action=%s", action.action)
        if action.action == "answer_only":
            if action.item_query:
                found = resolve_action_item(action.item_query, language)
                if found["status"] == "found" and _item_mentioned(message, language, found["item_id"]):
                    if _intent_allowed(message, [], language, "add_order_item",
                                       {"item_id": found["item_id"]}, state):
                        return self._execute(CompactAction(action="add_item", item_query=action.item_query),
                                             message, language, state)
                    pending = PendingClarification(action="add_item", item_query=action.item_query)
                    return RestaurantChatOutcome(say(language, "confirm_add", item=name(found["item_id"], language)),
                                                 [], state, pending)
            if _needs_authoritative_menu_fact(message) and not _is_order_change_request(message):
                return self._menu_answer(message, language, history, state)
            if _looks_like_action_request(message):
                return RestaurantChatOutcome(say(language, "unclear"), [], state)
            if model.content and not UNVERIFIED_ORDER_CHANGE.search(model.content) and not re.search(
                r"\b(paid|processed)\b", _fold(model.content)
            ):
                return RestaurantChatOutcome(model.content, [], state)
            return RestaurantChatOutcome(say(language, "unclear"), [], state)
        return self._execute(action, message, language, state)

    def _clarify(self, language: str, state: RestaurantSnapshot,
                 pending: PendingClarification) -> RestaurantChatOutcome:
        choices = ", ".join(name(item_id, language) for item_id in pending.matches)
        return RestaurantChatOutcome(say(language, "clarify", items=choices), [], state, pending)

    def _execute(self, action: CompactAction, message: str, language: str,
                 state: RestaurantSnapshot, trusted: bool = False) -> RestaurantChatOutcome:
        mapping = {"open_menu": "open_menu", "show_category": "show_menu_category",
                   "show_item": "show_menu_item", "search_menu": "get_menu_items", "recommend": "get_menu_items",
                   "add_item": "add_order_item", "remove_item": "remove_order_item",
                   "replace_item": "replace_order_item", "get_order": "get_current_order",
                   "get_total": "get_order_total", "review_order": "review_order",
                   "back_to_menu": "go_back_to_menu", "start_payment": "start_payment",
                   "choose_payment": "choose_payment_method"}
        if action.action == "answer_only":
            return RestaurantChatOutcome(say(language, "unclear"), [], state)
        tool = mapping.get(action.action)
        if tool is None:
            return RestaurantChatOutcome(say(language, "unclear"), [], state)
        args: dict[str, str] = {}
        if tool in ("show_menu_category", "get_menu_items"):
            category = action.category or mentioned_category(message) or state.category
            args = {"category": category}
        elif tool == "choose_payment_method":
            if action.payment_method is None:
                return RestaurantChatOutcome(say(language, "unclear"), [], state)
            args = {"method": action.payment_method}
        elif tool in ("show_menu_item", "add_order_item", "remove_order_item", "replace_order_item"):
            if not action.item_query:
                return RestaurantChatOutcome(say(language, "unclear"), [], state)
            selected = state.order if tool in ("remove_order_item", "replace_order_item") else None
            found = resolve_action_item(action.item_query, language, order=selected)
            if selected is not None and found["status"] == "not_found":
                found = resolve_action_item(action.item_query, language)
            if found["status"] == "ambiguous":
                return self._clarify(language, state, PendingClarification(
                    action=action.action, item_query=action.item_query,
                    replacement_query=action.replacement_query, matches=found["matches"],
                    clarify_field="item"))
            if found["status"] != "found":
                return RestaurantChatOutcome(say(language, "not_found"), [], state)
            args = {"item_id": found["item_id"]}
            if tool == "replace_order_item":
                if not action.replacement_query:
                    return RestaurantChatOutcome(say(language, "unclear"), [], state)
                replacement = resolve_action_item(action.replacement_query, language)
                if replacement["status"] == "ambiguous":
                    return self._clarify(language, state, PendingClarification(
                        action="replace_item", item_query=action.item_query,
                        replacement_query=action.replacement_query, matches=replacement["matches"],
                        clarify_field="replacement"))
                if replacement["status"] != "found":
                    return RestaurantChatOutcome(say(language, "not_found"), [], state)
                args = {"old_item_id": found["item_id"], "new_item_id": replacement["item_id"]}
        if not trusted and not _intent_allowed(message, [], language, tool, args, state):
            if tool == "add_order_item" and args.get("item_id"):
                pending = PendingClarification(action="add_item", item_query=action.item_query)
                return RestaurantChatOutcome(say(language, "confirm_add", item=name(args["item_id"], language)),
                                             [], state, pending)
            return RestaurantChatOutcome(say(language, "unclear"), [], state)
        engine = RestaurantToolEngine(state, language)
        result = engine.run(tool, args)
        reply = result_reply(language, tool, args, result, engine.snapshot, message)
        if result.ok and tool in ("get_menu", "get_menu_items", "show_menu_category", "show_menu_item") and self._provider:
            try:
                reply = self._menu_answer(message, language, [], engine.snapshot).reply
            except RestaurantLLMFailure:
                logger.warning("restaurant_llm_menu_reply_failed; using validated menu response")
        if action.action == "recommend" and result.ok:
            # Only validated available candidates can be recommended or selected by a follow-up.
            matches = [item["id"] for item in available_menu_items(result, message)[:2]]
            if matches and self._provider:
                try:
                    reply = self._menu_answer(message, language, [], engine.snapshot, matches).reply
                except RestaurantLLMFailure:
                    reply = result_reply(language, tool, args, result, engine.snapshot, "recommend " + message)
            else:
                reply = result_reply(language, tool, args, result, engine.snapshot, "recommend " + message)
            pending = (PendingClarification(action="add_item", item_query=name(matches[0], language), matches=matches)
                       if matches and engine.snapshot.step != "success" else None)
            return RestaurantChatOutcome(reply[:MAX_WAITER_REPLY_LENGTH], engine.actions, engine.snapshot, pending)
        return RestaurantChatOutcome(reply[:MAX_WAITER_REPLY_LENGTH], engine.actions, engine.snapshot)


def _fold(value: str) -> str:
    return "".join(character for character in unicodedata.normalize("NFKD", value.casefold())
                   if not unicodedata.combining(character))


ACTION_WORDS = re.compile(
    r"\b(add|take|want|give|have|remove|change|replace|switch|pay|review|done|confirm|"
    r"anadir|agregar|quiero|quitar|cambiar|pagar|revisar|"
    r"ajouter|prendre|retirer|enlever|changer|payer|verifier|"
    r"hinzufugen|nehmen|entfernen|ersetzen|zahlen|prufen|"
    r"adicionar|quero|retirar|trocar|pagar|rever|"
    r"ekle|istiyorum|cikar|degistir|ode|incele)\b", re.IGNORECASE,
)


def _is_order_change_request(message: str) -> bool:
    return bool(re.search(r"\b(add|remove|delete|replace|switch|change|take off|pay|review|"
                          r"anadir|agregar|quitar|cambiar|pagar|ajouter|retirer|enlever|"
                          r"hinzufugen|entfernen|ersetzen|zahlen|adicionar|retirar|"
                          r"ekle|cikar|degistir|ode)\b", _fold(message)))


def _is_menu_question(message: str) -> bool:
    if _is_order_change_request(message):
        return False
    folded = _fold(message)
    if re.search(r"\b(my order|my total|my bill|my basket)\b", folded):
        return False
    return bool(re.search(
        r"\b(?:what (?:do you have|else do you have|else is available|other dishes do you have|"
        r"have you got|do you serve|options do you have|food do you have|"
        r"are your options|is available|is on the menu|s on the menu|can i order)|"
        r"can you tell me what you have|more options|anything else|"
        r"what kinds? of (?:food|dishes|meals|drinks) do you have|"
        r"tell me (?:about|what is on) (?:the|your) menu|tell me the menu|"
        r"que (?:tienen|hay|ofrecen)|was (?:habt ihr|gibt es)|"
        r"qu (?:avez vous|est ce que vous avez)|o que (?:tem|voc s tem)|"
        r"neler var|ne var)\b", folded))


def _looks_like_action_request(message: str) -> bool:
    return bool(ACTION_WORDS.search(_fold(message)))


def _dietary_request(message: str) -> bool:
    return bool(re.search(r"\b(gluten|vegetarian|vegan|meat.free|no meat|sans viande|sin carne|sem carne|"
                          r"fleischfrei|etsiz|glutensiz|allerg\w*|light|leicht|ligero|leger|leve|hafif)\b", _fold(message)))


def _needs_authoritative_menu_fact(message: str) -> bool:
    return bool(re.search(r"\b(menu|show|see|dish\w*|food|what do you have|order|ordered|total|price|cost|how much|recommend\w*|suggest\w*|ingredient\w*|"
                          r"menu|pedido|precio|recom\w*|commande|prix|conseill\w*|"
                          r"speisekarte|bestellung|preis|wie viel|empfehl\w*|ementa|preco|quanto|suger\w*|"
                          r"menu|siparis|fiyat|ne kadar|oner\w*|cuanto|combien)\b", _fold(message))) or _dietary_request(message)


def _item_mentioned(message: str, language: str, item_id: str) -> bool:
    if item_id not in CATALOG:
        return False
    folded = _fold(message)
    if item_id == "burger" and re.search(r"\b(hamburger\w*|hamburguesa\w*|hamburguer\w*)\b", folded):
        return True
    return bool(re.search(rf"\b{re.escape(_fold(CATALOG[item_id]['names'][language]))}\b", folded))


def _intent_allowed(message: str, history: list[dict[str, str]], language: str,
                    tool: str, args: dict, state: RestaurantSnapshot) -> bool:
    folded = _fold(message)
    payment_intent = bool(re.search(r"\b(pay\w*|card|cash|pagar\w*|tarjeta|efectivo|payer\w*|carte|especes|"
                                    r"zahl\w*|karte|bargeld|cartao|dinheiro|od\w*|kart|nakit)\b", folded))
    if tool == "start_payment":
        return payment_intent or bool(re.search(r"\b(confirm\w*|confirmed)\b", folded))
    if tool == "choose_payment_method":
        method = args.get("method")
        words = ("card", "tarjeta", "carte", "karte", "cartao", "kart") if method == "card" else (
            "cash", "efectivo", "especes", "bargeld", "dinheiro", "nakit")
        return payment_intent and any(re.search(rf"\b{word}\b", folded) for word in words)
    if tool == "review_order":
        return bool(re.search(r"\b(review\w*|done|everything|continue|check|revis\w*|listo|"
                              r"verif\w*|fini|termin\w*|pruf\w*|fertig|weiter|rever|pronto|"
                              r"incele\w*|bitti|tamam)\b", folded)) or payment_intent
    if tool == "go_back_to_menu":
        return bool(re.search(r"\b(back|change|edit|again|volver|cambi\w*|retour|chang\w*|"
                              r"zuruck|ander\w*|voltar|troc\w*|geri|degistir\w*)\b", folded))
    if tool not in ("add_order_item", "remove_order_item", "replace_order_item"):
        return True
    if tool == "add_order_item":
        explicit = re.search(r"\b(add|take|want|give me|have|anad\w*|agreg\w*|quier\w*|"
                             r"ajout\w*|prend\w*|voudr\w*|fug\w*|hinzu\w*|nehm\w*|mocht\w*|"
                             r"adicion\w*|quer\w*|ekle\w*|istiyor\w*)\b", folded)
        recent_confirmation = re.search(r"\b(yes|si|oui|ja|evet|sim)\b.*\b(add|it|lo|le|es|ekle)\b", folded)
        target = args.get("item_id")
        if target not in CATALOG:
            return True  # The tool engine reports an unknown item without changing state.
        mentioned = isinstance(target, str) and _item_mentioned(message, language, target)
        prior = bool(history and target in CATALOG and
                     _fold(CATALOG[target]["names"][language]) in _fold(history[-1]["content"]))
        return bool((explicit and mentioned) or (recent_confirmation and prior))
    if tool == "remove_order_item":
        target = args.get("item_id")
        if target not in CATALOG:
            return True  # Engine returns unknown_item without mutation.
        category = CATALOG[target]["category"]
        has_verb = re.search(r"\b(remove|take .* off|don't want|do not want|quit\w*|retir\w*|"
                             r"enlev\w*|supprim\w*|entfern\w*|weg|remov\w*|cikar\w*|kaldir\w*)\b", folded)
        category_word = _fold(category[:-1] if category.endswith("s") else category)
        return bool(has_verb and (_item_mentioned(message, language, target) or category_word in folded))
    old_id, new_id = args.get("old_item_id"), args.get("new_item_id")
    if old_id not in CATALOG or new_id not in CATALOG:
        return True
    has_verb = re.search(r"\b(change|replace|instead of|switch|cambi\w*|remplac\w*|chang\w*|"
                         r"ersetz\w*|troc\w*|degistir\w*)\b", folded)
    return bool(has_verb and _item_mentioned(message, language, new_id) and
                (_item_mentioned(message, language, old_id) or
                 CATALOG[old_id]["category"][:-1] in folded or
                 getattr(state.order, CATALOG[old_id]["category"]) == old_id))
