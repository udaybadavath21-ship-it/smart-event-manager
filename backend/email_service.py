"""
Email Delivery Service for Smart Event Manager via Gmail API over HTTPS.

Replaces SMTP and third-party email providers with Google's Gmail API REST endpoint:
POST https://gmail.googleapis.com/gmail/v1/users/me/messages/send

Uses OAuth2 refresh token exchange to maintain valid access tokens automatically.
Eliminates outbound SMTP port blocks on cloud hosts like Render Free.
"""

import base64
import json
import logging
import os
import time
from email.mime.image import MIMEImage
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Any, Dict, Optional

import requests

from config import (
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    GOOGLE_REDIRECT_URI,
    GMAIL_SENDER_EMAIL,
    GMAIL_REFRESH_TOKEN,
    EMAIL_USER,
    EMAIL_PASSWORD,
)

logger = logging.getLogger("email_service")

# In-memory token cache for active process
_runtime_cache: Dict[str, Any] = {
    "refresh_token": None,
    "access_token": None,
    "expires_at": 0.0,
}


def set_runtime_tokens(
    refresh_token: Optional[str] = None,
    access_token: Optional[str] = None,
    expires_in: int = 3600,
) -> None:
    """Store runtime tokens obtained from OAuth callback in memory."""
    if refresh_token:
        _runtime_cache["refresh_token"] = refresh_token
    if access_token:
        _runtime_cache["access_token"] = access_token
        _runtime_cache["expires_at"] = time.time() + max(60, expires_in - 120)


def save_refresh_token_locally(token: str) -> None:
    """
    Persist refresh token to local git-ignored storage for local development.
    NEVER logs or exposes the token value.
    """
    if not token or len(token.strip()) < 5:
        return

    clean_token = token.strip()

    # 1. Save to backend/gmail_token.json (strictly git-ignored)
    token_file = os.path.join(os.path.dirname(__file__), "gmail_token.json")
    try:
        with open(token_file, "w", encoding="utf-8") as f:
            json.dump({"refresh_token": clean_token, "saved_at": time.time()}, f, indent=2)
    except Exception as exc:
        logger.debug("Could not write gmail_token.json: %s", exc)

    # 2. Update or append in local .env if it exists (strictly git-ignored)
    for env_path in [
        os.path.join(os.path.dirname(__file__), "..", ".env"),
        os.path.join(os.path.dirname(__file__), ".env"),
    ]:
        resolved = os.path.abspath(env_path)
        if os.path.exists(resolved):
            try:
                with open(resolved, "r", encoding="utf-8") as ef:
                    lines = ef.readlines()

                updated = False
                new_lines = []
                for line in lines:
                    if line.strip().startswith("GMAIL_REFRESH_TOKEN="):
                        new_lines.append(f"GMAIL_REFRESH_TOKEN={clean_token}\n")
                        updated = True
                    else:
                        new_lines.append(line)

                if not updated:
                    new_lines.append(f"\nGMAIL_REFRESH_TOKEN={clean_token}\n")

                with open(resolved, "w", encoding="utf-8") as ef:
                    ef.writelines(new_lines)
                break
            except Exception as env_exc:
                logger.debug("Could not update local .env with refresh token: %s", env_exc)


