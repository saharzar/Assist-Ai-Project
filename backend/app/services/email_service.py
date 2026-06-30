import logging
import smtplib
from email.message import EmailMessage
from email.utils import formataddr

from app.core.config import get_settings
from app.models.user import User

logger = logging.getLogger("assist_ai.email")


def _log_console_email(to_email: str, subject: str, body: str) -> None:
    logger.warning(
        "\n================ CONSOLE EMAIL ================\n"
        "To: %s\n"
        "Subject: %s\n"
        "Body:\n%s\n"
        "===============================================",
        to_email or "(not configured)",
        subject,
        body,
    )


def _smtp_config_is_ready() -> bool:
    settings = get_settings()
    return all(
        [
            settings.smtp_host,
            settings.smtp_port,
            settings.smtp_from_email,
        ]
    )


def _sender_address() -> str:
    settings = get_settings()
    return formataddr((settings.smtp_from_name, settings.smtp_from_email))


def _send_smtp_email(message: EmailMessage) -> None:
    settings = get_settings()

    if settings.smtp_use_ssl:
        with smtplib.SMTP_SSL(
            settings.smtp_host,
            settings.smtp_port,
            timeout=settings.smtp_timeout_seconds,
        ) as server:
            _login_if_configured(server)
            server.send_message(message)
        return

    with smtplib.SMTP(
        settings.smtp_host,
        settings.smtp_port,
        timeout=settings.smtp_timeout_seconds,
    ) as server:
        if settings.smtp_use_tls:
            server.starttls()
        _login_if_configured(server)
        server.send_message(message)


def _login_if_configured(server: smtplib.SMTP) -> None:
    settings = get_settings()
    if settings.smtp_username and settings.smtp_password:
        server.login(settings.smtp_username, settings.smtp_password)


def send_email(
    to_email: str,
    subject: str,
    text_body: str,
    html_body: str | None = None,
) -> None:
    settings = get_settings()
    backend = settings.email_backend.lower().strip()

    if not to_email:
        logger.warning("Email not sent because recipient address is missing. Subject: %s", subject)
        return

    if not settings.email_enabled or backend == "console":
        logger.info("Console email fallback used for %s.", to_email)
        _log_console_email(to_email, subject, text_body)
        return

    if backend != "smtp":
        logger.warning("Unknown EMAIL_BACKEND=%s. Falling back to console email logging.", backend)
        _log_console_email(to_email, subject, text_body)
        return

    if not _smtp_config_is_ready():
        logger.warning("SMTP email is enabled but required SMTP config is missing. Falling back to console email logging.")
        _log_console_email(to_email, subject, text_body)
        return

    message = EmailMessage()
    message["From"] = _sender_address()
    message["To"] = to_email
    message["Subject"] = subject
    message.set_content(text_body)
    if html_body:
        message.add_alternative(html_body, subtype="html")

    try:
        _send_smtp_email(message)
        logger.info("Email sent successfully to %s. Subject: %s", to_email, subject)
    except Exception:
        logger.exception("Email failed for %s. Subject: %s", to_email, subject)


def _greeting(user: User) -> str:
    return f"Hello {user.full_name},"


def send_account_request_received_email(user: User) -> None:
    body = (
        f"{_greeting(user)}\n\n"
        "Your ASSIST-AI account request has been received.\n\n"
        "Your request has been sent to the system administrator for review.\n"
        "You will receive another email after your account is approved or denied.\n\n"
        "Thank you,\n"
        "ASSIST-AI Team"
    )
    send_email(user.email, "ASSIST-AI Account Request Received", body)


def send_admin_new_account_notification(user: User) -> None:
    settings = get_settings()
    body = (
        "A new user has registered and is waiting for approval.\n\n"
        f"Name: {user.full_name}\n"
        f"Email: {user.email}\n"
        f"Category: {user.user_category}\n"
        f"Preferred language: {user.preferred_language}\n\n"
        "Review pending accounts here:\n"
        f"{settings.app_frontend_url}/admin/users\n\n"
        "ASSIST-AI System"
    )
    send_email(settings.admin_notification_email, "New ASSIST-AI Account Waiting for Approval", body)


def send_account_approved_email(user: User) -> None:
    settings = get_settings()
    body = (
        f"{_greeting(user)}\n\n"
        "Your ASSIST-AI account has been approved.\n\n"
        "You can now log in here:\n"
        f"{settings.app_frontend_url}/login\n\n"
        "Thank you,\n"
        "ASSIST-AI Team"
    )
    send_email(user.email, "ASSIST-AI Account Approved", body)


def send_account_denied_email(user: User, reason: str | None = None) -> None:
    body = (
        f"{_greeting(user)}\n\n"
        "Your ASSIST-AI account request was not approved.\n"
    )
    if reason:
        body = f"{body}\nReason:\n{reason}\n"

    body = f"{body}\nThank you,\nASSIST-AI Team"
    send_email(user.email, "ASSIST-AI Account Request Update", body)
