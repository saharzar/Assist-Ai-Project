from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.security import create_access_token, get_current_user, hash_password, verify_password
from app.database import get_db
from app.models.user import User
from app.schemas.auth import AuthToken, RegisterPendingResponse, UserCreate, UserLogin, UserRead
from app.services.email_service import (
    send_account_request_received_email,
    send_admin_new_account_notification,
)
from app.services.stt_service import get_or_create_stt_usage
from app.services.tts_service import get_or_create_tts_usage

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=RegisterPendingResponse, status_code=status.HTTP_201_CREATED)
def register_user(payload: UserCreate, db: Session = Depends(get_db)) -> RegisterPendingResponse:
    existing_user = db.scalar(select(User).where(User.email == payload.email.lower()))
    if existing_user:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email is already registered.")

    user = User(
        email=payload.email.lower(),
        password_hash=hash_password(payload.password),
        full_name=payload.full_name.strip(),
        user_category=payload.user_category,
        preferred_language=payload.preferred_language,
        role="user",
        approval_status="pending",
        is_active=False,
    )
    db.add(user)
    db.flush()
    get_or_create_tts_usage(db, user.id)
    get_or_create_stt_usage(db, user.id)
    db.commit()
    db.refresh(user)

    send_account_request_received_email(user)
    send_admin_new_account_notification(user)

    return RegisterPendingResponse(
        message="Your account request has been sent for admin approval.",
        approval_status="pending",
    )


@router.post("/login", response_model=AuthToken)
def login_user(payload: UserLogin, db: Session = Depends(get_db)) -> AuthToken:
    user = db.scalar(select(User).where(User.email == payload.email.lower()))
    if user is None or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )

    if user.approval_status == "pending":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account is waiting for admin approval.",
        )

    if user.approval_status == "denied":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account request was not approved.",
        )

    if user.approval_status == "suspended":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account is suspended.",
        )

    if not user.is_active or user.approval_status != "approved":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account is not active.",
        )

    settings = get_settings()
    token = create_access_token(
        str(user.id),
        expires_delta=timedelta(minutes=settings.access_token_expire_minutes),
    )
    return AuthToken(access_token=token, user=UserRead.model_validate(user))


@router.get("/me", response_model=UserRead)
def read_current_user(current_user: User = Depends(get_current_user)) -> User:
    return current_user
