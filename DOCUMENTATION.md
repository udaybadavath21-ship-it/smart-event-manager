# Smart Event Manager — Technical Documentation (Milestones 1–4)

## 1. System Architecture Overview

The **Smart Event Manager** is an enterprise-grade AI-powered event management platform.
Milestone 4 introduces the **Event Intelligence & Agent Orchestration Layer** situated above the operational modules.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    EXECUTIVE & OPERATIONAL INTERFACES                   │
│  ┌──────────────────────┐  ┌──────────────────────┐  ┌───────────────┐  │
│  │ Executive Command    │  │ AI Operations Center │  │ Operations    │  │
│  │ Center (/executive)  │  │ (/ai-operations)     │  │ (/operations) │  │
│  └──────────┬───────────┘  └──────────┬───────────┘  └───────┬───────┘  │
└─────────────┼─────────────────────────┼──────────────────────┼──────────┘
              ▼                         ▼                      │
┌───────────────────────────────────────────────────────┐      │
│            MILESTONE 4 INTELLIGENCE LAYER             │      │
│  ┌─────────────────────────┐ ┌──────────────────────┐ │      │
│  │ Event Intelligence      │ │ Multi-Agent          │ │      │
│  │ Engine                  │ │ Orchestrator         │ │      │
│  │ (Health Score 0–100)    │ │ (Decision Support)   │ │      │
│  └───────────┬─────────────┘ └──────────┬───────────┘ │      │
└──────────────┼──────────────────────────┼─────────────┘      │
               ▼                          ▼                    │
┌──────────────────────────────────────────────────────────────┴──────────┐
│                           AI AGENTS ROSTER                              │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────┐ │
│  │Venue Agent │ │Speaker     │ │Incident    │ │Sponsorship │ │Analytics││
│  │(Cap/Facil) │ │Agent(Match)│ │Agent(Risk) │ │Agent(Tier) │ │Agent   │ │
│  └─────┬──────┘ └─────┬──────┘ └─────┬──────┘ └─────┬──────┘ └───┬────┘ │
└────────┼──────────────┼──────────────┼──────────────┼────────────┼──────┘
         ▼              ▼              ▼              ▼            ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                     DATABASE / APPLICATION LAYER                        │
│   attendees │ venues │ speakers │ sessions │ schedules │ sponsors   │
│                 incidents │ operational_alerts                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Event Intelligence Engine Architecture

The **Event Intelligence Engine** (`backend/intelligence_engine.py`) aggregates real-time metrics from all existing tables and produces a deterministic **Event Health Score (0–100)**.

### Health Score Weighting & Formulas

$$\text{Health Score} = \sum (\text{SubScore}_i \times \text{Weight}_i)$$

| Component | Weight | Deterministic Formula / Rule | Explainability Focus |
|---|---|---|---|
| **Attendance** | 20% | $\frac{\text{Checked In}}{\text{Total Registered}} \times 100$ | Live turn-out velocity |
| **Venue Utilization** | 15% | Average $\frac{\text{Expected Attendees}}{\text{Venue Capacity}}$ (optimal 60–85%) | Overcrowding & underutilization detection |
| **Speaker Readiness** | 15% | Assigned & Available Speakers / Total Speakers | Topic coverage & speaker availability |
| **Schedule Health** | 15% | $\frac{\text{Scheduled Sessions}}{\text{Total Sessions}} \times 100 - (\text{Conflicts} \times 15)$ | Conflict-free session execution |
| **Incident Risk** | 15% | $100 - (\text{Open Incidents} \times 8) - (\text{Critical} \times 15)$ | Safety & operational disruptions |
| **Session Performance** | 10% | Average `venue_match_score` across scheduled sessions | Requirement-to-facility alignment |
| **Sponsor Health** | 10% | Average deliverable fulfillment rate ($\frac{\text{Completed}}{\text{Total}}$) | Contract satisfaction & ROI |

### Health Ratings
- **$\ge 90$**: `HEALTHY` (🟢 Good)
- **$70 - 89$**: `GOOD` (🟢 Good)
- **$50 - 69$**: `WARNING` (🟡 Warning)
- **$< 50$**: `CRITICAL` (🔴 Critical)

---

## 3. AI Agents Architecture

The platform features 5 specialized, deterministic AI agents:

1. **Venue Recommendation Agent (`POST /venue-agent/recommend`)**:
   - Scores venues on Capacity Efficiency (30), Facility Matching (30), Accessibility (20), and Availability (20).
