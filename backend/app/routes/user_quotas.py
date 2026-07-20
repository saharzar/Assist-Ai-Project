from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.core.security import get_current_admin, get_current_user
from app.database import get_db
from app.models.user import User
from app.models.user_speech_quota import QuotaAdjustmentHistory, QuotaIncreaseRequest, UserNotification, UserSpeechUsagePeriod
from app.schemas.user_quota import AllUsersQuotaUpdate, QuotaRequestCreate, QuotaRequestRead, QuotaRequestReview, QuotaUpdate, UserQuotaRead
from app.services.user_quota_service import apply_update, create_request, quota_snapshot, review_request
from app.services.quota_defaults_service import get_quota_defaults

router=APIRouter(prefix="/api/speech-quotas",tags=["speech-quotas"])
@router.get("/me",response_model=UserQuotaRead)
def my_quota(user:User=Depends(get_current_user),db:Session=Depends(get_db)): result=quota_snapshot(db,user);db.commit();return result
@router.get("/me/requests",response_model=list[QuotaRequestRead])
def my_requests(user:User=Depends(get_current_user),db:Session=Depends(get_db)): return list(db.scalars(select(QuotaIncreaseRequest).where(QuotaIncreaseRequest.user_id==user.id).order_by(QuotaIncreaseRequest.created_at.desc())).all())
@router.post("/me/requests",response_model=QuotaRequestRead,status_code=201)
def request_more(payload:QuotaRequestCreate,user:User=Depends(get_current_user),db:Session=Depends(get_db)): return create_request(db,user,payload)
@router.get("/me/history")
def my_history(user:User=Depends(get_current_user),db:Session=Depends(get_db)): return list(db.scalars(select(UserSpeechUsagePeriod).where(UserSpeechUsagePeriod.user_id==user.id).order_by(UserSpeechUsagePeriod.period_start.desc())).all())
@router.get("/me/notifications")
def my_notifications(user:User=Depends(get_current_user),db:Session=Depends(get_db)): return list(db.scalars(select(UserNotification).where(UserNotification.user_id==user.id).order_by(UserNotification.created_at.desc()).limit(50)).all())
@router.get("/admin/users",response_model=list[UserQuotaRead])
def all_quotas(admin:User=Depends(get_current_admin),db:Session=Depends(get_db)): result=[quota_snapshot(db,u) for u in db.scalars(select(User).where(User.role!="admin").order_by(User.full_name)).all()];db.commit();return result
@router.put("/admin/users/{user_id}",response_model=UserQuotaRead)
def edit_quota(user_id:int,payload:QuotaUpdate,admin:User=Depends(get_current_admin),db:Session=Depends(get_db)):
    user=db.get(User,user_id)
    if not user or user.role=="admin": raise HTTPException(404,"User not found.")
    apply_update(db,user,payload,admin.id);db.commit();return quota_snapshot(db,user)
@router.post("/admin/all")
def update_all(payload:AllUsersQuotaUpdate,admin:User=Depends(get_current_admin),db:Session=Depends(get_db)):
    defaults=get_quota_defaults(db)
    if payload.tts_limit_characters is not None: defaults.tts_limit_characters=payload.tts_limit_characters
    if payload.stt_limit_seconds is not None: defaults.stt_limit_seconds=payload.stt_limit_seconds
    if payload.period_type: defaults.period_type=payload.period_type
    defaults.updated_by_admin_id=admin.id
    users=[] if payload.scope=="future_only" else list(db.scalars(select(User).where(User.role!="admin")).all())
    updated=0
    for user in users:
        snapshot=quota_snapshot(db,user)
        if payload.scope=="default_users" and not snapshot.uses_default: continue
        update=QuotaUpdate(**payload.model_dump(exclude={"scope"}));apply_update(db,user,update,admin.id,"all_users_edit");updated+=1
    db.commit();return {"updated":updated,"scope":payload.scope}
@router.get("/admin/requests",response_model=list[QuotaRequestRead])
def requests(admin:User=Depends(get_current_admin),db:Session=Depends(get_db)): return list(db.scalars(select(QuotaIncreaseRequest).order_by(QuotaIncreaseRequest.created_at.desc())).all())
@router.post("/admin/requests/{request_id}/review")
def review(request_id:int,payload:QuotaRequestReview,admin:User=Depends(get_current_admin),db:Session=Depends(get_db)):
    request=db.get(QuotaIncreaseRequest,request_id)
    if not request: raise HTTPException(404,"Request not found.")
    review_request(db,request,payload,admin.id);return {"status":"reviewed"}
