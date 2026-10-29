"""Local diagnostics only; every provider response here uses MockTransport."""

import json
import logging

import httpx
import pytest

from app.services.llm_request_diagnostics import build_llm_request_diagnostics
from app.services.restaurant_llm_service import GroqRestaurantLLMProvider, RestaurantLLMFailure


def test_breakdown_counts_sections_without_exposing_content():
    private = "private-user-text-8391"
    secret = "GROQ_API_KEY-private-value"
    payload = {
        "model": "qwen/qwen3.8-27b",
        "messages": [
            {"role": "system", "content": f"Private rule {secret}. Context: " + json.dumps({
                "step": "menu", "category": "mains", "order": {"mains": "pizza"},
                "candidates": [{"name": "Private dish", "description": "Private ingredients", "price_cents": 1200}],
            }, separators=(",", ":"))},
            {"role": "user", "content": "Earlier private question"},
            {"role": "assistant", "content": "Earlier private answer"},
            {"role": "tool", "content": "Private tool result"},
            {"role": "user", "content": private},
        ],
        "tools": [{"type": "function", "function": {"name": "restaurant_action", "description": "Private schema detail"}}],
        "headers": {"Authorization": "Bearer private-auth-token"},
    }
    report = build_llm_request_diagnostics(payload)
    sections = report["sections"]
    assert sections["conversation_history"]["messages"] == 3
    assert sections["conversation_history"]["user_messages"] == 1
    assert sections["conversation_history"]["assistant_messages"] == 1
    assert sections["conversation_history"]["tool_messages"] == 1
    assert sections["tool_results"]["count"] == 1
    assert sections["tool_schemas"]["count"] == 1
    assert sections["tool_schemas"]["largest_tool"] == "restaurant_action"
    assert sections["scenario_context"]["fields"] == ["candidates", "category", "order", "step"]
    assert sections["order_context"]["items"] == 1
    assert sections["menu_context"]["items"] == 1
    assert sections["menu_context"]["descriptions"] is True
    assert sections["menu_context"]["prices"] is True
    assert sections["current_user_message"]["characters"] == len(private)
    assert report["request_total_estimate"]["estimated_tokens"] > 0
    assert report["request_total_estimate"]["serialized_bytes"] > 0
    safe = json.dumps(report)
    for forbidden in (private, secret, "Authorization", "private-auth-token", "Private dish", "Private ingredients",
                      "Earlier private question", "Private rule", "Private tool result"):
        assert forbidden not in safe


def test_menu_facts_and_repeated_message_are_measured_without_values():
    private = "private-menu-question"
    facts = [{"category": "mains", "items": [
        {"name": "private-a", "available": True},
        {"name": "private-b", "description": "private-description", "price_cents": 900},
    ]}]
    payload = {"messages": [
        {"role": "system", "content": "Instructions. Menu facts: " + json.dumps(facts)},
        {"role": "user", "content": private},
        {"role": "user", "content": private},
    ]}
    report = build_llm_request_diagnostics(payload)
    assert report["sections"]["menu_context"]["items"] == 2
    assert report["sections"]["menu_context"]["availability"] is True
    assert report["current_user_message_repeated_in_history"] is True
    assert private not in json.dumps(report)
    assert "private-description" not in json.dumps(report)


def test_provider_records_actual_usage_with_one_mocked_call(caplog):
    calls = []

    def handler(request):
        calls.append(request)
        return httpx.Response(200, json={"choices": [{"message": {"content": "Okay."}}],
                                         "usage": {"prompt_tokens": 29400, "completion_tokens": 248,
                                                   "total_tokens": 29648}})

    provider = GroqRestaurantLLMProvider("private-test-key", httpx.MockTransport(handler), diagnostics_enabled=True)
    with caplog.at_level(logging.INFO, logger="uvicorn.error"):
        assert provider.complete([{"role": "system", "content": "private-system"},
                                  {"role": "user", "content": "private-message"}], "qwen/qwen3.8-27b") == "Okay."
    assert len(calls) == 1
    assert provider.last_usage == (29400, 248, 29648)
    assert provider.last_diagnostics["sections"]["current_user_message"]["characters"] == len("private-message")
    assert provider.last_request_id.startswith("restaurant-llm-")
    assert f"request_id={provider.last_request_id}" in caplog.text
    assert "provider_input_tokens=29400" in caplog.text
    assert "severity=high" in caplog.text
    for forbidden in ("private-test-key", "private-system", "private-message", "Authorization"):
        assert forbidden not in caplog.text


def test_missing_provider_usage_is_safe_and_diagnostics_are_off_by_default(caplog):
    calls = []

    def handler(request):
        calls.append(request)
        return httpx.Response(200, json={"choices": [{"message": {"content": "Okay."}}]})

    provider = GroqRestaurantLLMProvider("private-test-key", httpx.MockTransport(handler), diagnostics_enabled=True)
    with caplog.at_level(logging.INFO, logger="uvicorn.error"):
        assert provider.complete([{"role": "user", "content": "Hi"}], "qwen/qwen3.8-27b") == "Okay."
    assert provider.last_usage is None
    assert "available=false" in caplog.text
    assert len(calls) == 1
    caplog.clear()
    quiet = GroqRestaurantLLMProvider("private-test-key", httpx.MockTransport(handler))
    with caplog.at_level(logging.INFO, logger="uvicorn.error"):
        assert quiet.complete([{"role": "user", "content": "Hi"}], "qwen/qwen3.8-27b") == "Okay."
    assert quiet.last_diagnostics is None
    assert "request_diagnostics" not in caplog.text
    assert len(calls) == 2


def test_medium_usage_warning_is_development_only(caplog):
    def handler(_request):
        return httpx.Response(200, json={"choices": [{"message": {"content": "Okay."}}],
                                         "usage": {"prompt_tokens": 5000, "completion_tokens": 10,
                                                   "total_tokens": 5010}})

    provider = GroqRestaurantLLMProvider("private-test-key", httpx.MockTransport(handler), diagnostics_enabled=True)
    with caplog.at_level(logging.INFO, logger="uvicorn.error"):
        provider.complete([{"role": "user", "content": "Hi"}], "qwen/qwen3.8-27b")
    assert "severity=warning" in caplog.text
    assert "severity=high" not in caplog.text
    caplog.clear()
    quiet = GroqRestaurantLLMProvider("private-test-key", httpx.MockTransport(handler))
    with caplog.at_level(logging.INFO, logger="uvicorn.error"):
        quiet.complete([{"role": "user", "content": "Hi"}], "qwen/qwen3.8-27b")
    assert "Restaurant LLM prompt unexpectedly large" not in caplog.text


def test_failed_upstream_request_keeps_only_safe_request_id_and_status(caplog):
    provider = GroqRestaurantLLMProvider("private-test-key", httpx.MockTransport(
        lambda _request: httpx.Response(429, headers={"Retry-After": "7"})), diagnostics_enabled=True)
    with caplog.at_level(logging.INFO, logger="uvicorn.error"):
        with pytest.raises(RestaurantLLMFailure) as failure:
            provider.complete([{"role": "user", "content": "private-message"}], "qwen/qwen3.8-27b")
    assert failure.value.kind == "rate_limit"
    assert f"request_id={provider.last_request_id} upstream_status=429" in caplog.text
    assert "private-test-key" not in caplog.text
    assert "private-message" not in caplog.text
