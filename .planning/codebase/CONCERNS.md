# Technical Debt, Risks & Areas of Concern

**Date:** 2026-09-11  
**Project:** Smart Event Manager

## Known Technical Debt & Vulnerabilities

1. **Hardcoded JWT Secret Key**:
   - `backend/security.py` has a hardcoded `SECRET_KEY = "your_super_secret_key_123456"`.
   - **Recommendation**: Move `SECRET_KEY` into `.env` and load via `os.getenv("SECRET_KEY")`.

2. **Single Monolithic `main.py` File**:
   - `backend/main.py` is over 2,800 lines long and contains routing logic for attendees, venues, speakers, sessions, schedules, sponsors, incidents, alerts, dashboard, and reports.
   - **Recommendation**: Refactor into FastAPI `APIRouter` sub-modules (`routers/attendees.py`, `routers/venues.py`, `routers/sponsors.py`, `routers/incidents.py`, `routers/alerts.py`).

3. **Event Entity Modeling**:
   - Events are currently referenced as string columns (`event = Column(String(100))`) rather than a relational `Event` database entity with primary keys.
   - **Recommendation**: Create an `events` table in future milestones if multi-event support requires event metadata (start date, location, manager).

4. **Hardcoded CORS Origins**:
   - CORS middleware in `main.py` explicitly allows `http://localhost:5173`.
   - **Recommendation**: Use environment variables to support staging and production origin URLs.

5. **Client-Side Bundle Size**:
   - Recharts, SweetAlert2, jspdf, and html5-qrcode create a bundled JS size of ~720KB-890KB.
   - **Recommendation**: Use React `lazy` and `Suspense` for page-level code splitting (`SponsorshipPage`, `IncidentsPage`, `ReportsPage`).
