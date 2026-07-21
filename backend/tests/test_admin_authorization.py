from contextlib import AbstractContextManager

from fastapi.routing import APIRoute
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.security import create_access_token, get_current_admin
from app.database import Base, get_db
from app.main import app
from app.models import User


def make_user(db, email: str, role: str = "user") -> User:
    user = User(
        email=email,
        password_hash="x",
        full_name=email.split("@")[0],
        user_category="personal",
        preferred_language="en",
        role=role,
        approval_status="approved",
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def headers(user: User) -> dict[str, str]:
    return {"Authorization": f"Bearer {create_access_token(str(user.id))}"}


def dependency_calls(route: APIRoute) -> set[object]:
    calls: set[object] = set()
    pending = list(route.dependant.dependencies)
    while pending:
        dependency = pending.pop()
        calls.add(dependency.call)
        pending.extend(dependency.dependencies)
    return calls


def test_every_admin_api_route_requires_admin_dependency():
    admin_routes = [
        route
        for route in app.routes
        if isinstance(route, APIRoute)
        and (
            route.path.startswith("/api/admin/")
            or route.path.startswith("/api/speech-quotas/admin/")
        )
    ]
    assert admin_routes
    assert all(get_current_admin in dependency_calls(route) for route in admin_routes)


def test_admin_api_returns_401_403_and_200_for_expected_roles():
    with TestContext() as (client, db):
        user = make_user(db, "normal-user@example.com")
        admin = make_user(db, "admin-user@example.com", "admin")
        path = "/api/admin/users?status=all"

        assert client.get(path).status_code == 401
        assert client.get(path, headers=headers(user)).status_code == 403
        response = client.get(path, headers=headers(admin))
        assert response.status_code == 200
        assert any(item["email"] == user.email for item in response.json())


class TestContext(AbstractContextManager):
    def __enter__(self):
        self.engine = create_engine(
            "sqlite://",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        Base.metadata.create_all(self.engine)
        self.db = sessionmaker(bind=self.engine, autoflush=False)()

        def override_db():
            yield self.db

        app.dependency_overrides[get_db] = override_db
        self.client = TestClient(app)
        return self.client, self.db

    def __exit__(self, *args):
        self.client.close()
        self.db.close()
        app.dependency_overrides.clear()
        Base.metadata.drop_all(self.engine)
        self.engine.dispose()
