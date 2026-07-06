from typing import Literal

from pydantic import BaseModel, Field


TtsLanguage = Literal["en", "es", "de", "tr", "pt", "fr"]


class TtsRequest(BaseModel):
    text: str = Field(min_length=1)
    language: TtsLanguage = "en"


class TtsUsageResponse(BaseModel):
    tts_limit_characters: int
    tts_used_characters: int
    tts_remaining_characters: int
