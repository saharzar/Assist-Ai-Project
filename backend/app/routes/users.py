from fastapi import APIRouter, Depends

from app.core.security import get_current_user
from app.models.user import User
from app.database import get_db
from app.schemas.auth import UserPreferencesUpdate, UserRead
from sqlalchemy.orm import Session

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me", response_model=UserRead)
def read_profile(current_user: User = Depends(get_current_user)) -> User:
    return current_user


@router.patch("/me/preferences", response_model=UserRead)
def update_profile_preferences(
    payload: UserPreferencesUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> User:
    current_user.preferred_language = payload.preferred_language
    db.commit()
    db.refresh(current_user)
    return current_user
