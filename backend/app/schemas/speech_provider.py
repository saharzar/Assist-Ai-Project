from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, Field, model_validator

SpeechMode = Literal["automatic", "azure", "browser"]
SpeechServiceType = Literal["tts", "stt"]


class SpeechProviderSettingsUpdate(BaseModel):
    tts_mode: SpeechMode
    stt_mode: SpeechMode
    azure_tts_monthly_limit: int = Field(ge=1, le=1000000000)
    azure_stt_monthly_limit_seconds: int = Field(ge=1, le=31536000)
    warning_threshold_percent: int = Field(ge=1, le=99)
    switch_threshold_percent: int = Field(ge=2, le=100)

    @model_validator(mode="after")
    def validate_threshold_order(self):
        if self.warning_threshold_percent >= self.switch_threshold_percent:
            raise ValueError("Warning threshold must be lower than switch threshold.")
        return self


class SpeechProviderSettingsRead(SpeechProviderSettingsUpdate):
    pass


class SpeechProviderResolution(BaseModel):
    service_type: SpeechServiceType
    provider: Literal["azure", "browser"]
    mode: SpeechMode
    status: Literal["normal", "warning", "critical", "quota_reached", "unavailable"]


class SpeechServiceSnapshot(BaseModel):
    service_type: SpeechServiceType
    current_provider: Literal["azure", "browser"]
    mode: SpeechMode
    used: int
    limit: int
    remaining: int
    usage_percent: float
    successful_requests: int
    failed_requests: int
    cached_requests: int
    billing_period: date
    reset_date: date
    status: Literal["normal", "warning", "critical", "quota_reached", "unavailable"]


class SpeechUsageHistoryRead(BaseModel):
    billing_period: date
    service_type: SpeechServiceType
    provider: str
    successful_requests: int
    failed_requests: int
    characters_used: int
    cached_requests: int
    audio_seconds_used: int


class SpeechProviderEventRead(BaseModel):
    id: int
    created_at: datetime
    service_type: SpeechServiceType
    event_type: str
    previous_provider: str | None
    new_provider: str | None
    reason: str
    administrator_name: str | None


class SpeechProviderDashboard(BaseModel):
    estimate_notice: str
    settings: SpeechProviderSettingsRead
    tts: SpeechServiceSnapshot
    stt: SpeechServiceSnapshot
    usage_history: list[SpeechUsageHistoryRead]
    events: list[SpeechProviderEventRead]
