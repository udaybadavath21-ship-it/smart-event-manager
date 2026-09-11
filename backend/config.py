"""
Milestone 4 — Centralized Configuration Management.

Provides environment-variable-driven configuration with safe fallbacks
to existing hardcoded values for backward compatibility.
"""

import os
from pathlib import Path
from dotenv import load_dotenv
from urllib.parse import quote_plus

# Load .env from project root or current working directory
_base_dir = Path(__file__).resolve().parent
_root_env = _base_dir.parent / ".env"
_local_env = _base_dir / ".env"

if _root_env.exists():
    load_dotenv(_root_env)
elif _local_env.exists():
    load_dotenv(_local_env)
else:
    load_dotenv()


# ── Database ────────────────────────────────────────────────
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "3306")
DB_USER = os.getenv("DB_USER", "root")
DB_PASSWORD = os.getenv("DB_PASSWORD", "")
DB_NAME = os.getenv("DB_NAME", "event_management")

DATABASE_URL = (
    f"mysql+pymysql://{DB_USER}:{quote_plus(DB_PASSWORD)}"
    f"@{DB_HOST}:{DB_PORT}/{DB_NAME}"
)

# ── Security / JWT ──────────────────────────────────────────
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY")
if not JWT_SECRET_KEY:
    raise RuntimeError(
        "CRITICAL CONFIGURATION ERROR: JWT_SECRET_KEY environment variable "
        "must be defined in .env. Do not run without setting a secure JWT secret key."
    )
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
JWT_EXPIRE_MINUTES = int(os.getenv("JWT_EXPIRE_MINUTES", "60"))

# ── Application ─────────────────────────────────────────────
APP_VERSION = os.getenv("APP_VERSION", "1.0.0")
API_HOST = os.getenv("API_HOST", "127.0.0.1")
API_PORT = int(os.getenv("API_PORT", "8000"))
LOG_LEVEL = os.getenv("LOG_LEVEL", "info")

# ── CORS ────────────────────────────────────────────────────
_default_cors = "http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000,http://127.0.0.1:3000"
_cors_raw = os.getenv("CORS_ORIGINS", _default_cors)
_origins = {origin.strip() for origin in _default_cors.split(",")}
if _cors_raw:
    for origin in _cors_raw.split(","):
        if origin.strip():
            _origins.add(origin.strip())
CORS_ORIGINS = sorted(list(_origins))

# ── Gmail API (OAuth2 HTTPS Service) ────────────────────────
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "").strip()
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET", "").strip()
GOOGLE_REDIRECT_URI = os.getenv(
    "GOOGLE_REDIRECT_URI",
    "https://smart-event-manager-o8m9.onrender.com/gmail/callback",
).strip()
GMAIL_SENDER_EMAIL = os.getenv("GMAIL_SENDER_EMAIL", os.getenv("EMAIL_USER", "")).strip()
GMAIL_REFRESH_TOKEN = os.getenv("GMAIL_REFRESH_TOKEN", "").strip()

# Backward-compatibility aliases
EMAIL_USER = os.getenv("EMAIL_USER", GMAIL_SENDER_EMAIL)
EMAIL_PASSWORD = os.getenv("EMAIL_PASSWORD", "")
EMAIL_FROM = GMAIL_SENDER_EMAIL or "Smart Event Manager"

# ── AI Assistant Provider Config ──────────────────────────────
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "").strip()
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "").strip()

# ── Admin Credentials ───────────────────────────────────────
ADMIN_USERNAME = os.getenv("ADMIN_USERNAME")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD")

if not ADMIN_USERNAME or not ADMIN_PASSWORD:
    raise RuntimeError(
        "CRITICAL CONFIGURATION ERROR: ADMIN_USERNAME and ADMIN_PASSWORD "
        "environment variables must be defined in .env. Do not run without "
        "setting administrator credentials."
    )

