from datetime import datetime, timedelta, timezone
from types import SimpleNamespace

import httpx
import pytest

from app.services import soniox_usage
from test_speech_provider_manager import SpeechTestContext, headers, make_user

PATH = "/api/admin/speech-providers/soniox-usage"
SECRET = "private-soniox-test-key"


def usage_payload():
    def entry(model, cost, counts):
        return {
            "model": model, "days": ["2026-10-01", "2026-10-02", "2026-10-05"],
            "total_cost_usd": cost, "total_num_requests": sum(counts),
            "cost_usd": [cost, "0", "0"], "num_requests": counts,
            "authorization": f"Bearer {SECRET}", "api_key": SECRET,
        }
    return {"total": entry(None, "0.3000000000", [15, 0, 0]),
            "models": [entry("stt-rt-v5", "0.1", [10, 0, 0]), entry("tts-rt-v1", "0.2", [5, 0, 0])],
            "api_key": SECRET}


@pytest.fixture(autouse=True)
def configuration(monkeypatch):
    monkeypatch.setattr(soniox_usage, "get_settings", lambda: SimpleNamespace(
        soniox_api_key=SECRET, soniox_api_timeout_seconds=10,
    ))
    class Clock(datetime):
        @classmethod
        def now(cls, tz=None):
            return datetime(2026, 10, 4, 12, tzinfo=timezone.utc)
    monkeypatch.setattr(soniox_usage, "datetime", Clock)


def mock_response(monkeypatch, payload=None, status=200):
    calls = []
    def get(url, **kwargs):
        calls.append((url, kwargs))
        return httpx.Response(status, json=payload if payload is not None else usage_payload(), request=httpx.Request("GET", url))
    monkeypatch.setattr(soniox_usage.httpx, "get", get)
    return calls


def test_admin_usage_success_is_allowlisted_and_uses_server_key(monkeypatch):
    calls = mock_response(monkeypatch)
    with SpeechTestContext() as (client, db):
        admin = make_user(db, "usage-admin@example.com", "admin")
        response = client.get(PATH, headers=headers(admin))
        assert response.status_code == 200
        result = response.json()
        assert result["month"] == "2026-10"
        assert result["total_cost_usd"] == "0.3000000000"
        assert result["total_requests"] == 15
        assert result["models"] == [
            {"model": "stt-rt-v5", "cost_usd": "0.1", "requests": 10},
            {"model": "tts-rt-v1", "cost_usd": "0.2", "requests": 5},
        ]
        assert [day["date"] for day in result["daily"]] == ["2026-10-01", "2026-10-02"]
        assert result["daily"][0]["requests"] == 15
        assert result["updated_at"] == "2026-10-04T12:00:00Z"
        assert SECRET not in response.text
        assert "authorization" not in response.text.lower()
        assert response.headers["cache-control"] == "no-store"
    url, options = calls[0]
    assert url == "https://api.soniox.com/v1/usage/summary"
    assert options["headers"] == {"Authorization": f"Bearer {SECRET}"}
    assert options["params"] == {"start_time": "2026-10-01T00:00:00Z", "end_time": "2026-11-01T00:00:00Z"}
    assert options["timeout"] == 10


def test_unauthenticated_and_normal_users_cannot_request_provider_usage(monkeypatch):
    calls = mock_response(monkeypatch)
    with SpeechTestContext() as (client, db):
        assert client.get(PATH).status_code == 401
        user = make_user(db, "usage-user@example.com")
        assert client.get(PATH, headers=headers(user)).status_code == 403
    assert calls == []


@pytest.mark.parametrize("status", [401, 403, 429, 500])
def test_provider_errors_are_sanitized(monkeypatch, status):
    mock_response(monkeypatch, {"message": f"Authorization: Bearer {SECRET}"}, status)
    with SpeechTestContext() as (client, db):
        admin = make_user(db, "usage-errors@example.com", "admin")
        response = client.get(PATH, headers=headers(admin))
        assert response.status_code == 502
        assert response.json() == {"detail": "Soniox usage is temporarily unavailable."}
        assert SECRET not in response.text


def test_timeout_and_missing_configuration(monkeypatch):
    def timeout(*args, **kwargs):
        raise httpx.ReadTimeout(SECRET)
    monkeypatch.setattr(soniox_usage.httpx, "get", timeout)
    with SpeechTestContext() as (client, db):
        admin = make_user(db, "usage-timeout@example.com", "admin")
        response = client.get(PATH, headers=headers(admin))
        assert response.status_code == 504
        assert SECRET not in response.text
        monkeypatch.setattr(soniox_usage, "get_settings", lambda: SimpleNamespace(soniox_api_key=""))
        assert client.get(PATH, headers=headers(admin)).status_code == 503


@pytest.mark.parametrize("bad", [{}, {"total": {"api_key": SECRET}, "models": []},
                               {"total": {**usage_payload()["total"], "cost_usd": ["NaN"]}, "models": []},
                               {"total": {**usage_payload()["total"], "cost_usd": ["-1", "0", "0"]}, "models": []}])
def test_invalid_provider_data_fails_safely(monkeypatch, bad):
    mock_response(monkeypatch, bad)
    with SpeechTestContext() as (client, db):
        admin = make_user(db, "usage-invalid@example.com", "admin")
        response = client.get(PATH, headers=headers(admin))
        assert response.status_code == 502
        assert SECRET not in response.text


def test_zero_usage_is_valid(monkeypatch):
    payload = usage_payload()
    payload["total"].update(total_cost_usd="0", total_num_requests=0, cost_usd=["0"] * 3, num_requests=[0] * 3)
    payload["models"] = []
    mock_response(monkeypatch, payload)
    result = soniox_usage.fetch_current_month_soniox_usage()
    assert result.total_cost_usd == 0
    assert result.models == []


def test_calendar_window_uses_utc_and_handles_december_rollover(monkeypatch):
    payload = usage_payload()
    payload["total"]["days"] = ["2026-12-01", "2026-12-02", "2026-12-05"]
    payload["models"] = []
    calls = mock_response(monkeypatch, payload)
    result = soniox_usage.fetch_current_month_soniox_usage(datetime(2027, 1, 1, 1, tzinfo=timezone(timedelta(hours=3))))
    assert result.month == "2026-12"
    assert calls[0][1]["params"] == {"start_time": "2026-12-01T00:00:00Z", "end_time": "2027-01-01T00:00:00Z"}
