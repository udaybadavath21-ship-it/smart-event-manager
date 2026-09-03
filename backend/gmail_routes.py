"""
Gmail OAuth2 Endpoints for Smart Event Manager.

Provides:
- GET  /gmail/auth               : Initiates Google OAuth consent flow for gmail.send scope.
- GET  /gmail/callback           : Receives OAuth callback, exchanges code securely, and redirects to strip code from URL.
- GET  /gmail/admin-setup        : Secure admin identity challenge page (zero tokens exposed publicly).
- POST /gmail/admin-setup/verify : Authenticates admin credentials and provides one-time Render environment setup instructions.
- POST /gmail/admin-setup/api-token : Authenticated endpoint for CLI setup tools over HTTPS.
- GET  /gmail/status             : Public diagnostic status endpoint (never exposes secrets or tokens).
"""

import html
import logging
import os
import secrets
import time
import urllib.parse
from typing import Any, Dict, Optional

import requests
from fastapi import APIRouter, Form, HTTPException, Request
from fastapi.responses import HTMLResponse, JSONResponse, RedirectResponse
from pydantic import BaseModel

from config import (
    ADMIN_PASSWORD,
    ADMIN_USERNAME,
    GMAIL_REFRESH_TOKEN,
    GMAIL_SENDER_EMAIL,
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    GOOGLE_REDIRECT_URI,
)

router = APIRouter(tags=["Gmail OAuth"])
logger = logging.getLogger("gmail_routes")

# Short-lived in-memory staging for admin setup sessions (15 minutes TTL)
# Format: {session_id: {"refresh_token": str, "created_at": float, "failed_attempts": int}}
_pending_admin_sessions: Dict[str, Dict[str, Any]] = {}


def _clean_expired_sessions() -> None:
    """Purge sessions older than 15 minutes."""
    now = time.time()
    expired = [k for k, v in _pending_admin_sessions.items() if now - v.get("created_at", 0) > 900]
    for k in expired:
        _pending_admin_sessions.pop(k, None)


@router.get("/gmail/auth")
def gmail_auth(request: Request):
    """
    Redirect administrator to Google OAuth consent screen for Gmail sending scope.
    Requests offline access and consent prompt to ensure a refresh token is issued.
    """
    client_id = (os.environ.get("GOOGLE_CLIENT_ID", "").strip() or GOOGLE_CLIENT_ID).strip()
    redirect_uri = (os.environ.get("GOOGLE_REDIRECT_URI", "").strip() or GOOGLE_REDIRECT_URI).strip()

    if not client_id:
        return HTMLResponse(
            content="""
            <!DOCTYPE html>
            <html>
                <head><title>Gmail OAuth Configuration Error</title></head>
                <body style="font-family: system-ui, -apple-system, sans-serif; padding: 40px; background: #f8fafc; color: #1e293b;">
                    <div style="max-width: 600px; margin: auto; background: white; padding: 32px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.08); border-top: 5px solid #ef4444;">
                        <h2 style="color: #dc2626; margin-top: 0;">Missing GOOGLE_CLIENT_ID</h2>
                        <p>The <code>GOOGLE_CLIENT_ID</code> environment variable is not configured in this environment.</p>
                        <p>Please add <code>GOOGLE_CLIENT_ID</code> and <code>GOOGLE_CLIENT_SECRET</code> to your Render environment variables or <code>.env</code> file, then restart the server.</p>
                        <p><a href="/" style="color: #4f46e5; text-decoration: none; font-weight: 500;">&larr; Return to Dashboard</a></p>
                    </div>
                </body>
            </html>
            """,
            status_code=400,
        )

    params = {
        "client_id": client_id,
        "redirect_uri": redirect_uri,
        "response_type": "code",
        "scope": "https://www.googleapis.com/auth/gmail.send",
        "access_type": "offline",
        "prompt": "consent",
    }
    auth_url = f"https://accounts.google.com/o/oauth2/v2/auth?{urllib.parse.urlencode(params)}"
    print(f"[Gmail OAuth] Redirecting user to Google OAuth consent page (Redirect URI: {redirect_uri})", flush=True)
    return RedirectResponse(url=auth_url)


