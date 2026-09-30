import importlib.util
from pathlib import Path

import pytest
from alembic.migration import MigrationContext
from alembic.operations import Operations
from fastapi import HTTPException
from sqlalchemy import inspect, select, text

from app.models import SpeechProviderCapabilityConfig, SpeechProviderEvent, SpeechUsage
from app.routes import stt as stt_routes, tts as tts_routes
from app.services import speech_provider_manager as manager
from test_speech_provider_manager import SpeechTestContext, fake_config, headers, make_user


@pytest.mark.parametrize('service', ['tts', 'stt'])
@pytest.mark.parametrize('browser_supported', [True, False])
def test_soniox_failure_uses_only_browser_fallback(monkeypatch, service, browser_supported):
    monkeypatch.setattr(manager, 'get_settings', fake_config)
    def failed(*args, **kwargs):
        raise HTTPException(503, 'Speech service unavailable')
    monkeypatch.setattr(tts_routes, 'get_cached_tts_audio', lambda *args: None)
    monkeypatch.setattr(tts_routes, 'synthesize_tts_with_cache', failed)
    monkeypatch.setattr(stt_routes, 'recognize_soniox_stt', failed)
    monkeypatch.setattr(stt_routes, 'get_wav_duration_seconds', lambda audio: 1)
    with SpeechTestContext() as (client, db):
        user = make_user(db, 'fallback@test.example')
        request_headers = {**headers(user), 'X-Browser-Speech-Supported': str(browser_supported).lower()}
        if service == 'tts':
            response = client.post('/api/tts', headers=request_headers, json={'text': 'Hello', 'language': 'en'})
        else:
            response = client.post('/api/stt', headers={**request_headers, 'Content-Type': 'audio/wav'}, content=b'test-audio')
        assert response.status_code == (204 if browser_supported else 503)
        if browser_supported:
            assert response.headers['X-Speech-Provider'] == 'browser'
        failure = db.scalar(select(SpeechProviderEvent).where(SpeechProviderEvent.event_type == 'provider_failure'))
        assert failure.provider_key == 'soniox'


def test_removed_provider_cannot_be_selected_or_tested(monkeypatch):
    monkeypatch.setattr(manager, 'get_settings', fake_config)
    with SpeechTestContext() as (client, db):
        admin = make_user(db, 'admin@test.example', 'admin')
        response = client.post('/api/admin/speech-providers/test/tts/azure', headers=headers(admin))
        assert response.status_code == 422
        payload = client.get('/api/admin/speech-providers/global', headers=headers(admin)).json()
        assert {item['provider_key'] for item in payload['capabilities']} == {'soniox', 'browser'}
        payload['capabilities'][0]['provider_key'] = 'azure'
        assert client.put('/api/admin/speech-providers/global', headers=headers(admin), json=payload).status_code == 422


def test_removal_migration_preserves_usage_and_sets_supported_order(monkeypatch):
    monkeypatch.setattr(manager, 'get_settings', fake_config)
    path = Path(__file__).parents[1] / 'alembic/versions/20260930_0016_remove_azure_speech.py'
    spec = importlib.util.spec_from_file_location('remove_provider', path)
    migration = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(migration)
    with SpeechTestContext() as (_, db):
        configs = manager.ensure_capability_configs(db)
        db.commit()
        # Reconstruct the previous schema, then exercise the real upgrade.
        connection = db.connection()
        with Operations.context(MigrationContext.configure(connection)):
            migration.downgrade()
        db.commit()
        for service in ('tts', 'stt'):
            source = next(c for c in configs if c.provider_key == 'soniox' and c.service_type == service)
            values = {c.name: getattr(source, c.name) for c in source.__table__.columns if c.name != 'id'}
            values.update(provider_key='azure', display_name='Microsoft Azure', priority=3)
            db.add(SpeechProviderCapabilityConfig(**values))
        db.add(SpeechUsage(billing_period=manager.billing_period_for(), provider='azure', service_type='tts', characters_used=123))
        db.execute(text("UPDATE speech_provider_settings SET tts_mode='azure', stt_mode='azure', forced_tts_provider_key='azure', forced_stt_provider_key='azure'"))
        db.commit()
        with Operations.context(MigrationContext.configure(db.connection())):
            migration.upgrade()
        db.commit()
        db.expire_all()
        for service in ('tts', 'stt'):
            chain = manager.get_provider_chain(db, service)
            assert [item.provider for item in chain] == ['soniox', 'browser']
        columns = {c['name'] for c in inspect(db.connection()).get_columns('speech_provider_settings')}
        assert not any('azure' in name for name in columns)
        assert db.scalar(select(SpeechUsage).where(SpeechUsage.provider == 'azure')).characters_used == 123
        settings = manager.get_or_create_provider_settings(db)
        assert settings.forced_tts_provider_key is None and settings.forced_stt_provider_key is None
        assert len(db.scalars(select(SpeechProviderCapabilityConfig)).all()) == 4
