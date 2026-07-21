from contextlib import AbstractContextManager
from datetime import date, timedelta
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from app.core.security import create_access_token
from app.database import Base, get_db
from app.main import app
from app.models import QuotaAdjustmentHistory, QuotaIncreaseRequest, User, UserNotification, UserSpeechUsagePeriod, UserSttUsage, UserTtsUsage
from app.services.stt_service import record_stt_seconds
from app.services.tts_service import reserve_tts_characters

def make_user(db,email,role="user"):
    user=User(email=email,password_hash="x",full_name=email.split("@")[0],user_category="personal",preferred_language="en",role=role,approval_status="approved",is_active=True);db.add(user);db.commit();db.refresh(user);return user
def headers(user): return {"Authorization":f"Bearer {create_access_token(str(user.id))}"}

def test_user_sees_only_own_quota_and_admin_sees_all():
    with Ctx() as (client,db):
        first=make_user(db,"first@test.local");second=make_user(db,"second@test.local");admin=make_user(db,"admin@test.local","admin")
        mine=client.get("/api/speech-quotas/me",headers=headers(first));assert mine.status_code==200;assert mine.json()["user_id"]==first.id
        assert client.get("/api/speech-quotas/admin/users",headers=headers(first)).status_code==403
        rows=client.get("/api/speech-quotas/admin/users",headers=headers(admin));assert rows.status_code==200;assert {r["user_id"] for r in rows.json()}=={first.id,second.id}

def test_admin_quota_page_reuses_current_archived_usage_period():
    with Ctx() as (client,db):
        user=make_user(db,"archived-period@test.local");admin=make_user(db,"archive-admin@test.local","admin")
        today=date.today();start=today-timedelta(days=7)
        db.add_all([
            UserTtsUsage(user_id=user.id,tts_limit_characters=5000,tts_used_characters=321,period_start=start,tts_reset_date=today),
            UserSttUsage(user_id=user.id,stt_limit_seconds=300,stt_used_seconds=45,period_start=start,stt_reset_date=today),
        ]);db.commit()

        first=client.get("/api/speech-quotas/admin/users",headers=headers(admin))
        second=client.get("/api/speech-quotas/admin/users",headers=headers(admin))

        assert first.status_code==200;assert second.status_code==200
        periods=list(db.scalars(select(UserSpeechUsagePeriod).where(UserSpeechUsagePeriod.user_id==user.id)).all())
        assert len(periods)==1
        assert periods[0].period_start==start;assert periods[0].period_end==today
        assert periods[0].tts_characters_used==321;assert periods[0].stt_seconds_used==45

def test_request_duplicate_review_and_audit():
    with Ctx() as (client,db):
        user=make_user(db,"request@test.local");admin=make_user(db,"admin@test.local","admin");body={"service_type":"both","requested_tts_characters":800,"requested_stt_seconds":60,"reason":"I need more practice time."}
        created=client.post("/api/speech-quotas/me/requests",headers=headers(user),json=body);assert created.status_code==201
        assert client.post("/api/speech-quotas/me/requests",headers=headers(user),json=body).status_code==409
        request_id=created.json()["id"];review={"action":"approve","approved_tts_characters":500,"approved_stt_seconds":30,"permanent":False,"admin_response":"A smaller temporary increase was approved."}
        reviewed=client.post(f"/api/speech-quotas/admin/requests/{request_id}/review",headers=headers(admin),json=review);assert reviewed.status_code==200
        assert client.post(f"/api/speech-quotas/admin/requests/{request_id}/review",headers=headers(admin),json=review).status_code==409
        quota=client.get("/api/speech-quotas/me",headers=headers(user)).json();assert quota["tts_extra"]==500;assert quota["stt_extra"]==30
        assert client.get("/api/speech-quotas/me/requests",headers=headers(user)).json()[0]["status"]=="approved"
        assert db.scalar(select(QuotaAdjustmentHistory).where(QuotaAdjustmentHistory.related_request_id==request_id)) is not None

def test_admin_permanent_temporary_and_restore_updates():
    with Ctx() as (client,db):
        one=make_user(db,"one@test.local");admin=make_user(db,"admin@test.local","admin")
        update={"tts_limit_characters":7000,"stt_limit_seconds":420,"add_tts_characters":500,"add_stt_seconds":20,"reason":"Accessibility accommodation"}
        assert client.put(f"/api/speech-quotas/admin/users/{one.id}",headers=headers(admin),json=update).status_code==200
        restored=client.put(f"/api/speech-quotas/admin/users/{one.id}",headers=headers(admin),json={"restore_default":True,"reason":"Restore standard allowance"}).json();assert restored["tts_limit"]==5000;assert restored["uses_default"] is True

def test_admin_can_update_without_reason_but_user_request_still_requires_one():
    with Ctx() as (client,db):
        user=make_user(db,"optional-reason@test.local");admin=make_user(db,"admin@test.local","admin")
        updated=client.put(f"/api/speech-quotas/admin/users/{user.id}",headers=headers(admin),json={"add_tts_characters":100})
        assert updated.status_code==200
        history=db.scalar(select(QuotaAdjustmentHistory).where(QuotaAdjustmentHistory.user_id==user.id))
        assert history is not None;assert history.reason=="Quota updated by administrator."
        notification=db.scalar(select(UserNotification).where(UserNotification.user_id==user.id,UserNotification.notification_type=="quota_adjusted"))
        assert notification is not None;assert "TTS allowance: 5,000 to 5,100 characters" in notification.message
        request=client.post("/api/speech-quotas/me/requests",headers=headers(user),json={"service_type":"tts","requested_tts_characters":100})
        assert request.status_code==422

def test_atomic_personal_quota_enforcement():
    with Ctx() as (_,db):
        user=make_user(db,"usage@test.local");tts=UserTtsUsage(user_id=user.id,tts_limit_characters=10,tts_used_characters=0);stt=UserSttUsage(user_id=user.id,stt_limit_seconds=5,stt_used_seconds=0);db.add_all([tts,stt]);db.commit()
        assert reserve_tts_characters(db,user.id,8).remaining_characters==2
        try: reserve_tts_characters(db,user.id,3);assert False
        except Exception as exc: assert getattr(exc,"status_code",None)==403
        assert record_stt_seconds(db,user.id,5).remaining_seconds==0
        try: record_stt_seconds(db,user.id,1);assert False
        except Exception as exc: assert getattr(exc,"status_code",None)==403

class Ctx(AbstractContextManager):
    def __enter__(self):
        self.engine=create_engine("sqlite://",connect_args={"check_same_thread":False},poolclass=StaticPool);Base.metadata.create_all(self.engine);self.db=sessionmaker(bind=self.engine,autoflush=False)()
        def override():yield self.db
        app.dependency_overrides[get_db]=override;self.client=TestClient(app);return self.client,self.db
    def __exit__(self,*args):self.client.close();self.db.close();app.dependency_overrides.clear();Base.metadata.drop_all(self.engine);self.engine.dispose()
