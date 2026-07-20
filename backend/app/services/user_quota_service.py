from datetime import datetime, timezone
from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.core.config import get_settings
from app.models.stt_usage import UserSttUsage
from app.models.tts_usage import UserTtsUsage
from app.models.user import User
from app.models.user_speech_quota import QuotaAdjustmentHistory, QuotaIncreaseRequest, UserNotification
from app.schemas.user_quota import QuotaRequestCreate, QuotaRequestReview, QuotaUpdate, UserQuotaRead
from app.services.stt_service import get_or_create_stt_usage
from app.services.tts_service import get_or_create_tts_usage
from app.services.email_service import send_admin_quota_request_email, send_quota_request_review_email
from app.services.quota_defaults_service import get_quota_defaults

def quota_snapshot(db: Session, user: User) -> UserQuotaRead:
    tts = get_or_create_tts_usage(db, user.id); stt = get_or_create_stt_usage(db, user.id)
    pending = db.scalar(select(QuotaIncreaseRequest).where(QuotaIncreaseRequest.user_id == user.id, QuotaIncreaseRequest.status == "pending").order_by(QuotaIncreaseRequest.created_at.desc()))
    tts_total = tts.tts_limit_characters + tts.extra_characters; stt_total = stt.stt_limit_seconds + stt.extra_seconds
    ratio = max(tts.tts_used_characters / tts_total if tts_total else 1, stt.stt_used_seconds / stt_total if stt_total else 1)
    settings = get_settings(); status = "exhausted" if ratio >= 1 else "critical" if ratio >= settings.user_quota_critical_percent / 100 else "warning" if ratio >= settings.user_quota_warning_percent / 100 else "normal"
    return UserQuotaRead(user_id=user.id, full_name=user.full_name, email=user.email, role=user.role, tts_limit=tts.tts_limit_characters, tts_extra=tts.extra_characters, tts_used=tts.tts_used_characters, tts_remaining=max(0, tts_total-tts.tts_used_characters), stt_limit=stt.stt_limit_seconds, stt_extra=stt.extra_seconds, stt_used=stt.stt_used_seconds, stt_remaining=max(0, stt_total-stt.stt_used_seconds), period_type=tts.period_type, period_start=tts.period_start, reset_date=tts.tts_reset_date, enabled=tts.enabled and stt.enabled, uses_default=tts.uses_default and stt.uses_default, status=status, pending_request=pending)

def create_request(db: Session, user: User, payload: QuotaRequestCreate) -> QuotaIncreaseRequest:
    duplicate = db.scalar(select(QuotaIncreaseRequest).where(QuotaIncreaseRequest.user_id == user.id, QuotaIncreaseRequest.service_type == payload.service_type, QuotaIncreaseRequest.status == "pending").with_for_update())
    if duplicate: raise HTTPException(409, "A matching quota request is already pending.")
    request = QuotaIncreaseRequest(user_id=user.id, **payload.model_dump()); db.add(request)
    db.add(UserNotification(user_id=user.id, notification_type="quota_request_submitted", title="Quota request submitted", message="Your speech quota request is awaiting administrator review."))
    db.commit(); db.refresh(request)
    send_admin_quota_request_email(user, payload.requested_tts_characters, payload.requested_stt_seconds, payload.reason)
    return request

