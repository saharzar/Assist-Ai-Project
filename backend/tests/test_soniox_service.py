from types import SimpleNamespace

import httpx
import pytest

from app.services import soniox_service


def soniox_config():
    return SimpleNamespace(
        soniox_api_key="private-test-key",
        soniox_tts_model="tts-rt-v1",
        soniox_tts_voice="Adrian",
        soniox_api_timeout_seconds=30,
    )


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
