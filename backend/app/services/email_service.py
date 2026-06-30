import logging
import smtplib
from email.message import EmailMessage
from email.utils import formataddr

from app.core.config import get_settings
from app.models.user import User

logger = logging.getLogger("assist_ai.email")

SUPPORTED_EMAIL_LANGUAGES = {"en", "es", "de", "tr", "pt", "fr"}

EMAIL_COPY = {
    "en": {
        "request_subject": "ASSIST-AI Account Request Received",
        "request_body": (
            "Hello {full_name},\n\n"
            "Your ASSIST-AI account request has been received.\n\n"
            "Your request has been sent to the system administrator for review.\n"
            "You will receive another email after your account is approved or denied.\n\n"
            "Thank you,\n"
            "ASSIST-AI Team"
        ),
        "admin_subject": "New ASSIST-AI Account Waiting for Approval",
        "admin_body": (
            "A new user has registered and is waiting for approval.\n\n"
            "Name: {full_name}\n"
            "Email: {email}\n"
            "Category: {user_category}\n\n"
            "Review pending accounts here:\n"
            "{admin_url}\n\n"
            "ASSIST-AI System"
        ),
        "approved_subject": "ASSIST-AI Account Approved",
        "approved_body": (
            "Hello {full_name},\n\n"
            "Your ASSIST-AI account has been approved.\n\n"
            "You can now log in here:\n"
            "{login_url}\n\n"
            "Thank you,\n"
            "ASSIST-AI Team"
        ),
        "denied_subject": "ASSIST-AI Account Request Update",
        "denied_body": (
            "Hello {full_name},\n\n"
            "Your ASSIST-AI account request was not approved.\n"
            "{reason_block}\n"
            "Thank you,\n"
            "ASSIST-AI Team"
        ),
        "reason_block": "\nReason:\n{reason}\n",
        "suspended_subject": "ASSIST-AI Account Suspended",
        "suspended_body": (
            "Hello {full_name},\n\n"
            "Your ASSIST-AI account has been suspended.\n\n"
            "Please contact the system administrator if you need help.\n\n"
            "Thank you,\n"
            "ASSIST-AI Team"
        ),
        "reactivated_subject": "ASSIST-AI Account Reactivated",
        "reactivated_body": (
            "Hello {full_name},\n\n"
            "Your ASSIST-AI account has been reactivated.\n\n"
            "You can now log in here:\n"
            "{login_url}\n\n"
            "Thank you,\n"
            "ASSIST-AI Team"
        ),
    },
    "es": {
        "request_subject": "Solicitud de cuenta ASSIST-AI recibida",
        "request_body": (
            "Hola {full_name},\n\n"
            "Hemos recibido tu solicitud de cuenta ASSIST-AI.\n\n"
            "Tu solicitud fue enviada al administrador del sistema para revision.\n"
            "Recibiras otro correo cuando tu cuenta sea aprobada o denegada.\n\n"
            "Gracias,\n"
            "Equipo ASSIST-AI"
        ),
        "admin_subject": "Nueva cuenta ASSIST-AI esperando aprobacion",
        "admin_body": (
            "Un nuevo usuario se registro y esta esperando aprobacion.\n\n"
            "Nombre: {full_name}\n"
            "Email: {email}\n"
            "Categoria: {user_category}\n\n"
            "Revisa las cuentas pendientes aqui:\n"
            "{admin_url}\n\n"
            "Sistema ASSIST-AI"
        ),
        "approved_subject": "Cuenta ASSIST-AI aprobada",
        "approved_body": (
            "Hola {full_name},\n\n"
            "Tu cuenta ASSIST-AI fue aprobada.\n\n"
            "Ahora puedes iniciar sesion aqui:\n"
            "{login_url}\n\n"
            "Gracias,\n"
            "Equipo ASSIST-AI"
        ),
        "denied_subject": "Actualizacion de solicitud de cuenta ASSIST-AI",
        "denied_body": (
            "Hola {full_name},\n\n"
            "Tu solicitud de cuenta ASSIST-AI no fue aprobada.\n"
            "{reason_block}\n"
            "Gracias,\n"
            "Equipo ASSIST-AI"
        ),
        "reason_block": "\nMotivo:\n{reason}\n",
        "suspended_subject": "Cuenta ASSIST-AI suspendida",
        "suspended_body": (
            "Hola {full_name},\n\n"
            "Tu cuenta ASSIST-AI fue suspendida.\n\n"
            "Contacta al administrador del sistema si necesitas ayuda.\n\n"
            "Gracias,\n"
            "Equipo ASSIST-AI"
        ),
        "reactivated_subject": "Cuenta ASSIST-AI reactivada",
        "reactivated_body": (
            "Hola {full_name},\n\n"
            "Tu cuenta ASSIST-AI fue reactivada.\n\n"
            "Ahora puedes iniciar sesion aqui:\n"
            "{login_url}\n\n"
            "Gracias,\n"
            "Equipo ASSIST-AI"
        ),
    },
    "de": {
        "request_subject": "ASSIST-AI Kontoanfrage erhalten",
        "request_body": (
            "Hallo {full_name},\n\n"
            "Deine ASSIST-AI Kontoanfrage wurde erhalten.\n\n"
            "Deine Anfrage wurde zur Prufung an die Systemadministration gesendet.\n"
            "Du erhaltst eine weitere E-Mail, sobald dein Konto genehmigt oder abgelehnt wurde.\n\n"
            "Vielen Dank,\n"
            "ASSIST-AI Team"
        ),
        "admin_subject": "Neues ASSIST-AI Konto wartet auf Freigabe",
        "admin_body": (
            "Ein neuer Benutzer hat sich registriert und wartet auf Freigabe.\n\n"
            "Name: {full_name}\n"
            "E-Mail: {email}\n"
            "Kategorie: {user_category}\n\n"
            "Ausstehende Konten hier prufen:\n"
            "{admin_url}\n\n"
            "ASSIST-AI System"
        ),
        "approved_subject": "ASSIST-AI Konto genehmigt",
        "approved_body": (
            "Hallo {full_name},\n\n"
            "Dein ASSIST-AI Konto wurde genehmigt.\n\n"
            "Du kannst dich jetzt hier anmelden:\n"
            "{login_url}\n\n"
            "Vielen Dank,\n"
            "ASSIST-AI Team"
        ),
        "denied_subject": "Aktualisierung deiner ASSIST-AI Kontoanfrage",
        "denied_body": (
            "Hallo {full_name},\n\n"
            "Deine ASSIST-AI Kontoanfrage wurde nicht genehmigt.\n"
            "{reason_block}\n"
            "Vielen Dank,\n"
            "ASSIST-AI Team"
        ),
        "reason_block": "\nGrund:\n{reason}\n",
        "suspended_subject": "ASSIST-AI Konto gesperrt",
        "suspended_body": (
            "Hallo {full_name},\n\n"
            "Dein ASSIST-AI Konto wurde gesperrt.\n\n"
            "Bitte kontaktiere die Systemadministration, wenn du Hilfe brauchst.\n\n"
            "Vielen Dank,\n"
            "ASSIST-AI Team"
        ),
        "reactivated_subject": "ASSIST-AI Konto reaktiviert",
        "reactivated_body": (
            "Hallo {full_name},\n\n"
            "Dein ASSIST-AI Konto wurde reaktiviert.\n\n"
            "Du kannst dich jetzt hier anmelden:\n"
            "{login_url}\n\n"
            "Vielen Dank,\n"
            "ASSIST-AI Team"
        ),
    },
    "tr": {
        "request_subject": "ASSIST-AI hesap istegi alindi",
        "request_body": (
            "Merhaba {full_name},\n\n"
            "ASSIST-AI hesap istegin alindi.\n\n"
            "Istegin incelenmek uzere sistem yoneticisine gonderildi.\n"
            "Hesabin onaylandiginda veya reddedildiginde bir e-posta daha alacaksin.\n\n"
            "Tesekkurler,\n"
            "ASSIST-AI Ekibi"
        ),
        "admin_subject": "Yeni ASSIST-AI hesabi onay bekliyor",
        "admin_body": (
            "Yeni bir kullanici kaydoldu ve onay bekliyor.\n\n"
            "Ad: {full_name}\n"
            "E-posta: {email}\n"
            "Kategori: {user_category}\n\n"
            "Bekleyen hesaplari buradan incele:\n"
            "{admin_url}\n\n"
            "ASSIST-AI Sistemi"
        ),
        "approved_subject": "ASSIST-AI hesabi onaylandi",
        "approved_body": (
            "Merhaba {full_name},\n\n"
            "ASSIST-AI hesabin onaylandi.\n\n"
            "Artik buradan giris yapabilirsin:\n"
            "{login_url}\n\n"
            "Tesekkurler,\n"
            "ASSIST-AI Ekibi"
        ),
        "denied_subject": "ASSIST-AI hesap istegi guncellemesi",
        "denied_body": (
            "Merhaba {full_name},\n\n"
            "ASSIST-AI hesap istegin onaylanmadi.\n"
            "{reason_block}\n"
            "Tesekkurler,\n"
            "ASSIST-AI Ekibi"
        ),
        "reason_block": "\nNeden:\n{reason}\n",
        "suspended_subject": "ASSIST-AI hesabi askida",
        "suspended_body": (
            "Merhaba {full_name},\n\n"
            "ASSIST-AI hesabin askiya alindi.\n\n"
            "Yardima ihtiyacin varsa lutfen sistem yoneticisiyle iletisime gec.\n\n"
            "Tesekkurler,\n"
            "ASSIST-AI Ekibi"
        ),
        "reactivated_subject": "ASSIST-AI hesabi yeniden etkinlestirildi",
        "reactivated_body": (
            "Merhaba {full_name},\n\n"
            "ASSIST-AI hesabin yeniden etkinlestirildi.\n\n"
            "Artik buradan giris yapabilirsin:\n"
            "{login_url}\n\n"
            "Tesekkurler,\n"
            "ASSIST-AI Ekibi"
        ),
    },
    "pt": {
        "request_subject": "Solicitacao de conta ASSIST-AI recebida",
        "request_body": (
            "Ola {full_name},\n\n"
            "Sua solicitacao de conta ASSIST-AI foi recebida.\n\n"
            "Sua solicitacao foi enviada ao administrador do sistema para revisao.\n"
            "Voce recebera outro email quando sua conta for aprovada ou negada.\n\n"
            "Obrigado,\n"
            "Equipe ASSIST-AI"
        ),
        "admin_subject": "Nova conta ASSIST-AI aguardando aprovacao",
        "admin_body": (
            "Um novo usuario se registrou e esta aguardando aprovacao.\n\n"
            "Nome: {full_name}\n"
            "Email: {email}\n"
            "Categoria: {user_category}\n\n"
            "Revise as contas pendentes aqui:\n"
            "{admin_url}\n\n"
            "Sistema ASSIST-AI"
        ),
        "approved_subject": "Conta ASSIST-AI aprovada",
        "approved_body": (
            "Ola {full_name},\n\n"
            "Sua conta ASSIST-AI foi aprovada.\n\n"
            "Agora voce pode entrar aqui:\n"
            "{login_url}\n\n"
            "Obrigado,\n"
            "Equipe ASSIST-AI"
        ),
        "denied_subject": "Atualizacao da solicitacao de conta ASSIST-AI",
        "denied_body": (
            "Ola {full_name},\n\n"
            "Sua solicitacao de conta ASSIST-AI nao foi aprovada.\n"
            "{reason_block}\n"
            "Obrigado,\n"
            "Equipe ASSIST-AI"
        ),
        "reason_block": "\nMotivo:\n{reason}\n",
        "suspended_subject": "Conta ASSIST-AI suspensa",
        "suspended_body": (
            "Ola {full_name},\n\n"
            "Sua conta ASSIST-AI foi suspensa.\n\n"
            "Entre em contato com o administrador do sistema se precisar de ajuda.\n\n"
            "Obrigado,\n"
            "Equipe ASSIST-AI"
        ),
        "reactivated_subject": "Conta ASSIST-AI reativada",
        "reactivated_body": (
            "Ola {full_name},\n\n"
            "Sua conta ASSIST-AI foi reativada.\n\n"
            "Agora voce pode entrar aqui:\n"
            "{login_url}\n\n"
            "Obrigado,\n"
            "Equipe ASSIST-AI"
        ),
    },
    "fr": {
        "request_subject": "Demande de compte ASSIST-AI recue",
        "request_body": (
            "Bonjour {full_name},\n\n"
            "Ta demande de compte ASSIST-AI a ete recue.\n\n"
            "Ta demande a ete envoyee a l'administrateur du systeme pour examen.\n"
            "Tu recevras un autre e-mail quand ton compte sera approuve ou refuse.\n\n"
            "Merci,\n"
            "Equipe ASSIST-AI"
        ),
        "admin_subject": "Nouveau compte ASSIST-AI en attente d'approbation",
        "admin_body": (
            "Un nouvel utilisateur s'est inscrit et attend une approbation.\n\n"
            "Nom: {full_name}\n"
            "E-mail: {email}\n"
            "Categorie: {user_category}\n\n"
            "Consulte les comptes en attente ici:\n"
            "{admin_url}\n\n"
            "Systeme ASSIST-AI"
        ),
        "approved_subject": "Compte ASSIST-AI approuve",
        "approved_body": (
            "Bonjour {full_name},\n\n"
            "Ton compte ASSIST-AI a ete approuve.\n\n"
            "Tu peux maintenant te connecter ici:\n"
            "{login_url}\n\n"
            "Merci,\n"
            "Equipe ASSIST-AI"
        ),
        "denied_subject": "Mise a jour de ta demande de compte ASSIST-AI",
        "denied_body": (
            "Bonjour {full_name},\n\n"
            "Ta demande de compte ASSIST-AI n'a pas ete approuvee.\n"
            "{reason_block}\n"
            "Merci,\n"
            "Equipe ASSIST-AI"
        ),
        "reason_block": "\nRaison:\n{reason}\n",
        "suspended_subject": "Compte ASSIST-AI suspendu",
        "suspended_body": (
            "Bonjour {full_name},\n\n"
            "Ton compte ASSIST-AI a ete suspendu.\n\n"
            "Contacte l'administrateur du systeme si tu as besoin d'aide.\n\n"
            "Merci,\n"
            "Equipe ASSIST-AI"
        ),
        "reactivated_subject": "Compte ASSIST-AI reactive",
        "reactivated_body": (
            "Bonjour {full_name},\n\n"
            "Ton compte ASSIST-AI a ete reactive.\n\n"
            "Tu peux maintenant te connecter ici:\n"
            "{login_url}\n\n"
            "Merci,\n"
            "Equipe ASSIST-AI"
        ),
    },
}


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