@router.get("/gmail/callback")
def gmail_callback(
    code: Optional[str] = None,
    error: Optional[str] = None,
):
    """
    Handle Google OAuth callback, exchange authorization code for tokens,
    and immediately redirect to strip the authorization code from the browser URL.
    """
    _clean_expired_sessions()

    if error:
        print(f"[Gmail OAuth] ERROR: Google returned authorization error: {error}", flush=True)
        return RedirectResponse(url=f"/gmail/admin-setup?error={urllib.parse.quote(error)}", status_code=303)

    if not code:
        return RedirectResponse(url="/gmail/admin-setup?error=missing_code", status_code=303)

    client_id = (os.environ.get("GOOGLE_CLIENT_ID", "").strip() or GOOGLE_CLIENT_ID).strip()
    client_secret = (os.environ.get("GOOGLE_CLIENT_SECRET", "").strip() or GOOGLE_CLIENT_SECRET).strip()
    redirect_uri = (os.environ.get("GOOGLE_REDIRECT_URI", "").strip() or GOOGLE_REDIRECT_URI).strip()

    token_url = "https://oauth2.googleapis.com/token"
    token_payload = {
        "code": code,
        "client_id": client_id,
        "client_secret": client_secret,
        "redirect_uri": redirect_uri,
        "grant_type": "authorization_code",
    }

    try:
        resp = requests.post(token_url, data=token_payload, timeout=15)
        data = resp.json()
    except Exception as exc:
        print(f"[Gmail OAuth] ERROR: Failed network call to Google token endpoint: {exc}", flush=True)
        return RedirectResponse(url="/gmail/admin-setup?error=network_failure", status_code=303)

    if resp.status_code != 200:
        err_desc = data.get("error_description", data.get("error", "Unknown token exchange failure"))
        print(f"[Gmail OAuth] ERROR: Token exchange failed with HTTP {resp.status_code}: {err_desc}", flush=True)
        return RedirectResponse(url=f"/gmail/admin-setup?error={urllib.parse.quote(str(err_desc))}", status_code=303)

    refresh_token = data.get("refresh_token")
    access_token = data.get("access_token")
    expires_in = int(data.get("expires_in", 3600))

    # Activate in-memory runtime cache for the active process
    from email_service import save_refresh_token_locally, set_runtime_tokens

    set_runtime_tokens(
        refresh_token=refresh_token,
        access_token=access_token,
        expires_in=expires_in,
    )

    if refresh_token:
        save_refresh_token_locally(refresh_token)

        # Stage for secure admin-authenticated transfer to Render environment variables
        session_id = secrets.token_urlsafe(32)
        _pending_admin_sessions[session_id] = {
            "refresh_token": refresh_token,
            "created_at": time.time(),
            "failed_attempts": 0,
        }
        print(
            f"[Gmail OAuth] SUCCESS: Authorization code exchanged. Admin setup session created. Refresh token present: True",
            flush=True,
        )
        return RedirectResponse(url=f"/gmail/admin-setup?session={session_id}", status_code=303)
    else:
        print(
            "[Gmail OAuth] NOTICE: Google did not return a new refresh token (already granted previously).",
            flush=True,
        )
        return RedirectResponse(url="/gmail/admin-setup?notice=already_authorized", status_code=303)


