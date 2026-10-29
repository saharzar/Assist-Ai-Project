"""Content-free, provider-independent measurements of an assembled chat request."""

import json
import math
from typing import Any


def _size(characters: int) -> dict[str, int]:
    # This is deliberately a rough local estimate, not Groq/Qwen tokenization.
    return {"characters": characters, "estimated_tokens": math.ceil(characters / 4)}


def _json(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, separators=(",", ":"))


def _menu_flags(value: Any) -> dict[str, bool | int]:
    keys: set[str] = set()
    unavailable_items = 0

    def visit(node: Any) -> None:
        nonlocal unavailable_items
        if isinstance(node, dict):
            keys.update(node)
            unavailable_items += node.get("available") is False
            for child in node.values():
                visit(child)
        elif isinstance(node, list):
            for child in node:
                visit(child)

    visit(value)
    return {
        "descriptions": "description" in keys,
        "prices": "price_cents" in keys,
        "image_urls": bool(keys & {"image", "image_url", "image_urls", "photo", "photo_url"}),
        "all_translations": bool(keys & {"names", "descriptions", "translations"}),
        "availability": "available" in keys,
        "unavailable_items": unavailable_items,
    }


def build_llm_request_diagnostics(payload: dict[str, Any], *, payload_bytes: int | None = None) -> dict[str, Any]:
    """Return only numeric metrics, fixed labels, and safe schema names; never content."""
    serialized = _json(payload)
    messages = payload.get("messages") if isinstance(payload.get("messages"), list) else []
    tools = payload.get("tools") if isinstance(payload.get("tools"), list) else []
    system = messages[0].get("content", "") if messages and messages[0].get("role") == "system" else ""
    system = system if isinstance(system, str) else ""

    scenario_chars = menu_chars = order_chars = 0
    scenario_fields: list[str] = []
    order_items = menu_items = 0
    flags = _menu_flags(None)
    if " Menu facts: " in system:
        prefix, separator, raw = system.partition(" Menu facts: ")
        system_chars = len(prefix)
        menu_chars = len(separator) + len(raw)
        try:
            facts = json.loads(raw)
            if isinstance(facts, list):
                menu_items = sum(len(item.get("items", [])) if isinstance(item, dict) and isinstance(item.get("items"), list)
                                 else 1 for item in facts)
            flags = _menu_flags(facts)
        except (TypeError, ValueError):
            pass
    elif " Context: " in system:
        prefix, separator, raw = system.partition(" Context: ")
        system_chars = len(prefix)
        scenario_chars = len(separator) + len(raw)
        try:
            context = json.loads(raw)
            if isinstance(context, dict):
                allowed_fields = {"step", "category", "order", "unavailable", "payment", "candidates"}
                scenario_fields = sorted(key for key in context if key in allowed_fields)
                if isinstance(context.get("order"), dict):
                    order = context["order"]
                    order_chars = len(_json(order))
                    scenario_chars -= order_chars
                    order_items = sum(value is not None for value in order.values())
                if isinstance(context.get("candidates"), list):
                    candidates = context["candidates"]
                    menu_items = len(candidates)
                    menu_chars = len(_json(candidates))
                    scenario_chars -= menu_chars
                    flags = _menu_flags(candidates)
        except (TypeError, ValueError):
            pass
    else:
        system_chars = len(system)

    current = messages[-1] if messages and messages[-1].get("role") == "user" else None
    current_text = current.get("content", "") if current else ""
    current_chars = len(current_text) if isinstance(current_text, str) else 0
    history = messages[1:-1] if current and system else messages[1:] if system else messages[:-1] if current else messages
    history_chars = sum(len(item.get("content", "")) for item in history if isinstance(item.get("content"), str)
                        and item.get("role") != "tool")
    tool_results = [item for item in history if item.get("role") == "tool"]
    tool_result_chars = sum(len(item.get("content", "")) for item in tool_results if isinstance(item.get("content"), str))
    tools_chars = len(_json(tools)) if tools else 0
    tools_by_size = [(len(_json(tool)), tool.get("function", {}).get("name", "")) for tool in tools if isinstance(tool, dict)]
    largest_name = max(tools_by_size, default=(0, ""))[1]
    # Only known, source-controlled names can enter a diagnostic log.
    largest_name = "restaurant_action" if largest_name == "restaurant_action" else "other_tool" if tools else None
    accounted = system_chars + scenario_chars + menu_chars + order_chars + current_chars + history_chars + tool_result_chars + tools_chars
    # JSON keys, roles, model/options, escaping, and punctuation remain here.
    metadata_chars = max(0, len(serialized) - accounted)
    sections = {
        "system_prompt": _size(system_chars),
        "conversation_history": {**_size(history_chars), "messages": len(history),
                                 "user_messages": sum(item.get("role") == "user" for item in history),
                                 "assistant_messages": sum(item.get("role") == "assistant" for item in history),
                                 "tool_messages": len(tool_results)},
        "current_user_message": _size(current_chars),
        "tool_schemas": {**_size(tools_chars), "count": len(tools), "largest_tool": largest_name,
                         "largest_tool_characters": max(tools_by_size, default=(0, ""))[0]},
        "scenario_context": {**_size(scenario_chars), "fields": scenario_fields},
        "menu_context": {**_size(menu_chars), "items": menu_items, **flags},
        "order_context": {**_size(order_chars), "items": order_items},
        "tool_results": {**_size(tool_result_chars), "count": len(tool_results)},
        "request_metadata": _size(metadata_chars),
    }
    duplicate_current = bool(current_text and any(item.get("role") == "user" and item.get("content") == current_text
                                                   for item in history))
    return {
        "sections": sections,
        "request_total_estimate": {**_size(len(serialized)),
                                   "serialized_bytes": payload_bytes if payload_bytes is not None else len(serialized.encode("utf-8"))},
        "estimation_method": "ceil(characters/4)",
        "current_user_message_repeated_in_history": duplicate_current,
    }
