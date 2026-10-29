"""Restaurant waiter speech reuses the existing exact-text Soniox cache."""

from app.services import tts_service


class FakeSession:
    def commit(self):
        pass


def test_identical_final_text_avoids_second_provider_call_and_keys_are_separate(monkeypatch):
    saved = {}
    calls = []

    def cached(_db, text, language, voice):
        return saved.get(tts_service.get_tts_cache_key(text, language, voice))

    def save(_db, text, language, voice, audio):
        saved[tts_service.get_tts_cache_key(text, language, voice)] = tts_service.CachedTtsAudio(
            audio=audio, content_type="audio/mpeg", character_count=len(text))

    def synthesize(text, language, request_id, **kwargs):
        calls.append((text, language, kwargs.get("voice")))
        return b"audio"

    monkeypatch.setattr(tts_service, "get_cached_tts_audio", cached)
    monkeypatch.setattr(tts_service, "save_tts_audio_cache", save)
    monkeypatch.setattr(tts_service, "synthesize_soniox_tts", synthesize)
    db = FakeSession()
    voice = "soniox:tts-rt-v1:Emma:v2"
    phrase = "What would you like to add or change?"

    first = tts_service.synthesize_tts_with_cache(db, None, phrase, "en", cache_voice=voice)
    repeat = tts_service.synthesize_tts_with_cache(db, None, phrase, "en", cache_voice=voice)
    assert first.cache_status == "MISS" and repeat.cache_status == "HIT"
    assert len(calls) == 1

    tts_service.synthesize_tts_with_cache(db, None, phrase, "fr", cache_voice=voice)
    tts_service.synthesize_tts_with_cache(db, None, "What would you like to change?", "en", cache_voice=voice)
    tts_service.synthesize_tts_with_cache(db, None, phrase, "en", cache_voice="soniox:tts-rt-v1:Adrian:v2")
    assert len(calls) == 4
