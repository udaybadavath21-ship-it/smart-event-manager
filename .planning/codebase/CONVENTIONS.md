# Coding Conventions & Development Patterns

**Date:** 2026-09-11  
**Project:** Smart Event Manager

## Backend Code Conventions (Python / FastAPI)

- **Naming Conventions**:
  - Modules and files: `snake_case.py` (`qr_utils.py`, `email_service.py`)
  - Classes (ORM Models & Pydantic Schemas): `PascalCase` (`Attendee`, `VenueCreate`, `OperationalAlert`)
  - Functions & Endpoint Handlers: `snake_case` (`get_all_attendees`, `recommend_sponsors`, `escalate_incident`)
  - Constants & Environment Variables: `UPPER_SNAKE_CASE` (`SECRET_KEY`, `DATABASE_URL`)
- **Data Normalization Utilities**:
  - `normalize(value)`: Trims whitespace and converts to Title Case.
  - `normalize_ticket(ticket)`: Handles VIP capitalization (`VIP`) vs Title Case.
  - `normalize_status(status)`: Normalizes sponsor statuses to standard choices (`Lead`, `Contacted`, `Confirmed`, etc.).
- **HTTP Exception Handling**:
  - Explicit `HTTPException(status_code=..., detail=...)` for 400 (Bad Request), 404 (Not Found), 401 (Unauthorized), 409 (Conflict), and 500 (Internal Error).
- **ORM Dependency Pattern**:
  - `db: Session = Depends(get_db)` used in all database route handlers.
- **JWT Authorization Pattern**:
  - `user: str = Depends(verify_token)` used to secure admin endpoints.

---

## Frontend Code Conventions (React / Vite)

- **Naming Conventions**:
  - Page Components: `PascalCase.jsx` (`SponsorshipPage.jsx`, `M3DashboardPage.jsx`)
  - Shared Components: `PascalCase.jsx` (`Navbar.jsx`)
  - Helper Functions: `camelCase` (`fetchSponsors`, `evaluateAiPriority`, `downloadCSV`)
- **CSS Styling**:
  - Global stylesheet: `frontend/src/App.css`
  - BEM-like class naming: `.stats-container`, `.stat-card`, `.agent-card`, `.badge`, `.badge-critical`
- **API Requests**:
  - `axios` instance communicating directly with base URL `http://127.0.0.1:8000`.
- **State Management**:
  - React `useState` and `useEffect` for component-level asynchronous data fetching and form state.
