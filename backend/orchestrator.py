"""
Milestone 4 — Agent Orchestrator.

Coordinates multiple AI agents to resolve complex event situations.
Uses rule-based keyword routing (no external LLM dependency).

Public API
----------
orchestrate(db, situation, context)  → dict   (full orchestration result)
get_agent_statuses()                 → list   (agent status indicators)
"""

from __future__ import annotations

import re
from datetime import datetime
from typing import Any, Optional

from sqlalchemy import func
from sqlalchemy.orm import Session as DBSession

from models import (
    Attendee,
    Incident,
    Session,
    SessionSchedule,
    Speaker,
    Sponsor,
    Venue,
)

from intelligence_engine import compute_event_health


# ═══════════════════════════════════════════════════════════
#  AGENT REGISTRY
# ═══════════════════════════════════════════════════════════

AGENTS = {
    "venue_agent": {
        "name": "Venue Agent",
        "description": "Finds optimal venues, detects capacity issues, recommends alternatives",
        "endpoint": "POST /venue-agent/recommend",
        "keywords": [
            "venue", "hall", "room", "capacity", "space", "location",
            "auditorium", "building", "seating", "overcrowd", "full",
        ],
    },
    "speaker_agent": {
        "name": "Speaker Agent",
        "description": "Matches speakers to topics, checks availability, resolves conflicts",
        "endpoint": "POST /speaker-agent/recommend",
        "keywords": [
            "speaker", "presenter", "keynote", "panelist", "talk",
            "expert", "availability", "topic", "expertise",
        ],
    },
    "incident_agent": {
        "name": "Incident Agent",
        "description": "Assesses incident priority, recommends response teams and actions",
        "endpoint": "POST /incident-agent/recommend-priority",
        "keywords": [
            "incident", "emergency", "problem", "issue", "failure",
            "outage", "medical", "security", "technical", "fire",
            "accident", "broken", "malfunction", "power",
        ],
    },
    "sponsor_agent": {
        "name": "Sponsor Agent",
        "description": "Matches sponsors to events, evaluates contract health and deliverables",
        "endpoint": "POST /sponsorship-agent/recommend",
        "keywords": [
            "sponsor", "sponsorship", "budget", "funding", "partner",
            "deliverable", "contract", "package", "payment",
        ],
    },
    "analytics_agent": {
        "name": "Analytics Agent",
        "description": "Analyzes session metrics, attendance trends, and venue utilization",
        "endpoint": "GET /session-analytics",
        "keywords": [
            "analytics", "metrics", "statistics", "trend", "performance",
            "attendance", "check-in", "data", "report", "insight",
        ],
    },
}


# ═══════════════════════════════════════════════════════════
#  IN-MEMORY ORCHESTRATION LOG
# ═══════════════════════════════════════════════════════════

_orchestration_log: list[dict] = []
_MAX_LOG = 50


def _log_orchestration(entry: dict) -> None:
    """Append to in-memory orchestration history (capped)."""
    _orchestration_log.insert(0, entry)
    if len(_orchestration_log) > _MAX_LOG:
        _orchestration_log.pop()


def get_orchestration_history() -> list[dict]:
    """Return recent orchestration activity."""
    return _orchestration_log[:20]


# ═══════════════════════════════════════════════════════════
#  AGENT STATUS
# ═══════════════════════════════════════════════════════════

def get_agent_statuses() -> list[dict[str, Any]]:
    """Return current status for each registered agent."""
    statuses = []
    for agent_id, info in AGENTS.items():
        statuses.append({
            "id": agent_id,
            "name": info["name"],
            "description": info["description"],
            "endpoint": info["endpoint"],
            "status": "active",
            "last_used": _get_last_used(agent_id),
        })
    return statuses


def _get_last_used(agent_id: str) -> Optional[str]:
    """Find the most recent orchestration that consulted this agent."""
    for entry in _orchestration_log:
        if agent_id in [a.get("id") for a in entry.get("agents_consulted", [])]:
            return entry.get("timestamp")
    return None


# ═══════════════════════════════════════════════════════════
#  KEYWORD ROUTER
# ═══════════════════════════════════════════════════════════

