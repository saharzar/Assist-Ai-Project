from typing import Annotated, Literal
from uuid import UUID

from pydantic import AwareDatetime, BaseModel, ConfigDict, Field, StrictBool, model_validator

Angle = Annotated[float, Field(strict=True, ge=-180, le=180, allow_inf_nan=False)]


class ComputerVisionSampleCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    timestamp: Annotated[int, Field(strict=True, ge=0)]
    yaw: Annotated[float, Field(strict=True, ge=-90, le=90, allow_inf_nan=False)] | None
    pitch: Angle | None
    roll: Angle | None
    estimated_eye_direction: Literal["left", "center", "right"] | None = Field(alias="estimatedEyeDirection")
    is_user_interacting: StrictBool = Field(alias="isUserInteracting")

    @model_validator(mode="after")
    def consistent_missing_data(self):
        missing = [self.yaw is None, self.pitch is None, self.roll is None]
        if any(missing) and not all(missing):
            raise ValueError("Head angles must either all be present or all be null.")
        if all(missing) and self.estimated_eye_direction is not None:
            raise ValueError("Eye direction must be null when head data is unavailable.")
        return self


class ComputerVisionSessionCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    client_session_id: UUID
    consent: StrictBool
    scenario_key: Literal["atm-withdrawal", "online-bill-payment"]
    scenario_session_id: UUID | None = None
    started_at: AwareDatetime
    ended_at: AwareDatetime
    duration_ms: Annotated[int, Field(strict=True, ge=0, le=86_400_000)]
    samples: list[ComputerVisionSampleCreate] = Field(min_length=1, max_length=20_000)

    @model_validator(mode="after")
    def valid_session_timing(self):
        duration = (self.ended_at - self.started_at).total_seconds() * 1000
        if duration < 0 or abs(duration - self.duration_ms) > 2:
            raise ValueError("Session start, end, and duration must agree.")
        previous = -1
        for sample in self.samples:
            if sample.timestamp <= previous or sample.timestamp > self.duration_ms:
                raise ValueError("Sample timestamps must increase and remain within the session duration.")
            previous = sample.timestamp
        return self


class ComputerVisionSessionSaved(BaseModel):
    session_id: UUID
    saved: bool
    sample_count: int