@router.get("/gmail/admin-setup")
def gmail_admin_setup_page(
    session: Optional[str] = None,
    error: Optional[str] = None,
    notice: Optional[str] = None,
):
    """
    Administrator identity challenge page.
    NEVER renders or reveals the refresh token to unauthenticated visitors.
    """
    _clean_expired_sessions()

    if error:
        return HTMLResponse(
            content=f"""
            <!DOCTYPE html>
            <html>
                <head><title>Gmail Authorization Failed</title></head>
                <body style="font-family: system-ui, -apple-system, sans-serif; padding: 40px; background: #fef2f2; color: #991b1b; line-height: 1.6;">
                    <div style="max-width: 600px; margin: auto; background: white; padding: 32px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.08); border-top: 5px solid #dc2626;">
                        <h2 style="color: #dc2626; margin-top: 0;">Authorization Error</h2>
                        <p>{html.escape(error)}</p>
                        <p><a href="/gmail/auth" style="display: inline-block; padding: 8px 16px; background: #dc2626; color: white; border-radius: 6px; text-decoration: none; font-weight: 500;">Restart Authorization</a></p>
                    </div>
                </body>
            </html>
            """,
            status_code=400,
        )

    if notice == "already_authorized":
        return HTMLResponse(
            content="""
            <!DOCTYPE html>
            <html>
                <head><title>Gmail API Already Authorized</title></head>
                <body style="font-family: system-ui, -apple-system, sans-serif; padding: 40px; background: #f8fafc; color: #1e293b; line-height: 1.6;">
                    <div style="max-width: 600px; margin: auto; background: white; padding: 36px; border-radius: 12px; box-shadow: 0 4px 16px rgba(0,0,0,0.08); border-top: 5px solid #3b82f6;">
                        <h2 style="color: #2563eb; margin-top: 0;">Gmail Already Authorized</h2>
                        <p>Google did not issue a new refresh token because this account was granted access previously. The existing refresh token remains active.</p>
                        <p>If you need a new refresh token, revoke access at <a href="https://myaccount.google.com/permissions" target="_blank" style="color: #4f46e5; text-decoration: underline;">Google Account Permissions</a> and authorize again.</p>
                        <div style="margin-top: 24px;">
                            <a href="/gmail/status" style="display: inline-block; padding: 10px 20px; background: #0f172a; color: white; text-decoration: none; border-radius: 6px; font-weight: 500;">Check Live Status &rarr;</a>
                        </div>
                    </div>
                </body>
            </html>
            """
        )

    if not session or session not in _pending_admin_sessions:
        return HTMLResponse(
            content="""
            <!DOCTYPE html>
            <html>
                <head><title>Gmail Setup Session Expired</title></head>
                <body style="font-family: system-ui, -apple-system, sans-serif; padding: 40px; background: #f8fafc; color: #1e293b; line-height: 1.6;">
                    <div style="max-width: 600px; margin: auto; background: white; padding: 36px; border-radius: 12px; box-shadow: 0 4px 16px rgba(0,0,0,0.08); border-top: 5px solid #64748b;">
                        <h2 style="color: #334155; margin-top: 0;">No Active Setup Session</h2>
                        <p>No active authorization session was found, or the session has expired.</p>
                        <p>If you have already configured <code>GMAIL_REFRESH_TOKEN</code> in your Render Environment Variables, your service is active and ready.</p>
                        <div style="margin-top: 24px;">
                            <a href="/gmail/auth" style="display: inline-block; padding: 9px 18px; background: #4f46e5; color: white; text-decoration: none; border-radius: 6px; font-weight: 500; margin-right: 10px;">Start New Authorization</a>
                            <a href="/gmail/status" style="display: inline-block; padding: 9px 18px; background: #0f172a; color: white; text-decoration: none; border-radius: 6px; font-weight: 500;">Check Status</a>
                        </div>
                    </div>
                </body>
            </html>
            """
        )

    # Render secure admin authentication form
    return HTMLResponse(
        content=f"""
        <!DOCTYPE html>
        <html>
            <head><title>Administrator Verification - Gmail Setup</title></head>
            <body style="font-family: system-ui, -apple-system, sans-serif; padding: 40px; background: #f8fafc; color: #1e293b; line-height: 1.6;">
                <div style="max-width: 580px; margin: auto; background: white; padding: 36px; border-radius: 12px; box-shadow: 0 4px 16px rgba(0,0,0,0.08); border-top: 5px solid #4f46e5;">
                    <div style="font-size: 40px; text-align: center; margin-bottom: 8px;">🔒</div>
                    <h2 style="color: #1e1b4b; text-align: center; margin-top: 0;">Administrator Identity Verification</h2>
                    <p style="color: #475569; text-align: center; margin-bottom: 24px;">
                        Google OAuth authorization succeeded. To securely obtain the <code>GMAIL_REFRESH_TOKEN</code> for your Render Environment Variables, authenticate with your administrator credentials.
                    </p>
                    <form method="POST" action="/gmail/admin-setup/verify" style="background: #f8fafc; padding: 24px; border-radius: 8px; border: 1px solid #e2e8f0;">
                        <input type="hidden" name="session_id" value="{html.escape(session)}" />
                        <div style="margin-bottom: 16px;">
                            <label style="display: block; font-weight: 600; font-size: 14px; margin-bottom: 6px; color: #334155;">Admin Username:</label>
                            <input type="text" name="username" required autocomplete="username" style="width: 100%; padding: 10px; border: 1px solid #cbd5e1; border-radius: 6px; box-sizing: border-box; font-size: 14px;" />
                        </div>
                        <div style="margin-bottom: 20px;">
                            <label style="display: block; font-weight: 600; font-size: 14px; margin-bottom: 6px; color: #334155;">Admin Password:</label>
                            <input type="password" name="password" required autocomplete="current-password" style="width: 100%; padding: 10px; border: 1px solid #cbd5e1; border-radius: 6px; box-sizing: border-box; font-size: 14px;" />
                        </div>
                        <button type="submit" style="width: 100%; padding: 11px; background: #4f46e5; color: white; border: none; border-radius: 6px; font-weight: 600; font-size: 15px; cursor: pointer;">
                            Unlock Render Configuration Token &rarr;
                        </button>
                    </form>
                    <p style="font-size: 12px; color: #94a3b8; text-align: center; margin-top: 16px; margin-bottom: 0;">
                        Security note: This setup session expires automatically after 15 minutes.
                    </p>
                </div>
            </body>
        </html>
        """
    )


