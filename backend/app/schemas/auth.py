from datetime import datetime
from typing import Literal

from pydantic import BaseModel, EmailStr, Field

UserCategory = Literal["personal", "family_caregiver", "institution", "professional"]
UserRole = Literal["user", "admin"]
ApprovalStatus = Literal["pending", "approved", "denied"]


class UserBase(BaseModel):
    email: EmailStr
    full_name: str = Field(min_length=1)
    user_category: UserCategory
    preferred_language: str = "en"


class UserCreate(UserBase):
    password: str = Field(min_length=8)


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserRead(UserBase):
    id: int
    role: UserRole
    approval_status: ApprovalStatus
    approved_by: int | None = None
    approved_at: datetime | None = None
    denied_at: datetime | None = None
    rejection_reason: str | None = None
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class AuthToken(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserRead


class RegisterPendingResponse(BaseModel):
    message: str
    approval_status: ApprovalStatus


class AdminUserRead(UserRead):
    pass


class DenyUserRequest(BaseModel):
    rejection_reason: str | None = None


class GuestSessionCreate(BaseModel):
    save_progress: bool = False
    preferred_language: str = "en"


class GuestSessionRead(BaseModel):
    guest_session_token: str
    save_progress: bool
    preferred_language: str
