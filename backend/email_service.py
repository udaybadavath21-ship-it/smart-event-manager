"""
Email Delivery Service for Smart Event Manager.

Replaces legacy SMTP with the Resend HTTPS API (compatible with Render Free
and all cloud environments where outbound SMTP ports 465/587 are blocked).
"""

import logging
import os
from typing import Any, Dict, List, Optional
import resend
from config import EMAIL_FROM, EMAIL_PASSWORD, EMAIL_USER, RESEND_API_KEY

logger = logging.getLogger("email_service")


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
    """
    api_key = os.getenv("RESEND_API_KEY") or RESEND_API_KEY
    if not api_key:
        logger.warning(
            "RESEND_API_KEY is not configured. Registration email delivery skipped for recipient: %s (Event ID: %s)",
            email,
            event_id,
        )
        return None

    # Determine sender address
    sender = os.getenv("EMAIL_FROM") or EMAIL_FROM
    if not sender or sender.endswith("@gmail.com") or sender.endswith("@yahoo.com"):
        sender = "Smart Event Manager <onboarding@resend.dev>"

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

    # Build attachments list with QR code image
    attachments: List[Dict[str, Any]] = []
    if qr_path and os.path.exists(qr_path):
        try:
            with open(qr_path, "rb") as img_file:
                attachments.append({
                    "filename": os.path.basename(qr_path),
                    "content": list(img_file.read()),
                })
        except Exception as read_err:
            logger.error("Failed to read QR image attachment from '%s': %s", qr_path, str(read_err))
    else:
        logger.warning("QR code attachment file not found at path: %s", qr_path)

    # Dispatch email via Resend HTTPS API
    try:
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
        email_id = (
            response.get("id")
            if isinstance(response, dict)
            else getattr(response, "id", str(response))
        )
        logger.info(
            "Registration email successfully sent to %s via Resend HTTPS (ID: %s)",
            email,
            email_id,
        )
        return response

    except Exception as exc:
        logger.error(
            "Resend email delivery failure for recipient %s (Event ID: %s): %s",
            email,
            event_id,
            str(exc),
        )
        return None