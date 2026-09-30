from contextlib import AbstractContextManager
from datetime import date, datetime, timezone
from types import SimpleNamespace

from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.security import create_access_token
from app.database import Base, get_db
from app.main import app
from app.models import SpeechProviderEvent, SpeechUsage, User, UserTtsUsage
from app.routes import stt as stt_routes
from app.schemas.speech_provider import GlobalSpeechRoutingUpdate
from app.services import speech_provider_manager as manager
from app.services.soniox_service import SonioxSttResult


def fake_config():
    return SimpleNamespace(
        speech_warning_threshold_percent=80,
        speech_switch_threshold_percent=95,
        soniox_api_key="test-soniox-key",
        soniox_stt_monthly_limit_seconds=36000,
        soniox_tts_monthly_limit_characters=500000,
        speech_provider_cooldown_seconds=300,
    )


def make_user(db: Session, email: str, role: str = "user") -> User:
    user = User(
        email=email,
        password_hash="unused",
        full_name="Speech Admin" if role == "admin" else "Speech User",
        user_category="professional" if role == "admin" else "personal",
        preferred_language="en",
        role=role,
        approval_status="approved",
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def headers(user: User) -> dict[str, str]:
    return {"Authorization": f"Bearer {create_access_token(str(user.id))}"}


def test_soniox_counting_cache_browser_and_retries(monkeypatch):
    monkeypatch.setattr(manager, "get_settings", fake_config)
    with SpeechTestContext() as (_, db):
        assert manager.record_request_result(db, "00000000-0000-4000-8000-000000000001", "tts", "soniox", "success", characters_used=42)
        assert not manager.record_request_result(db, "00000000-0000-4000-8000-000000000001", "tts", "soniox", "success", characters_used=42)
        assert manager.record_request_result(db, "00000000-0000-4000-8000-000000000002", "tts", "soniox", "success", was_cached=True)
        assert manager.record_request_result(db, "00000000-0000-4000-8000-000000000003", "tts", "browser", "success", characters_used=500)
        assert manager.record_request_result(db, "00000000-0000-4000-8000-000000000004", "stt", "soniox", "success", audio_seconds_used=17)
        assert manager.record_request_result(db, "00000000-0000-4000-8000-000000000005", "stt", "browser", "success", audio_seconds_used=90)

        tts = manager.get_or_create_provider_usage(db, manager.get_capability(db, "soniox", "tts"))
        stt = manager.get_or_create_provider_usage(db, manager.get_capability(db, "soniox", "stt"))
        assert (tts.characters_used, tts.successful_requests, tts.cached_requests) == (42, 2, 1)
        assert (stt.audio_seconds_used, stt.successful_requests) == (17, 1)


def test_monthly_records_are_separate_and_history_is_preserved(monkeypatch):
    monkeypatch.setattr(manager, "get_settings", fake_config)
    with SpeechTestContext() as (_, db):
        june = manager.get_or_create_provider_usage(db, manager.get_capability(db, "soniox", "tts"), moment=datetime(2026, 6, 1, tzinfo=timezone.utc))
        june.characters_used = 123
        july = manager.get_or_create_provider_usage(db, manager.get_capability(db, "soniox", "tts"), moment=datetime(2026, 7, 1, tzinfo=timezone.utc))
        db.commit()
        assert june.id != july.id
        rows = list(db.scalars(select(SpeechUsage).order_by(SpeechUsage.billing_period)).all())
        assert [(row.billing_period, row.characters_used) for row in rows] == [
            (date(2026, 6, 1), 123),
            (date(2026, 7, 1), 0),
        ]


def test_soniox_warning_switch_and_failure_fallback(monkeypatch):
    monkeypatch.setattr(manager, "get_settings", fake_config)
    with SpeechTestContext() as (_, db):
        capability = manager.get_capability(db, "soniox", "tts")
        usage = manager.get_or_create_provider_usage(db, capability)
        usage.characters_used = 400000
        db.commit()
        assert manager.resolve_global_provider(db, "tts").provider == "soniox"
        assert manager.resolve_global_provider(db, "tts").status == "warning"
        usage.characters_used = 475000
        db.commit()
        assert manager.resolve_global_provider(db, "tts").provider == "browser"
        usage.characters_used = 0
        manager.mark_provider_failure(db, "soniox", "tts", "Service unavailable")
        db.commit()
        assert manager.resolve_global_provider(db, "tts").provider == "browser"
        assert db.scalar(select(SpeechProviderEvent).where(SpeechProviderEvent.event_type == "provider_failure"))


def test_admin_dashboard_and_settings_permissions(monkeypatch):
    monkeypatch.setattr(manager, "get_settings", fake_config)
    with SpeechTestContext() as (client, db):
        user = make_user(db, "user-speech@example.com")
        admin = make_user(db, "admin-speech@example.com", "admin")
        payload = routing_payload(db).model_dump()
        assert client.put("/api/admin/speech-providers/global", headers=headers(user), json=payload).status_code == 403
        updated = client.put("/api/admin/speech-providers/global", headers=headers(admin), json=payload)
        assert updated.status_code == 200
        assert updated.json()["active_tts_provider"] == "soniox"
        assert updated.json()["active_stt_provider"] == "soniox"
        assert len(updated.json()["capabilities"]) == 4


def routing_payload(db: Session, **overrides) -> GlobalSpeechRoutingUpdate:
    capabilities = manager.ensure_capability_configs(db)
    values = {
        "capabilities": [
            {
                "provider_key": item.provider_key,
                "service_type": item.service_type,
                "enabled": item.enabled,
                "priority": item.priority,
                "quota_limit": item.quota_limit,
                "warning_threshold_value": item.warning_threshold_value,
                "switch_threshold_value": item.switch_threshold_value,
                "billing_period_type": item.billing_period_type,
                "reset_day": item.reset_day,
            }
            for item in capabilities
        ],
    }
    values.update(overrides)
    return GlobalSpeechRoutingUpdate.model_validate(values)


def test_global_priority_and_disabled_provider_apply_to_every_user(monkeypatch):
    monkeypatch.setattr(manager, "get_settings", fake_config)
    with SpeechTestContext() as (_, db):
        admin = make_user(db, "routing-admin@example.com", "admin")
        assert [item.provider for item in manager.get_provider_chain(db, "stt")] == ["soniox", "browser"]
        payload = routing_payload(db)
        for item in payload.capabilities:
            if item.provider_key == "soniox" and item.service_type == "stt":
                item.enabled = False
        manager.save_global_routing(db, payload, admin.id)
        assert manager.get_provider_chain(db, "stt")[0].provider == "browser"


def test_threshold_fallback_and_browser_unlimited(monkeypatch):
    monkeypatch.setattr(manager, "get_settings", fake_config)
    with SpeechTestContext() as (_, db):
        soniox = manager.get_capability(db, "soniox", "stt")
        usage = manager.get_or_create_provider_usage(db, soniox)
        usage.audio_seconds_used = int(soniox.quota_limit * 0.8)
        assert manager.capability_quota_status(soniox, usage) == "warning"
        usage.audio_seconds_used = int(soniox.quota_limit * 0.95)
        assert manager.get_provider_chain(db, "stt")[0].provider == "browser"
        browser = manager.get_capability(db, "browser", "stt")
        browser_usage = manager.get_or_create_provider_usage(db, browser)
        browser_usage.successful_requests = 1000000
        assert manager.capability_quota_status(browser, browser_usage) == "unlimited"


def test_tts_threshold_falls_back_from_soniox_to_browser(monkeypatch):
    monkeypatch.setattr(manager, "get_settings", fake_config)
    with SpeechTestContext() as (_, db):
        soniox = manager.get_capability(db, "soniox", "tts")
        usage = manager.get_or_create_provider_usage(db, soniox)
        usage.characters_used = int(soniox.quota_limit * 0.95)
        assert manager.get_provider_chain(db, "tts")[0].provider == "browser"


def test_absolute_warning_emails_once_and_switches_from_soniox_to_browser(monkeypatch):
    monkeypatch.setattr(manager, "get_settings", fake_config)
    sent_emails = []
    monkeypatch.setattr(
        manager,
        "send_speech_quota_warning_email",
        lambda *args: sent_emails.append(args),
    )
    with SpeechTestContext() as (_, db):
        soniox = next(
            item
            for item in manager.ensure_capability_configs(db)
            if item.provider_key == "soniox" and item.service_type == "tts"
        )
        soniox.quota_limit = 100
        soniox.warning_threshold_value = 10
        soniox.switch_threshold_value = 20
        db.commit()

        assert manager.record_request_result(
            db, "00000000-0000-4000-8000-000000000101", "tts", "soniox", "success", characters_used=12
        )
        assert len(sent_emails) == 1
        assert manager.get_provider_chain(db, "tts")[0].provider == "soniox"

        assert manager.record_request_result(
            db, "00000000-0000-4000-8000-000000000102", "tts", "soniox", "success", characters_used=5
        )
        assert len(sent_emails) == 1

        assert manager.record_request_result(
            db, "00000000-0000-4000-8000-000000000103", "tts", "soniox", "success", characters_used=3
        )
        assert manager.get_provider_chain(db, "tts")[0].provider == "browser"
        switch_event = db.scalar(
            select(SpeechProviderEvent).where(
                SpeechProviderEvent.event_type == "switch_threshold_reached",
                SpeechProviderEvent.provider_key == "soniox",
            )
        )
        assert switch_event is not None
        assert switch_event.new_provider == "browser"
        assert switch_event.threshold_at_event == 20


def test_missing_soniox_tts_rebalances_priorities(monkeypatch):
    monkeypatch.setattr(manager, "get_settings", fake_config)
    with SpeechTestContext() as (_, db):
        browser = manager.get_capability(db, "browser", "tts")
        db.delete(manager.get_capability(db, "soniox", "tts"))
        db.flush()
        browser.priority = 1
        db.commit()
        restored = [item for item in manager.ensure_capability_configs(db) if item.service_type == "tts"]
        assert [(item.provider_key, item.priority) for item in restored] == [("soniox", 1), ("browser", 2)]


def test_custom_billing_period_starts_at_zero_and_keeps_history(monkeypatch):
    monkeypatch.setattr(manager, "get_settings", fake_config)
    with SpeechTestContext() as (_, db):
        soniox = next(item for item in manager.ensure_capability_configs(db) if item.provider_key == "soniox" and item.service_type == "tts")
        soniox.billing_period_type = "custom_monthly"
        soniox.reset_day = 15
        june = manager.get_or_create_provider_usage(db, soniox, moment=datetime(2026, 6, 20, tzinfo=timezone.utc))
        june.characters_used = 700
        july = manager.get_or_create_provider_usage(db, soniox, moment=datetime(2026, 7, 20, tzinfo=timezone.utc))
        assert june.billing_period == date(2026, 6, 15)
        assert july.billing_period == date(2026, 7, 15)
        assert july.characters_used == 0
        assert db.query(SpeechUsage).filter(SpeechUsage.provider == "soniox", SpeechUsage.service_type == "tts").count() == 2


def test_duplicate_priority_is_rejected_and_soniox_tts_is_supported(monkeypatch):
    monkeypatch.setattr(manager, "get_settings", fake_config)
    with SpeechTestContext() as (_, db):
        values = routing_payload(db).model_dump()
        stt = [item for item in values["capabilities"] if item["service_type"] == "stt"]
        stt[1]["priority"] = stt[0]["priority"]
        try:
            GlobalSpeechRoutingUpdate.model_validate(values)
            assert False, "duplicate priorities should fail"
        except ValueError:
            pass
        tts = [item for item in manager.ensure_capability_configs(db) if item.service_type == "tts"]
        assert [item.provider_key for item in tts] == ["soniox", "browser"]


def test_global_admin_api_is_protected_and_does_not_return_secrets(monkeypatch):
    monkeypatch.setattr(manager, "get_settings", fake_config)
    with SpeechTestContext() as (client, db):
        user = make_user(db, "global-user@example.com")
        admin = make_user(db, "global-admin@example.com", "admin")
        assert client.get("/api/admin/speech-providers/global", headers=headers(user)).status_code == 403
        response = client.get("/api/admin/speech-providers/global", headers=headers(admin))
        assert response.status_code == 200
        serialized = response.text.lower()
        assert "test-key" not in serialized
        assert "test-soniox-key" not in serialized
        body = response.json()
        payload = {
            "capabilities": [
                {key: item[key] for key in (
                    "provider_key", "service_type", "enabled", "priority", "quota_limit",
                    "warning_threshold_value", "switch_threshold_value",
                    "billing_period_type", "reset_day",
                )}
                for item in body["capabilities"]
            ],
        }
        stt_items = [item for item in payload["capabilities"] if item["service_type"] == "stt"]
        for item in stt_items:
            item["priority"] = {"soniox": 1, "soniox": 2, "browser": 3}[item["provider_key"]]
        denied = client.put("/api/admin/speech-providers/global", headers=headers(user), json=payload)
        updated = client.put("/api/admin/speech-providers/global", headers=headers(admin), json=payload)
        assert denied.status_code == 403
        assert updated.status_code == 200
        assert updated.json()["active_stt_provider"] == "soniox"


def test_global_browser_routing_applies_to_guest_speech(monkeypatch):
    monkeypatch.setattr(manager, "get_settings", fake_config)
    with SpeechTestContext() as (client, db):
        guest = client.post("/guests/session", json={"save_progress": False, "preferred_language": "en"})
        guest_token = guest.json()["guest_session_token"]
        admin = make_user(db, "guest-routing-admin@example.com", "admin")
        payload = routing_payload(db)
        for item in payload.capabilities:
            item.priority = 1 if item.provider_key == "browser" else item.priority + 1
        manager.save_global_routing(db, payload, admin.id)
        guest_headers = {
            "X-Guest-Session-Token": guest_token,
            "X-Browser-Speech-Supported": "true",
        }
        resolution = client.get(
            "/api/speech/providers/stt?browser_supported=true",
            headers=guest_headers,
        )
        tts = client.post("/api/tts", headers=guest_headers, json={"text": "Welcome", "language": "en"})
        stt = client.post(
            "/api/stt?language=en&mode=name",
            headers={**guest_headers, "Content-Type": "audio/wav"},
            content=b"RIFF-not-read-for-browser-routing",
        )
        assert resolution.status_code == 200
        assert resolution.json()["provider"] == "browser"
        assert resolution.json()["status"] == "normal"
        assert tts.status_code == 204
        assert stt.status_code == 204
        assert tts.headers["X-Speech-Provider"] == stt.headers["X-Speech-Provider"] == "browser"


def test_exhausted_user_tts_quota_falls_back_to_browser(monkeypatch):
    monkeypatch.setattr(manager, "get_settings", fake_config)
    with SpeechTestContext() as (client, db):
        user = make_user(db, "tts-quota-fallback@example.com")
        db.add(UserTtsUsage(
            user_id=user.id,
            tts_limit_characters=10,
            tts_used_characters=10,
        ))
        db.commit()

        response = client.post(
            "/api/tts",
            headers={
                **headers(user),
                "X-Browser-Speech-Supported": "true",
            },
            json={"text": "This message is not cached.", "language": "en"},
        )

        assert response.status_code == 204
        assert response.headers["X-Speech-Provider"] == "browser"
        assert response.headers["X-Speech-Status"] == "quota_fallback"


def test_empty_provider_transcript_falls_back_to_next_stt_provider(monkeypatch):
    monkeypatch.setattr(
        stt_routes,
        "get_provider_chain",
        lambda *args, **kwargs: [
            SimpleNamespace(provider="soniox", status="normal"),
            SimpleNamespace(provider="browser", status="normal"),
        ],
    )
    monkeypatch.setattr(
        stt_routes,
        "recognize_soniox_stt",
        lambda *args, **kwargs: SonioxSttResult("", "en", 0.2),
    )
    monkeypatch.setattr(stt_routes, "get_wav_duration_seconds", lambda audio: 1)
    monkeypatch.setattr(stt_routes, "log_provider_event", lambda *args, **kwargs: None)
    monkeypatch.setattr(
        stt_routes,
        "get_settings",
        lambda: SimpleNamespace(count_browser_usage_against_user_quota=False),
    )

    with SpeechTestContext() as (client, db):
        user = make_user(db, "empty-stt-result@example.com")
        response = client.post(
            "/api/stt?language=en&mode=name",
            headers={
                **headers(user),
                "Content-Type": "audio/wav",
                "X-Browser-Speech-Supported": "true",
            },
            content=b"empty-transcript-audio",
        )

        assert response.status_code == 204
        assert response.headers["X-Speech-Provider"] == "browser"


class SpeechTestContext(AbstractContextManager):
    def __enter__(self):
        self.engine = create_engine(
            "sqlite://",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        Base.metadata.create_all(self.engine)
        self.factory = sessionmaker(bind=self.engine, autoflush=False, autocommit=False)
        self.db = self.factory()

        def override_db():
            yield self.db

        app.dependency_overrides[get_db] = override_db
        self.client = TestClient(app)
        return self.client, self.db

    def __exit__(self, exc_type, exc, traceback):
        self.client.close()
        self.db.close()
        app.dependency_overrides.clear()
        Base.metadata.drop_all(self.engine)
        self.engine.dispose()