@router.post("/gmail/admin-setup/verify")
def gmail_admin_verify(
    username: str = Form(...),
    password: str = Form(...),
    session_id: str = Form(...),
):
    """
    Authenticate administrator credentials before revealing the GMAIL_REFRESH_TOKEN.
    One-time access: Deletes the staged token from memory immediately upon authorized retrieval.
    """
    _clean_expired_sessions()

    session_data = _pending_admin_sessions.get(session_id)
    if not session_data:
        return HTMLResponse(
            content="""
            <div style="font-family: sans-serif; max-width: 500px; margin: 50px auto; padding: 24px; border: 1px solid #ef4444; border-radius: 8px; color: #991b1b;">
                <h3>Session Expired</h3>
                <p>This setup session has expired or was already consumed. Please restart authorization at <a href="/gmail/auth">/gmail/auth</a>.</p>
            </div>
            """,
            status_code=400,
        )

    # Secure constant-time authentication against ADMIN_USERNAME and ADMIN_PASSWORD
    valid_user = secrets.compare_digest(username.strip(), (os.getenv("ADMIN_USERNAME") or ADMIN_USERNAME or "").strip())
    valid_pass = secrets.compare_digest(password.strip(), (os.getenv("ADMIN_PASSWORD") or ADMIN_PASSWORD or "").strip())

    if not (valid_user and valid_pass):
        session_data["failed_attempts"] += 1
        if session_data["failed_attempts"] >= 3:
            _pending_admin_sessions.pop(session_id, None)
            print("[Gmail OAuth] SECURITY: Too many failed admin authentication attempts. Setup session revoked.", flush=True)

        return HTMLResponse(
            content="""
            <div style="font-family: sans-serif; max-width: 500px; margin: 50px auto; padding: 24px; border: 1px solid #dc2626; border-radius: 8px; color: #991b1b;">
                <h3>❌ Authentication Failed</h3>
                <p>Invalid administrator username or password. Access denied.</p>
                <p><a href="javascript:history.back()">&larr; Try Again</a></p>
            </div>
            """,
            status_code=401,
        )

    # Authorized: extract token and immediately consume/delete session
    refresh_token = session_data["refresh_token"]
    _pending_admin_sessions.pop(session_id, None)

    print("[Gmail OAuth] SUCCESS: Administrator authenticated. Displaying GMAIL_REFRESH_TOKEN for Render environment setup.", flush=True)

    return HTMLResponse(
        content=f"""
        <!DOCTYPE html>
        <html>
            <head><title>Gmail Refresh Token - Render Environment Setup</title></head>
            <body style="font-family: system-ui, -apple-system, sans-serif; padding: 40px; background: #f8fafc; color: #1e293b; line-height: 1.6;">
                <div style="max-width: 650px; margin: auto; background: white; padding: 36px; border-radius: 12px; box-shadow: 0 4px 16px rgba(0,0,0,0.08); border-top: 5px solid #10b981;">
                    <div style="font-size: 44px; text-align: center; margin-bottom: 8px;">✅</div>
                    <h2 style="color: #059669; text-align: center; margin-top: 0;">Administrator Authorized</h2>
                    <p>Your Gmail OAuth refresh token has been generated. Because Render Free ephemeral disks are rebuilt on redeployments, set this token in your Render Dashboard to ensure permanent email delivery.</p>
                    
                    <div style="margin: 24px 0; background: #f1f5f9; padding: 18px; border-radius: 8px; border: 1px solid #cbd5e1;">
                        <label style="display: block; font-weight: 600; margin-bottom: 8px; color: #0f172a;">GMAIL_REFRESH_TOKEN (Copy for Render Environment Variables):</label>
                        <input type="text" id="refToken" value="{html.escape(refresh_token)}" readonly style="width: 100%; padding: 10px; font-family: monospace; font-size: 13px; border: 1px solid #94a3b8; border-radius: 6px; box-sizing: border-box; background: white;" />
                        <button onclick="navigator.clipboard.writeText(document.getElementById('refToken').value); alert('Token copied to clipboard!');" style="margin-top: 12px; padding: 9px 18px; background: #4f46e5; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 14px;">
                            📋 Copy Refresh Token
                        </button>
                    </div>

                    <div style="background: #f0fdf4; padding: 16px 20px; border-radius: 8px; border-left: 4px solid #10b981; font-size: 14px; margin-top: 20px;">
                        <strong>Permanent Setup Instructions:</strong>
                        <ol style="margin: 8px 0 0 16px; padding: 0;">
                            <li>Open your <strong>Render Dashboard &gt; smart-event-manager</strong> service.</li>
                            <li>Navigate to the <strong>Environment</strong> tab.</li>
                            <li>Add or update the environment variable: <code>GMAIL_REFRESH_TOKEN</code>.</li>
                            <li>Click <strong>Save Changes</strong>.</li>
                        </ol>
                    </div>

                    <div style="margin-top: 25px; text-align: center;">
                        <a href="/gmail/status" style="display: inline-block; padding: 10px 20px; background: #0f172a; color: white; text-decoration: none; border-radius: 6px; font-weight: 500;">Verify Live Integration Status &rarr;</a>
                    </div>
                </div>
            </body>
        </html>
        """
    )