def _get_active_refresh_token() -> str:
    """
    Retrieve refresh token with fallback priority:
    1. Environment variable GMAIL_REFRESH_TOKEN
    2. In-memory runtime cache
    3. config.py GMAIL_REFRESH_TOKEN
    4. Local git-ignored gmail_token.json
    """
    # 1. Environment variable
    env_token = os.environ.get("GMAIL_REFRESH_TOKEN", "").strip()
    if env_token:
        return env_token

    # 2. Runtime cache
    cached = (_runtime_cache.get("refresh_token") or "").strip()
    if cached:
        return cached

    # 3. Config module
    if GMAIL_REFRESH_TOKEN and GMAIL_REFRESH_TOKEN.strip():
        return GMAIL_REFRESH_TOKEN.strip()

    # 4. Local git-ignored token file
    candidates = [
        os.path.join(os.path.dirname(__file__), "gmail_token.json"),
        os.path.join(os.path.dirname(__file__), "..", "gmail_token.json"),
    ]
    for p in candidates:
        if os.path.exists(p):
            try:
                with open(p, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    tok = data.get("refresh_token", "").strip()
                    if tok:
                        return tok
            except Exception:
                pass

    return ""


def _get_valid_access_token() -> Optional[str]:
    """
    Obtain a valid OAuth2 access token for the Gmail API.
    Reuses cached token if valid; otherwise exchanges the refresh token.
    """
    # 1. Check in-memory cached access token
    cached_token = _runtime_cache.get("access_token")
    expires_at = _runtime_cache.get("expires_at", 0.0)
    if cached_token and time.time() < expires_at:
        return cached_token

    # 2. Retrieve refresh token and client credentials
    refresh_token = _get_active_refresh_token()
    if not refresh_token:
        return None

    client_id = (os.environ.get("GOOGLE_CLIENT_ID", "").strip() or GOOGLE_CLIENT_ID).strip()
    client_secret = (os.environ.get("GOOGLE_CLIENT_SECRET", "").strip() or GOOGLE_CLIENT_SECRET).strip()

    if not client_id or not client_secret:
        print("[Gmail Service] ERROR: GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET is missing.", flush=True)
        return None

    # 3. Request fresh access token from Google
    token_url = "https://oauth2.googleapis.com/token"
    payload = {
        "client_id": client_id,
        "client_secret": client_secret,
        "refresh_token": refresh_token,
        "grant_type": "refresh_token",
    }

    try:
        resp = requests.post(token_url, data=payload, timeout=12)
        data = resp.json()
    except Exception as err:
        print(f"[Gmail Service] ERROR: Failed network call refreshing token: {err}", flush=True)
        return None

    if resp.status_code != 200:
        err_msg = data.get("error_description", data.get("error", "Unknown token refresh error"))
        print(f"[Gmail Service] ERROR: Google token refresh failed (HTTP {resp.status_code}): {err_msg}", flush=True)
        return None

    access_token = data.get("access_token")
    expires_in = int(data.get("expires_in", 3600))
    if access_token:
        _runtime_cache["access_token"] = access_token
        _runtime_cache["expires_at"] = time.time() + max(60, expires_in - 120)
        return access_token

    return None


def get_gmail_status() -> Dict[str, Any]:
    """
    Diagnostic status report for the Gmail integration.
    Guarantees no secret keys, access tokens, or refresh tokens are exposed.
    """
    client_id = (os.environ.get("GOOGLE_CLIENT_ID", "").strip() or GOOGLE_CLIENT_ID).strip()
    client_secret = (os.environ.get("GOOGLE_CLIENT_SECRET", "").strip() or GOOGLE_CLIENT_SECRET).strip()
    refresh_token = _get_active_refresh_token()
    sender_email = (
        os.environ.get("GMAIL_SENDER_EMAIL", "").strip()
        or GMAIL_SENDER_EMAIL
        or "me"
    ).strip()

    is_configured = bool(client_id and client_secret and refresh_token)

    return {
        "provider": "gmail_api_https",
        "configured": is_configured,
        "has_client_id": bool(client_id),
        "has_client_secret": bool(client_secret),
        "has_refresh_token": bool(refresh_token),
        "sender_email": sender_email,
        "redirect_uri": GOOGLE_REDIRECT_URI,
        "note": "Authorized via Google OAuth2; sends over HTTPS via users.messages.send.",
    }


def send_registration_email(
    email: str,
    name: str,
    event_id: str,
    ticket_type: str,
    qr_path: str,
) -> Optional[Dict[str, Any]]:
    """
    Send registration confirmation email with QR code pass attached via Gmail API over HTTPS.

    Maintains identical signature and behavior to legacy implementation
    while eliminating outbound SMTP network blocks on cloud hosts like Render Free.
    Provides clear, safe diagnostic logging for container environments.
    """
    # 1. Log function invocation
    print(
        f"[Gmail Service] send_registration_email() called for attendee: '{name}' (Event ID: {event_id})",
        flush=True,
    )
    logger.info("send_registration_email() called for attendee: '%s' (Event ID: %s)", name, event_id)

    # 2. Check and log whether refresh token is configured (ONLY as True/False, NEVER log the token)
    refresh_token = _get_active_refresh_token()
    has_refresh_token = bool(refresh_token and len(refresh_token) > 5)
    print(f"[Gmail Service] GMAIL_REFRESH_TOKEN configured: {has_refresh_token}", flush=True)
    logger.info("GMAIL_REFRESH_TOKEN configured: %s", has_refresh_token)

    if not has_refresh_token:
        print(
            f"[Gmail Service] WARNING: GMAIL_REFRESH_TOKEN is not configured. Skipping email delivery for recipient: '{email}' (Event ID: {event_id}). Visit /gmail/auth to authorize.",
            flush=True,
        )
        logger.warning(
            "GMAIL_REFRESH_TOKEN is not configured. Skipping email delivery for recipient: '%s' (Event ID: %s).",
            email,
            event_id,
        )
        return None

    # 3. Obtain active access token
    access_token = _get_valid_access_token()
    if not access_token:
        print(
            f"[Gmail Service] ERROR: Unable to obtain valid Gmail API access token. Skipping delivery for '{email}'.",
            flush=True,
        )
        logger.error("Unable to obtain valid Gmail API access token for recipient: %s", email)
        return None

    # 4. Determine sender email
    sender_email = (
        os.environ.get("GMAIL_SENDER_EMAIL", "").strip()
        or GMAIL_SENDER_EMAIL
        or "me"
    ).strip()

    # 5. Build plain text and HTML message bodies
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

    # 6. Resolve QR attachment path and log status
    resolved_qr = qr_path
    if resolved_qr and not os.path.exists(resolved_qr):
        alt_qr = os.path.join(os.path.dirname(__file__), qr_path)
        if os.path.exists(alt_qr):
            resolved_qr = alt_qr

    qr_exists = bool(resolved_qr and os.path.exists(resolved_qr))
    qr_size = os.path.getsize(resolved_qr) if qr_exists else 0
    print(
        f"[Gmail Service] QR Attachment: path='{qr_path}', resolved='{resolved_qr}', exists={qr_exists}, size={qr_size} bytes",
        flush=True,
    )
    logger.info("QR Attachment: path='%s', resolved='%s', exists=%s, size=%d bytes", qr_path, resolved_qr, qr_exists, qr_size)

    # 7. Construct MIME multipart email message
    try:
        message = MIMEMultipart("mixed")
        message["To"] = email
        message["From"] = sender_email
        message["Subject"] = "Event Registration Confirmed"

        # Alternative part for plain text and HTML
        alt_part = MIMEMultipart("alternative")
        alt_part.attach(MIMEText(body, "plain", "utf-8"))
        alt_part.attach(MIMEText(html_body, "html", "utf-8"))
        message.attach(alt_part)

        # Attach QR PNG image
        if qr_exists:
            try:
                with open(resolved_qr, "rb") as img_file:
                    img_part = MIMEImage(img_file.read())
                    img_part.add_header(
                        "Content-Disposition",
                        "attachment",
                        filename=os.path.basename(resolved_qr),
                    )
                    message.attach(img_part)
            except Exception as read_err:
                print(f"[Gmail Service] WARNING: Failed to read QR attachment from '{resolved_qr}': {read_err}", flush=True)
        else:
            print(
                f"[Gmail Service] WARNING: QR attachment file not found at '{resolved_qr}'. Proceeding without attachment.",
                flush=True,
            )

        # Base64url encode the entire MIME message
        raw_message = base64.urlsafe_b64encode(message.as_bytes()).decode("utf-8")

    except Exception as mime_err:
        print(f"[Gmail Service] ERROR: Failed constructing MIME message: {mime_err}", flush=True)
        logger.error("Failed constructing MIME message: %s", mime_err)
        return None

    # 8. Submit via Gmail API over HTTPS
    try:
        print(f"[Gmail Service] Submitting email to Gmail API HTTPS for recipient: '{email}'...", flush=True)
        logger.info("Submitting email to Gmail API HTTPS for recipient: '%s'...", email)

        send_url = "https://gmail.googleapis.com/gmail/v1/users/me/messages/send"
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json",
        }
        send_resp = requests.post(send_url, json={"raw": raw_message}, headers=headers, timeout=15)

        if send_resp.status_code == 200:
            msg_data = send_resp.json()
            message_id = msg_data.get("id", "unknown")
            print(
                f"[Gmail Service] SUCCESS: Email submitted via Gmail API for '{email}'. Gmail Message ID: {message_id}",
                flush=True,
            )
            logger.info("SUCCESS: Email submitted via Gmail API for '%s'. Gmail Message ID: %s", email, message_id)
            return msg_data
        else:
            try:
                err_json = send_resp.json()
                safe_reason = err_json.get("error", {}).get("message", send_resp.text[:200])
            except Exception:
                safe_reason = send_resp.text[:200]

            print(
                f"[Gmail Service] FAILURE: Gmail API delivery error for '{email}' (Event ID: {event_id}) -> Status: {send_resp.status_code} | Reason: {safe_reason}",
                flush=True,
            )
            logger.error(
                "FAILURE: Gmail API delivery error for '%s' (Event ID: %s) -> Status: %s | Reason: %s",
                email,
                event_id,
                send_resp.status_code,
                safe_reason,
            )
            return None

    except Exception as exc:
        print(f"[Gmail Service] FAILURE: Unexpected error calling Gmail API for '{email}': {exc}", flush=True)
        logger.error("FAILURE: Unexpected error calling Gmail API for '%s': %s", email, exc)
        return None