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


class ComputerVisionSessionDetail(BaseModel):
    session: ComputerVisionSessionRead
    samples: list[ComputerVisionSampleRead]
    page: int
    page_size: int
