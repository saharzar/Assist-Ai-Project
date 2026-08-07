from dataclasses import dataclass
import time
import unicodedata

import httpx
from fastapi import HTTPException, status

from app.core.config import get_settings

SONIOX_BASE_URL = "https://api.soniox.com/v1"
SONIOX_TTS_URL = "https://tts-rt.soniox.com/tts"
QUOTA_STATUS_CODES = {402, 429}
SUPPORTED_STT_LANGUAGES = ("en", "es", "de", "tr", "pt", "fr")
MIN_NAME_CONFIDENCE = 0.35
NAME_EDGE_PUNCTUATION = " \t\r\n.,!?;:\u2026"


@dataclass(frozen=True)
class SonioxSttResult:
    transcript: str
    detected_language: str | None = None
    confidence: float | None = None


class SonioxProviderError(HTTPException):
    def __init__(self, status_code: int, detail: str, *, quota_error: bool = False):
        super().__init__(status_code=status_code, detail=detail)
        self.quota_error = quota_error


def _raise_for_soniox(response: httpx.Response) -> None:
    if response.is_success:
        return
    try:
        body = response.json()
        message = body.get("message") or body.get("error_message") or "Soniox request failed."
    except ValueError:
        message = "Soniox request failed."
    raise SonioxProviderError(
        status.HTTP_503_SERVICE_UNAVAILABLE,
        message,
        quota_error=response.status_code in QUOTA_STATUS_CODES,
    )


def get_soniox_language_hints(language: str, mode: str) -> list[str]:
    preferred = language if language in SUPPORTED_STT_LANGUAGES else "en"
    if mode == "pin":
        return [preferred]
    return [preferred, *(candidate for candidate in SUPPORTED_STT_LANGUAGES if candidate != preferred)]


def is_supported_name_text(value: str) -> bool:
    has_letter = False
    for character in value.strip():
        if character.isalpha():
            has_letter = True
            if not unicodedata.name(character, "").startswith("LATIN"):
                return False
        elif not (character.isspace() or character in "-'\u2019"):
            return False
    return has_letter


def parse_soniox_transcript(payload: dict, mode: str) -> SonioxSttResult:
    transcript = str(payload.get("text", "")).strip()
    if mode == "name":
        transcript = transcript.strip(NAME_EDGE_PUNCTUATION)
    tokens = payload.get("tokens") if isinstance(payload.get("tokens"), list) else []
    confidences = [
        float(token["confidence"])
        for token in tokens
        if isinstance(token, dict) and isinstance(token.get("confidence"), (int, float))
    ]
    confidence = sum(confidences) / len(confidences) if confidences else None
    detected_languages = [
        str(token["language"])
        for token in tokens
        if isinstance(token, dict) and token.get("language") in SUPPORTED_STT_LANGUAGES
    ]
    detected_language = max(set(detected_languages), key=detected_languages.count) if detected_languages else None

    if mode == "name" and (
        not is_supported_name_text(transcript)
        or (confidence is not None and confidence < MIN_NAME_CONFIDENCE)
    ):
        return SonioxSttResult("", detected_language, confidence)
    return SonioxSttResult(transcript, detected_language, confidence)


def recognize_soniox_stt(audio: bytes, request_id: str, language: str, mode: str) -> SonioxSttResult:
    settings = get_settings()
    if not settings.soniox_api_key:
        raise SonioxProviderError(status.HTTP_503_SERVICE_UNAVAILABLE, "Soniox STT is not configured.")
    headers = {"Authorization": f"Bearer {settings.soniox_api_key}"}
    timeout = httpx.Timeout(settings.soniox_api_timeout_seconds)
    file_id: str | None = None
    transcription_id: str | None = None
    try:
        with httpx.Client(headers=headers, timeout=timeout) as client:
            upload = client.post(
                f"{SONIOX_BASE_URL}/files",
                files={"file": ("speech.wav", audio, "audio/wav")},
                data={"client_reference_id": request_id},
            )
            _raise_for_soniox(upload)
            file_id = upload.json()["id"]
            create = client.post(
                f"{SONIOX_BASE_URL}/transcriptions",
                json={
                    "model": settings.soniox_stt_model,
                    "file_id": file_id,
                    "language_hints": get_soniox_language_hints(language, mode),
                    "language_hints_strict": True,
                    "enable_language_identification": True,
                    "context": (
                        "The speaker says a person's full name only."
                        if mode == "name"
                        else "The speaker confirms or rejects a name using a short yes or no phrase."
                        if mode == "confirmation"
                        else "The speaker says exactly two individual alphabet letters."
                        if mode == "letters"
                        else "The speaker says digits only."
                    ),
                    "client_reference_id": request_id,
                },
            )
            _raise_for_soniox(create)
            transcription_id = create.json()["id"]
            deadline = time.monotonic() + settings.soniox_api_timeout_seconds
            while time.monotonic() < deadline:
                job = client.get(f"{SONIOX_BASE_URL}/transcriptions/{transcription_id}")
                _raise_for_soniox(job)
                state = job.json()
                if state.get("status") == "completed":
                    transcript = client.get(f"{SONIOX_BASE_URL}/transcriptions/{transcription_id}/transcript")
                    _raise_for_soniox(transcript)
                    return parse_soniox_transcript(transcript.json(), mode)
                if state.get("status") in {"error", "failed"}:
                    raise SonioxProviderError(
                        status.HTTP_503_SERVICE_UNAVAILABLE,
                        str(state.get("error_message") or "Soniox transcription failed."),
                    )
                time.sleep(0.25)
            raise SonioxProviderError(status.HTTP_504_GATEWAY_TIMEOUT, "Soniox transcription timed out.")
    except httpx.HTTPError as exc:
        raise SonioxProviderError(status.HTTP_503_SERVICE_UNAVAILABLE, "Soniox STT is unavailable.") from exc
    finally:
        if settings.soniox_api_key:
            try:
                with httpx.Client(headers=headers, timeout=5) as client:
                    if transcription_id:
                        client.delete(f"{SONIOX_BASE_URL}/transcriptions/{transcription_id}")
                    if file_id:
                        client.delete(f"{SONIOX_BASE_URL}/files/{file_id}")
            except httpx.HTTPError:
                pass


def synthesize_soniox_tts(text: str, language: str, request_id: str) -> bytes:
    settings = get_settings()
    if not settings.soniox_api_key:
        raise SonioxProviderError(status.HTTP_503_SERVICE_UNAVAILABLE, "Soniox TTS is not configured.")
    try:
        response = httpx.post(
            SONIOX_TTS_URL,
            headers={
                "Authorization": f"Bearer {settings.soniox_api_key}",
                "X-Request-Id": request_id,
            },
            json={
                "model": settings.soniox_tts_model,
                "language": language,
                "voice": settings.soniox_tts_voice,
                "audio_format": "mp3",
                "text": text,
                "client_reference_id": request_id,
            },
            timeout=settings.soniox_api_timeout_seconds,
        )
        _raise_for_soniox(response)
        return response.content
    except httpx.HTTPError as exc:
        raise SonioxProviderError(status.HTTP_503_SERVICE_UNAVAILABLE, "Soniox TTS is unavailable.") from exc


def get_soniox_tts_cache_voice() -> str:
    settings = get_settings()
    # Bump the cache namespace when the playback pipeline changes so older
    # generated files cannot keep breaking only certain languages or screens.
    return f"soniox:{settings.soniox_tts_model}:{settings.soniox_tts_voice}:v2"
