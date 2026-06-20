"""
Notification helpers for UrbanFlow AI.

SMS  → Simulated (logged to console; no external service required)
Email → SMTP   (real delivery when SMTP_USER / SMTP_PASSWORD are set)
"""

import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from app.config import settings

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────────────────────
# SMS – Simulated (no Twilio, no external service)
# ─────────────────────────────────────────────────────────────────────────────

def send_sms(to_number: str, body: str) -> bool:
    """
    Simulate sending an SMS by logging it to the console.

    In a real deployment you could swap this for any free/open service
    (e.g. Vonage free tier, AWS SNS sandbox, or a self-hosted gateway).
    For now the message is printed so the app works without any credentials.
    """
    logger.info(
        "[SIMULATED SMS] TO: %s\n%s\n%s",
        to_number,
        "─" * 60,
        body,
    )
    print(f"\n📱 [SIMULATED SMS → {to_number}]\n{body}\n")
    return True          # always succeeds so the SOS flow completes normally


def send_sos_sms_to_contacts(contact_entries: list[str], user_name: str, lat: float, lng: float) -> list[str]:
    """
    Parse a list of 'Name:Phone' strings and send a simulated emergency SMS
    to each number.

    Returns a list of contact display-names that were notified.
    """
    maps_link = f"https://maps.google.com/?q={lat},{lng}"
    notified = []

    for entry in contact_entries:
        entry = entry.strip()
        if not entry:
            continue

        if ":" in entry:
            name, phone = entry.split(":", 1)
            name = name.strip()
            phone = phone.strip()
        else:
            name = entry
            phone = None

        if phone:
            body = (
                f"🚨 EMERGENCY ALERT from UrbanFlow AI 🚨\n"
                f"{user_name} has triggered an SOS!\n"
                f"Live location: {maps_link}\n"
                f"Please contact them immediately or call emergency services (100 / 112)."
            )
            send_sms(phone, body)

        notified.append(name)

    return notified


# ─────────────────────────────────────────────────────────────────────────────
# Password-reset email via SMTP
# ─────────────────────────────────────────────────────────────────────────────

def send_password_reset_email(to_email: str, reset_token: str, user_name: str) -> bool:
    """
    Send a password-reset email with a tokenised reset link.

    Returns True on success.  Falls back to console logging when SMTP is not configured.
    """
    reset_link = f"{settings.APP_BASE_URL}/reset-password?token={reset_token}"

    subject = "UrbanFlow AI – Password Reset Request"
    html_body = f"""
    <div style="font-family:sans-serif;max-width:500px;margin:auto;padding:24px;
                background:#0b132b;color:#cbd5e1;border-radius:12px;">
      <h2 style="color:#5BC0BE;margin-bottom:8px;">UrbanFlow AI</h2>
      <p>Hi {user_name},</p>
      <p>We received a request to reset the password for your account.</p>
      <p style="margin:24px 0;">
        <a href="{reset_link}"
           style="background:#5BC0BE;color:#0b132b;padding:12px 24px;
                  border-radius:8px;text-decoration:none;font-weight:bold;">
          Reset My Password
        </a>
      </p>
      <p style="font-size:12px;color:#6b7280;">
        This link expires in <strong>30 minutes</strong>.
        If you did not request a password reset, you can safely ignore this email.
      </p>
      <hr style="border-color:#1c2541;margin:24px 0;"/>
      <p style="font-size:11px;color:#4b5563;">UrbanFlow AI · Smart City Mobility Platform</p>
    </div>
    """

    if not settings.SMTP_USER or not settings.SMTP_PASSWORD:
        logger.warning(
            "[EMAIL – no SMTP credentials] TO: %s | reset link: %s", to_email, reset_link
        )
        return reset_link  # truthy

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = settings.SMTP_FROM
        msg["To"] = to_email
        msg.attach(MIMEText(html_body, "html"))

        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
            server.starttls()
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.sendmail(settings.SMTP_FROM, to_email, msg.as_string())

        logger.info("Password-reset email sent to %s", to_email)
        return True
    except Exception as exc:
        logger.error("SMTP email failed to %s: %s", to_email, exc)
        return False
