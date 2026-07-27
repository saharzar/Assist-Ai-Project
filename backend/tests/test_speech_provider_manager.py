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
from app.models import SpeechProviderEvent, SpeechUsage, User
from app.schemas.speech_provider import GlobalSpeechRoutingUpdate, SpeechProviderSettingsUpdate
from app.services import speech_provider_manager as manager


def fake_config():
    return SimpleNamespace(
        azure_speech_key="test-key",
        azure_speech_region="test-region",
        azure_tts_monthly_limit_characters=500000,
        azure_stt_monthly_limit_seconds=18000,
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


def test_azure_counting_cache_browser_and_retries(monkeypatch):
    monkeypatch.setattr(manager, "get_settings", fake_config)
    with SpeechTestContext() as (_, db):
        assert manager.record_request_result(db, "00000000-0000-4000-8000-000000000001", "tts", "azure", "success", characters_used=42)
        assert not manager.record_request_result(db, "00000000-0000-4000-8000-000000000001", "tts", "azure", "success", characters_used=42)
        assert manager.record_request_result(db, "00000000-0000-4000-8000-000000000002", "tts", "azure", "success", was_cached=True)
        assert manager.record_request_result(db, "00000000-0000-4000-8000-000000000003", "tts", "browser", "success", characters_used=500)
        assert manager.record_request_result(db, "00000000-0000-4000-8000-000000000004", "stt", "azure", "success", audio_seconds_used=17)
        assert manager.record_request_result(db, "00000000-0000-4000-8000-000000000005", "stt", "browser", "success", audio_seconds_used=90)

        tts = manager.get_or_create_monthly_usage(db, "tts")
        stt = manager.get_or_create_monthly_usage(db, "stt")
        assert (tts.characters_used, tts.successful_requests, tts.cached_requests) == (42, 2, 1)
        assert (stt.audio_seconds_used, stt.successful_requests) == (17, 1)


def test_monthly_records_are_separate_and_history_is_preserved(monkeypatch):
    monkeypatch.setattr(manager, "get_settings", fake_config)
    with SpeechTestContext() as (_, db):
        june = manager.get_or_create_monthly_usage(db, "tts", period=date(2026, 6, 1))
        june.characters_used = 123
        july = manager.get_or_create_monthly_usage(db, "tts", period=date(2026, 7, 1))
        db.commit()
        assert june.id != july.id
        rows = list(db.scalars(select(SpeechUsage).order_by(SpeechUsage.billing_period)).all())
        assert [(row.billing_period, row.characters_used) for row in rows] == [
            (date(2026, 6, 1), 123),
            (date(2026, 7, 1), 0),
        ]


def test_automatic_manual_and_failure_fallback(monkeypatch):
    monkeypatch.setattr(manager, "get_settings", fake_config)
    with SpeechTestContext() as (_, db):
        settings = manager.get_or_create_provider_settings(db)
        usage = manager.get_or_create_monthly_usage(db, "tts")
        usage.characters_used = 400000
        db.commit()
        warning = manager.resolve_provider(db, "tts")
        assert warning.provider == "azure"
        assert warning.status == "warning"

        usage.characters_used = 475000
        db.commit()
        critical = manager.resolve_provider(db, "tts")
        assert critical.provider == "browser"
        assert critical.status == "critical"

        settings.tts_mode = "azure"
        db.commit()
        assert manager.resolve_provider(db, "tts").provider == "azure"
        settings.tts_mode = "browser"
        db.commit()
        assert manager.resolve_provider(db, "tts").provider == "browser"

        settings.tts_mode = "automatic"
        usage.characters_used = 0
        db.commit()
        manager.handle_provider_failure(
            db,
            "00000000-0000-4000-8000-000000000006",
            "tts",
            "Azure service unavailable",
        )
        decision = manager.resolve_provider(db, "tts")
        assert decision.provider == "browser"
        assert decision.status == "unavailable"
        assert db.scalar(select(SpeechProviderEvent).where(SpeechProviderEvent.event_type == "provider_failure"))


def test_admin_dashboard_and_settings_permissions(monkeypatch):
    monkeypatch.setattr(manager, "get_settings", fake_config)
    with SpeechTestContext() as (client, db):
        user = make_user(db, "user-speech@example.com")
        admin = make_user(db, "admin-speech@example.com", "admin")
        payload = SpeechProviderSettingsUpdate(
            tts_mode="browser",
            stt_mode="automatic",
            azure_tts_monthly_limit=600000,
            azure_stt_monthly_limit_seconds=20000,
            warning_threshold_percent=75,
            switch_threshold_percent=90,
        ).model_dump()
        assert client.put("/api/admin/speech-providers/settings", headers=headers(user), json=payload).status_code == 403
        updated = client.put("/api/admin/speech-providers/settings", headers=headers(admin), json=payload)
        assert updated.status_code == 200
        assert updated.json()["tts_mode"] == "browser"

        dashboard = client.get("/api/admin/speech-providers", headers=headers(admin))
        assert dashboard.status_code == 200
        body = dashboard.json()
        assert body["estimate_notice"] == "Estimated Azure usage based on ASSIST-AI requests."
        assert body["tts"]["current_provider"] == "browser"
        assert body["tts"]["remaining"] == 600000
        assert body["settings"]["warning_threshold_percent"] == 75


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
        payload = routing_payload(db)
        for item in payload.capabilities:
            if item.service_type == "stt":
                item.priority = {"soniox": 1, "azure": 2, "browser": 3}[item.provider_key]
        manager.save_global_routing(db, payload, admin.id)
        assert manager.get_provider_chain(db, "stt")[0].provider == "soniox"

        automatic = routing_payload(db)
        for item in automatic.capabilities:
            if item.provider_key == "azure" and item.service_type == "stt":
                item.enabled = False
        manager.save_global_routing(db, automatic, admin.id)
        assert manager.get_provider_chain(db, "stt")[0].provider == "soniox"


def test_threshold_fallback_and_browser_unlimited(monkeypatch):
    monkeypatch.setattr(manager, "get_settings", fake_config)
    with SpeechTestContext() as (_, db):
        configs = manager.ensure_capability_configs(db)
        azure = next(item for item in configs if item.provider_key == "azure" and item.service_type == "stt")
        soniox = next(item for item in configs if item.provider_key == "soniox" and item.service_type == "stt")
        browser = next(item for item in configs if item.provider_key == "browser" and item.service_type == "stt")
        azure_usage = manager.get_or_create_provider_usage(db, azure)
        azure_usage.audio_seconds_used = int(azure.quota_limit * 0.8)
        assert manager.capability_quota_status(azure, azure_usage) == "warning"
        azure_usage.audio_seconds_used = int(azure.quota_limit * 0.95)
        assert manager.get_provider_chain(db, "stt")[0].provider == "soniox"
        soniox_usage = manager.get_or_create_provider_usage(db, soniox)
        soniox_usage.audio_seconds_used = int(soniox.quota_limit * 0.95)
        assert manager.get_provider_chain(db, "stt")[0].provider == "browser"
        browser_usage = manager.get_or_create_provider_usage(db, browser)
        browser_usage.successful_requests = 1000000
        assert manager.capability_quota_status(browser, browser_usage) == "unlimited"


def test_tts_threshold_falls_back_from_azure_to_soniox_then_browser(monkeypatch):
    monkeypatch.setattr(manager, "get_settings", fake_config)
    with SpeechTestContext() as (_, db):
        configs = manager.ensure_capability_configs(db)
        azure = next(item for item in configs if item.provider_key == "azure" and item.service_type == "tts")
        soniox = next(item for item in configs if item.provider_key == "soniox" and item.service_type == "tts")
        azure_usage = manager.get_or_create_provider_usage(db, azure)
        azure_usage.characters_used = int(azure.quota_limit * 0.95)
        assert manager.get_provider_chain(db, "tts")[0].provider == "soniox"
        soniox_usage = manager.get_or_create_provider_usage(db, soniox)
        soniox_usage.characters_used = int(soniox.quota_limit * 0.95)
        assert manager.get_provider_chain(db, "tts")[0].provider == "browser"


def test_absolute_warning_emails_once_and_switches_to_next_priority(monkeypatch):
    monkeypatch.setattr(manager, "get_settings", fake_config)
    sent_emails = []
    monkeypatch.setattr(
        manager,
        "send_speech_quota_warning_email",
        lambda *args: sent_emails.append(args),
    )
    with SpeechTestContext() as (_, db):
        azure = next(
            item
            for item in manager.ensure_capability_configs(db)
            if item.provider_key == "azure" and item.service_type == "tts"
        )
        azure.quota_limit = 100
        azure.warning_threshold_value = 10
        azure.switch_threshold_value = 20
        db.commit()

        assert manager.record_request_result(
            db, "00000000-0000-4000-8000-000000000101", "tts", "azure", "success", characters_used=12
        )
        assert len(sent_emails) == 1
        assert manager.get_provider_chain(db, "tts")[0].provider == "azure"

        assert manager.record_request_result(
            db, "00000000-0000-4000-8000-000000000102", "tts", "azure", "success", characters_used=5
        )
        assert len(sent_emails) == 1

        assert manager.record_request_result(
            db, "00000000-0000-4000-8000-000000000103", "tts", "azure", "success", characters_used=3
        )
        assert manager.get_provider_chain(db, "tts")[0].provider == "soniox"
        switch_event = db.scalar(
            select(SpeechProviderEvent).where(
                SpeechProviderEvent.event_type == "switch_threshold_reached",
                SpeechProviderEvent.provider_key == "azure",
            )
        )
        assert switch_event is not None
        assert switch_event.new_provider == "soniox"
        assert switch_event.threshold_at_event == 20


def test_missing_soniox_tts_rebalances_legacy_priorities(monkeypatch):
    monkeypatch.setattr(manager, "get_settings", fake_config)
    with SpeechTestContext() as (_, db):
        configs = manager.ensure_capability_configs(db)
        soniox = next(item for item in configs if item.provider_key == "soniox" and item.service_type == "tts")
        browser = next(item for item in configs if item.provider_key == "browser" and item.service_type == "tts")
        db.delete(soniox)
        db.flush()
        browser.priority = 2
        db.commit()

        restored = [item for item in manager.ensure_capability_configs(db) if item.service_type == "tts"]
        db.commit()

        assert [(item.provider_key, item.priority) for item in restored] == [
            ("azure", 1),
            ("soniox", 2),
            ("browser", 3),
        ]


def test_custom_billing_period_starts_at_zero_and_keeps_history(monkeypatch):
    monkeypatch.setattr(manager, "get_settings", fake_config)
    with SpeechTestContext() as (_, db):
        azure = next(item for item in manager.ensure_capability_configs(db) if item.provider_key == "azure" and item.service_type == "tts")
        azure.billing_period_type = "custom_monthly"
        azure.reset_day = 15
        june = manager.get_or_create_provider_usage(db, azure, moment=datetime(2026, 6, 20, tzinfo=timezone.utc))
        june.characters_used = 700
        july = manager.get_or_create_provider_usage(db, azure, moment=datetime(2026, 7, 20, tzinfo=timezone.utc))
        assert june.billing_period == date(2026, 6, 15)
        assert july.billing_period == date(2026, 7, 15)
        assert july.characters_used == 0
        assert db.query(SpeechUsage).filter(SpeechUsage.provider == "azure", SpeechUsage.service_type == "tts").count() == 2


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
        assert [item.provider_key for item in tts] == ["azure", "soniox", "browser"]


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
            item["priority"] = {"soniox": 1, "azure": 2, "browser": 3}[item["provider_key"]]
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
