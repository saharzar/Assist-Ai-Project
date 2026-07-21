from datetime import date, timedelta
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.models.user_speech_quota import UserSpeechUsagePeriod

def get_or_create_usage_period(db: Session, user_id: int, start: date, end: date) -> UserSpeechUsagePeriod:
    row = db.scalar(
        select(UserSpeechUsagePeriod).where(
            UserSpeechUsagePeriod.user_id == user_id,
            UserSpeechUsagePeriod.period_start == start,
            UserSpeechUsagePeriod.period_end == end,
        )
    )
    if row is not None:
        return row

    # Sessions with autoflush disabled cannot find an archive added earlier in
    # the same request through SQL, so also inspect pending ORM objects.
    row = next(
        (
            item
            for item in db.new
            if isinstance(item, UserSpeechUsagePeriod)
            and item.user_id == user_id
            and item.period_start == start
            and item.period_end == end
        ),
        None,
    )
    if row is not None:
        return row

    row = UserSpeechUsagePeriod(user_id=user_id, period_start=start, period_end=end)
    db.add(row)
    return row


def archive_usage(db: Session, user_id: int, start: date | None, end: date, *, tts_used: int | None = None, stt_used: int | None = None) -> None:
    start = start or end - timedelta(days=7)
    row = get_or_create_usage_period(db, user_id, start, end)
    if tts_used is not None: row.tts_characters_used = tts_used
    if stt_used is not None: row.stt_seconds_used = stt_used
