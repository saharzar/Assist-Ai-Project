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


@pytest.mark.parametrize("name", ["Sahar Zar", "Ceyda \u00d6zt\u00fcrk", "Fran\u00e7ois D'Arc", "Jo\u00e3o-Silva"])
def test_supported_latin_names_are_accepted(name):
    result = soniox_service.parse_soniox_transcript(
        {"text": name, "tokens": [{"text": name, "confidence": 0.9, "language": "tr"}]},
        "name",
    )
    assert result.transcript == name
    assert result.detected_language == "tr"


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