def _copy_for_user(user: User) -> dict[str, str]:
    language = (user.preferred_language or "en").lower()
    if language not in SUPPORTED_EMAIL_LANGUAGES:
        language = "en"
    return EMAIL_COPY[language]


def send_account_request_received_email(user: User) -> None:
    copy = _copy_for_user(user)
    body = copy["request_body"].format(full_name=user.full_name)
    send_email(user.email, copy["request_subject"], body)


def send_admin_new_account_notification(user: User) -> None:
    settings = get_settings()
    copy = EMAIL_COPY["en"]
    body = copy["admin_body"].format(
        full_name=user.full_name,
        email=user.email,
        user_category=user.user_category,
        admin_url=f"{settings.app_frontend_url}/admin/users",
    )
    send_email(settings.admin_notification_email, copy["admin_subject"], body)


def send_account_approved_email(user: User) -> None:
    settings = get_settings()
    copy = _copy_for_user(user)
    body = copy["approved_body"].format(
        full_name=user.full_name,
        login_url=f"{settings.app_frontend_url}/login",
    )
    send_email(user.email, copy["approved_subject"], body)


def send_account_denied_email(user: User, reason: str | None = None) -> None:
    copy = _copy_for_user(user)
    reason_block = (
        copy["reason_block"].format(reason=reason)
        if reason
        else ""
    )
    body = copy["denied_body"].format(
        full_name=user.full_name,
        reason_block=reason_block,
    )
    send_email(user.email, copy["denied_subject"], body)


def send_account_suspended_email(user: User) -> None:
    copy = _copy_for_user(user)
    body = copy["suspended_body"].format(full_name=user.full_name)
    send_email(user.email, copy["suspended_subject"], body)


def send_account_reactivated_email(user: User) -> None:
    settings = get_settings()
    copy = _copy_for_user(user)
    body = copy["reactivated_body"].format(
        full_name=user.full_name,
        login_url=f"{settings.app_frontend_url}/login",
    )
    send_email(user.email, copy["reactivated_subject"], body)
