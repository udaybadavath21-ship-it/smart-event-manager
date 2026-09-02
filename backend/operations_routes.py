from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session as DBSession

from models import Sponsor, Incident, OperationalAlert
from database import get_db
from security import verify_token

router = APIRouter(tags=["Operations"])



@router.get("/operations/dashboard")
def operations_dashboard(
    db: DBSession = Depends(get_db),
    user: str = Depends(verify_token),
):
    sponsors = db.query(Sponsor).all()
    incidents = db.query(Incident).all()
    alerts = db.query(OperationalAlert).all()

    total_sponsors = len(sponsors)
    active_sponsors = sum(
        1 for s in sponsors
        if s.status and s.status.lower() == "active"
    )
    total_value = sum(s.amount or 0 for s in sponsors)
    pending_value = sum(
        s.amount or 0 for s in sponsors
        if s.status and s.status.lower() in (
            "lead", "contacted", "negotiating"
        )
    )

    perf_scores = []
    for s in sponsors:
        if s.deliverables_total and s.deliverables_total > 0:
            perf_scores.append(
                round(
                    (s.deliverables_completed or 0) /
                    s.deliverables_total * 100, 1
                )
            )
    avg_sponsor_perf = (
        round(sum(perf_scores) / len(perf_scores), 1)
        if perf_scores else 0
    )

    open_incidents = sum(
        1 for i in incidents
        if (i.status or "").lower() in ("reported", "acknowledged", "open", "escalated")
    )
    critical_incidents = sum(
        1 for i in incidents
        if (i.priority or "").lower() == "critical"
    )
    high_incidents = sum(
        1 for i in incidents
        if (i.priority or "").lower() == "high"
    )
    in_progress_incidents = sum(
        1 for i in incidents
        if (i.status or "").lower() in ("in progress", "in_progress")
    )
    resolved_incidents = sum(
        1 for i in incidents
        if (i.status or "").lower() == "resolved"
    )

    resolution_times = []
    for i in incidents:
        if i.resolved_time and i.created_at:
            delta = i.resolved_time - i.created_at
            resolution_times.append(delta.total_seconds() / 3600)

    avg_resolution = (
        round(sum(resolution_times) / len(resolution_times), 1)
        if resolution_times else 0
    )

    active_alerts = sum(1 for a in alerts if not a.is_read)
    critical_alerts = sum(
        1 for a in alerts
        if not a.is_read and a.priority
        and a.priority.lower() == "critical"
    )
    unread_alerts = active_alerts

    recent_incidents = sorted(
        incidents,
        key=lambda x: x.created_at or "",
        reverse=True
    )[:5]

    recent_alerts = sorted(
        alerts,
        key=lambda x: x.created_at or "",
        reverse=True
    )[:10]

    top_sponsors = sorted(
        sponsors,
        key=lambda x: x.amount or 0,
        reverse=True
    )[:5]

    return {
        "sponsorship": {
            "total_sponsors": total_sponsors,
            "active_sponsors": active_sponsors,
            "total_value": total_value,
            "pending_value": pending_value,
            "average_performance": avg_sponsor_perf,
        },
        "incidents": {
            "open_incidents": open_incidents,
            "critical_incidents": critical_incidents,
            "high_priority": high_incidents,
            "in_progress": in_progress_incidents,
            "resolved": resolved_incidents,
            "average_resolution_hours": avg_resolution,
        },
        "alerts": {
            "active_alerts": active_alerts,
            "critical_alerts": critical_alerts,
            "unread_alerts": unread_alerts,
        },
        "recent_incidents": [
            {
                "incident_id": i.incident_id,
                "title": i.title,
                "priority": i.priority,
                "status": i.status,
                "category": i.category,
                "created_at": str(i.created_at) if i.created_at else None,
            }
            for i in recent_incidents
        ],
        "recent_alerts": [
            {
                "alert_id": a.alert_id,
                "alert_type": a.alert_type,
                "priority": a.priority,
                "message": a.message,
                "is_read": a.is_read,
                "created_at": str(a.created_at) if a.created_at else None,
            }
            for a in recent_alerts
        ],
        "top_sponsors": [
            {
                "sponsor_id": s.sponsor_id,
                "company_name": s.company_name,
                "package": s.package,
                "amount": s.amount,
                "status": s.status,
                "deliverables_completed": s.deliverables_completed,
                "deliverables_total": s.deliverables_total,
            }
            for s in top_sponsors
        ],
    }


@router.get("/reports/sponsors")
def sponsor_report(
    db: DBSession = Depends(get_db),
    user: str = Depends(verify_token),
):
    sponsors = db.query(Sponsor).all()

    report = []
    for s in sponsors:
        total = s.deliverables_total or 0
        completed = s.deliverables_completed or 0
        perf = round((completed / total) * 100, 1) if total > 0 else 0

        report.append({
            "sponsor_id": s.sponsor_id,
            "company_name": s.company_name,
            "contact_person": s.contact_person,
            "email": s.email,
            "category": s.category,
            "package": s.package,
            "amount": s.amount,
            "event": s.event,
            "status": s.status,
            "start_date": str(s.start_date) if s.start_date else None,
            "end_date": str(s.end_date) if s.end_date else None,
            "deliverables_completed": completed,
            "deliverables_total": total,
            "performance": perf,
        })

    return report


@router.get("/reports/incidents")
def incident_report(
    db: DBSession = Depends(get_db),
    user: str = Depends(verify_token),
):
    incidents = db.query(Incident).all()
    total = len(incidents)

    category_dist = {}
    for i in incidents:
        cat = (i.category or "Other").title()
        category_dist[cat] = category_dist.get(cat, 0) + 1

    priority_dist = {}
    for i in incidents:
        pri = (i.priority or "Medium").title()
        priority_dist[pri] = priority_dist.get(pri, 0) + 1

    status_dist = {}
    for i in incidents:
        st = (i.status or "Reported")
        status_dist[st] = status_dist.get(st, 0) + 1

    resolution_times = []
    for i in incidents:
        if i.resolved_time and i.created_at:
            delta = i.resolved_time - i.created_at
            resolution_times.append(round(delta.total_seconds() / 3600, 1))

    avg_resolution = (
        round(sum(resolution_times) / len(resolution_times), 1)
        if resolution_times else 0
    )

    escalated = sum(
        1 for i in incidents
        if i.escalation_level and i.escalation_level > 0
    )
    escalation_rate = round((escalated / total) * 100, 1) if total > 0 else 0

    detail = []
    for i in incidents:
        detail.append({
            "incident_id": i.incident_id,
            "title": i.title,
            "event": i.event,
            "category": i.category,
            "priority": i.priority,
            "severity": i.severity,
            "status": i.status,
            "escalation_level": i.escalation_level,
            "assigned_team": i.assigned_team,
            "created_at": str(i.created_at) if i.created_at else None,
            "resolved_at": str(i.resolved_time) if i.resolved_time else None,
            "resolution": i.resolution,
        })

    return {
        "summary": {
            "total_incidents": total,
            "escalated": escalated,
            "escalation_rate": escalation_rate,
            "average_resolution_hours": avg_resolution,
        },
        "category_distribution": category_dist,
        "priority_distribution": priority_dist,
        "status_distribution": status_dist,
        "incidents": detail,
    }
