from sqlalchemy import select
from sqlalchemy.orm import Session
from app.core.config import get_settings
from app.models.user_speech_quota import UserNotification

def notify_threshold(db: Session, user_id: int, service: str, used: int, limit: int, period_key: str) -> None:
    settings=get_settings(); percent=(used/limit*100) if limit else 100
    level="exhausted" if percent>=100 else "critical" if percent>=settings.user_quota_critical_percent else "warning" if percent>=settings.user_quota_warning_percent else None
    if level is None:return
    kind=f"{service}_{level}"
    exists=db.scalar(select(UserNotification.id).where(UserNotification.user_id==user_id,UserNotification.notification_type==kind,UserNotification.period_key==period_key))
    if exists:return
    message=f"You have used {round(percent)}% of your {service.upper()} allowance." if level=="warning" else f"You have almost reached your {service.upper()} allowance." if level=="critical" else f"You have reached your current {service.upper()} allowance."
    db.add(UserNotification(user_id=user_id,notification_type=kind,title=f"{service.upper()} allowance {level}",message=message,period_key=period_key))
