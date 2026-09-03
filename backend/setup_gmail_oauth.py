"""
Gmail OAuth Setup Utility for Smart Event Manager.

Generates the authorized Google OAuth2 consent URL targeting the production Render callback:
https://smart-event-manager-o8m9.onrender.com/gmail/callback

Guides the administrator through Google consent, where the callback is securely received
and handled by the deployed Render backend without exposing tokens publicly.

Allows the administrator to securely transfer the refresh token to Render environment variables.

Usage:
    python backend/setup_gmail_oauth.py
"""

import getpass
import json
import os
import sys
import time
import urllib.parse
import webbrowser

import requests
from dotenv import load_dotenv

# Load local environment variables from root or backend
base_dir = os.path.dirname(os.path.abspath(__file__))
root_env = os.path.join(base_dir, "..", ".env")
backend_env = os.path.join(base_dir, ".env")

if os.path.exists(root_env):
    load_dotenv(root_env)
elif os.path.exists(backend_env):
    load_dotenv(backend_env)


def save_token_to_local_env(refresh_token: str) -> None:
    """Safely update GMAIL_REFRESH_TOKEN in local git-ignored .env."""
    clean_token = refresh_token.strip()
    target_env = root_env if os.path.exists(root_env) else backend_env

    # 1. Write to git-ignored gmail_token.json
    json_path = os.path.join(base_dir, "gmail_token.json")
    try:
        with open(json_path, "w", encoding="utf-8") as jf:
            json.dump({"refresh_token": clean_token, "saved_at": time.time()}, jf, indent=2)
    except Exception:
        pass

    # 2. Write to git-ignored .env
    if os.path.exists(target_env):
        try:
            with open(target_env, "r", encoding="utf-8") as f:
                lines = f.readlines()

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

            with open(target_env, "w", encoding="utf-8") as f:
                f.writelines(new_lines)
        except Exception:
            pass


def run_gmail_oauth_setup():
    print("=" * 74)
    print("   Smart Event Manager - Gmail API OAuth Setup (Render Production)")
    print("=" * 74)

    client_id = os.getenv("GOOGLE_CLIENT_ID", "").strip()
    redirect_uri = os.getenv(
        "GOOGLE_REDIRECT_URI",
        "https://smart-event-manager-o8m9.onrender.com/gmail/callback",
    ).strip()

    if not client_id:
        print("\n[-] Missing GOOGLE_CLIENT_ID in environment.")
        print("Please ensure GOOGLE_CLIENT_ID is defined in your .env file or enter it below.")
        client_id = input("Enter GOOGLE_CLIENT_ID: ").strip()

    if not client_id:
        print("\n[-] Aborting: GOOGLE_CLIENT_ID is required.")
        sys.exit(1)

    # Build the exact Google OAuth2 consent URL
    params = {
        "client_id": client_id,
        "redirect_uri": redirect_uri,
        "response_type": "code",
        "scope": "https://www.googleapis.com/auth/gmail.send",
        "access_type": "offline",
        "prompt": "consent",
    }
    auth_url = f"https://accounts.google.com/o/oauth2/v2/auth?{urllib.parse.urlencode(params)}"

    print(f"\nOAuth Scope   : https://www.googleapis.com/auth/gmail.send")
    print(f"Redirect URI  : {redirect_uri}")
    print("\n" + "-" * 74)
    print("Google OAuth Authorization URL:")
    print(auth_url)
    print("-" * 74)

    print("\n[+] Opening authorization URL in your default browser...")
    try:
        webbrowser.open(auth_url)
    except Exception:
        pass

    print("\nAUTHORIZATION INSTRUCTIONS:")
    print("1. In your browser, sign in with your authorized sending Gmail account.")
    print("2. Approve the 'Send email on your behalf' permission.")
    print("3. Google will redirect directly to your production Render backend:")
    print(f"   {redirect_uri}")
    print("4. The Render backend securely captures the code and redirects to:")
    print(f"   {redirect_uri.replace('/gmail/callback', '/gmail/admin-setup')}")
    print("5. Enter your Admin Username & Password on that page to view your token.")
    print("6. Copy GMAIL_REFRESH_TOKEN into your Render Dashboard > Environment Variables.")

    render_base = redirect_uri.replace("/gmail/callback", "")
    api_fetch_url = f"{render_base}/gmail/admin-setup/api-token"
    status_url = f"{render_base}/gmail/status"

    print("\n" + "-" * 74)
    choice = input("Would you like this script to securely fetch & save the token to your local .env? (y/n): ").strip().lower()
    if choice in ("y", "yes"):
        admin_user = os.getenv("ADMIN_USERNAME", "").strip() or input("Admin Username: ").strip()
        admin_pass = os.getenv("ADMIN_PASSWORD", "").strip() or getpass.getpass("Admin Password: ").strip()

        print(f"\nContacting Render secure admin setup endpoint: {api_fetch_url}...")
        try:
            resp = requests.post(api_fetch_url, json={"username": admin_user, "password": admin_pass}, timeout=15)
            if resp.status_code == 200:
                res_data = resp.json()
                tok = res_data.get("refresh_token")
                if tok:
                    save_token_to_local_env(tok)
                    print("\n[SUCCESS] Refresh token securely retrieved and saved to local .env and gmail_token.json!")
                    print("SECURITY NOTE:")
                    print("  - Both files are strictly ignored by .gitignore.")
                    print("  - Copy the GMAIL_REFRESH_TOKEN from your local .env file into your")
                    print("    Render Dashboard > Environment Variables so it persists permanently.")
                else:
                    print("\n[-] Token missing in response.")
            elif resp.status_code == 401:
                print("\n[-] Authentication Failed: Invalid administrator username or password.")
            elif resp.status_code == 404:
                print("\n[-] No active authorization session found on Render.")
                print("    Please complete the Google consent in your browser first, then try again.")
            else:
                print(f"\n[-] Render returned HTTP {resp.status_code}: {resp.text}")
        except Exception as net_err:
            print(f"\n[-] Network error contacting Render: {net_err}")

    print("\n" + "=" * 74)
    print(f"Check live integration status anytime at: {status_url}")
    print("=" * 74 + "\n")


if __name__ == "__main__":
    run_gmail_oauth_setup()
