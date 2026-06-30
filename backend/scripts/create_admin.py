import os
import sys
from pathlib import Path

from dotenv import load_dotenv
from sqlalchemy import select

ROOT_DIR = Path(__file__).resolve().parents[1]
sys.path.append(str(ROOT_DIR))

from app.core.security import hash_password  # noqa: E402
from app.database import SessionLocal  # noqa: E402
from app.models.user import User  # noqa: E402


def main() -> None:
    load_dotenv(ROOT_DIR / ".env")

    email = os.getenv("ADMIN_EMAIL", "").strip().lower()
    password = os.getenv("ADMIN_PASSWORD", "")
    full_name = os.getenv("ADMIN_FULL_NAME", "ASSIST-AI Admin").strip()

    if not email or not password:
        raise SystemExit("ADMIN_EMAIL and ADMIN_PASSWORD must be set in backend/.env or the environment.")
    if len(password) < 8:
        raise SystemExit("ADMIN_PASSWORD must be at least 8 characters.")

    with SessionLocal() as db:
        user = db.scalar(select(User).where(User.email == email))
        if user is None:
            user = User(
                email=email,
                password_hash=hash_password(password),
                full_name=full_name,
                user_category="professional",
                preferred_language="en",
            )
            db.add(user)

        user.role = "admin"
        user.approval_status = "approved"
        user.is_active = True
        user.full_name = full_name
        user.password_hash = hash_password(password)
        db.commit()

    print(f"Admin account ready: {email}")


if __name__ == "__main__":
    main()
