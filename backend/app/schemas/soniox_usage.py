from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, Field


class SonioxModelUsage(BaseModel):
    model: str
    cost_usd: Decimal = Field(ge=0, allow_inf_nan=False)
    requests: int = Field(ge=0)


class SonioxDailyUsage(BaseModel):
    date: date
    cost_usd: Decimal = Field(ge=0, allow_inf_nan=False)
    requests: int = Field(ge=0)


class SonioxUsageSummary(BaseModel):
    month: str
    period_start: datetime
    period_end: datetime
    updated_at: datetime
    total_cost_usd: Decimal = Field(ge=0, allow_inf_nan=False)
    total_requests: int = Field(ge=0)
    models: list[SonioxModelUsage]
    daily: list[SonioxDailyUsage]
