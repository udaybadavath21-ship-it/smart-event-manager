# Technology Stack

**Date:** 2026-09-11  
**Project:** Smart Event Manager

## Overview

The Smart Event Manager is a full-stack event operations platform built using a FastAPI Python backend and a React (Vite) single-page frontend application with MySQL persistence.

---

## Languages & Runtime

- **Python 3.10+**: Backend application runtime (`backend/main.py`)
- **JavaScript / JSX (ESNext)**: Frontend single-page application (`frontend/src/`)
- **HTML5 & CSS3**: Document structure and custom styling (`frontend/index.html`, `frontend/src/App.css`)

---

## Backend Framework & Core Libraries

- **FastAPI (`0.141.1`)**: High-performance Web framework for API endpoints (`backend/main.py`)
- **Uvicorn (`0.52.0`)**: ASGI server runner (`uvicorn main:app --reload`)
- **SQLAlchemy (`2.0.51`)**: Database ORM mapping models (`backend/models.py`)
- **PyMySQL (`1.2.0`)**: MySQL database adapter (`mysql+pymysql://`)
- **Pydantic (`2.13.4`)**: Data validation and request schemas (`backend/schemas.py`)
- **Passlib (`1.7.4`) & bcrypt (`4.0.1`)**: Password hashing and verification (`backend/security.py`)
- **Python-Jose (`3.5.0`)**: JWT token generation and verification (`backend/security.py`)
- **Pandas (`3.0.5`)**: CSV file parsing and batch registration processing (`backend/main.py`)
- **QRCode (`8.2`) & Pillow (`12.3.0`)**: Event QR code generation (`backend/qr_utils.py`)
- **Python-Dotenv (`1.2.2`)**: Environment variable configuration (`.env`)

---

## Frontend Framework & Libraries

- **React (`19.2.7`) & React DOM (`19.2.7`)**: Component-based UI framework
- **Vite (`8.1.1`)**: Build tool and hot-reloading dev server
- **React Router DOM (`7.18.2`)**: Client-side routing (`frontend/src/App.jsx`)
- **Axios (`1.18.1`)**: HTTP API client for backend communication
- **Recharts (`3.10.1`)**: Interactive data visualization charts (`AdminPage.jsx`, `M3DashboardPage.jsx`)
- **HTML5-QRCode (`2.3.8`)**: Browser-based QR code camera scanner
- **jspdf (`4.2.1`) & html2canvas (`1.4.1`)**: PDF export and document generation
- **SweetAlert2 (`11.26.25`)**: Alert and notification popups

---

## Configuration & Tooling

- **Environment Config**: Root `.env` file holding `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `EMAIL_USER`, `EMAIL_PASSWORD`
- **ESLint (`10.6.0`)**: Code linting (`frontend/eslint.config.js`)
