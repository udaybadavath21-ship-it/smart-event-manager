"""
Email Delivery Service for Smart Event Manager.

Uses the Resend HTTPS API (compatible with Render Free and cloud environments
where outbound SMTP ports 465/587 are blocked).
"""

import logging
import os
from typing import Any, Dict, List, Optional
import resend
from config import EMAIL_FROM, EMAIL_PASSWORD, EMAIL_USER, RESEND_API_KEY

logger = logging.getLogger("email_service")


def _sanitize_email_from(sender: str) -> str:
    """Ensure sender address is safe for Resend testing/domain policy."""
    raw = (sender or "").strip()
    if not raw:
        return "Smart Event Manager <onboarding@resend.dev>"
    lower = raw.lower()
    if any(dom in lower for dom in ["@gmail.com", "@yahoo.com", "@hotmail.com", "@outlook.com"]):
        return "Smart Event Manager <onboarding@resend.dev>"
    return raw


def send_registration_email(
    email: str,
    name: str,
    event_id: str,
    ticket_type: str,
    qr_path: str,
) -> Optional[Dict[str, Any]]:
    """
    Send registration confirmation email with QR code pass attached via Resend HTTPS API.

    Maintains identical signature and behavior to legacy SMTP implementation
    while eliminating outbound SMTP network blocks on cloud hosts like Render Free.
    Provides clear, safe diagnostic logging for container environments.
    """
    # 1. Log that send_registration_email() was called
    print(
        f"[Email Service] send_registration_email() called for attendee: '{name}' (Event ID: {event_id})",
        flush=True,
    )
    logger.info("send_registration_email() called for attendee: '%s' (Event ID: %s)", name, event_id)

    # 2. Check and log whether RESEND_API_KEY is configured (ONLY as True/False, NEVER log the key)
    api_key = (
        os.environ.get("RESEND_API_KEY", "").strip()
        or os.getenv("RESEND_API_KEY", "").strip()
        or (RESEND_API_KEY or "").strip()
    )
    has_api_key = bool(api_key and len(api_key) > 5)
    print(f"[Email Service] RESEND_API_KEY configured: {has_api_key}", flush=True)
    logger.info("RESEND_API_KEY configured: %s", has_api_key)

    if not has_api_key:
        print(
            f"[Email Service] WARNING: RESEND_API_KEY is not configured in environment. Skipping email delivery for recipient: '{email}' (Event ID: {event_id}).",
            flush=True,
        )
        logger.warning(
            "RESEND_API_KEY is not configured in environment. Skipping email delivery for recipient: '%s' (Event ID: %s).",
            email,
            event_id,
        )
        return None

    # 3. Determine and log sender and recipient addresses
    sender_raw = (
        os.environ.get("EMAIL_FROM", "").strip()
        or os.getenv("EMAIL_FROM", "").strip()
        or (EMAIL_FROM or "").strip()
    )
    sender = _sanitize_email_from(sender_raw)
    print(f"[Email Service] Sender address: '{sender}' | Recipient email: '{email}'", flush=True)
    logger.info("Sender address: '%s' | Recipient email: '%s'", sender, email)

    # Plain text email content (matches Milestone 1 specification)
    body = f"""Hello {name},

Your registration has been successfully completed.

Event ID: {event_id}
Ticket Type: {ticket_type}

Your QR Code is attached with this email.

Please carry it on the event day.

Thank you for registering!

Regards,
Event Registration Team
"""

    html_body = f"""<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1e293b; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
    <h2 style="color: #4f46e5; margin-top: 0;">Event Registration Confirmed</h2>
    <p>Hello <strong>{name}</strong>,</p>
    <p>Your registration has been successfully completed.</p>
    <div style="background-color: #f8fafc; padding: 15px; border-radius: 6px; border-left: 4px solid #4f46e5; margin: 15px 0;">
        <p style="margin: 4px 0;"><strong>Event ID:</strong> {event_id}</p>
        <p style="margin: 4px 0;"><strong>Ticket Type:</strong> {ticket_type}</p>
    </div>
    <p>Your <strong>QR Code pass</strong> is attached to this email. Please carry it with you on the event day for check-in.</p>
    <p>Thank you for registering!</p>
    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
    <p style="font-size: 13px; color: #64748b; margin-bottom: 0;">Regards,<br><strong>Event Registration Team</strong></p>
</div>"""

    # 4. Resolve QR attachment path and log status
    resolved_qr = qr_path
    if resolved_qr and not os.path.exists(resolved_qr):
        alt_qr = os.path.join(os.path.dirname(__file__), qr_path)
        if os.path.exists(alt_qr):
            resolved_qr = alt_qr

    file_exists = bool(resolved_qr and os.path.exists(resolved_qr))
    file_size = os.path.getsize(resolved_qr) if file_exists else 0
    print(
        f"[Email Service] QR Attachment: path='{qr_path}', resolved='{resolved_qr}', exists={file_exists}, size={file_size} bytes",
        flush=True,
    )
    logger.info(
        "QR Attachment: path='%s', resolved='%s', exists=%s, size=%d bytes",
        qr_path,
        resolved_qr,
        file_exists,
        file_size,
    )

    attachments: List[Dict[str, Any]] = []
    if file_exists:
        try:
            with open(resolved_qr, "rb") as f:
                attachments.append({
                    "filename": os.path.basename(resolved_qr),
                    "content": list(f.read()),
                })
        except Exception as read_err:
            print(f"[Email Service] WARNING: Failed to read QR attachment from '{resolved_qr}': {read_err}", flush=True)
            logger.warning("Failed to read QR attachment from '%s': %s", resolved_qr, read_err)
    else:
        print(
            f"[Email Service] WARNING: QR attachment file does not exist at '{resolved_qr}'. Proceeding without attachment.",
            flush=True,
        )
        logger.warning("QR attachment file does not exist at '%s'. Proceeding without attachment.", resolved_qr)

    # 5. Dispatch email via Resend HTTPS API
    try:
        print(f"[Email Service] Submitting email to Resend HTTPS API for '{email}' via '{sender}'...", flush=True)
        logger.info("Submitting email to Resend HTTPS API for '%s' via '%s'...", email, sender)

        resend.api_key = api_key
        params: resend.Emails.SendParams = {
            "from": sender,
            "to": [email],
            "subject": "Event Registration Confirmed",
            "text": body,
            "html": html_body,
        }
        if attachments:
            params["attachments"] = attachments

        response = resend.Emails.send(params)

        email_id = None
        if isinstance(response, dict):
            email_id = response.get("id")
        else:
            email_id = getattr(response, "id", str(response))

        print(
            f"[Email Service] SUCCESS: Email submitted to Resend for '{email}'. Message ID: {email_id}",
            flush=True,
        )
        logger.info("SUCCESS: Email submitted to Resend for '%s'. Message ID: %s", email, email_id)
        return response

    except Exception as exc:
        error_code = getattr(exc, "code", None) or getattr(exc, "status_code", "N/A")
        error_type = getattr(exc, "error_type", type(exc).__name__)
        error_message = getattr(exc, "message", str(exc))

        print(
            f"[Email Service] FAILURE: Resend delivery error for '{email}' (Event ID: {event_id}) -> HTTP/API Status: {error_code} | Error Type: {error_type} | Message: {error_message}",
            flush=True,
        )
        logger.error(
            "FAILURE: Resend delivery error for '%s' (Event ID: %s) -> HTTP/API Status: %s | Error Type: %s | Message: %s",
            email,
            event_id,
            error_code,
            error_type,
            error_message,
        )
        return None