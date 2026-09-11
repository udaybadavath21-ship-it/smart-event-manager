# External Services & Integrations

**Date:** 2026-09-11  
**Project:** Smart Event Manager

## Database Integration

- **MySQL Database**:
  - Connection URL: `mysql+pymysql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}`
  - Managed via SQLAlchemy ORM (`backend/database.py`, `backend/models.py`)
  - Configured via environment variables in `.env` (`DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`)
  - Default database name: `event_management`

---

## Email Services (SMTP)

- **Gmail SMTP Server**:
  - Host: `smtp.gmail.com:587` (TLS)
  - Configured via `.env` (`EMAIL_USER`, `EMAIL_PASSWORD`)
  - Module: `backend/email_service.py` & `backend/main.py` (`send_schedule_email`, `send_registration_email`)
  - Sends automatic attendee registration tickets (with QR attachments) and speaker session schedules/reminders.

---

## Authentication & Authorization

- **JWT Authentication**:
  - Implementation: `backend/security.py` & `backend/auth.py`
  - OAuth2 Bearer Token flow (`/login`, `/token`)
  - Token expiration: 60 minutes
  - Secret key configured in `security.py`

---

## Data Import / Export

- **CSV File Upload**:
  - Endpoint: `POST /upload-csv`
  - Uses `pandas` to parse CSV files and bulk-insert attendees into MySQL database.
- **Client-Side Export**:
  - CSV reports export in `frontend/src/pages/ReportsPage.jsx`
  - PDF export capabilities via `jspdf` and `html2canvas`

---

## AI & Rule-Based Agents

- **Venue Agent**: AI venue scoring engine (`POST /venue-agent/recommend`, `POST /venue-agent/room-suggestion`)
- **Speaker Agent**: AI speaker matching engine (`POST /speaker-agent/recommend`)
- **Sponsorship Agent**: AI sponsor & package match engine (`POST /sponsorship-agent/recommend`)
- **Incident Agent**: AI incident priority calculation engine (`POST /incident-agent/recommend-priority`)
