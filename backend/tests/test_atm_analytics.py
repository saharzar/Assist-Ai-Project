from datetime import datetime, timedelta, timezone

from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.security import create_access_token
from app.database import Base, get_db
from app.main import app
from app.models import AtmScenarioEvent, AtmScenarioSession, GuestSession, User


def make_user(db: Session, *, email: str, role: str = "user") -> User:
    user = User(
        email=email,
        password_hash="not-used-in-these-tests",
        full_name="Admin User" if role == "admin" else "Registered User",
        user_category="professional" if role == "admin" else "personal",
        preferred_language="en",
        role=role,
        approval_status="approved",
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def auth_headers(user: User) -> dict[str, str]:
    return {"Authorization": f"Bearer {create_access_token(str(user.id))}"}


def start_session(client: TestClient, headers: dict[str, str]) -> str:
    response = client.post(
        "/api/atm-sessions/start",
        headers=headers,
        json={"scenario_type": "atm-withdrawal", "selected_language": "en"},
    )
    assert response.status_code == 200
    assert response.json()["tracking_enabled"] is True
    return response.json()["session_id"]


def event(client: TestClient, session_id: str, headers: dict[str, str], event_id: str, outcome: str):
    return client.post(
        f"/api/atm-sessions/{session_id}/events",
        headers=headers,
        json={
            "client_event_id": event_id,
            "event_type": "pin_submission",
            "pin_outcome": outcome,
            "final_step_reached": "pin_attempt",
        },
    )


def verification_event(
    client: TestClient,
    session_id: str,
    headers: dict[str, str],
    event_id: str,
    outcome: str,
):
    return client.post(
        f"/api/atm-sessions/{session_id}/events",
        headers=headers,
        json={
            "client_event_id": event_id,
            "event_type": "identity_verification",
            "verification_outcome": outcome,
            "final_step_reached": "letter_check",
        },
    )


def initial_system_error(client: TestClient, session_id: str, headers: dict[str, str], event_id: str):
    return event(client, session_id, headers, event_id, "simulated_system_error")


def test_registered_and_consenting_guest_sessions_are_saved_but_nonconsenting_is_not():
    with test_context() as (client, db):
        user = make_user(db, email="user@example.com")
        start_session(client, auth_headers(user))

        consenting = client.post(
            "/guests/session", json={"save_progress": True, "preferred_language": "tr"}
        ).json()
        consenting_response = client.post(
            "/api/atm-sessions/start",
            headers={"X-Guest-Session-Token": consenting["guest_session_token"]},
            json={"scenario_type": "atm-withdrawal", "selected_language": "tr"},
        )
        assert consenting_response.json()["tracking_enabled"] is True

        nonconsenting = client.post(
            "/guests/session", json={"save_progress": False, "preferred_language": "en"}
        ).json()
        nonconsenting_response = client.post(
            "/api/atm-sessions/start",
            headers={"X-Guest-Session-Token": nonconsenting["guest_session_token"]},
            json={"scenario_type": "atm-withdrawal", "selected_language": "en"},
        )
        assert nonconsenting_response.json() == {
            "tracking_enabled": False,
            "session_id": None,
        }

        sessions = list(db.scalars(select(AtmScenarioSession)).all())
        assert len(sessions) == 2
        assert sum(item.user_id is not None for item in sessions) == 1
        assert sum(item.guest_session_id is not None for item in sessions) == 1


def test_first_pin_result_is_recorded_and_verification_events_are_idempotent():
    with test_context() as (client, db):
        user = make_user(db, email="pin@example.com")
        headers = auth_headers(user)
        session_id = start_session(client, headers)

        system_id = "00000000-0000-4000-8000-000000000001"
        assert initial_system_error(client, session_id, headers, system_id).status_code == 200
        assert initial_system_error(client, session_id, headers, system_id).status_code == 200
        pin_id = "00000000-0000-4000-8000-000000000002"
        assert event(client, session_id, headers, pin_id, "incorrect").status_code == 200
        verification_id = "00000000-0000-4000-8000-000000000003"
        assert verification_event(
            client,
            session_id,
            headers,
            verification_id,
            "failed",
        ).status_code == 200
        assert verification_event(client, session_id, headers, verification_id, "failed").status_code == 200

        session = db.scalar(select(AtmScenarioSession).where(AtmScenarioSession.public_id == session_id))
        assert session is not None
        assert session.total_pin_submission_count == 1
        assert session.first_pin_was_correct is False
        assert session.simulated_system_error_count == 1
        assert session.incorrect_user_pin_count == 1
        assert session.identity_verification_attempt_count == 1
        assert session.incorrect_identity_verification_count == 1
        assert db.query(AtmScenarioEvent).count() == 3


def test_completion_is_idempotent_and_duration_is_calculated_server_side():
    with test_context() as (client, db):
        user = make_user(db, email="complete@example.com")
        headers = auth_headers(user)
        session_id = start_session(client, headers)
        assert initial_system_error(client, session_id, headers, "00000000-0000-4000-8000-000000000010").status_code == 200
        assert event(
            client,
            session_id,
            headers,
            "00000000-0000-4000-8000-000000000011",
            "success",
        ).status_code == 200
        blocked = client.post(
            f"/api/atm-sessions/{session_id}/complete",
            headers=headers,
            json={"final_step_reached": "success"},
        )
        assert blocked.status_code == 409
        assert verification_event(
            client,
            session_id,
            headers,
            "00000000-0000-4000-8000-000000000012",
            "success",
        ).status_code == 200
        session = db.scalar(select(AtmScenarioSession).where(AtmScenarioSession.public_id == session_id))
        assert session is not None
        session.started_at = datetime.now(timezone.utc) - timedelta(seconds=12)
        db.commit()

        first = client.post(
            f"/api/atm-sessions/{session_id}/complete",
            headers=headers,
            json={"final_step_reached": "success"},
        )
        second = client.post(
            f"/api/atm-sessions/{session_id}/complete",
            headers=headers,
            json={"final_step_reached": "success"},
        )
        assert first.status_code == second.status_code == 200
        assert first.json()["completion_status"] == "completed"
        assert first.json()["success"] is True
        assert first.json()["duration_seconds"] >= 12
        assert second.json()["duration_seconds"] == first.json()["duration_seconds"]
        assert db.query(AtmScenarioSession).count() == 1


def test_incorrect_first_pin_returns_to_pin_only_after_successful_verification():
    with test_context() as (client, db):
        user = make_user(db, email="return@example.com")
        headers = auth_headers(user)
        session_id = start_session(client, headers)
        assert initial_system_error(client, session_id, headers, "00000000-0000-4000-8000-000000000020").status_code == 200
        assert event(client, session_id, headers, "00000000-0000-4000-8000-000000000021", "incorrect").status_code == 200
        blocked_pin = event(client, session_id, headers, "00000000-0000-4000-8000-000000000022", "success")
        assert blocked_pin.status_code == 409
        assert verification_event(client, session_id, headers, "00000000-0000-4000-8000-000000000023", "success").status_code == 200
        returned = client.post(
            f"/api/atm-sessions/{session_id}/events",
            headers=headers,
            json={
                "client_event_id": "00000000-0000-4000-8000-000000000024",
                "event_type": "returned_to_pin",
                "final_step_reached": "pin_attempt",
            },
        )
        assert returned.status_code == 200
        assert event(client, session_id, headers, "00000000-0000-4000-8000-000000000025", "success").status_code == 200
        session = db.scalar(select(AtmScenarioSession).where(AtmScenarioSession.public_id == session_id))
        assert session is not None
        assert session.returned_to_pin_after_verification is True
        assert session.pin_return_count == 1
        assert session.total_pin_submission_count == 2


def test_three_failed_verifications_terminate_once_and_cannot_succeed():
    with test_context() as (client, db):
        user = make_user(db, email="terminated@example.com")
        headers = auth_headers(user)
        session_id = start_session(client, headers)
        assert initial_system_error(client, session_id, headers, "00000000-0000-4000-8000-000000000030").status_code == 200
        assert event(client, session_id, headers, "00000000-0000-4000-8000-000000000031", "success").status_code == 200
        for index in range(3):
            response = verification_event(
                client,
                session_id,
                headers,
                f"00000000-0000-4000-8000-00000000003{index + 2}",
                "failed",
            )
            assert response.status_code == 200

        first = client.post(f"/api/atm-sessions/{session_id}/terminate", headers=headers, json={"reason": "verification_failed"})
        second = client.post(f"/api/atm-sessions/{session_id}/terminate", headers=headers, json={"reason": "verification_failed"})
        assert first.status_code == second.status_code == 200
        assert first.json()["security_terminated"] is True
        assert first.json()["success"] is False
        assert first.json()["termination_reason"] == "identity_verification_failed_three_times"
        assert verification_event(
            client,
            session_id,
            headers,
            "00000000-0000-4000-8000-000000000039",
            "success",
        ).status_code == 200
        assert db.query(AtmScenarioEvent).filter(AtmScenarioEvent.event_type == "identity_verification").count() == 3


def test_two_wrong_pins_after_verification_end_the_session_for_security():
    with test_context() as (client, db):
        user = make_user(db, email="pin-security@example.com")
        headers = auth_headers(user)
        session_id = start_session(client, headers)
        assert initial_system_error(client, session_id, headers, "00000000-0000-4000-8000-000000000040").status_code == 200
        assert event(client, session_id, headers, "00000000-0000-4000-8000-000000000041", "incorrect").status_code == 200
        assert verification_event(client, session_id, headers, "00000000-0000-4000-8000-000000000042", "success").status_code == 200
        assert event(client, session_id, headers, "00000000-0000-4000-8000-000000000043", "incorrect").status_code == 200
        assert event(client, session_id, headers, "00000000-0000-4000-8000-000000000044", "incorrect").status_code == 200

        terminated = client.post(
            f"/api/atm-sessions/{session_id}/terminate",
            headers=headers,
            json={"reason": "pin_failed_after_verification"},
        )
        assert terminated.status_code == 200
        assert terminated.json()["security_terminated"] is True
        assert terminated.json()["termination_reason"] == "pin_failed_twice_after_verification"
        session = db.scalar(select(AtmScenarioSession).where(AtmScenarioSession.public_id == session_id))
        assert session is not None
        assert session.incorrect_user_pin_count == 3
        assert session.total_pin_submission_count == 3


def test_abandoned_session_and_session_ownership_are_enforced():
    with test_context() as (client, db):
        owner = make_user(db, email="owner@example.com")
        other = make_user(db, email="other@example.com")
        session_id = start_session(client, auth_headers(owner))
        forbidden = client.post(
            f"/api/atm-sessions/{session_id}/abandon",
            headers=auth_headers(other),
            json={"final_step_reached": "enter_name"},
        )
        assert forbidden.status_code == 404

        response = client.post(
            f"/api/atm-sessions/{session_id}/abandon",
            headers=auth_headers(owner),
            json={"final_step_reached": "enter_name"},
        )
        assert response.status_code == 200
        assert response.json()["completion_status"] == "abandoned"
        assert response.json()["success"] is False


def test_admin_analytics_requires_admin_and_returns_history():
    with test_context() as (client, db):
        user = make_user(db, email="normal@example.com")
        admin = make_user(db, email="admin@example.com", role="admin")
        start_session(client, auth_headers(user))

        denied = client.get("/admin/atm-analytics/summary", headers=auth_headers(user))
        assert denied.status_code == 403
        summary = client.get("/admin/atm-analytics/summary", headers=auth_headers(admin))
        sessions = client.get("/admin/atm-analytics/sessions", headers=auth_headers(admin))
        assert summary.status_code == sessions.status_code == 200
        assert summary.json()["total_sessions"] == 1
        assert sessions.json()[0]["display_name"] == "Registered User"


class test_context:
    def __enter__(self):
        self.engine = create_engine(
            "sqlite://",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        Base.metadata.create_all(self.engine)
        self.session_factory = sessionmaker(bind=self.engine, autoflush=False, autocommit=False)
        self.db = self.session_factory()

        def override_db():
            yield self.db

        app.dependency_overrides[get_db] = override_db
        self.client = TestClient(app)
        return self.client, self.db

    def __exit__(self, exc_type, exc, traceback):
        self.client.close()
        self.db.close()
        app.dependency_overrides.clear()
        Base.metadata.drop_all(self.engine)
        self.engine.dispose()
