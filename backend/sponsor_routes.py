from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session as DBSession
from datetime import datetime, date

from models import Sponsor, Attendee, OperationalAlert
from schemas import SponsorCreate, SponsorUpdate, SponsorRecommendationRequest
from database import get_db
from security import verify_token

router = APIRouter(tags=["Sponsors"])



def normalize(value):
    if value is None:
        return None
    value = value.strip().lower()
    return value.title()


VALID_PACKAGES = ["Platinum", "Gold", "Silver", "Bronze", "Custom"]
VALID_STATUSES = [
    "Lead", "Contacted", "Negotiating",
    "Confirmed", "Active", "Completed", "Cancelled"
]



@router.post("/sponsors")
def create_sponsor(
    sponsor_data: SponsorCreate,
    db: DBSession = Depends(get_db),
    user: str = Depends(verify_token),
):
    sponsor = Sponsor(
        company_name=sponsor_data.company_name.strip(),
        contact_person=(
            sponsor_data.contact_person.strip()
            if sponsor_data.contact_person else None
        ),
        email=sponsor_data.email.strip().lower(),
        phone=sponsor_data.phone,
        category=normalize(sponsor_data.category),
        package=normalize(sponsor_data.package),
        amount=sponsor_data.amount or 0.0,
        event=normalize(sponsor_data.event),
        status=normalize(sponsor_data.status) or "Lead",
        start_date=(
            datetime.strptime(sponsor_data.start_date, "%Y-%m-%d").date()
            if sponsor_data.start_date else None
        ),
        end_date=(
            datetime.strptime(sponsor_data.end_date, "%Y-%m-%d").date()
            if sponsor_data.end_date else None
        ),
        benefits=sponsor_data.benefits,
        deliverables=sponsor_data.deliverables,
        deliverables_completed=sponsor_data.deliverables_completed or 0,
        deliverables_total=sponsor_data.deliverables_total or 0,
        notes=sponsor_data.notes,
    )

    db.add(sponsor)
    db.commit()
    db.refresh(sponsor)

    return {
        "message": "Sponsor created successfully!",
        "sponsor": _serialize_sponsor(sponsor)
    }


@router.get("/sponsors")
def get_sponsors(
    db: DBSession = Depends(get_db),
    user: str = Depends(verify_token),
):
    sponsors = db.query(Sponsor).all()
    return [_serialize_sponsor(s) for s in sponsors]


@router.get("/sponsor/{sponsor_id}")
def get_sponsor(
    sponsor_id: int,
    db: DBSession = Depends(get_db),
    user: str = Depends(verify_token),
):
    sponsor = db.query(Sponsor).filter(
        Sponsor.sponsor_id == sponsor_id
    ).first()

    if not sponsor:
        raise HTTPException(
            status_code=404,
            detail="Sponsor not found."
        )

    return _serialize_sponsor(sponsor)


@router.put("/sponsor/{sponsor_id}")
def update_sponsor(
    sponsor_id: int,
    sponsor_data: SponsorUpdate,
    db: DBSession = Depends(get_db),
    user: str = Depends(verify_token),
):
    sponsor = db.query(Sponsor).filter(
        Sponsor.sponsor_id == sponsor_id
    ).first()

    if not sponsor:
        raise HTTPException(
            status_code=404,
            detail="Sponsor not found."
        )

    sponsor.company_name = sponsor_data.company_name.strip()
    sponsor.contact_person = (
        sponsor_data.contact_person.strip()
        if sponsor_data.contact_person else None
    )
    sponsor.email = sponsor_data.email.strip().lower()
    sponsor.phone = sponsor_data.phone
    sponsor.category = normalize(sponsor_data.category)
    sponsor.package = normalize(sponsor_data.package)
    sponsor.amount = sponsor_data.amount or 0.0
    sponsor.event = normalize(sponsor_data.event)
    sponsor.status = normalize(sponsor_data.status) or "Lead"
    sponsor.start_date = (
        datetime.strptime(sponsor_data.start_date, "%Y-%m-%d").date()
        if sponsor_data.start_date else None
    )
    sponsor.end_date = (
        datetime.strptime(sponsor_data.end_date, "%Y-%m-%d").date()
        if sponsor_data.end_date else None
    )
    sponsor.benefits = sponsor_data.benefits
    sponsor.deliverables = sponsor_data.deliverables
    sponsor.deliverables_completed = sponsor_data.deliverables_completed or 0
    sponsor.deliverables_total = sponsor_data.deliverables_total or 0
    sponsor.notes = sponsor_data.notes

    # --- Auto-generate alerts for overdue deliverables ---
    if sponsor.end_date and sponsor.end_date < date.today():
        if sponsor.deliverables_completed < sponsor.deliverables_total:
            _create_alert(
                db,
                alert_type="sponsor_overdue",
                priority="High",
                message=(
                    f"Sponsor '{sponsor.company_name}' has overdue deliverables: "
                    f"{sponsor.deliverables_completed}/{sponsor.deliverables_total} completed."
                ),
                related_event=sponsor.event,
                related_sponsor_id=sponsor.sponsor_id,
            )

    db.commit()
    db.refresh(sponsor)

    return {
        "message": "Sponsor updated successfully!",
        "sponsor": _serialize_sponsor(sponsor)
    }


