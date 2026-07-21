from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.security import get_current_admin
from app.database import get_db
from app.models.user import User
from app.schemas.auth import AdminUserRead, DenyUserRequest
from app.services.email_service import (
    send_account_approved_email,
    send_account_denied_email,
    send_account_reactivated_email,
    send_account_suspended_email,
    send_email,
)

router = APIRouter(prefix="/api/admin", tags=["admin"])

AllowedStatus = Query(default="pending", pattern="^(pending|approved|denied|suspended|all)$")


@router.get("/users", response_model=list[AdminUserRead])
def list_users(
    status: str = AllowedStatus,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
) -> list[User]:
    query = select(User).order_by(User.approval_status.desc(), User.created_at.desc())
    if status != "all":
        query = query.where(User.approval_status == status)

    return list(db.scalars(query).all())


@router.get("/users/pending", response_model=list[AdminUserRead])
def list_pending_users(
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
) -> list[User]:
    return list(
        db.scalars(
            select(User)
            .where(User.approval_status == "pending")
            .order_by(User.created_at.desc())
        ).all()
    )


@router.post("/users/{user_id}/approve", response_model=AdminUserRead)
def approve_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
) -> User:
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")
    if user.role == "admin":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Admin users cannot be approved here.")

    user.approval_status = "approved"
    user.is_active = True
    user.approved_by = current_admin.id
    user.approved_at = datetime.now(timezone.utc)
    user.denied_at = None
    user.rejection_reason = None
    db.commit()
    db.refresh(user)

    send_account_approved_email(user)
    return user


@router.post("/users/{user_id}/deny", response_model=AdminUserRead)
def deny_user(
    user_id: int,
    payload: DenyUserRequest,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
) -> User:
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")
    if user.role == "admin":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Admin users cannot be denied here.")

    reason = payload.rejection_reason.strip() if payload.rejection_reason else None
    user.approval_status = "denied"
    user.is_active = False
    user.denied_at = datetime.now(timezone.utc)
    user.rejection_reason = reason
    db.commit()
    db.refresh(user)

    send_account_denied_email(user, reason)
    return user


@router.post("/users/{user_id}/suspend", response_model=AdminUserRead)
def suspend_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
) -> User:
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")
    if user.role == "admin":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Admin users cannot be suspended here.")
    if user.approval_status != "approved":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only approved users can be suspended.")

    user.approval_status = "suspended"
    user.is_active = False
    db.commit()
    db.refresh(user)

    send_account_suspended_email(user)
    return user


@router.post("/users/{user_id}/activate", response_model=AdminUserRead)
def activate_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
) -> User:
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")
    if user.role == "admin":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Admin users cannot be activated here.")
    if user.approval_status != "suspended":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only suspended users can be activated.")

    user.approval_status = "approved"
    user.is_active = True
    user.approved_by = current_admin.id
    user.approved_at = datetime.now(timezone.utc)
    user.denied_at = None
    user.rejection_reason = None
    db.commit()
    db.refresh(user)

    send_account_reactivated_email(user)
    return user


@router.post("/email/test")
def send_test_email(
    current_admin: User = Depends(get_current_admin),
) -> dict[str, str]:
    settings = get_settings()
    send_email(
        settings.admin_notification_email,
        "ASSIST-AI Test Email",
        (
            "This is a test email from ASSIST-AI.\n\n"
            "If you received this message, the email notification pipeline was processed.\n\n"
            "ASSIST-AI System"
        ),
    )
    return {"message": "Test email processed."}