2. **Room Suggestion Agent (`POST /venue-agent/room-suggestion`)**:
   - Detects room overcrowding ($>100\%$) and suggests `UPGRADE` to larger available venue, or `DOWNGRADE` if utilization $<30\%$.
3. **Speaker Recommendation Agent (`POST /speaker-agent/recommend`)**:
   - Matches speakers on Expertise Alignment (50), Experience Threshold (30), and Availability (20).
4. **Sponsorship AI Agent (`POST /sponsorship-agent/recommend`)**:
   - Evaluates Category Relevance (25), Delivery History (25), Budget Fit (25), and Partnership Status (25) in INR (₹).
5. **Incident Priority Agent (`POST /incident-agent/recommend-priority`)**:
   - Ranks incidents on Safety Weight (30), Severity (25), Affected Ratio (25), and Disruption Potential (20).

---

## 4. Agent Orchestration Workflow

The **Agent Orchestrator** (`backend/orchestrator.py`) handles multi-agent coordination for complex event scenarios:

```
Situation Input (e.g. "Hall A power outage during AI session")
                       ↓
         Keyword & Semantic Router
                       ↓
   ┌───────────────────┼───────────────────┐
   ▼                   ▼                   ▼
Incident Agent    Venue Agent        Analytics Agent
(Priority: High)  (Find Backup Hall) (Check Impact)
   │                   │                   │
   └───────────────────┼───────────────────┘
                       ▼
        Consolidated Decision Synthesis
                       ↓
 Output: Detected Problem + Action Plan + Confidence Score
```

### Execution Example:
- **Input**: *"Hall A has a technical problem during the Generative AI session"*
- **Detected Problem**: *Technical infrastructure failure detected*
- **Agents Consulted**: `Incident Agent`, `Venue Agent`, `Analytics Agent`
- **Recommendation**: *Assign to: Technical Support → Immediate escalation recommended → Move to Hall C (capacity: 200)*
- **Confidence**: 90%

---

## 5. Executive Dashboard (`/executive`)

Designed specifically for senior event leadership:
- **Answers**: *"How is my event performing right now?"*
- **Executive Summary Banner**: Large Event Health Score (e.g. `82/100`), Rating badge, and dynamic natural-language summary.
- **7 Core Executive KPIs**:
  1. Registrations
  2. Check-ins
  3. Attendance Rate (%)
  4. Sponsors (Active / Total)
  5. Open Incidents (Safety monitor)
  6. Critical Incidents (Senior escalation trigger)
  7. Sponsorship Value in INR (₹) & Deliverable ROI %
- **High-Level Trends**:
  - Registration & Check-in Velocity
  - Incident Reports & Response Velocity
  - Venue Capacity Utilization
  - Sponsor Deliverable Fulfillment Rate
- **Key Management Risks**: Filtered actionable alerts requiring leadership decisions.
- **AI Operational Recommendations**: Prioritized insights from the Intelligence Engine.

---

## 6. AI Operations Center (`/ai-operations`)

Dedicated to operational controllers:
- **Agent Status Dashboard**: Real-time status (`● Active`) of all 5 agents.
- **Interactive Orchestrator Console**: Text input with 5 quick-fill scenario triggers.
- **Detailed Multi-Agent Results**: Expandable agent-by-agent findings and recommendation chains.
- **Decision Support Alerts Feed**: Immediate actionable operational directives.
- **Historical Orchestration Log**: Searchable audit log of past resolutions.

---

## 7. API Reference

