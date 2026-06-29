from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.security import create_access_token, get_current_user, hash_password, verify_password
from app.database import get_db
from app.models.user import User
from app.schemas.auth import AuthToken, UserCreate, UserLogin, UserRead

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=AuthToken, status_code=status.HTTP_201_CREATED)
def register_user(payload: UserCreate, db: Session = Depends(get_db)) -> AuthToken:
    existing_user = db.scalar(select(User).where(User.email == payload.email.lower()))
    if existing_user:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email is already registered.")

    user = User(
        email=payload.email.lower(),
        password_hash=hash_password(payload.password),
        full_name=payload.full_name.strip(),
        user_category=payload.user_category,
        preferred_language=payload.preferred_language,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    settings = get_settings()
    token = create_access_token(
        str(user.id),
        expires_delta=timedelta(minutes=settings.access_token_expire_minutes),
    )
    return AuthToken(access_token=token, user=UserRead.model_validate(user))


@router.post("/login", response_model=AuthToken)
def login_user(payload: UserLogin, db: Session = Depends(get_db)) -> AuthToken:
    user = db.scalar(select(User).where(User.email == payload.email.lower()))
    if user is None or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
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