@router.delete("/sponsor/{sponsor_id}")
def delete_sponsor(
    sponsor_id: int,
    db: DBSession = Depends(get_db),
    user: str = Depends(verify_token),
):
    sponsor = db.query(Sponsor).filter(
        Sponsor.sponsor_id == sponsor_id
    ).first()

    if not sponsor:
        raise HTTPException(
            status_code=404,
            detail="Sponsor not found."
        )

    db.delete(sponsor)
    db.commit()

    return {"message": "Sponsor deleted successfully!"}



@router.post("/sponsorship-agent/recommend")
def recommend_sponsor(
    request: SponsorRecommendationRequest,
    db: DBSession = Depends(get_db),
    user: str = Depends(verify_token),
):
    """
    Intelligent sponsor recommendation engine.
    Scores sponsors based on actual data:
      - Event-category relevance (25 pts)
      - Performance history (25 pts)
      - Budget/package suitability (25 pts)
      - Status & availability (25 pts)

    Structured so an LLM can be integrated later
    by replacing the scoring logic.
    """

    sponsors = db.query(Sponsor).all()

    if not sponsors:
        raise HTTPException(
            status_code=404,
            detail="No sponsors found in the system."
        )

    event_attendees = 0
    if request.event:
        event_attendees = db.query(Attendee).filter(
            Attendee.event == request.event
        ).count()

    recommendations = []

    for sponsor in sponsors:

        if sponsor.status and sponsor.status.lower() == "cancelled":
            continue

        score = 0
        reasons = []


        category_score = 0

        if request.category and sponsor.category:
            req_cat = request.category.strip().lower()
            sp_cat = sponsor.category.strip().lower()

            if req_cat == sp_cat:
                category_score = 25
                reasons.append("Strong event-category relevance")
            elif req_cat in sp_cat or sp_cat in req_cat:
                category_score = 18
                reasons.append("Partial category alignment")
            else:
                category_score = 5
        elif not request.category:
            category_score = 15  # No preference = neutral

        score += category_score


        performance_score = 0

        if sponsor.deliverables_total and sponsor.deliverables_total > 0:
            completion_rate = (
                sponsor.deliverables_completed /
                sponsor.deliverables_total
            )

            if completion_rate >= 0.9:
                performance_score = 25
                reasons.append("Excellent past performance (90%+ delivery)")
            elif completion_rate >= 0.7:
                performance_score = 20
                reasons.append("Strong previous performance")
            elif completion_rate >= 0.5:
                performance_score = 15
                reasons.append("Moderate past performance")
            else:
                performance_score = 8
                reasons.append("Below-average past delivery")
        else:
            performance_score = 12  # New sponsor, no history
            reasons.append("No historical performance data")

        score += performance_score


        budget_score = 0

        if request.budget_max > 0 and sponsor.amount:
            if request.budget_min <= sponsor.amount <= request.budget_max:
                budget_score = 25
                reasons.append("Suitable budget range")
            elif sponsor.amount < request.budget_min:
                budget_score = 10
                reasons.append("Below minimum budget")
            else:
                budget_score = 8
                reasons.append("Above maximum budget")
        elif not request.budget_max:
            budget_score = 15  # No budget preference

        # Package alignment bonus
        if request.package and sponsor.package:
            req_pkg = request.package.strip().lower()
            sp_pkg = sponsor.package.strip().lower()

            if req_pkg == sp_pkg:
                budget_score = min(25, budget_score + 5)
                reasons.append("Package type match")

        score += budget_score


        status_score = 0
        status = (sponsor.status or "lead").lower()

        status_weights = {
            "active": 25,
            "confirmed": 22,
            "negotiating": 18,
            "contacted": 15,
            "lead": 12,
            "completed": 10,
        }

        status_score = status_weights.get(status, 10)

        if status in ("active", "confirmed"):
            reasons.append("Sponsor is currently active/confirmed")
        elif status == "completed":
            reasons.append("Sponsor has completed prior engagement")

        score += status_score

        recommended_package = _recommend_package(
            sponsor, event_attendees, request
        )

        recommendations.append({
            "sponsor_id": sponsor.sponsor_id,
            "company_name": sponsor.company_name,
            "contact_person": sponsor.contact_person,
            "email": sponsor.email,
            "category": sponsor.category,
            "current_package": sponsor.package,
            "amount": sponsor.amount,
            "status": sponsor.status,
            "match_score": min(100, score),
            "reasons": reasons,
            "recommended_package": recommended_package,
            "deliverables_completed": sponsor.deliverables_completed,
            "deliverables_total": sponsor.deliverables_total,
        })

    recommendations.sort(
        key=lambda x: x["match_score"],
        reverse=True
    )

    if not recommendations:
        raise HTTPException(
            status_code=404,
            detail="No matching sponsors found."
        )

    return {
        "message": "Sponsor recommendations generated successfully.",
        "request": {
            "event": request.event,
            "category": request.category,
            "budget_min": request.budget_min,
            "budget_max": request.budget_max,
            "package": request.package,
        },
        "best_sponsor": recommendations[0],
        "alternatives": recommendations[1:],
    }



