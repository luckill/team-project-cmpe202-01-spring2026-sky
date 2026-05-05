from types import SimpleNamespace

import pytest
from fastapi import HTTPException

from app.models.Event import EventStatus
from app.models.Registration import RegistrationStatus
from app.models.User import UserRole
from app.routers import admin as admin_router
from app.services.registration_service import cancel_event_by_organizer


class FakeQuery:
    def __init__(self, *, first_result=None, all_result=None):
        self.first_result = first_result
        self.all_result = all_result or []

    def filter_by(self, **kwargs):
        return self

    def filter(self, *args, **kwargs):
        return self

    def first(self):
        return self.first_result

    def all(self):
        return list(self.all_result)


class FakePromoteDb:
    def __init__(self, user):
        self.user = user
        self.committed = False
        self.refreshed = None

    def query(self, model):
        return FakeQuery(first_result=self.user)

    def commit(self):
        self.committed = True

    def refresh(self, user):
        self.refreshed = user


class FakeCancellationDb:
    def __init__(self, event, registrations):
        self.event = event
        self.registrations = registrations
        self.committed = False
        self.refreshed = None

    def query(self, model):
        if model.__name__ == "Event":
            return FakeQuery(first_result=self.event)
        return FakeQuery(all_result=self.registrations)

    def commit(self):
        self.committed = True

    def refresh(self, event):
        self.refreshed = event


class FakeCognito:
    def __init__(self):
        self.add_calls = []
        self.remove_calls = []

    def admin_add_user_to_group(self, **kwargs):
        self.add_calls.append(kwargs)

    def admin_remove_user_from_group(self, **kwargs):
        self.remove_calls.append(kwargs)


def test_promote_user_rejects_organizer_targets(monkeypatch):
    organizer = SimpleNamespace(id="organizer-1", role=UserRole.organizer, cognito_sub="org-sub")
    admin_user = SimpleNamespace(id="admin-1")
    db = FakePromoteDb(organizer)
    cognito = FakeCognito()

    monkeypatch.setattr(admin_router, "ensure_cognito_config", lambda: "pool-id")
    monkeypatch.setattr(admin_router, "get_cognito_client", lambda: cognito)

    with pytest.raises(HTTPException) as exc:
        admin_router.promote_user("organizer-1", db=db, admin_user=admin_user)

    assert exc.value.status_code == 400
    assert exc.value.detail == "Only attendee users can be promoted to admin"
    assert cognito.add_calls == []
    assert cognito.remove_calls == []
    assert db.committed is False


def test_promote_user_allows_attendee_targets(monkeypatch):
    attendee = SimpleNamespace(id="attendee-1", role=UserRole.attendee, cognito_sub="att-sub")
    admin_user = SimpleNamespace(id="admin-1")
    db = FakePromoteDb(attendee)
    cognito = FakeCognito()

    monkeypatch.setattr(admin_router, "ensure_cognito_config", lambda: "pool-id")
    monkeypatch.setattr(admin_router, "get_cognito_client", lambda: cognito)

    result = admin_router.promote_user("attendee-1", db=db, admin_user=admin_user)

    assert result == {"message": "User promoted to admin"}
    assert attendee.role == UserRole.admin
    assert cognito.add_calls == [{
        "UserPoolId": "pool-id",
        "Username": "att-sub",
        "GroupName": "admin",
    }]
    assert cognito.remove_calls == [{
        "UserPoolId": "pool-id",
        "Username": "att-sub",
        "GroupName": "attendee",
    }]
    assert db.committed is True
    assert db.refreshed is attendee


def test_cancel_event_by_organizer_marks_event_and_registrations_cancelled():
    event = SimpleNamespace(id="event-1", organizer_id="organizer-1", status=EventStatus.approved)
    registrations = [
        SimpleNamespace(status=RegistrationStatus.confirmed),
        SimpleNamespace(status=RegistrationStatus.confirmed),
    ]
    db = FakeCancellationDb(event, registrations)
    organizer_user = SimpleNamespace(id="organizer-1")

    result = cancel_event_by_organizer(db, organizer_user, "event-1")

    assert result["status"] == EventStatus.cancelled
    assert result["cancelled_registrations"] == 2
    assert event.status == EventStatus.cancelled
    assert [registration.status for registration in registrations] == [
        RegistrationStatus.cancelled,
        RegistrationStatus.cancelled,
    ]
    assert db.committed is True
    assert db.refreshed is event
