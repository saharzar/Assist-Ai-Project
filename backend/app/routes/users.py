from fastapi import APIRouter, Depends

from app.core.security import get_current_user
from app.models.user import User
from app.schemas.auth import UserRead

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me", response_model=UserRead)
def read_profile(current_user: User = Depends(get_current_user)) -> User:
    return current_user
