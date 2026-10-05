from types import SimpleNamespace

import httpx
import pytest

from app.services import soniox_service


def soniox_config():
    return SimpleNamespace(
        soniox_api_key="private-test-key",
        soniox_stt_model="stt-async-preview",
        soniox_tts_model="tts-rt-v1",
        soniox_tts_voice="Adrian",
        soniox_api_timeout_seconds=30,
    )


def test_name_language_hints_prioritize_ui_language_but_remain_multilingual():
    assert soniox_service.get_soniox_language_hints("tr", "name") == [
        "tr", "en", "es", "de", "pt", "fr",
    ]


def test_pin_language_hints_only_use_selected_supported_language():
    assert soniox_service.get_soniox_language_hints("de", "pin") == ["de"]


def test_confirmation_language_hints_remain_multilingual():
    assert soniox_service.get_soniox_language_hints("fr", "confirmation") == [
        "fr", "en", "es", "de", "tr", "pt",
    ]


@pytest.mark.parametrize("name", ["Sahar Zar", "Ceyda \u00d6zt\u00fcrk", "Fran\u00e7ois D'Arc", "Jo\u00e3o-Silva"])
def test_supported_latin_names_are_accepted(name):
    result = soniox_service.parse_soniox_transcript(
        {"text": name, "tokens": [{"text": name, "confidence": 0.9, "language": "tr"}]},
        "name",
    )
    assert result.transcript == name
    assert result.detected_language == "tr"


@pytest.mark.parametrize("punctuated", ["Sahar Zar.", "Sahar Zar!", "Sahar Zar,", "Sahar Zar\u2026"])
def test_terminal_punctuation_is_removed_before_name_validation(punctuated):
    result = soniox_service.parse_soniox_transcript(
        {"text": punctuated, "tokens": [{"text": punctuated, "confidence": 0.9, "language": "en"}]},
        "name",
    )
    assert result.transcript == "Sahar Zar"


def test_unrelated_script_is_rejected_in_name_mode():
    result = soniox_service.parse_soniox_transcript(
        {"text": "\u0928\u092e\u0938\u094d\u0924\u0947", "tokens": [{"text": "\u0928\u092e\u0938\u094d\u0924\u0947", "confidence": 0.94, "language": "hi"}]},
        "name",
    )
    assert result.transcript == ""
    assert result.detected_language is None


def test_low_confidence_name_is_rejected_instead_of_guessed():
    result = soniox_service.parse_soniox_transcript(
        {"text": "Sahar", "tokens": [{"text": "Sahar", "confidence": 0.2, "language": "en"}]},
        "name",
    )
    assert result.transcript == ""
    assert result.confidence == pytest.approx(0.2)


def test_soniox_tts_uses_backend_key_and_returns_mp3(monkeypatch):
    captured = {}

    def fake_post(url, **kwargs):
        captured["url"] = url
        captured.update(kwargs)
        return httpx.Response(200, content=b"mp3-audio", request=httpx.Request("POST", url))

    monkeypatch.setattr(soniox_service, "get_settings", soniox_config)
    monkeypatch.setattr(soniox_service.httpx, "post", fake_post)

    result = soniox_service.synthesize_soniox_tts("Merhaba", "tr", "request-1")

    assert result == b"mp3-audio"
    assert captured["url"] == "https://tts-rt.soniox.com/tts"
    assert captured["headers"]["Authorization"] == "Bearer private-test-key"
    assert captured["json"] == {
        "model": "tts-rt-v1",
        "language": "tr",
        "voice": "Adrian",
        "audio_format": "mp3",
        "text": "Merhaba",
        "client_reference_id": "request-1",
    }


def test_soniox_tts_cache_voice_is_versioned(monkeypatch):
    monkeypatch.setattr(soniox_service, "get_settings", soniox_config)

    assert soniox_service.get_soniox_tts_cache_voice() == "soniox:tts-rt-v1:Adrian:v2"


@pytest.mark.parametrize("field", ["message", "error_message"])
def test_provider_error_diagnostics_redact_credentials(monkeypatch, field):
    monkeypatch.setattr(soniox_service, "get_settings", soniox_config)
    response = httpx.Response(401, json={field: "Invalid api_key=private-test-key; Authorization: Bearer synthetic-header-token"})
    with pytest.raises(soniox_service.SonioxProviderError) as error:
        soniox_service._raise_for_soniox(response)
    assert "private-test-key" not in error.value.detail
    assert "synthetic-header-token" not in error.value.detail
    assert "[REDACTED]" in error.value.detail


def test_async_transcription_failure_redacts_credentials(monkeypatch):
    class Client:
        def __init__(self, **kwargs):
            pass
        def __enter__(self):
            return self
        def __exit__(self, *args):
            pass
        def post(self, url, **kwargs):
            return httpx.Response(200, json={"id": "synthetic-id"})
        def get(self, url):
            return httpx.Response(200, json={"status": "failed", "error_message": "Rejected private-test-key"})
        def delete(self, url):
            return httpx.Response(200)
    monkeypatch.setattr(soniox_service, "get_settings", soniox_config)
    monkeypatch.setattr(soniox_service.httpx, "Client", Client)
    with pytest.raises(soniox_service.SonioxProviderError) as error:
        soniox_service.recognize_soniox_stt(b"audio", "audit-request", "en", "name")
    assert error.value.detail == "Rejected [REDACTED]"


def test_error_credentials_do_not_reach_api_responses_or_stored_events(monkeypatch):
    from app.routes import tts as tts_routes
    from app.services import speech_provider_manager as manager
    from app.models import SpeechProviderEvent
    from test_speech_provider_manager import SpeechTestContext, fake_config, headers, make_user

    monkeypatch.setattr(manager, "get_settings", fake_config)
    monkeypatch.setattr(soniox_service, "get_settings", soniox_config)
    monkeypatch.setattr(soniox_service.httpx, "post", lambda *args, **kwargs: httpx.Response(
        401, json={"message": "Invalid Authorization: Bearer private-test-key"},
    ))
    monkeypatch.setattr(tts_routes, "synthesize_tts_with_cache", lambda *args, **kwargs:
                        soniox_service.synthesize_soniox_tts("Hello", "en", "audit-request"))
    with SpeechTestContext() as (client, db):
        admin = make_user(db, "credential-audit@example.com", "admin")
        response = client.post("/api/tts", headers={**headers(admin), "X-Browser-Speech-Supported": "false"},
                               json={"text": "Hello", "language": "en"})
        assert response.status_code == 503
        assert "private-test-key" not in response.text
        events = db.query(SpeechProviderEvent).filter_by(event_type="provider_failure").all()
        assert events
        assert all("private-test-key" not in event.reason for event in events)
        dashboard = client.get("/api/admin/speech-providers/global", headers=headers(admin))
        assert dashboard.status_code == 200
        assert "private-test-key" not in dashboard.text


@pytest.mark.parametrize("status_code", [402, 429])
def test_soniox_tts_marks_quota_errors(monkeypatch, status_code):
    def fake_post(url, **kwargs):
        return httpx.Response(
            status_code,
            json={"message": "Usage limit reached"},
            request=httpx.Request("POST", url),
        )

    monkeypatch.setattr(soniox_service, "get_settings", soniox_config)
    monkeypatch.setattr(soniox_service.httpx, "post", fake_post)

    with pytest.raises(soniox_service.SonioxProviderError) as error:
        soniox_service.synthesize_soniox_tts("Hello", "en", "request-2")

    assert error.value.quota_error is True
