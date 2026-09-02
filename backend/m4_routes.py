"""
Milestone 4 — API Routes.

All new endpoints for Event Intelligence, Agent Orchestration,
Executive Dashboard, and Production Health Check.
"""

from __future__ import annotations

from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session as DBSession

from database import get_db, engine
from security import verify_token
from config import APP_VERSION

from intelligence_engine import (
    EventContext,
    compute_event_health,
    detect_critical_actions,
    generate_insights,
    get_attendance_trend,
    get_checkin_trend,
    get_executive_kpis,
    get_incident_trend,
    get_venue_utilization_data,
    get_sponsor_performance_data,
)
from orchestrator import (
    get_agent_statuses,
    get_orchestration_history,
    orchestrate,
)


router = APIRouter(tags=["Milestone4"])


# ═══════════════════════════════════════════════════════════
#  SCHEMAS
# ═══════════════════════════════════════════════════════════

class OrchestrationRequest(BaseModel):
    situation: str
    context: Optional[dict] = None


# ═══════════════════════════════════════════════════════════
#  EVENT INTELLIGENCE ENGINE
# ═══════════════════════════════════════════════════════════

@router.get("/intelligence/health")
def event_health(
    db: DBSession = Depends(get_db),
    user: str = Depends(verify_token),
):
    """Return the Event Health Score with sub-scores and explanations."""
    return compute_event_health(db)


@router.get("/intelligence/insights")
def event_insights(
    db: DBSession = Depends(get_db),
    user: str = Depends(verify_token),
):
    """Return AI-generated insights and recommendations."""
    return {"insights": generate_insights(db)}


@router.get("/intelligence/critical-actions")
def critical_actions(
    db: DBSession = Depends(get_db),
    user: str = Depends(verify_token),
):
    """Return critical actions requiring immediate attention."""
    return {"actions": detect_critical_actions(db)}


@router.get("/intelligence/dashboard")
def executive_dashboard(
    db: DBSession = Depends(get_db),
    user: str = Depends(verify_token),
):
    """
    Combined executive dashboard endpoint.

    Returns health score, KPIs, trends, insights, critical actions,
    agent statuses, and recent orchestration activity — all in one call.
    """
    ctx = EventContext(db)
    health = compute_event_health(db, ctx=ctx)
    kpis = get_executive_kpis(db, ctx=ctx)
    insights = generate_insights(db, ctx=ctx)
    actions = detect_critical_actions(db, ctx=ctx)
    agents = get_agent_statuses()
    activity = get_orchestration_history()

    attendance_trend = get_attendance_trend(db)
    checkin_trend = get_checkin_trend(db)
    incident_trend = get_incident_trend(db)
    venue_trend = get_venue_utilization_data(db, ctx=ctx)
    sponsor_trend = get_sponsor_performance_data(db, ctx=ctx)

    return {
        "health": health,
        "kpis": kpis,
        "insights": insights,
        "critical_actions": actions,
        "agents": agents,
        "recent_activity": activity[:5],
        "trends": {
            "attendance": attendance_trend,
            "checkin": checkin_trend,
            "incidents": incident_trend,
            "venue_utilization": venue_trend,
            "sponsor_performance": sponsor_trend,
        },
        "generated_at": datetime.now().isoformat(),
    }


# ═══════════════════════════════════════════════════════════
#  AGENT ORCHESTRATOR
# ═══════════════════════════════════════════════════════════

@router.post("/orchestrator/resolve")
def orchestrate_situation(
    request: OrchestrationRequest,
    db: DBSession = Depends(get_db),
    user: str = Depends(verify_token),
):
    """
    Accept a situation description, run multi-agent orchestration,
    and return the consolidated recommendation.
    """
    if not request.situation or len(request.situation.strip()) < 5:
        raise HTTPException(
            status_code=400,
            detail="Please provide a meaningful situation description (at least 5 characters).",
        )

    result = orchestrate(db, request.situation.strip(), request.context)
    return result


@router.get("/orchestrator/agents/status")
def agent_status(
    user: str = Depends(verify_token),
):
    """Return the status of all registered AI agents."""
    return {"agents": get_agent_statuses()}


@router.get("/orchestrator/activity")
def orchestration_activity(
    user: str = Depends(verify_token),
):
    """Return recent orchestration activity log."""
    return {"activity": get_orchestration_history()}


# ═══════════════════════════════════════════════════════════
#  PRODUCTION HEALTH CHECK
# ═══════════════════════════════════════════════════════════

@router.get("/health")
def health_check():
    """
    Production health check endpoint.  No auth required.

    Returns database connectivity status and application version.
    """
    db_status = "connected"
    try:
        with engine.connect() as conn:
            conn.execute(__import__("sqlalchemy").text("SELECT 1"))
    except Exception:
        db_status = "disconnected"

    return {
        "status": "healthy" if db_status == "connected" else "degraded",
        "database": db_status,
        "version": APP_VERSION,
        "timestamp": datetime.now().isoformat(),
    }