def _identify_agents(situation: str) -> list[str]:
    """Determine which agents to consult based on keywords in the situation."""
    situation_lower = situation.lower()
    matched: list[tuple[str, int]] = []

    for agent_id, info in AGENTS.items():
        hits = sum(
            1 for kw in info["keywords"]
            if kw in situation_lower
        )
        if hits > 0:
            matched.append((agent_id, hits))

    # Sort by relevance (most keyword hits first)
    matched.sort(key=lambda x: x[1], reverse=True)

    agent_ids = [m[0] for m in matched]

    # Always include analytics_agent if any other agent is triggered
    if agent_ids and "analytics_agent" not in agent_ids:
        agent_ids.append("analytics_agent")

    # If nothing matched, default to analytics + incident
    if not agent_ids:
        agent_ids = ["incident_agent", "analytics_agent"]

    return agent_ids


# ═══════════════════════════════════════════════════════════
#  AGENT EXECUTION (reuses existing logic directly)
# ═══════════════════════════════════════════════════════════

def _run_venue_agent(db: DBSession, situation: str) -> dict:
    """Check venue-related issues for the situation."""
    findings: list[str] = []
    recommendations: list[str] = []

    venues = db.query(Venue).all()
    schedules = db.query(SessionSchedule).all()

    # Find mentioned venue
    mentioned_venue = None
    for v in venues:
        if v.venue_name.lower() in situation.lower():
            mentioned_venue = v
            break

    # Check utilization of all venues (optimized batch lookups)
    sessions_by_id = {s.session_id: s for s in db.query(Session).all()}
    venues_by_id = {v.venue_id: v for v in venues}

    overloaded = []
    alternatives = []
    for sch in schedules:
        session = sessions_by_id.get(sch.session_id)
        venue = venues_by_id.get(sch.venue_id)
        if session and venue and venue.capacity:
            util = (session.expected_attendees or 0) / venue.capacity * 100
            if util > 85:
                overloaded.append({
                    "venue": venue.venue_name,
                    "session": session.session_title,
                    "utilization": round(util, 1),
                })

    # Find available alternatives
    for v in venues:
        if v.available and (not mentioned_venue or v.venue_id != mentioned_venue.venue_id):
            alternatives.append({
                "name": v.venue_name,
                "capacity": v.capacity,
                "location": v.location,
                "facilities": v.facilities,
            })

    if mentioned_venue:
        findings.append(
            f"Venue '{mentioned_venue.venue_name}' identified — "
            f"capacity {mentioned_venue.capacity}, "
            f"{'available' if mentioned_venue.available else 'unavailable'}"
        )

    if overloaded:
        for o in overloaded:
            findings.append(
                f"{o['venue']} is at {o['utilization']}% for '{o['session']}'"
            )

    if alternatives:
        best = max(alternatives, key=lambda x: x["capacity"])
        recommendations.append(
            f"Alternative venue available: {best['name']} "
            f"(capacity: {best['capacity']}, location: {best['location']})"
        )

    return {
        "id": "venue_agent",
        "name": "Venue Agent",
        "findings": findings or ["No venue issues detected"],
        "recommendations": recommendations,
        "data": {
            "overloaded_venues": overloaded,
            "available_alternatives": alternatives,
        },
    }


def _run_speaker_agent(db: DBSession, situation: str) -> dict:
    """Check speaker-related issues."""
    findings: list[str] = []
    recommendations: list[str] = []

    speakers = db.query(Speaker).all()
    speakers_by_id = {s.speaker_id: s for s in speakers}
    schedules = db.query(SessionSchedule).all()

    # Speaker availability
    available = [s for s in speakers if s.available]
    unavailable = [s for s in speakers if not s.available]

    # Speaker conflicts (in-memory evaluation)
    conflicts = []
    for i, a in enumerate(schedules):
        for b in schedules[i + 1:]:
            if a.speaker_id == b.speaker_id:
                if a.start_time < b.end_time and b.start_time < a.end_time:
                    sp = speakers_by_id.get(a.speaker_id)
                    if sp:
                        conflicts.append(sp.name)

    findings.append(f"{len(available)}/{len(speakers)} speakers available")

    if unavailable:
        findings.append(
            f"Unavailable: {', '.join(s.name for s in unavailable[:3])}"
        )

    if conflicts:
        findings.append(f"Scheduling conflicts: {', '.join(set(conflicts))}")
        recommendations.append(
            "Resolve speaker scheduling conflicts before proceeding"
        )

    if available:
        recommendations.append(
            f"Available speakers for reassignment: "
            f"{', '.join(s.name for s in available[:3])}"
        )

    return {
        "id": "speaker_agent",
        "name": "Speaker Agent",
        "findings": findings,
        "recommendations": recommendations,
        "data": {
            "available_count": len(available),
            "conflicts": list(set(conflicts)),
        },
    }