### Milestone 4 Endpoints

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/health` | No | Production health check (database status & version) |
| `GET` | `/intelligence/health` | Yes | Event Health Score, sub-scores, and explanations |
| `GET` | `/intelligence/insights` | Yes | AI-generated operational recommendations |
| `GET` | `/intelligence/critical-actions` | Yes | Actionable risks needing immediate attention |
| `GET` | `/intelligence/dashboard` | Yes | Aggregated executive dashboard payload |
| `POST` | `/orchestrator/resolve` | Yes | Runs multi-agent orchestration for a given situation |
| `GET` | `/orchestrator/agents/status` | Yes | Status and endpoints of all 5 agents |
| `GET` | `/orchestrator/activity` | Yes | Recent orchestration execution history |

---

## 8. Database Schema

All database models reside in MySQL `event_management`:
1. `attendees`: `attendee_id`, `event_id`, `name`, `email`, `phone`, `organization`, `ticket_type`, `checkin_status`, `checkin_time`, etc.
2. `venues`: `venue_id`, `venue_name`, `location`, `capacity`, `facilities`, `accessibility`, `available`
3. `speakers`: `speaker_id`, `name`, `email`, `organization`, `expertise`, `experience_years`, `available`
4. `sessions`: `session_id`, `event`, `session_title`, `session_type`, `expected_attendees`, `start_time`, `end_time`
5. `session_schedules`: `schedule_id`, `session_id`, `venue_id`, `speaker_id`, `start_time`, `end_time`, `venue_match_score`
6. `sponsors`: `sponsor_id`, `company_name`, `package`, `amount`, `status`, `deliverables_completed`, `deliverables_total`
7. `incidents`: `incident_id`, `title`, `description`, `category`, `priority`, `severity`, `status`, `escalation_level`, `resolved_time`
8. `operational_alerts`: `alert_id`, `alert_type`, `priority`, `message`, `is_read`, `created_at`

---

## 9. Security & Authentication

- **JWT Tokens**: HS256-signed bearer tokens via `OAuth2PasswordBearer(tokenUrl="token")`.
- **Password Hashing**: `bcrypt` via `passlib.context.CryptContext`.
- **Input Validation**: Pydantic v2 schemas validating email formats, phone numbers, date bounds, and required strings.
- **Route Protection**: Frontend `ProtectedRoute.jsx` verifying token existence with redirect on 401.
- **Environment Variables**: Sensitive configuration (`DB_PASSWORD`, `JWT_SECRET_KEY`, `EMAIL_PASSWORD`) isolated in `.env`.

---

## 10. End-to-End Testing

Run the automated test suite:
```powershell
cd backend
.\venv\Scripts\python.exe test_e2e.py --port 8000
```
### Test Coverage (97 Tests, 100% Pass Rate):
- Health check & unauthenticated access
- Authentication & JWT token issuance/invalidation
- Attendee registration, duplicate prevention, and check-in / undo check-in
- Venue, speaker, session CRUD and AI match recommendations
- Scheduling conflict detection & session analytics
- Sponsor CRUD, analytics, and deadline scanner deduplication
- Incident 6-stage lifecycle state machine (`Reported → Acknowledged → In Progress → Escalated → Resolved → Closed`)
- Mutually exclusive incident KPI reconciliation & Executive Center 1:1 synchronization
- Event Health Score computation, sub-score boundaries & dynamic risk degradation/recovery
- Multi-agent orchestration scenarios (technical, medical, speaker conflicts)

---

## 11. Platform Performance Optimization

### 1. Database Query Optimizations Performed
- **EventContext Pattern**: Implemented request-scoped context (`EventContext`) in `backend/intelligence_engine.py` that loads database entities into memory once per dashboard request.
- **N+1 Query Elimination**: Replaced per-session/per-schedule repeated SQL queries in `_venue_utilization_score`, `generate_insights`, `detect_critical_actions`, and `_run_venue_agent` with in-memory $O(1)$ dictionary lookups (`sessions_by_id`, `venues_by_id`, `speakers_by_id`).
- **Conflict Detection Optimization**: Replaced repeated nested database queries during scheduling conflict checks with single-pass in-memory conflict detection.
- **Database Query Reduction**: Reduced SQL query count during a single `/intelligence/dashboard` request from over 40+ queries down to 13 fast indexed queries.

### 2. Indexes Added
Added 7 targeted indexes on frequently filtered/joined columns without changing any database schemas or breaking existing contracts:
- `ix_attendees_checkin_status` on `attendees (checkin_status)`
- `ix_incidents_status` on `incidents (status)`
- `ix_incidents_priority` on `incidents (priority)`
- `ix_sponsors_status` on `sponsors (status)`
- `ix_venues_available` on `venues (available)`
- `ix_speakers_available` on `speakers (available)`
- `ix_operational_alerts_is_read` on `operational_alerts (is_read)`

### 3. API Optimization
- `GET /intelligence/dashboard` leverages `EventContext` to reuse database objects across health score, executive KPIs, natural-language insights, and critical action detections.
- `POST /orchestrator/resolve` uses cached dictionary lookups for venue and speaker availability, executing in ~32ms.
- `GET /health` executes a lightweight ping (`SELECT 1`), returning in < 4ms.

### 4. Frontend Optimization
- **Concurrent Request Guard**: Added `isFetchingRef` in `ExecutiveCenter.jsx` and `AIOperationsCenter.jsx` to prevent duplicate concurrent network requests when users rapidly click refresh or when background polling fires during an in-flight request.
- **Component Lifecycle Safety**: Added `isMountedRef` to prevent state updates on unmounted components.
- **Render Memoization**: Memoized derived chart and KPI objects with `useMemo` to eliminate unnecessary component re-renders.

### 5. Measured API Response Times (Actual Measured Values)
Measured using `backend/measure_performance.py` across 5 warm runs:

| Endpoint | Method | Average Latency | Min Latency |
|---|---|---|---|
| `/health` | `GET` | **3.94 ms** | **2.68 ms** |
| `/intelligence/health` | `GET` | **18.51 ms** | **13.49 ms** |
| `/intelligence/dashboard` | `GET` | **32.58 ms** | **23.76 ms** |
| `/orchestrator/agents/status` | `GET` | **4.26 ms** | **3.58 ms** |
| `/orchestrator/resolve` | `POST` | **32.39 ms** | **19.71 ms** |
| `/orchestrator/activity` | `GET` | **6.53 ms** | **4.58 ms** |

### 6. Verification Results
- **E2E Tests**: **97/97 passed, 0 failed (100% pass rate)**
- **Frontend Production Build**: **0 errors** (`dist/` built in 13.99s)
- **Backend Health Check**: **`{"status": "healthy", "database": "connected", "version": "1.0.0"}`**

---

## 12. Deployment Guide

### Development vs. Production Environments

| Aspect | Development Environment | Production Environment |
|---|---|---|
| **Backend Server** | `uvicorn main:app --reload --port 8000` | `gunicorn -w 4 -k uvicorn.workers.UvicornWorker main:app --bind 0.0.0.0:8000` |
| **Frontend Server** | `npm run dev` (Vite HMR on `localhost:5173`) | Nginx container / Static hosting serving `dist/` bundle on port 80/443 |
| **API Base URL** | Default fallback `http://127.0.0.1:8000` | `VITE_API_URL=https://api.yourdomain.com` (embedded at build time) |
| **CORS Policy** | `http://localhost:5173,http://127.0.0.1:5173` | Strict production domain list via `CORS_ORIGINS` env variable |
| **Database** | Local MySQL instance | Managed Cloud MySQL (AWS RDS, Cloud SQL) with SSL, pooling & automated backups |
| **Security / TLS** | HTTP / localhost | Enforced HTTPS with Let's Encrypt SSL/TLS certificates via reverse proxy |
| **Process Control** | Terminal session | Systemd service / Docker container with automated healthcheck restart |