@router.get("/sponsorship/analytics")
def sponsorship_analytics(
    db: DBSession = Depends(get_db),
    user: str = Depends(verify_token),
):
    sponsors = db.query(Sponsor).all()

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

    confirmed_value = sum(
        s.amount or 0 for s in sponsors
        if s.status and s.status.lower() in (
            "confirmed", "active"
        )
    )

    # Deliverable completion rate
    total_deliverables = sum(s.deliverables_total or 0 for s in sponsors)
    completed_deliverables = sum(
        s.deliverables_completed or 0 for s in sponsors
    )

    deliverable_completion_rate = (
        round(
            (completed_deliverables / total_deliverables) * 100, 1
        )
        if total_deliverables > 0 else 0
    )

    # Performance score (average across sponsors with deliverables)
    performance_scores = []
    for s in sponsors:
        if s.deliverables_total and s.deliverables_total > 0:
            perf = (s.deliverables_completed or 0) / s.deliverables_total
            performance_scores.append(round(perf * 100, 1))

    avg_performance = (
        round(sum(performance_scores) / len(performance_scores), 1)
        if performance_scores else 0
    )

    # Package distribution
    package_distribution = {}
    for s in sponsors:
        pkg = (s.package or "Unassigned").title()
        package_distribution[pkg] = (
            package_distribution.get(pkg, 0) + 1
        )

    # Status distribution
    status_distribution = {}
    for s in sponsors:
        st = (s.status or "Unknown").title()
        status_distribution[st] = (
            status_distribution.get(st, 0) + 1
        )

    # Category distribution
    category_distribution = {}
    for s in sponsors:
        cat = (s.category or "Other").title()
        category_distribution[cat] = (
            category_distribution.get(cat, 0) + 1
        )

    # Sponsor performance list
    sponsor_performance = []
    for s in sponsors:
        total = s.deliverables_total or 0
        completed = s.deliverables_completed or 0
        perf = round((completed / total) * 100, 1) if total > 0 else 0

        sponsor_performance.append({
            "sponsor_id": s.sponsor_id,
            "company_name": s.company_name,
            "package": s.package,
            "amount": s.amount,
            "status": s.status,
            "deliverables_completed": completed,
            "deliverables_total": total,
            "performance": perf,
        })

    return {
        "summary": {
            "total_sponsors": total_sponsors,
            "active_sponsors": active_sponsors,
            "total_value": total_value,
            "pending_value": pending_value,
            "confirmed_value": confirmed_value,
            "deliverable_completion_rate": deliverable_completion_rate,
            "average_performance": avg_performance,
        },
        "package_distribution": package_distribution,
        "status_distribution": status_distribution,
        "category_distribution": category_distribution,
        "sponsor_performance": sponsor_performance,
    }



def _serialize_sponsor(sponsor):
    """Convert Sponsor model to JSON-safe dict."""
    return {
        "sponsor_id": sponsor.sponsor_id,
        "company_name": sponsor.company_name,
        "contact_person": sponsor.contact_person,
        "email": sponsor.email,
        "phone": sponsor.phone,
        "category": sponsor.category,
        "package": sponsor.package,
        "amount": sponsor.amount,
        "event": sponsor.event,
        "status": sponsor.status,
        "start_date": str(sponsor.start_date) if sponsor.start_date else None,
        "end_date": str(sponsor.end_date) if sponsor.end_date else None,
        "benefits": sponsor.benefits,
        "deliverables": sponsor.deliverables,
        "deliverables_completed": sponsor.deliverables_completed,
        "deliverables_total": sponsor.deliverables_total,
        "notes": sponsor.notes,
        "created_at": str(sponsor.created_at) if sponsor.created_at else None,
    }


def _recommend_package(sponsor, event_attendees, request):
    """Recommend a sponsorship package based on data."""

    if sponsor.package and request.package:
        if sponsor.package.lower() == request.package.lower():
            return sponsor.package

    amount = sponsor.amount or 0

    if amount >= 4000000 or event_attendees >= 1000:
        return "Platinum"
    elif amount >= 2000000 or event_attendees >= 500:
        return "Gold"
    elif amount >= 800000 or event_attendees >= 200:
        return "Silver"
    elif amount >= 400000:
        return "Bronze"
    else:
        return "Custom"


def _create_alert(db, alert_type, priority, message,
                  related_event=None, related_incident_id=None,
                  related_sponsor_id=None):
    """Create an operational alert."""
    alert = OperationalAlert(
        alert_type=alert_type,
        priority=priority,
        message=message,
        related_event=related_event,
        related_incident_id=related_incident_id,
        related_sponsor_id=related_sponsor_id,
    )
    db.add(alert)
