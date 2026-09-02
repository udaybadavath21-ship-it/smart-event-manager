from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session as DBSession
from datetime import datetime, date
from typing import Optional

from models import OperationalAlert, Sponsor, Incident
from database import get_db
from security import verify_token

router = APIRouter(tags=["Alerts"])


def _to_date(val) -> Optional[date]:
    """Safely convert any datetime, date, or date string into a date object."""
    if val is None:
        return None
    if isinstance(val, datetime):
        return val.date()
    if isinstance(val, date):
        return val
    if isinstance(val, str):
        val = val.strip()
        if not val:
            return None
        for fmt in ("%Y-%m-%d", "%Y-%m-%dT%H:%M:%S", "%Y-%m-%d %H:%M:%S"):
            try:
                return datetime.strptime(val, fmt).date()
            except ValueError:
                pass
        try:
            return date.fromisoformat(val[:10])
        except Exception:
            return None
    return None

@router.get("/alerts")
def get_alerts(
    db: DBSession = Depends(get_db),
    user: str = Depends(verify_token),
):
    alerts = db.query(OperationalAlert).order_by(
        OperationalAlert.created_at.desc()
    ).all()

    return [_serialize_alert(a) for a in alerts]


@router.get("/alerts/unread-count")
def get_unread_count(
    db: DBSession = Depends(get_db),
    user: str = Depends(verify_token),
):
    count = db.query(OperationalAlert).filter(
        OperationalAlert.is_read == False
    ).count()

    return {"unread_count": count}


@router.put("/alert/{alert_id}/read")
def mark_alert_read(
    alert_id: int,
    db: DBSession = Depends(get_db),
    user: str = Depends(verify_token),
):
    alert = db.query(OperationalAlert).filter(
        OperationalAlert.alert_id == alert_id
    ).first()

    if not alert:
        raise HTTPException(
            status_code=404,
            detail=f"Alert with ID {alert_id} not found."
        )

    alert.is_read = True
    db.commit()
    db.refresh(alert)

    return {
        "message": "Alert marked as read.",
        "alert": _serialize_alert(alert)
    }


@router.put("/alerts/mark-all-read")
def mark_all_read(
    db: DBSession = Depends(get_db),
    user: str = Depends(verify_token),
):
    updated = db.query(OperationalAlert).filter(
        OperationalAlert.is_read == False
    ).update({"is_read": True})

    db.commit()

    return {"message": "All alerts marked as read.", "count": updated}


@router.post("/alerts/check-deadlines")
def check_sponsor_deadlines(
    db: DBSession = Depends(get_db),
    user: str = Depends(verify_token),
):
    """
    Scan sponsors for approaching deadlines and overdue deliverables.
    Generates real alerts based on actual system data.
    """
    today = date.today()
    alerts_created = 0

    sponsors = db.query(Sponsor).filter(
        Sponsor.status != "Cancelled"
    ).all()

    for sponsor in sponsors:
        end_d = _to_date(sponsor.end_date)

        if not end_d:
          continue

        if isinstance(end_d, datetime):
            end_d = end_d.date()

        days_until = (end_d - today).days

        if 0 <= days_until <= 7:
            existing = db.query(OperationalAlert).filter(
                OperationalAlert.related_sponsor_id == sponsor.sponsor_id,
                OperationalAlert.alert_type == "sponsor_deadline",
                OperationalAlert.is_read == False,
            ).first()

            if not existing:
                priority = "Critical" if days_until <= 1 else "High" if days_until <= 3 else "Medium"
                time_msg = "ends today" if days_until == 0 else f"ends in {days_until} day(s)"
                alert = OperationalAlert(
                    alert_type="sponsor_deadline",
                    priority=priority,
                    message=(
                        f"📅 Sponsor deadline approaching: "
                        f"'{sponsor.company_name}' ({sponsor.package or 'Sponsor'}) {time_msg} on {end_d.isoformat()}."
                    ),
                    related_event=sponsor.event,
                    related_sponsor_id=sponsor.sponsor_id,
                )
                db.add(alert)
                alerts_created += 1

        elif days_until < 0:
            completed = sponsor.deliverables_completed or 0
            total = sponsor.deliverables_total or 0

            if total > 0 and completed < total:
                existing = db.query(OperationalAlert).filter(
                    OperationalAlert.related_sponsor_id == sponsor.sponsor_id,
                    OperationalAlert.alert_type == "sponsor_overdue",
                    OperationalAlert.is_read == False,
                ).first()

                if not existing:
                    alert = OperationalAlert(
                        alert_type="sponsor_overdue",
                        priority="High",
                        message=(
                            f"⚠️ Overdue deliverables: '{sponsor.company_name}' — "
                            f"{completed}/{total} completed (ended {abs(days_until)} day(s) ago)."
                        ),
                        related_event=sponsor.event,
                        related_sponsor_id=sponsor.sponsor_id,
                    )
                    db.add(alert)
                    alerts_created += 1

    if alerts_created > 0:
        db.commit()

    return {
        "message": f"Scan completed. {alerts_created} new alert(s) generated.",
        "alerts_created": alerts_created,
    }


def _serialize_alert(alert):
    return {
        "alert_id": alert.alert_id,
        "alert_type": alert.alert_type,
        "priority": alert.priority,
        "message": alert.message,
        "related_event": alert.related_event,
        "related_incident_id": alert.related_incident_id,
        "related_sponsor_id": alert.related_sponsor_id,
        "is_read": alert.is_read,
        "created_at": str(alert.created_at) if alert.created_at else None,
    }