def _run_incident_agent(db: DBSession, situation: str) -> dict:
    """Assess incident severity for the situation."""
    findings: list[str] = []
    recommendations: list[str] = []

    # Determine likely category and severity from keywords
    category_map = {
        "medical": ("Medical", 5),
        "emergency": ("Medical", 5),
        "security": ("Security", 4),
        "fire": ("Security", 5),
        "technical": ("Technical", 3),
        "power": ("Technical", 4),
        "equipment": ("Equipment", 3),
        "crowd": ("Crowd", 4),
    }

    detected_category = "General"
    severity = 3
    for keyword, (cat, sev) in category_map.items():
        if keyword in situation.lower():
            if sev > severity:
                detected_category = cat
                severity = sev

    # Determine priority
    if severity >= 5:
        priority = "Critical"
    elif severity >= 4:
        priority = "High"
    elif severity >= 3:
        priority = "Medium"
    else:
        priority = "Low"

    # Check active incidents
    open_incidents = (
        db.query(Incident)
        .filter(
            func.lower(Incident.status).notin_(["resolved", "closed"])
        )
        .count()
    )

    findings.append(f"Detected category: {detected_category}")
    findings.append(f"Assessed severity: {severity}/5 → Priority: {priority}")
    findings.append(f"Currently {open_incidents} open incident(s) in system")

    # Team assignment
    team_map = {
        "Medical": "Medical Response Team",
        "Security": "Security Team",
        "Technical": "Technical Support",
        "Equipment": "Facilities Team",
        "Crowd": "Crowd Management Team",
    }
    team = team_map.get(detected_category, "Operations Team")
    recommendations.append(f"Assign to: {team}")

    if priority in ("Critical", "High"):
        recommendations.append("Immediate escalation recommended")

    return {
        "id": "incident_agent",
        "name": "Incident Agent",
        "findings": findings,
        "recommendations": recommendations,
        "data": {
            "category": detected_category,
            "severity": severity,
            "priority": priority,
            "assigned_team": team,
        },
    }


def _run_sponsor_agent(db: DBSession, situation: str) -> dict:
    """Check sponsor-related context."""
    findings: list[str] = []
    recommendations: list[str] = []

    sponsors = db.query(Sponsor).all()
    active = [
        s for s in sponsors
        if s.status and s.status.lower() in ("active", "confirmed")
    ]

    total_value = sum(s.amount or 0 for s in sponsors)
    active_value = sum(s.amount or 0 for s in active)

    findings.append(f"{len(active)}/{len(sponsors)} sponsors active")
    findings.append(f"Total sponsorship: ₹{total_value:,.0f}")

    # Deliverable health
    at_risk = [
        s for s in active
        if s.deliverables_total and s.deliverables_total > 0
        and (s.deliverables_completed or 0) / s.deliverables_total < 0.5
    ]
    if at_risk:
        findings.append(
            f"{len(at_risk)} sponsor(s) with <50% deliverable completion"
        )
        recommendations.append(
            "Follow up on incomplete deliverables: "
            + ", ".join(s.company_name for s in at_risk[:3])
        )

    return {
        "id": "sponsor_agent",
        "name": "Sponsor Agent",
        "findings": findings,
        "recommendations": recommendations,
        "data": {
            "active_sponsors": len(active),
            "total_value": total_value,
        },
    }


def _run_analytics_agent(db: DBSession, situation: str) -> dict:
    """Gather high-level analytics context."""
    findings: list[str] = []

    total_att = db.query(Attendee).count()
    checked = (
        db.query(Attendee)
        .filter(Attendee.checkin_status == True)  # noqa: E712
        .count()
    )
    rate = round(checked / total_att * 100, 1) if total_att > 0 else 0

    total_sessions = db.query(Session).count()
    scheduled = db.query(SessionSchedule).count()

    findings.append(f"Attendance: {checked}/{total_att} ({rate}% checked in)")
    findings.append(f"Sessions: {scheduled}/{total_sessions} scheduled")

    # Event health impact
    health = compute_event_health(db)
    findings.append(
        f"Event Health Score: {health['overall_score']}/100 ({health['rating']})"
    )

    return {
        "id": "analytics_agent",
        "name": "Analytics Agent",
        "findings": findings,
        "recommendations": [],
        "data": {
            "attendance_rate": rate,
            "event_health": health["overall_score"],
        },
    }


