# Testing Patterns & Verification Strategy

**Date:** 2026-09-11  
**Project:** Smart Event Manager

## Backend Verification & Testing

- **Backend Import Verification**:
  - Command: `.\venv\Scripts\python.exe -c "import main; print('Backend loaded successfully')"`
  - Validates syntax, module imports, database ORM table creation (`Base.metadata.create_all(bind=engine)`), and Pydantic schemas.
- **FastAPI Dev Server Test**:
  - Command: `uvicorn main:app --reload`
  - Validates API route mounting and CORS middleware setup.
- **Interactive Documentation**:
  - Swagger UI available at `http://127.0.0.1:8000/docs`
  - ReDoc available at `http://127.0.0.1:8000/redoc`

---

## Frontend Verification & Testing

- **Production Build Verification**:
  - Command: `npm run build` (runs `vite build`)
  - Transpiles JSX/JavaScript, checks imports, and outputs production bundle in `dist/`.
- **Vite Dev Server Test**:
  - Command: `npm run dev`
  - Runs local development server at `http://localhost:5173`.
- **ESLint Code Quality**:
  - Command: `npm run lint` (runs `eslint .`)

---

## Manual E2E Testing Workflows

1. **Registration & QR Check-in**:
   - Register attendee via `/` (`UserPage.jsx`).
   - Verify QR code generation in `backend/qrcodes/`.
   - Verify check-in update via `/admin` or `/scan-qr`.
2. **Venue & Speaker Agents**:
   - Create venue & speaker records.
   - Run AI matching recommendations and room upgrade suggestions.
3. **Session Scheduling**:
   - Create session and schedule speaker/venue.
   - Verify conflict detection prevents double booking.
4. **Sponsorship & Incident Agents**:
   - Create sponsor & incident records.
   - Test AI sponsor package match engine.
   - Execute incident workflow stepper (`Acknowledge` → `Response` → `Escalate` → `Resolve` → `Close`).
   - Trigger system audit to generate operational alerts.
   - Export analytical reports to CSV.
