# System Architecture & Design Patterns

**Date:** 2026-09-11  
**Project:** Smart Event Manager

## Overview

The Smart Event Manager follows a decoupled Client-Server architecture:
- **Backend**: FastAPI RESTful API server handling business logic, database persistence via SQLAlchemy, JWT authentication, and rule-based AI recommendation engines.
- **Frontend**: Vite + React Single Page Application (SPA) rendering responsive user interfaces, dashboard analytics using Recharts, and routing using React Router DOM.

---

## High-Level Architecture Diagram

```
+-------------------------------------------------------------------+
|                        React Frontend (Vite)                      |
|                                                                   |
|   +--------------+   +---------------+   +--------------------+   |
|   |  UserPage    |   |   AdminPage   |   |   SponsorshipPage  |   |
|   +--------------+   +---------------+   +--------------------+   |
|   | IncidentsPage|   |   AlertsPage  |   | M3DashboardPage    |   |
|   +--------------+   +---------------+   +--------------------+   |
|                                                                   |
|                           Navbar (Shared)                         |
+---------------------------------+---------------------------------+
                                  |
                                  | Axios HTTP (REST API)
                                  v
+---------------------------------+---------------------------------+
|                        FastAPI Backend Server                     |
|                                                                   |
|   +--------------+   +---------------+   +--------------------+   |
|   | Auth / JWT   |   | Attendees API |   | Venue Agent        |   |
|   +--------------+   +---------------+   +--------------------+   |
|   | Speaker Agent|   | Sessions API  |   | Sponsorship Agent  |   |
|   +--------------+   +---------------+   +--------------------+   |
|   | Incident Agent|  | Alerts API    |   | Reports API        |   |
|   +--------------+   +---------------+   +--------------------+   |
+---------------------------------+---------------------------------+
                                  |
                                  | SQLAlchemy ORM (PyMySQL)
                                  v
+---------------------------------+---------------------------------+
|                      MySQL Database (`event_management`)          |
|                                                                   |
|   tables: attendees, venues, speakers, sessions,                  |
|           session_schedules, sponsors, incidents,                 |
|           operational_alerts                                      |
+-------------------------------------------------------------------+
```

---

## Architectural Layers

### 1. Database & Persistence Layer (`backend/database.py`, `backend/models.py`)
- Declarative Base models (`Attendee`, `Venue`, `Speaker`, `Session`, `SessionSchedule`, `Sponsor`, `Incident`, `OperationalAlert`).
- Dependency injection pattern via `get_db()` yield function in FastAPI.

### 2. Validation & Schema Layer (`backend/schemas.py`)
- Pydantic models enforcing field types, patterns, email validation, and required/optional properties across all API requests and responses.

### 3. API Route Layer (`backend/main.py`, `backend/auth.py`)
- Modular routes organized by feature milestone:
  - Auth & Security (`/login`, `/token`, JWT verification)
  - Attendee Operations (`/register`, `/attendees`, `/checkin/{id}`, `/scan-qr`, `/upload-csv`)
  - Milestone 2 Agents (`/venue-agent/recommend`, `/speaker-agent/recommend`, `/schedule`)
  - Milestone 3 Agents & Workflows (`/sponsorship-agent/recommend`, `/incidents`, `/incident-agent/recommend-priority`, `/incident/{id}/escalate`, `/alerts`, `/milestone3/dashboard`, `/reports/*`)

### 4. Client View Layer (`frontend/src/`)
- Page components in `pages/` wrapping specific domain features.
- Shared navigation header (`components/Navbar.jsx`).
- Shared styling system (`App.css`).
