from uuid import uuid4

import pytest

from test_atm_analytics import auth_headers, make_user, start_session, test_context
from test_computer_vision import payload

ENDPOINT = "/api/admin/computer-vision-sessions"


@pytest.mark.parametrize("suffix", ["", f"/{uuid4()}"])
def test_reads_require_admin_even_for_unknown_session(suffix):
    with test_context() as (client, db):
        user = make_user(db, email="cv-reader@example.com")
        assert client.get(ENDPOINT + suffix).status_code == 401
        assert client.get(ENDPOINT + suffix, headers=auth_headers(user)).status_code == 403
        guest = client.post("/guests/session", json={"save_progress": False, "preferred_language": "en"}).json()
        assert client.get(ENDPOINT + suffix, headers={"X-Guest-Session-Token": guest["guest_session_token"]}).status_code == 401


@pytest.mark.parametrize("scenario", ["atm-withdrawal", "online-bill-payment"])
def test_admin_reads_metadata_samples_and_pagination(scenario):
    with test_context() as (client, db):
        user = make_user(db, email="cv-recorded@example.com")
        admin = make_user(db, email="cv-admin@example.com", role="admin")
        owner_headers = auth_headers(user)
        attempt = (start_session(client, owner_headers) if scenario == "atm-withdrawal" else
                   client.post("/api/bill-sessions/start", headers=owner_headers,
                               json={"selected_language": "en"}).json()["session_id"])
        body = payload(scenario, attempt)
        assert client.post("/api/computer-vision-sessions", headers=owner_headers, json=body).status_code == 200
        guest = client.post("/guests/session", json={"save_progress": False, "preferred_language": "en"}).json()
        guest_body = payload()
        assert client.post("/api/computer-vision-sessions", json=guest_body,
                           headers={"X-Guest-Session-Token": guest["guest_session_token"]}).status_code == 200
        headers = auth_headers(admin)
        response = client.get(ENDPOINT + "?page_size=1", headers=headers)
        assert response.status_code == 200, response.text
        result = response.json()
        assert result["total"] == 2 and result["page"] == 1 and result["page_size"] == 1
        assert result["items"][0]["actor_type"] == "guest"
        assert result["items"][0]["actor_reference"] and result["items"][0]["scenario_session_id"] is None
        assert "guest_session_token" not in response.text
        record = client.get(ENDPOINT + "?page=2&page_size=1", headers=headers).json()["items"][0]
        assert record == {
            "session_id": body["client_session_id"], "actor_type": "registered", "actor_reference": str(user.id),
            "display_name": user.full_name, "scenario_key": scenario, "scenario_session_id": attempt,
            "started_at": "2026-10-01T12:00:00Z", "ended_at": "2026-10-01T12:00:01Z",
            "duration_ms": 1000, "sample_count": 2,
        }
        detail = client.get(f"{ENDPOINT}/{body['client_session_id']}?page_size=1", headers=headers)
        assert detail.status_code == 200, detail.text
        assert detail.json()["session"] == record
        assert detail.json()["samples"] == [body["samples"][0]]
        detail2 = client.get(f"{ENDPOINT}/{body['client_session_id']}?page=2&page_size=1", headers=headers).json()
        assert detail2["samples"] == [body["samples"][1]]
        assert client.get(ENDPOINT + "?page=3&page_size=1", headers=headers).json()["items"] == []
        assert client.get(f"{ENDPOINT}/{uuid4()}", headers=headers).status_code == 404
        for query in ("page=0", "page_size=0", "page_size=501"):
            assert client.get(f"{ENDPOINT}/{body['client_session_id']}?{query}", headers=headers).status_code == 422
