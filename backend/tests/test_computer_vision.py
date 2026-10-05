import json
from copy import deepcopy
from uuid import uuid4

import pytest
from sqlalchemy import select

from app.models import ComputerVisionSample, ComputerVisionSession
from app.models.atm_scenario_session import AtmScenarioSession
from app.models.bill_scenario_session import BillScenarioSession
from test_atm_analytics import auth_headers, make_user, start_session, test_context

ENDPOINT = "/api/computer-vision-sessions"


def payload(scenario="atm-withdrawal", attempt=None):
    return {
        "client_session_id": str(uuid4()), "consent": True, "scenario_key": scenario,
        "scenario_session_id": attempt, "started_at": "2026-10-01T12:00:00Z",
        "ended_at": "2026-10-01T12:00:01Z", "duration_ms": 1000,
        "samples": [
            {"timestamp": 500, "yaw": 10, "pitch": -5, "roll": 2,
             "estimatedEyeDirection": "left", "isUserInteracting": True},
            {"timestamp": 1000, "yaw": None, "pitch": None, "roll": None,
             "estimatedEyeDirection": None, "isUserInteracting": False},
        ],
    }


@pytest.mark.parametrize("scenario", ["atm-withdrawal", "online-bill-payment"])
def test_saves_registered_user_session_and_samples_with_owned_attempt(scenario):
    with test_context() as (client, db):
        user = make_user(db, email="cv-owner@test.example")
        headers = auth_headers(user)
        if scenario == "atm-withdrawal":
            attempt = start_session(client, headers)
        else:
            attempt = client.post("/api/bill-sessions/start", headers=headers, json={"selected_language": "en"}).json()["session_id"]
        body = payload(scenario, attempt)
        result = client.post(ENDPOINT, headers=headers, json=body)
        assert result.status_code == 200, result.text
        assert result.json() == {"session_id": body["client_session_id"], "saved": True, "sample_count": 2}
        session = db.scalar(select(ComputerVisionSession))
        assert session.user_id == user.id and session.guest_session_id is None
        assert session.scenario_key == scenario and session.consent_given
        assert session.duration_ms == 1000
        if scenario == "atm-withdrawal":
            assert session.atm_session_id == db.scalar(select(AtmScenarioSession.id))
            assert session.bill_session_id is None
        else:
            assert session.bill_session_id == db.scalar(select(BillScenarioSession.id))
            assert session.atm_session_id is None
        samples = db.scalars(select(ComputerVisionSample).order_by(ComputerVisionSample.timestamp_ms)).all()
        assert len(samples) == 2 and all(sample.session_id == session.id for sample in samples)
        assert samples[0].yaw == 10 and samples[0].estimated_eye_direction == "left"
        assert samples[0].is_user_interacting and samples[1].yaw is None
        assert not samples[1].is_user_interacting


def test_no_save_without_cv_consent_or_identity_and_guest_consent_is_independent():
    with test_context() as (client, db):
        headers = auth_headers(make_user(db, email="cv-consent@test.example"))
        body = payload()
        body["consent"] = False
        assert client.post(ENDPOINT, headers=headers, json=body).status_code == 403
        assert client.post(ENDPOINT, json=payload()).status_code == 401
        assert db.scalars(select(ComputerVisionSession)).all() == []
        assert db.scalars(select(ComputerVisionSample)).all() == []
        guest = client.post("/guests/session", json={"save_progress": False, "preferred_language": "en"}).json()
        result = client.post(ENDPOINT, headers={"X-Guest-Session-Token": guest["guest_session_token"]}, json=payload())
        assert result.status_code == 200
        session = db.scalar(select(ComputerVisionSession))
        assert session.guest_session_id is not None and session.user_id is None
        assert session.atm_session_id is None


def test_retry_is_idempotent_and_recording_cannot_be_reassigned():
    with test_context() as (client, db):
        owner = auth_headers(make_user(db, email="cv-one@test.example"))
        other = auth_headers(make_user(db, email="cv-two@test.example"))
        body = payload()
        assert client.post(ENDPOINT, headers=owner, json=body).json()["saved"] is True
        assert client.post(ENDPOINT, headers=owner, json=body).json()["saved"] is False
        assert client.post(ENDPOINT, headers=other, json=body).status_code == 409
        changed = deepcopy(body)
        changed["samples"][0]["yaw"] = 20
        assert client.post(ENDPOINT, headers=owner, json=changed).json()["saved"] is False
        assert len(db.scalars(select(ComputerVisionSession)).all()) == 1
        assert len(db.scalars(select(ComputerVisionSample)).all()) == 2
        assert db.scalar(select(ComputerVisionSample).where(ComputerVisionSample.timestamp_ms == 500)).yaw == 10


def test_attempt_must_belong_to_same_actor_and_scenario():
    with test_context() as (client, db):
        owner = auth_headers(make_user(db, email="cv-attempt-one@test.example"))
        other = auth_headers(make_user(db, email="cv-attempt-two@test.example"))
        attempt = start_session(client, owner)
        assert client.post(ENDPOINT, headers=other, json=payload(attempt=attempt)).status_code == 404
        assert client.post(ENDPOINT, headers=owner, json=payload("online-bill-payment", attempt)).status_code == 404
        assert db.scalars(select(ComputerVisionSession)).all() == []


@pytest.mark.parametrize("mutation", [
    lambda p: p.update(video="raw"),
    lambda p: p["samples"][0].update(landmarks=[{"x": 1}]),
    lambda p: p["samples"][0].update(image="raw"),
    lambda p: p.update(user_id=999),
    lambda p: p.update(scenario_key="unknown"),
    lambda p: p.update(client_session_id="not-a-uuid"),
    lambda p: p.update(consent="yes"),
    lambda p: p.update(started_at="2026-10-01T12:00:00"),
    lambda p: p.update(ended_at="2026-10-01T11:59:00Z"),
    lambda p: p.update(duration_ms=9999),
    lambda p: p.update(samples=[]),
    lambda p: p["samples"][0].update(timestamp=-1),
    lambda p: p["samples"][1].update(timestamp=500),
    lambda p: p["samples"][1].update(timestamp=1500),
    lambda p: p["samples"][0].update(yaw=91),
    lambda p: p["samples"][0].update(pitch=181),
    lambda p: p["samples"][0].update(yaw="10"),
    lambda p: p["samples"][0].update(yaw=True),
    lambda p: p["samples"][0].update(yaw=None),
    lambda p: p["samples"][1].update(estimatedEyeDirection="left"),
    lambda p: p["samples"][0].update(estimatedEyeDirection="precise-gaze"),
    lambda p: p["samples"][0].update(isUserInteracting="true"),
])
def test_rejects_invalid_payload_without_any_partial_rows(mutation):
    with test_context() as (client, db):
        headers = auth_headers(make_user(db, email="cv-invalid@test.example"))
        body = payload()
        mutation(body)
        result = client.post(ENDPOINT, headers=headers, json=body)
        assert result.status_code == 422, result.text
        assert db.scalars(select(ComputerVisionSession)).all() == []
        assert db.scalars(select(ComputerVisionSample)).all() == []


@pytest.mark.parametrize("value", [float("nan"), float("inf"), -float("inf")])
def test_nonfinite_angles_are_rejected(value):
    with test_context() as (client, db):
        headers = auth_headers(make_user(db, email="cv-finite@test.example"))
        body = payload()
        body["samples"][0]["yaw"] = value
        result = client.post(ENDPOINT, headers={**headers, "Content-Type": "application/json"}, content=json.dumps(body))
        assert result.status_code == 422
        assert db.scalars(select(ComputerVisionSession)).all() == []
