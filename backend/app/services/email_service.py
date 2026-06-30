import logging

from app.core.config import get_settings
from app.models.user import User

logger = logging.getLogger("assist_ai.email")


def _log_fake_email(to_email: str, subject: str, body: str) -> None:
    logger.warning(
        "\n================ FAKE EMAIL ================\n"
        "To: %s\n"
        "Subject: %s\n"
        "Body:\n%s\n"
        "============================================",
        to_email or "(not configured)",
        subject,
        body,
    )


def send_account_request_received_email(user: User) -> None:
    _log_fake_email(
        user.email,
        "ASSIST-AI Account Request Received",
        "Your account request has been received and sent to the admin for approval.\n"
        "You will receive another email after review.",
    )


def send_admin_new_account_notification(user: User) -> None:
    settings = get_settings()
    _log_fake_email(
        settings.admin_notification_email,
        "New ASSIST-AI Account Waiting for Approval",
        f"Full name: {user.full_name}\n"
        f"Email: {user.email}\n"
        f"User category: {user.user_category}\n"
        f"Preferred language: {user.preferred_language}\n"
        f"Admin dashboard: {settings.app_frontend_url}/admin/users",
    )


def send_account_approved_email(user: User) -> None:
    _log_fake_email(
        user.email,
        "ASSIST-AI Account Approved",
        "Your ASSIST-AI account has been approved. You can now log in.",
    )


def send_account_denied_email(user: User, reason: str | None = None) -> None:
    body = "Your ASSIST-AI account request was not approved."
    if reason:
        body = f"{body}\nReason: {reason}"

    _log_fake_email(user.email, "ASSIST-AI Account Request Not Approved", body)
