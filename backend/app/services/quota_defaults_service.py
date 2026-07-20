from sqlalchemy.orm import Session
from app.core.config import get_settings
from app.models.user_speech_quota import UserQuotaDefaults
def get_quota_defaults(db:Session)->UserQuotaDefaults:
    row=db.get(UserQuotaDefaults,1)
    if row is None:
        settings=get_settings();row=UserQuotaDefaults(id=1,tts_limit_characters=settings.default_user_tts_limit_characters,stt_limit_seconds=settings.default_user_stt_limit_seconds,period_type=settings.default_user_quota_period);db.add(row);db.flush()
    return row
