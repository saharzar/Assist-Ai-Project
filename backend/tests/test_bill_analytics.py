from uuid import uuid4
from sqlalchemy import select
from app.models.bill_scenario_session import BillScenarioSession, BillScenarioEvent
from test_atm_analytics import test_context, make_user, auth_headers


def start(client, headers):
    response = client.post('/api/bill-sessions/start', headers=headers, json={'selected_language': 'en'})
    assert response.status_code == 200
    return response.json()['session_id']


def event(client, sid, headers, kind, **kwargs):
    body = {'client_event_id': str(uuid4()), 'event_type': kind, 'step': 'login', **kwargs}
    return client.post(f'/api/bill-sessions/{sid}/events', headers=headers, json=body)


def finish(client, sid, headers, reason='exit', step='login'):
    return client.post(f'/api/bill-sessions/{sid}/finish', headers=headers,
                       json={'reason': reason, 'final_step_reached': step})


def test_consent_and_ownership():
    with test_context() as (client, db):
        for consent in (True, False):
            guest = client.post('/guests/session', json={'save_progress': consent, 'preferred_language': 'en'}).json()
            sid = start(client, {'X-Guest-Session-Token': guest['guest_session_token']})
            assert bool(sid) == consent
        assert len(db.scalars(select(BillScenarioSession)).all()) == 1
        owner = auth_headers(make_user(db, email='owner@bill.test'))
        other = auth_headers(make_user(db, email='other@bill.test'))
        sid = start(client, owner)
        assert event(client, sid, other, 'login_failed').status_code == 404
        assert finish(client, sid, other).status_code == 404
        assert client.post('/api/bill-sessions/start', json={'selected_language': 'en'}).status_code == 401


def test_multiple_payments_deduplication_and_terminal_immutability():
    with test_context() as (client, db):
        headers = auth_headers(make_user(db, email='user@bill.test'))
        sid = start(client, headers)
        eid = str(uuid4())
        for _ in range(2):
            assert event(client, sid, headers, 'login_failed', client_event_id=eid).status_code == 200
        event(client, sid, headers, 'login_success')
        event(client, sid, headers, 'validation_error', step='card-payment')
        for bill in ('water', 'water', 'internet'):
            event(client, sid, headers, 'payment_success', step='success', bill_type=bill)
        assert finish(client, sid, headers, step='success').json()['completion_status'] == 'completed'
        event(client, sid, headers, 'login_failed')
        finish(client, sid, headers, 'login_locked')
        row = db.scalar(select(BillScenarioSession))
        db.refresh(row)
        assert row.login_attempt_count == 2
        assert row.incorrect_login_count == 1
        assert row.payment_attempt_count == 3
        assert row.paid_bill_count == 2
        assert row.validation_error_count == 1
        assert row.success and not row.security_terminated
        assert row.final_step_reached == 'success'
        assert row.duration_seconds >= 0
        assert event(client, sid, headers, 'login_failed', password='secret').status_code == 422


def test_outcomes_admin_filters_and_actor_history():
    with test_context() as (client, db):
        user = make_user(db, email='user@bill.test')
        headers = auth_headers(user)
        admin = auth_headers(make_user(db, email='admin@bill.test', role='admin'))
        for reason in ('exit', 'inactivity_timeout', 'login_locked'):
            sid = start(client, headers)
            finish(client, sid, headers, reason)
        assert client.get('/api/admin/bill-analytics/sessions', headers=headers).status_code == 403
        response = client.get('/api/admin/bill-analytics/sessions', headers=admin)
        assert response.status_code == 200
        rows = response.json()
        assert len(rows) == 3
        assert sum(row['security_terminated'] for row in rows) == 1
        assert sum(row['completion_status'] == 'abandoned' for row in rows) == 2
        assert all(row['started_at'].endswith('Z') or row['started_at'].endswith('+00:00') for row in rows)
        for query, count in [('actor_type=guest', 0), ('language=tr', 0), ('completion_status=abandoned', 2), ('user_name=Registered', 3)]:
            assert len(client.get('/api/admin/bill-analytics/sessions?' + query, headers=admin).json()) == count
        assert client.get('/api/admin/bill-analytics/sessions?date_from=2026-02-02&date_to=2026-01-01', headers=admin).status_code == 422
        history = client.get(f'/api/admin/bill-analytics/actors/registered/{user.id}', headers=admin)
        assert len(history.json()) == 3

def test_exit_flushes_pending_events_once_before_finalizing():
    with test_context() as (client, db):
        headers = auth_headers(make_user(db, email='flush@bill.test'))
        sid = start(client, headers)
        eid = str(uuid4())
        event(client, sid, headers, 'validation_error', client_event_id=eid, step='card-payment')
        response = client.post(f'/api/bill-sessions/{sid}/finish', headers=headers, json={
            'reason': 'exit', 'final_step_reached': 'success', 'pending_events': [
                {'client_event_id': eid, 'event_type': 'validation_error', 'step': 'card-payment'},
                {'client_event_id': str(uuid4()), 'event_type': 'payment_success', 'step': 'success', 'bill_type': 'water'},
            ]})
        assert response.status_code == 200
        row = db.scalar(select(BillScenarioSession))
        assert row.success and row.paid_bill_count == 1
        assert row.validation_error_count == 1 and row.payment_attempt_count == 2
        assert row.completion_status == 'completed'
