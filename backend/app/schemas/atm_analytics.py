from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field, model_validator

AtmCompletionStatus = Literal["in_progress", "completed", "abandoned"]
AtmInputMode = Literal["voice", "keyboard"]
AtmPinOutcome = Literal["simulated_system_error", "incorrect", "success"]


class AtmSessionStart(BaseModel):
    scenario_type: Literal["atm-withdrawal"] = "atm-withdrawal"
    selected_language: str = Field(default="en", min_length=2, max_length=8)


class AtmSessionStartResponse(BaseModel):
    tracking_enabled: bool
    session_id: str | None = None


class AtmSessionEventCreate(BaseModel):
    client_event_id: UUID
    event_type: Literal["progress", "pin_submission", "card_pin_submission", "input_mode", "identity_verification", "returned_to_pin"]
    pin_outcome: AtmPinOutcome | None = None
    final_step_reached: str | None = Field(default=None, max_length=32)
    input_mode: AtmInputMode | None = None
    stt_provider: str | None = Field(default=None, max_length=32)
    verification_outcome: Literal["failed", "success"] | None = None

    @model_validator(mode="after")
    def validate_event_fields(self):
        if self.event_type in {"pin_submission", "card_pin_submission"} and self.pin_outcome is None:
            raise ValueError("pin_outcome is required for PIN submissions")
        if self.event_type == "progress" and self.final_step_reached is None:
            raise ValueError("final_step_reached is required for progress events")
        if self.event_type == "input_mode" and self.input_mode is None:
            raise ValueError("input_mode is required for input events")
        if self.event_type == "identity_verification" and self.verification_outcome is None:
            raise ValueError("verification_outcome is required for identity verification events")
        return self


class AtmSessionFinish(BaseModel):
    final_step_reached: str = Field(min_length=1, max_length=32)


class AtmSessionTerminate(BaseModel):
    reason: Literal["verification_failed", "pin_failed_after_verification", "card_pin_failed"]


class AtmSessionRead(BaseModel):
    session_id: str
    completion_status: AtmCompletionStatus
    success: bool
    duration_seconds: int | None
    incorrect_user_pin_count: int
    simulated_system_error_count: int
    total_pin_submission_count: int
    retry_count: int
    final_step_reached: str
    first_pin_was_correct: bool | None
    identity_verification_attempt_count: int
    incorrect_identity_verification_count: int
    identity_verification_succeeded: bool
    returned_to_pin_after_verification: bool
    security_terminated: bool
    termination_reason: str | None


class AtmAnalyticsSummary(BaseModel):
    total_sessions: int
    successful_sessions: int
    abandoned_sessions: int
    in_progress_sessions: int
    success_rate: float
    average_completion_seconds: float
    average_incorrect_pin_attempts: float
    average_retries: float
    registered_user_sessions: int
    consenting_guest_sessions: int
    unsuccessful_sessions: int
    security_terminated_sessions: int
    average_pin_attempts: float
    average_verification_attempts: float
    returned_to_pin_sessions: int
    correct_first_pin_sessions: int
    incorrect_first_pin_sessions: int


class AtmAdminSessionRead(BaseModel):
    session_id: str
    actor_type: Literal["registered", "guest"]
    actor_reference: str
    display_name: str
    scenario_type: str
    started_at: datetime
    completed_at: datetime | None
    duration_seconds: int | None
    incorrect_user_pin_count: int
    simulated_system_error_count: int
    total_pin_submission_count: int
    retry_count: int
    completion_status: AtmCompletionStatus
    success: bool
    selected_language: str | None
    stt_provider: str | None
    used_voice_input: bool
    used_keyboard_input: bool
    final_step_reached: str
    first_pin_was_correct: bool | None
    identity_verification_attempt_count: int
    incorrect_identity_verification_count: int
    identity_verification_succeeded: bool
    returned_to_pin_after_verification: bool
    security_terminated: bool
    termination_reason: str | None