---

### Production Environment Variables

#### Backend Configuration (`.env`)
Create `.env` based on `.env.example`:
```env
# Database Settings
DB_HOST=your-production-db-host.internal
DB_PORT=3306
DB_USER=event_app_user
DB_PASSWORD=<DB_PASSWORD>
DB_NAME=event_management

# Authentication Security (Generate with: openssl rand -hex 32)
JWT_SECRET_KEY=<JWT_SECRET_KEY>
JWT_ALGORITHM=HS256
JWT_EXPIRE_MINUTES=60

# Initial Administrative Account
ADMIN_USERNAME=admin
ADMIN_PASSWORD=<ADMIN_PASSWORD>

# Cross-Origin Resource Sharing (Allowed Frontend Domains)
CORS_ORIGINS=https://event.yourdomain.com,https://admin.yourdomain.com

# Email Notifications (Gmail API over HTTPS — Render Free Compatible)
GOOGLE_CLIENT_ID=<GOOGLE_CLIENT_ID>
GOOGLE_CLIENT_SECRET=<GOOGLE_CLIENT_SECRET>
GOOGLE_REDIRECT_URI=https://smart-event-manager-o8m9.onrender.com/gmail/callback
GMAIL_SENDER_EMAIL=<GMAIL_SENDER_EMAIL>
GMAIL_REFRESH_TOKEN=<GMAIL_REFRESH_TOKEN>

# Server Settings
APP_VERSION=1.0.0
API_HOST=0.0.0.0
API_PORT=8000
LOG_LEVEL=info
```

#### Frontend Configuration (`frontend/.env.production`)
Create `frontend/.env.production` before executing `npm run build`:
```env
VITE_API_URL=https://api.yourdomain.com
```

---

### Gmail API Email Service Setup (OAuth2 over HTTPS)

