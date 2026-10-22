"""Authenticated, text-only Restaurant waiter conversation."""

import logging
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.core.config import get_settings
from app.core.security import get_speech_actor
from app.services.restaurant_compact import PendingClarification
from app.services.restaurant_llm_service import RestaurantLLMFailure, RestaurantLLMService
from app.services.restaurant_tools import ApprovedAction, RestaurantSnapshot


router = APIRouter(prefix="/api/restaurant/waiter", tags=["Restaurant waiter"])
logger = logging.getLogger(__name__)
Language = Literal["en", "es", "de", "tr", "pt", "fr"]
MAX_USER_MESSAGE_LENGTH = 1200


class ChatTurn(BaseModel):
    model_config = ConfigDict(extra="forbid")
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=MAX_USER_MESSAGE_LENGTH)

    @field_validator("content", mode="before")
    @classmethod
    def trim_content(cls, value: str) -> str:
        return value.strip() if isinstance(value, str) else value


class WaiterChatRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    message: str = Field(min_length=1, max_length=MAX_USER_MESSAGE_LENGTH)
    language: Language
    history: list[ChatTurn] = Field(default_factory=list, max_length=4)
    state: RestaurantSnapshot
    pending: PendingClarification | None = None

    @field_validator("message", mode="before")
    @classmethod
    def trim_message(cls, value: str) -> str:
        return value.strip() if isinstance(value, str) else value


class WaiterChatResponse(BaseModel):
    reply: str
    actions: list[ApprovedAction]
    state: RestaurantSnapshot
    pending: PendingClarification | None = None


@router.post("/chat", response_model=WaiterChatResponse)
def chat_with_waiter(payload: WaiterChatRequest, actor=Depends(get_speech_actor)) -> WaiterChatResponse:
    # Authentication is checked by the dependency. Neither actor nor analytics data enters the provider payload.
    _ = actor
    service = RestaurantLLMService(get_settings())
    try:
        outcome = service.chat_with_tools(payload.message, payload.language,
                                          [turn.model_dump() for turn in payload.history], payload.state,
                                          payload.pending)
    except RestaurantLLMFailure as failure:
        logger.warning("restaurant_llm_request_failed reason=%s upstream_status=%s",
                       failure.kind, failure.upstream_status)
        if failure.kind == "rate_limit":
            headers = ({"Retry-After": str(failure.retry_after_seconds)}
                       if failure.retry_after_seconds is not None else None)
            raise HTTPException(429, "The waiter is busy right now. Please try again shortly.", headers=headers) from None
        if failure.kind == "timeout":
            raise HTTPException(504, "The waiter conversation service is temporarily unavailable.") from None
        raise HTTPException(503, "The waiter conversation service is temporarily unavailable.") from None
    return WaiterChatResponse(reply=outcome.reply, actions=outcome.actions, state=outcome.state,
                              pending=outcome.pending)