def apply_update(db: Session, user: User, payload: QuotaUpdate, admin_id: int, source: str = "manual_edit", request_id: int | None = None) -> None:
    tts = get_or_create_tts_usage(db, user.id); stt = get_or_create_stt_usage(db, user.id); settings = get_settings()
    old_tts, old_stt = tts.tts_limit_characters, stt.stt_limit_seconds
    old_tts_total = tts.tts_limit_characters + tts.extra_characters
    old_stt_total = stt.stt_limit_seconds + stt.extra_seconds
    old_period = tts.period_type
    old_enabled = tts.enabled and stt.enabled
    if payload.restore_default:
        defaults=get_quota_defaults(db);tts.tts_limit_characters=defaults.tts_limit_characters;stt.stt_limit_seconds=defaults.stt_limit_seconds;tts.period_type=stt.period_type=defaults.period_type;tts.uses_default=stt.uses_default=True
    if payload.tts_limit_characters is not None: tts.tts_limit_characters=payload.tts_limit_characters; tts.uses_default=False
    if payload.stt_limit_seconds is not None: stt.stt_limit_seconds=payload.stt_limit_seconds; stt.uses_default=False
    tts.extra_characters += payload.add_tts_characters; stt.extra_seconds += payload.add_stt_seconds
    if payload.period_type: tts.period_type=stt.period_type=payload.period_type
    if payload.enabled is not None: tts.enabled=stt.enabled=payload.enabled
    if payload.reset_usage: tts.tts_used_characters=0; stt.stt_used_seconds=0
    tts.updated_by_admin_id=stt.updated_by_admin_id=admin_id
    audit_reason = payload.reason or "Quota updated by administrator."
    db.add(QuotaAdjustmentHistory(user_id=user.id, adjustment_type=source, previous_tts_limit=old_tts, new_tts_limit=tts.tts_limit_characters, previous_stt_limit=old_stt, new_stt_limit=stt.stt_limit_seconds, added_tts_characters=payload.add_tts_characters, added_stt_seconds=payload.add_stt_seconds, reason=audit_reason, admin_id=admin_id, related_request_id=request_id))
    changes: list[str] = []
    new_tts_total = tts.tts_limit_characters + tts.extra_characters
    new_stt_total = stt.stt_limit_seconds + stt.extra_seconds
    if old_tts_total != new_tts_total:
        changes.append(f"TTS allowance: {old_tts_total:,} to {new_tts_total:,} characters")
    if old_stt_total != new_stt_total:
        changes.append(f"STT allowance: {old_stt_total:,} to {new_stt_total:,} seconds")
    if old_period != tts.period_type:
        changes.append(f"Reset period: {old_period} to {tts.period_type}")
    new_enabled = tts.enabled and stt.enabled
    if old_enabled != new_enabled:
        changes.append(f"Speech access: {'enabled' if new_enabled else 'disabled'}")
    if payload.reset_usage:
        changes.append("Current usage was reset")
    if not changes:
        changes.append("Your quota settings were reviewed")
    notification_message = ". ".join(changes) + "."
    if payload.reason:
        notification_message += f" Reason: {payload.reason}"
    db.add(UserNotification(user_id=user.id, notification_type="quota_adjusted", title="Speech quota updated", message=notification_message))

def review_request(db: Session, request: QuotaIncreaseRequest, payload: QuotaRequestReview, admin_id: int) -> None:
    request = db.scalar(select(QuotaIncreaseRequest).where(QuotaIncreaseRequest.id == request.id).with_for_update())
    if request is None or request.status != "pending": raise HTTPException(409, "This request has already been reviewed.")
    request.status = "rejected" if payload.action == "reject" else "partially_approved" if payload.action == "partial" else "approved"
    request.admin_response=payload.admin_response; request.approved_tts_characters=payload.approved_tts_characters; request.approved_stt_seconds=payload.approved_stt_seconds; request.reviewed_by_admin_id=admin_id; request.reviewed_at=datetime.now(timezone.utc)
    if payload.action != "reject":
        user=db.get(User, request.user_id); update=QuotaUpdate(tts_limit_characters=None, stt_limit_seconds=None, add_tts_characters=0 if payload.permanent else payload.approved_tts_characters, add_stt_seconds=0 if payload.permanent else payload.approved_stt_seconds, reason=payload.admin_response)
        if payload.permanent:
            snap=quota_snapshot(db,user); update.tts_limit_characters=snap.tts_limit+payload.approved_tts_characters; update.stt_limit_seconds=snap.stt_limit+payload.approved_stt_seconds
        apply_update(db,user,update,admin_id,"approved_request",request.id)
    user = db.get(User, request.user_id)
    db.add(UserNotification(user_id=request.user_id, notification_type=f"quota_request_{request.status}", title="Quota request reviewed", message=payload.admin_response)); db.commit()
    if user is not None: send_quota_request_review_email(user, request.status, payload.admin_response)
