from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel


class ComputerVisionSessionRead(BaseModel):
    session_id: UUID
    actor_type: Literal["registered", "guest"]
    actor_reference: str
    display_name: str | None
    scenario_key: str
    scenario_session_id: UUID | None
    started_at: datetime
    ended_at: datetime
    duration_ms: int
    sample_count: int


class ComputerVisionSessionList(BaseModel):
    items: list[ComputerVisionSessionRead]
    total: int
    page: int
    page_size: int


class ComputerVisionSampleRead(BaseModel):
    timestamp: int
    yaw: float | None
    pitch: float | None
    roll: float | None
    estimatedEyeDirection: str | None
    isUserInteracting: bool


class HeadAxisSummary(BaseModel):
    minimum: float | None
    maximum: float | None
    mean: float | None
    standard_deviation: float | None
    range: float | None


class EyeDirectionSummary(BaseModel):
    count: int
    percentage: float


class ComputerVisionMetrics(BaseModel):
    total_samples: int
    valid_samples: int
    missing_samples: int
    interacting_samples: int
    interacting_percentage: float
    head_pose: dict[Literal["yaw", "pitch", "roll"], HeadAxisSummary]
    eye_direction: dict[Literal["left", "center", "right", "unknown"], EyeDirectionSummary]
    eye_direction_changes: int


class ComputerVisionSessionSummary(BaseModel):
    all_samples: ComputerVisionMetrics
    excluding_interaction: ComputerVisionMetrics


class ComputerVisionSessionDetail(BaseModel):
    session: ComputerVisionSessionRead
    summary: ComputerVisionSessionSummary
    samples: list[ComputerVisionSampleRead]
    page: int
    page_size: int
