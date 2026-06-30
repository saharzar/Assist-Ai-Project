from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import get_current_admin
from app.database import get_db
from app.models.user import User
from app.schemas.auth import AdminUserRead, DenyUserRequest
from app.services.email_service import send_account_approved_email, send_account_denied_email

router = APIRouter(prefix="/admin", tags=["admin"])

AllowedStatus = Query(default="pending", pattern="^(pending|approved|denied|all)$")


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