# ═══════════════════════════════════════════════════════════
#  AGENT DISPATCHER
# ═══════════════════════════════════════════════════════════

_AGENT_RUNNERS = {
    "venue_agent":     _run_venue_agent,
    "speaker_agent":   _run_speaker_agent,
    "incident_agent":  _run_incident_agent,
    "sponsor_agent":   _run_sponsor_agent,
    "analytics_agent": _run_analytics_agent,
}


# ═══════════════════════════════════════════════════════════
#  MAIN ORCHESTRATION
# ═══════════════════════════════════════════════════════════

def orchestrate(
    db: DBSession,
    situation: str,
    context: Optional[dict] = None,
) -> dict[str, Any]:
    """
    Run multi-agent orchestration for the given situation.

    Returns
    -------
    dict with keys:
        situation, detected_problem, agents_consulted, findings,
        recommendation, confidence, timestamp
    """
    context = context or {}
    start = datetime.now()

    # 1. Identify which agents to consult
    agent_ids = _identify_agents(situation)

    # 2. Run each agent
    agent_results: list[dict] = []
    for aid in agent_ids:
        runner = _AGENT_RUNNERS.get(aid)
        if runner:
            result = runner(db, situation)
            agent_results.append(result)

    # 3. Synthesize findings
    all_findings = []
    all_recommendations = []
    for ar in agent_results:
        all_findings.extend(ar.get("findings", []))
        all_recommendations.extend(ar.get("recommendations", []))

    # 4. Build final recommendation
    primary_agent = agent_results[0] if agent_results else {}
    detected_problem = _detect_problem(situation, agent_results)

    # Confidence score based on number of agents & keyword matches
    base_confidence = min(len(agent_ids) * 20, 70)
    data_confidence = min(
        sum(
            len(ar.get("findings", []))
            for ar in agent_results
        ) * 5,
        30,
    )
    confidence = min(base_confidence + data_confidence, 95)

    final_recommendation = _build_recommendation(
        situation, detected_problem, agent_results, all_recommendations
    )

    elapsed_ms = round((datetime.now() - start).total_seconds() * 1000)

    result = {
        "situation": situation,
        "detected_problem": detected_problem,
        "agents_consulted": [
            {"id": ar["id"], "name": ar["name"]}
            for ar in agent_results
        ],
        "agent_details": agent_results,
        "findings": all_findings,
        "recommendation": final_recommendation,
        "all_recommendations": all_recommendations,
        "confidence": confidence,
        "processing_time_ms": elapsed_ms,
        "timestamp": start.isoformat(),
    }

    _log_orchestration(result)
    return result


def _detect_problem(situation: str, agent_results: list[dict]) -> str:
    """Synthesize a one-line problem statement."""
    sit_lower = situation.lower()

    # Check for specific patterns
    patterns = [
        (r"(hall|venue|room)\s+\w+.*?(problem|issue|full|overflow|capacity)",
         "Venue capacity or availability issue detected"),
        (r"(speaker|presenter).*?(conflict|unavailable|cancel)",
         "Speaker scheduling conflict detected"),
        (r"(power|technical|equipment).*?(outage|failure|problem|broken)",
         "Technical infrastructure failure detected"),
        (r"(medical|emergency|injury|accident)",
         "Medical emergency requiring immediate response"),
        (r"(security|breach|unauthorized|threat)",
         "Security incident requiring immediate attention"),
        (r"(crowd|overcrowd|stampede|congestion)",
         "Crowd management situation detected"),
        (r"(sponsor|deliverable|payment|contract).*?(overdue|delay|issue)",
         "Sponsor relationship issue detected"),
    ]

    for pattern, description in patterns:
        if re.search(pattern, sit_lower):
            return description

    # Fallback: use the first agent's primary finding
    if agent_results and agent_results[0].get("findings"):
        return agent_results[0]["findings"][0]

    return "Operational situation requiring multi-agent assessment"


def _build_recommendation(
    situation: str,
    problem: str,
    agent_results: list[dict],
    all_recommendations: list[str],
) -> str:
    """Build a consolidated recommendation from all agent outputs."""
    if not all_recommendations:
        return (
            "Monitor the situation closely. No immediate action required "
            "based on available data."
        )

    # Prioritize critical/escalation recommendations
    priority_recs = [
        r for r in all_recommendations
        if any(w in r.lower() for w in ["immediate", "escalat", "critical", "assign"])
    ]

    if priority_recs:
        return " → ".join(priority_recs[:3])

    return " → ".join(all_recommendations[:3])
