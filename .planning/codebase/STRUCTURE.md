# Codebase Directory Layout & Key Locations

**Date:** 2026-09-11  
**Project:** Smart Event Manager

## Project Root Directory Layout

```text
Registration-AI - Copy/
├── .env                       # Global environment variables (DB & SMTP credentials)
├── .planning/                 # GSD planning & codebase documentation directory
│   └── codebase/              # Codebase maps (STACK, ARCHITECTURE, STRUCTURE, etc.)
├── backend/                   # FastAPI backend server application
│   ├── auth.py                # Authentication endpoints (/login, /token)
│   ├── database.py            # SQLAlchemy database engine and session setup
│   ├── email_service.py       # Email dispatch helper functions
│   ├── main.py                # Core FastAPI application with all route definitions
│   ├── models.py              # SQLAlchemy database ORM models
│   ├── qr_utils.py            # QR code generation utilities
│   ├── qrcodes/               # Saved PNG QR codes generated for attendees
│   ├── schemas.py             # Pydantic request & response schemas
│   ├── security.py            # JWT token encoding/decoding and bcrypt hashing
│   ├── requirements.txt       # Python package dependencies
│   └── venv/                  # Python virtual environment
└── frontend/                  # React + Vite frontend SPA application
    ├── index.html             # HTML entry point
    ├── package.json           # npm package dependencies and build scripts
    ├── vite.config.js         # Vite dev server configuration
    └── src/
        ├── App.css            # Application CSS stylesheet
        ├── App.jsx            # React Router root component
        ├── main.jsx           # React DOM rendering entry point
        ├── components/
        │   └── Navbar.jsx     # Shared top navigation header
        └── pages/
            ├── AdminPage.jsx  # Attendee management & analytics dashboard
            ├── UserPage.jsx   # Public attendee registration form
            ├── SponsorshipPage.jsx  # Sponsor CRUD, AI agent, deliverable tracking
            ├── IncidentsPage.jsx    # Incident reporting & automated workflows
            ├── AlertsPage.jsx       # Operational alerts feed & system audits
            ├── M3DashboardPage.jsx  # Real-time monitoring dashboard with charts
            └── ReportsPage.jsx      # Exportable sponsor and incident reports
```

---

## Key Locations & Entry Points

- **Backend Entry Point**: `backend/main.py` (`app = FastAPI()`)
- **Backend Database Models**: `backend/models.py`
- **Backend Validation Schemas**: `backend/schemas.py`
- **Frontend Entry Point**: `frontend/src/main.jsx` & `frontend/src/App.jsx`
- **Frontend Shared Stylesheet**: `frontend/src/App.css`
- **Frontend Navigation Header**: `frontend/src/components/Navbar.jsx`
- **Frontend Main Pages**: `frontend/src/pages/`
