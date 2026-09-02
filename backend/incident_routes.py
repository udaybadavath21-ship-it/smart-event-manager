from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session as DBSession
from datetime import datetime
from typing import Optional

from models import Incident, OperationalAlert, Attendee
from schemas import IncidentCreate, IncidentUpdate, IncidentPriorityRequest, IncidentResolveRequest
from database import get_db
from security import verify_token

router = APIRouter(tags=["Incidents"])



def normalize(value):
    if value is None:
        return None
    value = value.strip().lower()
    return value.title()


VALID_PRIORITIES = ["Low", "Medium", "High", "Critical"]
VALID_STATUSES = [
    "Reported", "Acknowledged", "In Progress",
    "Escalated", "Resolved", "Closed"
]
VALID_CATEGORIES = [
    "Medical", "Security", "Technical", "Equipment",
    "Venue", "Crowd", "Speaker", "Schedule", "Other"
]

CATEGORY_TEAM_MAP = {
    "medical": "Medical Response Team",
    "security": "Security Team",
    "technical": "Technical Support",
    "equipment": "Facilities Team",
    "venue": "Venue Management",
    "crowd": "Security + Event Operations",
    "speaker": "Speaker Coordination",
    "schedule": "Event Operations",
    "other": "Event Operations",
}

CATEGORY_SAFETY_WEIGHTS = {
    "medical": 5,
    "security": 4,
    "crowd": 4,
    "equipment": 2,
    "technical": 2,
    "venue": 3,
    "speaker": 1,
    "schedule": 1,
    "other": 2,
}


@router.post("/incidents")
def create_incident(
    incident_data: IncidentCreate,
    db: DBSession = Depends(get_db),
    user: str = Depends(verify_token),
):
    priority_val = normalize(incident_data.priority) or "Medium"
    sev_val = int(incident_data.severity or 3)
    if not incident_data.priority or incident_data.priority.lower() == "medium":
        if sev_val >= 5:
            priority_val = "Critical"
        elif sev_val == 4:
            priority_val = "High"

    assigned_team_val = incident_data.assigned_team or CATEGORY_TEAM_MAP.get((incident_data.category or "").lower(), "Event Operations")

    incident = Incident(
        event=normalize(incident_data.event) or "General Event",
        title=incident_data.title.strip(),
        description=incident_data.description or "",
        category=normalize(incident_data.category) or "Other",
        location=incident_data.location or "Unspecified Location",
        reported_by=incident_data.reported_by or "Anonymous",
        assigned_team=assigned_team_val,
        priority=priority_val,
        severity=str(sev_val),
        priority_reason=incident_data.priority_reason,
        status="Reported",
        escalation_level=0,
        updated_at=datetime.now(),
        notes=incident_data.notes or "",
    )

    db.add(incident)
    db.commit()
    db.refresh(incident)

    priority_lower = (incident.priority or "").lower()
    if priority_lower in ("high", "critical"):
        _create_alert(
            db,
            alert_type="incident",
            priority=incident.priority,
            message=(
                f"{'🔴 CRITICAL' if priority_lower == 'critical' else '🟠 HIGH'} "
                f"incident reported: {incident.title} ({incident.location})"
            ),
            related_event=incident.event,
            related_incident_id=incident.incident_id,
        )
        db.commit()

    return {
        "message": "Incident created successfully!",
        "incident": _serialize_incident(incident)
    }


@router.get("/incidents")
def get_incidents(
    db: DBSession = Depends(get_db),
    user: str = Depends(verify_token),
):
    incidents = db.query(Incident).order_by(
        Incident.created_at.desc()
    ).all()
    return [_serialize_incident(i) for i in incidents]



