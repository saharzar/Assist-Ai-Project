from contextlib import AbstractContextManager
from datetime import date
from types import SimpleNamespace

from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.security import create_access_token
from app.database import Base, get_db
from app.main import app
from app.models import SpeechProviderEvent, SpeechUsage, User
from app.schemas.speech_provider import SpeechProviderSettingsUpdate
from app.services import speech_provider_manager as manager


def fake_config():
    return SimpleNamespace(
        azure_speech_key="test-key",
        azure_speech_region="test-region",
        azure_tts_monthly_limit_characters=500000,
        azure_stt_monthly_limit_seconds=18000,
        speech_warning_threshold_percent=80,
        speech_switch_threshold_percent=95,
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
        assert client.put("/admin/speech-providers/settings", headers=headers(user), json=payload).status_code == 403
        updated = client.put("/admin/speech-providers/settings", headers=headers(admin), json=payload)
        assert updated.status_code == 200
        assert updated.json()["tts_mode"] == "browser"

        dashboard = client.get("/admin/speech-providers", headers=headers(admin))
        assert dashboard.status_code == 200
        body = dashboard.json()
        assert body["estimate_notice"] == "Estimated Azure usage based on ASSIST-AI requests."
        assert body["tts"]["current_provider"] == "browser"
        assert body["tts"]["remaining"] == 600000
        assert body["settings"]["warning_threshold_percent"] == 75


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