class AdminApiTokenRequest(BaseModel):
    username: str
    password: str
    session_id: Optional[str] = None


@router.post("/gmail/admin-setup/api-token")
def gmail_admin_api_token(payload: AdminApiTokenRequest):
    """
    Authenticated JSON endpoint for CLI utilities (like setup_gmail_oauth.py) over HTTPS.
    Guarantees that only valid administrators can retrieve staged refresh tokens.
    """
    _clean_expired_sessions()

    valid_user = secrets.compare_digest(payload.username.strip(), (os.getenv("ADMIN_USERNAME") or ADMIN_USERNAME or "").strip())
    valid_pass = secrets.compare_digest(payload.password.strip(), (os.getenv("ADMIN_PASSWORD") or ADMIN_PASSWORD or "").strip())

    if not (valid_user and valid_pass):
        raise HTTPException(status_code=401, detail="Invalid administrator credentials.")

    # Locate target session
    target_session = None
    if payload.session_id and payload.session_id in _pending_admin_sessions:
        target_session = payload.session_id
    elif _pending_admin_sessions:
        # If single pending session, use the most recent
        target_session = list(_pending_admin_sessions.keys())[-1]

    if not target_session or target_session not in _pending_admin_sessions:
        raise HTTPException(status_code=404, detail="No active authorization session found.")

    token = _pending_admin_sessions[target_session]["refresh_token"]
    _pending_admin_sessions.pop(target_session, None)

    return JSONResponse(content={"status": "success", "refresh_token": token})


@router.get("/gmail/status")
def gmail_status():
    """
    Check Gmail API configuration and authorization status.
    Never exposes client secrets, access tokens, or refresh tokens.
    """
    from email_service import get_gmail_status

    return JSONResponse(content=get_gmail_status())
