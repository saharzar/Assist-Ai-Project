from uuid import uuid4
import pytest
from sqlalchemy import select
from app.models.restaurant_scenario_session import RestaurantScenarioSession, RestaurantScenarioEvent
from app.models.computer_vision_session import ComputerVisionSession
from test_atm_analytics import test_context, make_user, auth_headers
from test_computer_vision import payload as cv_payload


def start(client, headers):
    response = client.post("/api/restaurant-sessions/start", headers=headers, json={"selected_language": "en"})
    assert response.status_code == 200
    return response.json()["session_id"]


def event(kind, meal=None):
    return dict(client_event_id=str(uuid4()), event_type=kind, meal=meal)


def send(client, sid, headers, body):
    return client.post(f"/api/restaurant-sessions/{sid}/events", headers=headers, json=body)


def finish(client, sid, headers, step="menu", pending=None):
    return client.post(f"/api/restaurant-sessions/{sid}/finish", headers=headers,
        json=dict(final_step_reached=step, pending_events=pending or []))


@pytest.mark.parametrize("meal", ["pasta", "chicken", "salad", "soup"])
def test_order_completion_pending_flush_and_idempotency(meal):
    with test_context() as (client, db):
        headers = auth_headers(make_user(db, email="restaurant@test.example"))
        sid = start(client, headers)
        alternative = "soup" if meal != "soup" else "salad"
        first = event("meal_selected", meal)
        assert send(client, sid, headers, first).status_code == 200
        assert send(client, sid, headers, first).json()["recorded"] is False
        pending = [first, event("menu_reopened"), event("alternative_selected", alternative), event("order_confirmed", alternative)]
        assert finish(client, sid, headers, "success", pending).json()["completion_status"] == "completed"
        row = db.scalar(select(RestaurantScenarioSession))
        assert row.success and row.unavailable_meal == meal and row.selected_meal == alternative
        assert row.final_step_reached == "success" and row.duration_seconds >= 0 and row.menu_reopen_count == 1
        assert db.query(RestaurantScenarioEvent).count() == 4
        ended = row.completed_at
        finish(client, sid, headers)
        db.refresh(row)
        assert row.completed_at == ended and row.completion_status == "completed"


def test_abandoned_attempt_and_invalid_transitions():
    with test_context() as (client, db):
        headers = auth_headers(make_user(db, email="restaurant@test.example"))
        sid = start(client, headers)
        assert send(client, sid, headers, event("order_confirmed", "pasta")).status_code == 422
        assert send(client, sid, headers, event("meal_selected", "pasta")).status_code == 200
        assert send(client, sid, headers, event("alternative_selected", "pasta")).status_code == 422
        assert send(client, sid, headers, event("meal_selected", "pizza")).status_code == 422
        assert send(client, sid, headers, {**event("menu_reopened"), "password": "not-accepted"}).status_code == 422
        # Client step alone cannot claim completion.
        assert finish(client, sid, headers, "success").json()["completion_status"] == "abandoned"
        row = db.scalar(select(RestaurantScenarioSession))
        assert not row.success and row.final_step_reached == "alternative"


def test_guest_progress_consent_ownership_and_admin_authorization():
    with test_context() as (client, db):
        headers = auth_headers(make_user(db, email="owner@restaurant.test"))
        other = auth_headers(make_user(db, email="other@restaurant.test"))
        admin = auth_headers(make_user(db, email="admin@restaurant.test", role="admin"))
        sid = start(client, headers)
        assert send(client, sid, other, event("meal_selected", "pasta")).status_code == 404
        assert finish(client, sid, other).status_code == 404
        assert client.get("/api/admin/restaurant-analytics/sessions").status_code == 401
        assert client.get("/api/admin/restaurant-analytics/sessions", headers=headers).status_code == 403
        result = client.get("/api/admin/restaurant-analytics/sessions?page_size=1", headers=admin).json()
        assert result["total"] == 1 and len(result["items"]) == 1
        assert result["items"][0]["display_name"] == "Registered User"
        for consent in (True, False):
            guest = client.post("/guests/session", json={"save_progress": consent, "preferred_language": "en"}).json()
            guest_headers = {"X-Guest-Session-Token": guest["guest_session_token"]}
            assert bool(start(client, guest_headers)) == consent
        assert client.post("/api/restaurant-sessions/start", json={"selected_language": "en"}).status_code == 401


def test_restaurant_cv_linkage_and_admin_recordings():
    with test_context() as (client, db):
        headers = auth_headers(make_user(db, email="cv@restaurant.test"))
        admin = auth_headers(make_user(db, email="admin@restaurant.test", role="admin"))
        sid = start(client, headers)
        finish(client, sid, headers)
        body = cv_payload("restaurant-ordering", sid)
        saved = client.post("/api/computer-vision-sessions", headers=headers, json=body)
        assert saved.status_code == 200, saved.text
        assert db.scalar(select(ComputerVisionSession)).restaurant_session_id == db.scalar(select(RestaurantScenarioSession.id))
        result = client.get("/api/admin/computer-vision-sessions?scenario_key=restaurant-ordering", headers=admin).json()
        assert result["total"] == 1 and str(result["items"][0]["scenario_session_id"]) == sid
        detail = client.get(f"/api/admin/computer-vision-sessions/{body['client_session_id']}", headers=admin)
        assert detail.status_code == 200 and len(detail.json()["samples"]) == 2