Render Free blocks outbound SMTP ports 465 and 587. The platform utilizes the official **Gmail API over HTTPS** (`POST https://gmail.googleapis.com/gmail/v1/users/me/messages/send`) on port 443 with OAuth2 authentication.

#### 1. Google Cloud Console Configuration
1. In Google Cloud Console:
   - OAuth Client Type: **Web application**
   - Authorized redirect URI (exact):
     `https://smart-event-manager-o8m9.onrender.com/gmail/callback`
   - Scope enabled: `https://www.googleapis.com/auth/gmail.send`

#### 2. Render Environment Variables
In your **Render Dashboard**, set the following environment variables:
- `GOOGLE_CLIENT_ID`: Your Google OAuth client ID.
- `GOOGLE_CLIENT_SECRET`: Your Google OAuth client secret.
- `GOOGLE_REDIRECT_URI`: `https://smart-event-manager-o8m9.onrender.com/gmail/callback`
- `GMAIL_SENDER_EMAIL`: Your authorized sending Gmail address.
- `GMAIL_REFRESH_TOKEN`: (Optional if authorizing via OAuth flow, or set directly).

#### 3. Authorizing via OAuth Flow
1. Run the local setup utility or visit the authorization endpoint:
   ```bash
   python backend/setup_gmail_oauth.py
   ```
   *Alternatively*, navigate directly to:
   `https://smart-event-manager-o8m9.onrender.com/gmail/auth`
2. Google prompts for consent to send emails on behalf of your Gmail account.
3. Upon approval, Google redirects directly to your production Render backend:
   `https://smart-event-manager-o8m9.onrender.com/gmail/callback`
4. The Render backend automatically:
   - Captures the authorization code.
   - Exchanges it with Google for OAuth tokens.
   - Stores the session in memory and writes it to `gmail_token.json`.
   - Never exposes refresh tokens, access tokens, or secrets in API responses, browser HTML, or logs.
5. Verify live status anytime at:
   `https://smart-event-manager-o8m9.onrender.com/gmail/status`

---

### Database Configuration & Resilience
The platform utilizes SQLAlchemy with production connection pooling:
- **`pool_pre_ping=True`**: Tests connections for liveness before dispatching queries, eliminating stale connection errors when database firewalls disconnect idle connections.
- **`pool_recycle=3600`**: Automatically recycles connections every hour to avoid MySQL `wait_timeout` disconnections.
- For high-availability environments, ensure the MySQL user has privileges on `event_management` and that `max_connections` is configured to at least 100.

---

### Manual Deployment Commands

#### 1. Backend (Linux / Production Host)
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt

# Start production server with 4 worker processes
gunicorn -w 4 -k uvicorn.workers.UvicornWorker main:app --bind 0.0.0.0:8000
```

#### 2. Frontend Build & Static Serving
```bash
cd frontend
# Set production API destination
export VITE_API_URL=https://api.yourdomain.com

# Build optimized production bundle
npm ci
npm run build

# Assets in frontend/dist/ can now be served via Nginx, Cloudflare Pages, S3, or Vercel
```

---

### Dockerized Deployment (Recommended)

A multi-container setup is pre-configured via `docker-compose.yml`:

```bash
# 1. Configure production environment
cp .env.example .env
# (Edit .env with production credentials)

# 2. Build and run all services in background
docker compose up -d --build

# 3. Verify container health
docker compose ps
docker compose logs -f backend
```

Services initialized:
1. **`db`**: MySQL 8.0 with persistent storage volume (`mysql_data`) and healthcheck.
2. **`backend`**: FastAPI running on Python 3.11 with automatic `/health` liveness probe.
3. **`frontend`**: Nginx serving the compiled React single-page application with SPA routing.

---

### Production Security & SSL/TLS Guidelines
1. **HTTPS Enforcement**: Always terminate TLS/SSL using Nginx, Caddy, Cloudflare, or AWS ALB. Never expose plain HTTP API endpoints on the public internet.
2. **Secret Management**: Never commit `.env` or production passwords to version control. The root `.gitignore` excludes `.env` and `*.env`.
3. **JWT Secret Rotation**: Rotate `JWT_SECRET_KEY` periodically. Changing this key will invalidate all active sessions.
4. **Admin Password**: Override `ADMIN_PASSWORD` in `.env` immediately upon deployment.
5. **CORS Restrictions**: Avoid using `*` for `CORS_ORIGINS` in production; whitelist only specific verified frontend origins.
