from datetime import date, timedelta
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.models.user_speech_quota import UserSpeechUsagePeriod

def archive_usage(db: Session, user_id: int, start: date | None, end: date, *, tts_used: int | None = None, stt_used: int | None = None) -> None:
    start = start or end - timedelta(days=7)
    row = db.scalar(select(UserSpeechUsagePeriod).where(UserSpeechUsagePeriod.user_id == user_id, UserSpeechUsagePeriod.period_start == start, UserSpeechUsagePeriod.period_end == end))
    if row is None:
        row = UserSpeechUsagePeriod(user_id=user_id, period_start=start, period_end=end); db.add(row)
    if tts_used is not None: row.tts_characters_used = tts_used
    if stt_used is not None: row.stt_seconds_used = stt_used
