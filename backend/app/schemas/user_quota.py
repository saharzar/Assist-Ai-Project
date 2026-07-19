from datetime import date, datetime
from typing import Literal
from pydantic import BaseModel, Field, model_validator

ServiceType = Literal["tts", "stt", "both"]

class QuotaRequestCreate(BaseModel):
    service_type: ServiceType
    requested_tts_characters: int | None = Field(default=None, gt=0, le=1000000)
    requested_stt_seconds: int | None = Field(default=None, gt=0, le=86400)
    reason: str = Field(min_length=10, max_length=500)
    @model_validator(mode="after")
    def validate_amounts(self):
        if self.service_type in {"tts", "both"} and self.requested_tts_characters is None: raise ValueError("TTS amount is required.")
        if self.service_type in {"stt", "both"} and self.requested_stt_seconds is None: raise ValueError("STT amount is required.")
        return self

class QuotaRequestReview(BaseModel):
    action: Literal["approve", "partial", "reject"]
    approved_tts_characters: int = Field(default=0, ge=0, le=1000000)
    approved_stt_seconds: int = Field(default=0, ge=0, le=86400)
    permanent: bool = False
    admin_response: str = Field(min_length=3, max_length=500)

class QuotaUpdate(BaseModel):
    tts_limit_characters: int | None = Field(default=None, ge=0, le=10000000)
    stt_limit_seconds: int | None = Field(default=None, ge=0, le=1000000)
    add_tts_characters: int = Field(default=0, ge=0, le=1000000)
    add_stt_seconds: int = Field(default=0, ge=0, le=86400)
    period_type: Literal["weekly", "monthly"] | None = None
    enabled: bool | None = None
    restore_default: bool = False
    reset_usage: bool = False
    reason: str = Field(min_length=3, max_length=500)

class BulkQuotaUpdate(QuotaUpdate):
    user_ids: list[int] = Field(min_length=1, max_length=1000)

class AllUsersQuotaUpdate(QuotaUpdate):
    scope: Literal["future_only", "default_users", "all_users"]

class QuotaRequestRead(BaseModel):
    id: int; user_id: int; service_type: str; requested_tts_characters: int | None; requested_stt_seconds: int | None
    reason: str; status: str; admin_response: str | None; approved_tts_characters: int | None; approved_stt_seconds: int | None
    reviewed_at: datetime | None; created_at: datetime
    model_config = {"from_attributes": True}

class UserQuotaRead(BaseModel):
    user_id: int; full_name: str; email: str; role: str
    tts_limit: int; tts_extra: int; tts_used: int; tts_remaining: int
    stt_limit: int; stt_extra: int; stt_used: int; stt_remaining: int
    period_type: str; period_start: date | None; reset_date: date | None; enabled: bool; uses_default: bool
    status: str; pending_request: QuotaRequestRead | None = None
