from datetime import date, datetime, timezone

from app.models import SpeechUsage
from app.models.speech_provider import SpeechUsageRequest
from app.routes import speech_providers
from app.services import speech_provider_manager as manager
from test_speech_provider_manager import SpeechTestContext, fake_config, headers, make_user


def test_monthly_dashboard_excludes_old_failed_future_requests_and_preserves_partial_cache_charges(monkeypatch):
    monkeypatch.setattr(manager, "get_settings", fake_config)
    monkeypatch.setattr(speech_providers, "utc_now", lambda: datetime(2026, 10, 5, 12, tzinfo=timezone.utc))
    with SpeechTestContext() as (client, db):
        admin = make_user(db, "monthly-admin@example.com", "admin")
        def request(index, when, service="tts", characters=100, seconds=0, outcome="success", cached=False, provider="soniox"):
            return SpeechUsageRequest(request_id=f"monthly-request-{index}", billing_period=date(2026, 9, 15),
                                      created_at=when, service_type=service, provider=provider, characters_used=characters,
                                      audio_seconds_used=seconds, outcome=outcome, was_cached=cached)
        db.add_all([
            request(1, datetime(2026, 9, 30, 23, 59, 59, tzinfo=timezone.utc), characters=33761),
            request(2, datetime(2026, 10, 1, tzinfo=timezone.utc), characters=727),
            request(3, datetime(2026, 10, 5, 12, tzinfo=timezone.utc), service="stt", characters=0, seconds=30),
            request(4, datetime(2026, 10, 2, tzinfo=timezone.utc), outcome="failed"),
            request(5, datetime(2026, 10, 2, tzinfo=timezone.utc), cached=True, characters=0),
            request(6, datetime(2026, 10, 6, tzinfo=timezone.utc)),
            request(7, datetime(2026, 10, 3, tzinfo=timezone.utc), characters=20, provider="browser"),
            request(8, datetime(2026, 10, 3, tzinfo=timezone.utc), provider="removed-provider"),
            request(9, datetime(2026, 10, 3, tzinfo=timezone.utc), cached=True, characters=43),
        ])
        db.add(SpeechUsage(billing_period=date(2026, 9, 1), provider="soniox", service_type="tts", characters_used=33761))
        db.commit()
        response = client.get("/api/admin/speech-providers/global", headers=headers(admin))
        assert response.status_code == 200
        payload = response.json()
        assert payload["current_month_usage"] == {"month": "2026-10-01", "items": [
            {"provider": "browser", "service_type": "tts", "characters_used": 20, "audio_seconds_used": 0},
            {"provider": "soniox", "service_type": "stt", "characters_used": 0, "audio_seconds_used": 30},
            {"provider": "soniox", "service_type": "tts", "characters_used": 770, "audio_seconds_used": 0},
        ]}
        assert any(row["characters_used"] == 33761 for row in payload["usage_history"])
        assert db.query(SpeechUsageRequest).count() == 9


def test_monthly_dashboard_has_no_usage_when_only_previous_month_has_requests(monkeypatch):
    monkeypatch.setattr(manager, "get_settings", fake_config)
    monkeypatch.setattr(speech_providers, "utc_now", lambda: datetime(2027, 1, 1, tzinfo=timezone.utc))
    with SpeechTestContext() as (client, db):
        admin = make_user(db, "empty-month-admin@example.com", "admin")
        db.add(SpeechUsageRequest(request_id="december-request", billing_period=date(2026, 12, 1),
                                 created_at=datetime(2026, 12, 31, 23, 59, 59, tzinfo=timezone.utc),
                                 provider="soniox", service_type="stt", outcome="success", audio_seconds_used=100))
        db.commit()
        payload = client.get("/api/admin/speech-providers/global", headers=headers(admin)).json()
        assert payload["current_month_usage"] == {"month": "2027-01-01", "items": []}
