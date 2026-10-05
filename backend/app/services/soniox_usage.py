from datetime import date, datetime, timezone
from decimal import Decimal

import httpx
from fastapi import HTTPException
from pydantic import BaseModel, Field, model_validator

from app.core.config import get_settings
from app.schemas.soniox_usage import SonioxDailyUsage, SonioxModelUsage, SonioxUsageSummary

SONIOX_USAGE_URL = "https://api.soniox.com/v1/usage/summary"


class _UsageEntry(BaseModel):
    """Allowlist the documented fields; discard all other upstream data."""

    model: str | None = Field(max_length=128)
    days: list[date]
    total_cost_usd: Decimal = Field(ge=0, allow_inf_nan=False)
    total_num_requests: int = Field(ge=0, strict=True)
    cost_usd: list[Decimal] = Field(max_length=31)
    num_requests: list[int] = Field(max_length=31)

    @model_validator(mode="after")
    def aligned_daily_data(self):
        if not (len(self.days) == len(self.cost_usd) == len(self.num_requests)):
            raise ValueError("Unaligned daily usage.")
        if self.days != sorted(set(self.days)):
            raise ValueError("Invalid usage dates.")
        if any(not value.is_finite() or value < 0 for value in self.cost_usd):
            raise ValueError("Invalid daily cost.")
        if any(value < 0 for value in self.num_requests):
            raise ValueError("Invalid daily request count.")
        return self


class _UsageResponse(BaseModel):
    total: _UsageEntry
    models: list[_UsageEntry]


def fetch_current_month_soniox_usage(moment: datetime | None = None) -> SonioxUsageSummary:
    settings = get_settings()
    if not settings.soniox_api_key:
        raise HTTPException(status_code=503, detail="Soniox usage is not configured.")
    now = (moment or datetime.now(timezone.utc)).astimezone(timezone.utc)
    start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    end = start.replace(year=start.year + 1, month=1) if start.month == 12 else start.replace(month=start.month + 1)
    try:
        response = httpx.get(
            SONIOX_USAGE_URL,
            headers={"Authorization": f"Bearer {settings.soniox_api_key}"},
            params={"start_time": start.isoformat().replace("+00:00", "Z"), "end_time": end.isoformat().replace("+00:00", "Z")},
            timeout=settings.soniox_api_timeout_seconds,
        )
        response.raise_for_status()
        usage = _UsageResponse.model_validate(response.json())
        if usage.total.model is not None or any(item.model is None for item in usage.models):
            raise ValueError("Invalid model identifiers.")
        if any(day < start.date() or day >= end.date() for entry in [usage.total, *usage.models] for day in entry.days):
            raise ValueError("Usage outside the requested month.")
        return SonioxUsageSummary(
            month=start.strftime("%Y-%m"), period_start=start, period_end=end,
            updated_at=datetime.now(timezone.utc), total_cost_usd=usage.total.total_cost_usd,
            total_requests=usage.total.total_num_requests,
            models=[SonioxModelUsage(model=item.model, cost_usd=item.total_cost_usd, requests=item.total_num_requests) for item in usage.models],
            daily=[SonioxDailyUsage(date=day, cost_usd=cost, requests=count)
                   for day, cost, count in zip(usage.total.days, usage.total.cost_usd, usage.total.num_requests)
                   if day <= now.date()],
        )
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="Soniox usage request timed out.") from None
    except (httpx.HTTPError, ValueError, TypeError):
        # Never reflect provider error bodies, headers, or exception text to clients.
        raise HTTPException(status_code=502, detail="Soniox usage is temporarily unavailable.") from None
