from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, Field, model_validator

SpeechMode = Literal["automatic", "azure", "browser"]
SpeechServiceType = Literal["tts", "stt"]
ProviderKey = Literal["azure", "soniox", "browser"]
BillingPeriodType = Literal["calendar_month", "custom_monthly", "no_reset", "manual"]


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


class SpeechCapabilityConfigUpdate(BaseModel):
    provider_key: ProviderKey
    service_type: SpeechServiceType
    enabled: bool
    priority: int = Field(ge=1, le=20)
    quota_limit: int | None = Field(default=None, ge=1, le=1000000000)
    warning_threshold_value: int = Field(ge=1, le=1000000000)
    switch_threshold_value: int = Field(ge=2, le=1000000000)
    billing_period_type: BillingPeriodType
    reset_day: int | None = Field(default=None, ge=1, le=28)

    @model_validator(mode="after")
    def validate_capability(self):
        if self.warning_threshold_value >= self.switch_threshold_value:
            raise ValueError("Warning threshold must be lower than switch threshold.")
        if self.quota_limit is not None and self.switch_threshold_value > self.quota_limit:
            raise ValueError("Switch threshold cannot exceed the quota limit.")
        if self.billing_period_type == "custom_monthly" and self.reset_day is None:
            raise ValueError("Custom monthly periods require a reset day.")
        return self


class GlobalSpeechRoutingUpdate(BaseModel):
    capabilities: list[SpeechCapabilityConfigUpdate]

    @model_validator(mode="after")
    def validate_orders(self):
        for service in ("tts", "stt"):
            items = [item for item in self.capabilities if item.service_type == service]
            keys = [item.provider_key for item in items]
            priorities = [item.priority for item in items]
            if len(keys) != len(set(keys)) or len(priorities) != len(set(priorities)):
                raise ValueError(f"{service.upper()} providers and priorities must be unique.")
            if not any(item.enabled for item in items):
                raise ValueError(f"At least one {service.upper()} provider must remain enabled.")
        return self


class SpeechCapabilityRead(BaseModel):
    provider_key: ProviderKey
    display_name: str
    service_type: SpeechServiceType
    enabled: bool
    available: bool
    configured: bool
    priority: int
    quota_type: Literal["limited", "unlimited"]
    quota_limit: int | None
    usage_unit: str
    warning_threshold_percent: int
    switch_threshold_percent: int
    warning_threshold_value: int
    switch_threshold_value: int
    billing_period_type: BillingPeriodType
    reset_day: int | None
    health_status: str
    quota_status: str
    used: int
    remaining: int | None
    usage_percent: float | None
    period_start: date
    period_end: date | None
    next_reset_date: date | None
    last_success_at: datetime | None
    last_failure_at: datetime | None


class GlobalSpeechRoutingRead(BaseModel):
    automatic_tts_routing_enabled: bool
    automatic_stt_routing_enabled: bool
    forced_tts_provider_key: ProviderKey | None
    forced_stt_provider_key: ProviderKey | None
    active_tts_provider: ProviderKey
    active_stt_provider: ProviderKey
    capabilities: list[SpeechCapabilityRead]


class SpeechProviderResolution(BaseModel):
    service_type: SpeechServiceType
    provider: ProviderKey
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


class GlobalSpeechDashboard(GlobalSpeechRoutingRead):
    estimate_notice: str
    usage_history: list[SpeechUsageHistoryRead]
    events: list[SpeechProviderEventRead]