@router.get("/incident/analytics")
@router.get("/incidents/analytics")
def incident_analytics(
    db: DBSession = Depends(get_db),
    user: str = Depends(verify_token),
):
    incidents = db.query(Incident).all()

    total = len(incidents)

    open_incidents = sum(
        1 for i in incidents
        if (i.status or "").lower() in ("reported", "acknowledged", "open", "escalated")
    )

    in_progress = sum(
        1 for i in incidents
        if (i.status or "").lower() in ("in progress", "in_progress")
    )

    resolved_count = sum(
        1 for i in incidents
        if (i.status or "").lower() == "resolved"
    )

    closed_count = sum(
        1 for i in incidents
        if (i.status or "").lower() == "closed"
    )

    critical_count = sum(
        1 for i in incidents
        if (i.priority or "").lower() == "critical"
    )

    high_count = sum(
        1 for i in incidents
        if (i.priority or "").lower() == "high"
    )

    escalated_count = sum(
        1 for i in incidents
        if (i.escalation_level and i.escalation_level > 0) or (i.status and i.status.lower() == "escalated")
    )

    resolution_seconds_list = []
    for i in incidents:
        if i.resolved_time and i.created_at:
            delta = (i.resolved_time - i.created_at).total_seconds()
            if delta >= 0:
                resolution_seconds_list.append(delta)

    if resolution_seconds_list:
        avg_sec = sum(resolution_seconds_list) / len(resolution_seconds_list)
        avg_resolution_hours = round(avg_sec / 3600, 2)
        
        hours = int(avg_sec // 3600)
        minutes = int((avg_sec % 3600) // 60)
        seconds = int(avg_sec % 60)
        if hours > 0:
            avg_formatted = f"{hours}h {minutes}m"
        elif minutes > 0:
            avg_formatted = f"{minutes}m {seconds}s"
        else:
            avg_formatted = f"{seconds}s"
    else:
        avg_resolution_hours = 0.0
        avg_formatted = "N/A"

    escalation_rate = (
        round((escalated_count / total) * 100, 1)
        if total > 0 else 0
    )

    category_distribution = {}
    for i in incidents:
        cat = (i.category or "Other").title()
        category_distribution[cat] = (
            category_distribution.get(cat, 0) + 1
        )

    priority_distribution = {}
    for i in incidents:
        pri = (i.priority or "Medium").title()
        priority_distribution[pri] = (
            priority_distribution.get(pri, 0) + 1
        )

    status_distribution = {}
    for i in incidents:
        st = (i.status or "Reported").title()
        if st in ("In Progress", "In_Progress"):
            st = "In Progress"
        status_distribution[st] = (
            status_distribution.get(st, 0) + 1
        )

    return {
        "summary": {
            "total_incidents": total,
            "open_incidents": open_incidents,
            "critical_incidents": critical_count,
            "high_priority": high_count,
            "in_progress": in_progress,
            "resolved": resolved_count,
            "closed": closed_count,
            "escalated": escalated_count,
            "average_resolution_hours": avg_resolution_hours,
            "average_resolution_formatted": avg_formatted,
            "escalation_rate": escalation_rate,
        },
        "category_distribution": category_distribution,
        "priority_distribution": priority_distribution,
        "status_distribution": status_distribution,
    }



@router.post("/incident-agent/recommend-priority")
def recommend_priority(
    request: IncidentPriorityRequest,
    db: DBSession = Depends(get_db),
    user: str = Depends(verify_token),
):
    """
    AI-based incident priority assessment.
    Uses actual incident characteristics:
      - Category safety weight
      - Severity level
      - Number of people affected
      - Event size context

    Structured for future LLM integration.
    """

    category = (request.category or "other").lower()
    severity = int(request.severity or 3)
    affected = int(request.affected_people or 0)

    event_size = 0
    if request.event:
        event_size = db.query(Attendee).filter(
            Attendee.event == request.event
        ).count()

    safety_weight = CATEGORY_SAFETY_WEIGHTS.get(category, 2)
    safety_score = min(30, safety_weight * 6)

    severity_score = min(25, severity * 5)

    if affected >= 100 or (event_size > 0 and affected >= event_size * 0.3):
        people_score = 25
    elif affected >= 50 or (event_size > 0 and affected >= event_size * 0.1):
        people_score = 20
    elif affected >= 20:
        people_score = 15
    elif affected >= 5:
        people_score = 10
    else:
        people_score = 5

    disruption_categories = {"crowd", "venue", "schedule", "technical"}
    disruption_score = 15 if category in disruption_categories else 8

    if event_size > 500:
        disruption_score = min(20, disruption_score + 5)

    total_score = safety_score + severity_score + people_score + disruption_score

    if total_score >= 80:
        priority = "Critical"
        action = "Immediate event operations response required."
    elif total_score >= 60:
        priority = "High"
        action = "Urgent team response and manager notification required."
    elif total_score >= 40:
        priority = "Medium"
        action = "Team notification and timely response required."
    else:
        priority = "Low"
        action = "Normal response protocol."

    recommended_team = CATEGORY_TEAM_MAP.get(
        category, "Event Operations"
    )

    reasons = []
    if safety_weight >= 4:
        reasons.append(f"High safety impact ({request.category} category)")
    if severity >= 4:
        reasons.append(f"High severity level ({severity}/5)")
    if affected >= 20:
        reasons.append(f"Significant number of people affected ({affected})")
    if event_size > 0:
        reasons.append(f"Event has {event_size} registered attendees")
    if category in disruption_categories:
        reasons.append("Potential event disruption")

    if not reasons:
        reasons.append("Standard operational incident assessment")

    return {
        "priority": priority,
        "score": total_score,
        "reason": ". ".join(reasons) + ".",
        "recommended_action": action,
        "recommended_team": recommended_team,
        "breakdown": {
            "safety_impact": safety_score,
            "severity": severity_score,
            "people_affected": people_score,
            "event_disruption": disruption_score,
        }
    }



@router.get("/incident/{incident_id}")
def get_incident(
    incident_id: int,
    db: DBSession = Depends(get_db),
    user: str = Depends(verify_token),
):
    incident = db.query(Incident).filter(
        Incident.incident_id == incident_id
    ).first()

    if not incident:
        raise HTTPException(
            status_code=404,
            detail=f"Incident with ID {incident_id} not found."
        )

    return _serialize_incident(incident)


@router.put("/incident/{incident_id}")
def update_incident(
    incident_id: int,
    incident_data: IncidentUpdate,
    db: DBSession = Depends(get_db),
    user: str = Depends(verify_token),
):
    incident = db.query(Incident).filter(
        Incident.incident_id == incident_id
    ).first()

    if not incident:
        raise HTTPException(
            status_code=404,
            detail=f"Incident with ID {incident_id} not found."
        )

    if incident_data.event is not None:
        incident.event = normalize(incident_data.event)
    incident.title = incident_data.title.strip()
    incident.description = incident_data.description
    incident.category = normalize(incident_data.category)
    incident.location = incident_data.location
    incident.reported_by = incident_data.reported_by
    incident.assigned_team = incident_data.assigned_team
    incident.priority = normalize(incident_data.priority) or "Medium"
    incident.severity = str(incident_data.severity or 3)
    incident.priority_reason = incident_data.priority_reason
    incident.notes = incident_data.notes
    incident.updated_at = datetime.now()

    if incident_data.status:
        incident.status = normalize(incident_data.status)

    if incident_data.escalation_level is not None:
        incident.escalation_level = incident_data.escalation_level

    if incident_data.resolution:
        incident.resolution = incident_data.resolution

    db.commit()
    db.refresh(incident)

    return {
        "message": "Incident updated successfully!",
        "incident": _serialize_incident(incident)
    }


@router.delete("/incident/{incident_id}")
def delete_incident(
    incident_id: int,
    db: DBSession = Depends(get_db),
    user: str = Depends(verify_token),
):
    incident = db.query(Incident).filter(
        Incident.incident_id == incident_id
    ).first()

    if not incident:
        raise HTTPException(
            status_code=404,
            detail=f"Incident with ID {incident_id} not found."
        )

    db.delete(incident)
    db.commit()

    return {"message": "Incident deleted successfully!"}


@router.put("/incident/{incident_id}/acknowledge")
def acknowledge_incident(
    incident_id: int,
    db: DBSession = Depends(get_db),
    user: str = Depends(verify_token),
):
    incident = _get_incident_or_404(incident_id, db)

    curr_status = (incident.status or "").lower()
    if curr_status not in ("reported", "open"):
        raise HTTPException(
            status_code=400,
            detail=f"Cannot acknowledge incident. Current status is '{incident.status}'. Only 'Reported' incidents can be acknowledged."
        )

    incident.status = "Acknowledged"
    incident.updated_at = datetime.now()
    db.commit()
    db.refresh(incident)

    return {
        "message": f"Incident #{incident_id} acknowledged successfully.",
        "incident": _serialize_incident(incident)
    }


@router.put("/incident/{incident_id}/start-response")
def start_response(
    incident_id: int,
    db: DBSession = Depends(get_db),
    user: str = Depends(verify_token),
):
    incident = _get_incident_or_404(incident_id, db)

    curr_status = (incident.status or "").lower()
    if curr_status not in ("acknowledged", "escalated"):
        raise HTTPException(
            status_code=400,
            detail=f"Cannot start response. Current status is '{incident.status}'. Response can only be started from 'Acknowledged' or 'Escalated' state."
        )

    incident.status = "In Progress"
    incident.updated_at = datetime.now()
    db.commit()
    db.refresh(incident)

    return {
        "message": f"Response started for incident #{incident_id}. Status changed to 'In Progress'.",
        "incident": _serialize_incident(incident)
    }


@router.put("/incident/{incident_id}/escalate")
def escalate_incident(
    incident_id: int,
    db: DBSession = Depends(get_db),
    user: str = Depends(verify_token),
):
    incident = _get_incident_or_404(incident_id, db)

    curr_status = (incident.status or "").lower()
    if curr_status in ("resolved", "closed"):
        raise HTTPException(
            status_code=400,
            detail=f"Cannot escalate incident #{incident_id}. Current status is '{incident.status}'. Resolved and closed incidents cannot be escalated."
        )

    current_level = incident.escalation_level or 0
    new_level = min(current_level + 1, 3)

    incident.status = "Escalated"
    incident.escalation_level = new_level
    incident.updated_at = datetime.now()

    level_names = {
        1: "Team Notification",
        2: "Manager Escalation",
        3: "Operations Command Escalation"
    }
    level_name = level_names.get(new_level, "Escalated")

    _create_alert(
        db,
        alert_type="escalation",
        priority="Critical" if new_level >= 2 else "High",
        message=(
            f"⚠️ Incident ESCALATED (Level {new_level} - {level_name}): "
            f"'{incident.title}' at {incident.location}"
        ),
        related_event=incident.event,
        related_incident_id=incident.incident_id,
    )

    db.commit()
    db.refresh(incident)

    return {
        "message": f"Incident #{incident_id} escalated to Level {new_level} ({level_name}).",
        "incident": _serialize_incident(incident)
    }


@router.put("/incident/{incident_id}/resolve")
def resolve_incident(
    incident_id: int,
    resolve_data: Optional[IncidentResolveRequest] = Body(default=None),
    db: DBSession = Depends(get_db),
    user: str = Depends(verify_token),
):
    incident = _get_incident_or_404(incident_id, db)

    curr_status = (incident.status or "").lower()
    if curr_status in ("resolved", "closed"):
        raise HTTPException(
            status_code=400,
            detail=f"Incident #{incident_id} is already '{incident.status}'."
        )

    incident.status = "Resolved"
    incident.resolved_time = datetime.now()
    incident.updated_at = datetime.now()

    if resolve_data and resolve_data.resolution:
        incident.resolution = resolve_data.resolution.strip()

    db.commit()
    db.refresh(incident)

    return {
        "message": f"Incident #{incident_id} resolved successfully.",
        "incident": _serialize_incident(incident)
    }


@router.put("/incident/{incident_id}/close")
def close_incident(
    incident_id: int,
    db: DBSession = Depends(get_db),
    user: str = Depends(verify_token),
):
    incident = _get_incident_or_404(incident_id, db)

    curr_status = (incident.status or "").lower()
    if curr_status != "resolved":
        raise HTTPException(
            status_code=400,
            detail=f"Cannot close incident #{incident_id}. Incident must be in 'Resolved' status before closing. Current status: '{incident.status}'."
        )

    incident.status = "Closed"
    incident.updated_at = datetime.now()
    db.commit()
    db.refresh(incident)

    return {
        "message": f"Incident #{incident_id} officially closed.",
        "incident": _serialize_incident(incident)
    }


def _get_incident_or_404(incident_id: int, db: DBSession) -> Incident:
    incident = db.query(Incident).filter(
        Incident.incident_id == incident_id
    ).first()

    if not incident:
        raise HTTPException(
            status_code=404,
            detail=f"Incident with ID {incident_id} not found."
        )

    return incident


def _serialize_incident(incident: Incident) -> dict:
    return {
        "incident_id": incident.incident_id,
        "event": incident.event,
        "title": incident.title,
        "description": incident.description,
        "category": incident.category,
        "location": incident.location,
        "reported_by": incident.reported_by,
        "assigned_team": incident.assigned_team,
        "priority": incident.priority,
        "severity": incident.severity,
        "priority_reason": incident.priority_reason,
        "status": incident.status,
        "escalation_level": incident.escalation_level,
        "created_at": str(incident.created_at) if incident.created_at else None,
        "updated_at": str(incident.updated_at) if incident.updated_at else None,
        "resolved_at": str(incident.resolved_time) if incident.resolved_time else None,
        "resolution": incident.resolution,
        "notes": incident.notes,
    }


def _create_alert(db: DBSession, alert_type: str, priority: str, message: str,
                  related_event: Optional[str] = None,
                  related_incident_id: Optional[int] = None,
                  related_sponsor_id: Optional[int] = None):
    alert = OperationalAlert(
        alert_type=alert_type,
        priority=priority,
        message=message,
        related_event=related_event,
        related_incident_id=related_incident_id,
        related_sponsor_id=related_sponsor_id,
    )
    db.add(alert)
