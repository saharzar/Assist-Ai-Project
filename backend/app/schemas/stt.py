from datetime import date

from pydantic import BaseModel, Field


class SttUsageRequest(BaseModel):
    seconds: int = Field(ge=1, le=300)


class SttUsageResponse(BaseModel):
    stt_limit_seconds: int
    stt_used_seconds: int
    stt_remaining_seconds: int
    stt_reset_date: date


class SttRecognitionResponse(SttUsageResponse):
    transcript: str
    detected_language: str | None = None
    confidence: float | None = None
