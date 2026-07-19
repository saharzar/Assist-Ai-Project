import time

import httpx
from fastapi import HTTPException, status

from app.core.config import get_settings

SONIOX_BASE_URL = "https://api.soniox.com/v1"
QUOTA_STATUS_CODES = {402, 429}


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


def recognize_soniox_stt(audio: bytes, request_id: str) -> str:
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
                    return str(transcript.json().get("text", "")).strip()
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
