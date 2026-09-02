"""
Milestone 4 — Event Intelligence Engine.

Computes a deterministic Event Health Score (0-100) by reading existing
data from Milestones 1-3.  Every sub-score is explainable.

Public API
----------
compute_event_health(db)        → dict   (scores + explanations)
generate_insights(db)           → list   (natural-language insights)
detect_critical_actions(db)     → list   (actionable alerts)
get_attendance_trend(db)        → list   (daily registration counts)
get_checkin_trend(db)           → list   (daily check-in counts)
get_incident_trend(db)          → list   (daily incident counts)
"""

from __future__ import annotations

from datetime import date, datetime, timedelta
from typing import Any

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
    OperationalAlert,
)


# ═══════════════════════════════════════════════════════════
#  HEALTH SCORE  (0–100)
# ═══════════════════════════════════════════════════════════

# Weights (must sum to 1.0)
_W = {
    "attendance":  0.20,
    "venue":       0.15,
    "speaker":     0.15,
    "schedule":    0.15,
    "incident":    0.15,
    "session":     0.10,
    "sponsor":     0.10,
}


class EventContext:
    """
    Request-scoped context that caches database entities and relationships.
    Eliminates N+1 queries and redundant table scans across all Milestone 4
    intelligence and dashboard computations.
    """

    def __init__(self, db: DBSession):
        self.db = db
        self._total_attendees: int | None = None
        self._checked_in_attendees: int | None = None
        self._venues: list[Venue] | None = None
        self._venues_by_id: dict[int, Venue] | None = None
        self._speakers: list[Speaker] | None = None
        self._speakers_by_id: dict[int, Speaker] | None = None
        self._sessions: list[Session] | None = None
        self._sessions_by_id: dict[int, Session] | None = None
        self._schedules: list[SessionSchedule] | None = None
        self._sponsors: list[Sponsor] | None = None
        self._incidents: list[Incident] | None = None
        self._unread_alerts: int | None = None
        self._critical_unread_alerts: int | None = None
        self._speaker_conflicts: list[tuple[int, int, Speaker | None]] | None = None
        self._venue_conflicts: list[tuple[int, int, Venue | None]] | None = None

    @property
    def total_attendees(self) -> int:
        if self._total_attendees is None:
            self._total_attendees = self.db.query(Attendee).count()
        return self._total_attendees

    @property
    def checked_in_attendees(self) -> int:
        if self._checked_in_attendees is None:
            self._checked_in_attendees = (
                self.db.query(Attendee)
                .filter(Attendee.checkin_status == True)  # noqa: E712
                .count()
            )
        return self._checked_in_attendees

    @property
    def venues(self) -> list[Venue]:
        if self._venues is None:
            self._venues = self.db.query(Venue).all()
        return self._venues

    @property
    def venues_by_id(self) -> dict[int, Venue]:
        if self._venues_by_id is None:
            self._venues_by_id = {v.venue_id: v for v in self.venues}
        return self._venues_by_id

    @property
    def speakers(self) -> list[Speaker]:
        if self._speakers is None:
            self._speakers = self.db.query(Speaker).all()
        return self._speakers

    @property
    def speakers_by_id(self) -> dict[int, Speaker]:
        if self._speakers_by_id is None:
            self._speakers_by_id = {s.speaker_id: s for s in self.speakers}
        return self._speakers_by_id

    @property
    def sessions(self) -> list[Session]:
        if self._sessions is None:
            self._sessions = self.db.query(Session).all()
        return self._sessions

    @property
    def sessions_by_id(self) -> dict[int, Session]:
        if self._sessions_by_id is None:
            self._sessions_by_id = {s.session_id: s for s in self.sessions}
        return self._sessions_by_id

    @property
    def schedules(self) -> list[SessionSchedule]:
        if self._schedules is None:
            self._schedules = self.db.query(SessionSchedule).all()
        return self._schedules

    @property
    def sponsors(self) -> list[Sponsor]:
        if self._sponsors is None:
            self._sponsors = self.db.query(Sponsor).all()
        return self._sponsors

    @property
    def incidents(self) -> list[Incident]:
        if self._incidents is None:
            self._incidents = self.db.query(Incident).all()
        return self._incidents

    @property
    def unread_alerts(self) -> int:
        if self._unread_alerts is None:
            self._unread_alerts = (
                self.db.query(OperationalAlert)
                .filter(OperationalAlert.is_read == False)  # noqa: E712
                .count()
            )
        return self._unread_alerts

    @property
    def critical_unread_alerts(self) -> int:
        if self._critical_unread_alerts is None:
            self._critical_unread_alerts = (
                self.db.query(OperationalAlert)
                .filter(
                    OperationalAlert.is_read == False,  # noqa: E712
                    func.lower(OperationalAlert.priority) == "critical",
                )
                .count()
            )
        return self._critical_unread_alerts

    def _detect_conflicts(self):
        if self._speaker_conflicts is not None and self._venue_conflicts is not None:
            return
        self._speaker_conflicts = []
        self._venue_conflicts = []
        schedules = self.schedules
        speakers_map = self.speakers_by_id
        venues_map = self.venues_by_id
        seen_sp: set[tuple[int, int]] = set()
        seen_vn: set[tuple[int, int]] = set()

        for i, a in enumerate(schedules):
            for b in schedules[i + 1:]:
                if a.start_time < b.end_time and b.start_time < a.end_time:
                    if a.speaker_id == b.speaker_id:
                        pair = (min(a.schedule_id, b.schedule_id), max(a.schedule_id, b.schedule_id))
                        if pair not in seen_sp:
                            seen_sp.add(pair)
                            self._speaker_conflicts.append(
                                (a.schedule_id, b.schedule_id, speakers_map.get(a.speaker_id))
                            )
                    if a.venue_id == b.venue_id:
                        pair = (min(a.schedule_id, b.schedule_id), max(a.schedule_id, b.schedule_id))
                        if pair not in seen_vn:
                            seen_vn.add(pair)
                            self._venue_conflicts.append(
                                (a.schedule_id, b.schedule_id, venues_map.get(a.venue_id))
                            )

    @property
    def speaker_conflicts(self) -> list[tuple[int, int, Speaker | None]]:
        self._detect_conflicts()
        return self._speaker_conflicts or []

    @property
    def venue_conflicts(self) -> list[tuple[int, int, Venue | None]]:
        self._detect_conflicts()
        return self._venue_conflicts or []

    @property
    def total_conflicts_count(self) -> int:
        self._detect_conflicts()
        return len(self._speaker_conflicts or []) + len(self._venue_conflicts or [])


def _attendance_score(db: DBSession, ctx: EventContext | None = None) -> tuple[float, str]:
    """Check-in rate across all attendees.  100 = everyone checked in."""
    ctx = ctx or EventContext(db)
    total = ctx.total_attendees
    if total == 0:
        return 50.0, "No attendees registered yet"
    checked = ctx.checked_in_attendees
    rate = round(checked / total * 100, 1)
    score = min(rate, 100.0)
    return score, f"{checked}/{total} attendees checked in ({rate}%)"


def _venue_utilization_score(db: DBSession, ctx: EventContext | None = None) -> tuple[float, str]:
    """Average (expected_attendees / venue_capacity) across scheduled sessions."""
    ctx = ctx or EventContext(db)
    schedules = ctx.schedules
    if not schedules:
        return 50.0, "No sessions scheduled yet"

    sessions_by_id = ctx.sessions_by_id
    venues_by_id = ctx.venues_by_id

    ratios: list[float] = []
    warnings: list[str] = []

    for sch in schedules:
        session = sessions_by_id.get(sch.session_id)
        venue = venues_by_id.get(sch.venue_id)
        if session and venue and venue.capacity and venue.capacity > 0:
            util = (session.expected_attendees or 0) / venue.capacity
            ratios.append(min(util, 1.0))
            pct = round(util * 100, 1)
            if pct > 90:
                warnings.append(
                    f"{venue.venue_name} is at {pct}% capacity for '{session.session_title}'"
                )

    if not ratios:
        return 50.0, "Unable to compute venue utilization"

    avg = sum(ratios) / len(ratios)
    # Ideal is 60-85%.  Below 40% or above 95% loses points.
    if 0.60 <= avg <= 0.85:
        score = 100.0
    elif avg > 0.85:
        score = max(100 - (avg - 0.85) * 300, 40)
    else:
        score = max(avg / 0.60 * 100, 20)

    explanation = f"Average venue utilization {round(avg * 100, 1)}%"
    if warnings:
        explanation += " — " + "; ".join(warnings[:2])

    return round(score, 1), explanation


def _speaker_readiness_score(db: DBSession, ctx: EventContext | None = None) -> tuple[float, str]:
    """% of speakers who are available AND assigned to at least one session."""
    ctx = ctx or EventContext(db)
    speakers = ctx.speakers
    if not speakers:
        return 50.0, "No speakers registered yet"

    total = len(speakers)
    available = sum(1 for s in speakers if s.available)
    assigned_ids = {sch.speaker_id for sch in ctx.schedules}
    assigned_and_available = sum(
        1 for s in speakers if s.speaker_id in assigned_ids and s.available
    )
    rate = assigned_and_available / total * 100
    score = min(rate + (available / total * 20), 100)  # bonus for availability

    return round(score, 1), (
        f"{assigned_and_available}/{total} speakers assigned & available, "
        f"{available}/{total} available overall"
    )
def _schedule_health_score(db: DBSession, ctx: EventContext | None = None) -> tuple[float, str]:
    """% of sessions that have been scheduled + conflict detection."""
    ctx = ctx or EventContext(db)
    total_sessions = len(ctx.sessions)
    if total_sessions == 0:
        return 50.0, "No sessions created yet"

    scheduled = len(ctx.schedules)
    pct = scheduled / total_sessions * 100
    conflicts = ctx.total_conflicts_count

    score = min(pct, 100)
    if conflicts > 0:
        score = max(score - conflicts * 15, 20)

    explanation = f"{scheduled}/{total_sessions} sessions scheduled"
    if conflicts:
        explanation += f", {conflicts} scheduling conflict(s) detected"

    return round(score, 1), explanation


def _incident_risk_score(db: DBSession, ctx: EventContext | None = None) -> tuple[float, str]:
    """Lower open/critical incidents → higher score."""
    ctx = ctx or EventContext(db)
    incidents = ctx.incidents
    total = len(incidents)
    if total == 0:
        return 100.0, "No incidents reported"

    # Use exact definitions from incident_routes.py (Single Source of Truth)
    open_count = sum(
        1 for i in incidents
        if (i.status or "").lower() in ("reported", "acknowledged", "open", "escalated")
    )
    in_prog_count = sum(
        1 for i in incidents
        if (i.status or "").lower() in ("in progress", "in_progress")
    )
    active_unresolved = open_count + in_prog_count

    active_critical = sum(
        1 for i in incidents
        if (i.priority or "").lower() == "critical"
        and (i.status or "").lower() not in ("resolved", "closed")
    )
    total_critical = sum(
        1 for i in incidents
        if (i.priority or "").lower() == "critical"
    )

    # Start at 100, deduct for active unresolved incidents and unresolved criticals
    score = 100.0
    score -= active_unresolved * 8
    score -= active_critical * 15
    score = max(score, 10)

    parts = [f"{open_count} open incident(s)"]
    if in_prog_count > 0:
        parts.append(f"{in_prog_count} in progress")
    if active_critical > 0:
        parts.append(f"{active_critical} unresolved critical")
    elif total_critical > 0:
        parts.append(f"{total_critical} critical (all resolved/closed)")
    explanation = ", ".join(parts)

    return round(score, 1), explanation


def _session_performance_score(db: DBSession, ctx: EventContext | None = None) -> tuple[float, str]:
    """Average venue_match_score across scheduled sessions."""
    ctx = ctx or EventContext(db)
    schedules = ctx.schedules
    if not schedules:
        return 50.0, "No scheduled sessions to evaluate"

    scores = [
        sch.venue_match_score
        for sch in schedules
        if sch.venue_match_score is not None
    ]
    if not scores:
        return 50.0, "No venue match scores available"

    avg = sum(scores) / len(scores)
    return round(avg, 1), f"Average venue match score: {round(avg, 1)}%"


def _sponsor_performance_score(db: DBSession, ctx: EventContext | None = None) -> tuple[float, str]:
    """Average deliverable completion rate across active sponsors."""
    ctx = ctx or EventContext(db)
    sponsors = ctx.sponsors
    if not sponsors:
        return 50.0, "No sponsors registered"

    active = [
        s for s in sponsors
        if s.status and s.status.lower() in ("active", "confirmed", "completed")
    ]
    if not active:
        return 50.0, f"{len(sponsors)} sponsors but none active/confirmed"

    rates: list[float] = []
    for s in active:
        if s.deliverables_total and s.deliverables_total > 0:
            rates.append((s.deliverables_completed or 0) / s.deliverables_total * 100)

    if not rates:
        return 60.0, f"{len(active)} active sponsors, no deliverables tracked"

    avg = sum(rates) / len(rates)
    return round(avg, 1), (
        f"{len(active)} active sponsor(s), "
        f"avg deliverable completion {round(avg, 1)}%"
    )


def compute_event_health(db: DBSession, ctx: EventContext | None = None) -> dict[str, Any]:
    """Return the full Event Health Score with sub-scores and explanations."""
    ctx = ctx or EventContext(db)
    sub_scores: dict[str, dict] = {}

    calculators = {
        "attendance":  _attendance_score,
        "venue":       _venue_utilization_score,
        "speaker":     _speaker_readiness_score,
        "schedule":    _schedule_health_score,
        "incident":    _incident_risk_score,
        "session":     _session_performance_score,
        "sponsor":     _sponsor_performance_score,
    }

    weighted_total = 0.0
    for key, calc_fn in calculators.items():
        score, explanation = calc_fn(db, ctx=ctx)
        weight = _W[key]
        sub_scores[key] = {
            "score": score,
            "weight": int(weight * 100),
            "weighted": round(score * weight, 2),
            "explanation": explanation,
        }
        weighted_total += score * weight

    overall = round(weighted_total, 1)

    if overall >= 90:
        rating = "Good"  # Executive standard: Good / Warning / Critical
        badge = "🟢"
        status_label = "HEALTHY"
    elif overall >= 70:
        rating = "Good"
        badge = "🟢"
        status_label = "GOOD"
    elif overall >= 50:
        rating = "Warning"
        badge = "🟡"
        status_label = "WARNING"
    else:
        rating = "Critical"
        badge = "🔴"
        status_label = "CRITICAL"

    # Generate concise executive explanation
    positives = []
    concerns = []
    for k, v in sub_scores.items():
        if v["score"] >= 75:
            positives.append(k.replace("_", " "))
        elif v["score"] < 60:
            concerns.append(k.replace("_", " "))

    if positives and concerns:
        summary_text = (
            f"Overall event performance is {rating.lower()}. "
            f"{', '.join(positives[:2]).capitalize()} are strong, "
            f"while {', '.join(concerns[:2])} require management attention."
        )
    elif concerns:
        summary_text = (
            f"Event performance is at {rating.lower()} level. "
            f"Immediate attention needed for: {', '.join(concerns[:3])}."
        )
    else:
        summary_text = (
            "Overall event performance is strong across all operational areas. "
            "Attendance, scheduling, and resources are operating within target parameters."
        )

    return {
        "overall_score": overall,
        "rating": rating,
        "status_label": status_label,
        "badge": badge,
        "summary_text": summary_text,
        "sub_scores": sub_scores,
        "computed_at": datetime.now().isoformat(),
    }


# ═══════════════════════════════════════════════════════════
#  INSIGHTS  (natural-language recommendations)
# ═══════════════════════════════════════════════════════════

def generate_insights(db: DBSession, ctx: EventContext | None = None) -> list[dict[str, str]]:
    """Return a list of actionable insights derived from existing data."""
    ctx = ctx or EventContext(db)
    insights: list[dict[str, str]] = []

    # ── Attendance ──
    total_att = ctx.total_attendees
    checked = ctx.checked_in_attendees
    if total_att > 0:
        rate = checked / total_att * 100
        if rate < 50:
            insights.append({
                "type": "warning",
                "category": "Attendance",
                "message": (
                    f"Check-in rate is only {rate:.0f}%. "
                    "Consider sending reminders to attendees who haven't checked in."
                ),
            })
        elif rate >= 90:
            insights.append({
                "type": "success",
                "category": "Attendance",
                "message": (
                    f"Excellent check-in rate of {rate:.0f}%. "
                    "Event attendance is on track."
                ),
            })

    # ── Venue (in-memory lookup) ──
    for sch in ctx.schedules:
        session = ctx.sessions_by_id.get(sch.session_id)
        venue = ctx.venues_by_id.get(sch.venue_id)
        if session and venue and venue.capacity:
            util = (session.expected_attendees or 0) / venue.capacity * 100
            if util > 90:
                insights.append({
                    "type": "warning",
                    "category": "Venue",
                    "message": (
                        f"{venue.venue_name} is at {util:.0f}% capacity for "
                        f"'{session.session_title}'. Consider moving to a larger venue."
                    ),
                })
            elif util < 30:
                insights.append({
                    "type": "info",
                    "category": "Venue",
                    "message": (
                        f"{venue.venue_name} is only {util:.0f}% utilized for "
                        f"'{session.session_title}'. Consider downsizing to save resources."
                    ),
                })

    # ── Speakers ──
    unavailable = [s for s in ctx.speakers if not s.available]
    if unavailable:
        names = ", ".join(s.name for s in unavailable[:3])
        insights.append({
            "type": "warning",
            "category": "Speaker",
            "message": (
                f"{len(unavailable)} speaker(s) marked unavailable: {names}. "
                "Verify assignments and arrange backup speakers."
            ),
        })

    # ── Scheduling conflicts (in-memory detected) ──
    for _, _, sp in ctx.speaker_conflicts:
        insights.append({
            "type": "critical",
            "category": "Schedule",
            "message": (
                f"Speaker {sp.name if sp else 'Unknown'} has overlapping "
                f"sessions. Resolve the scheduling conflict immediately."
            ),
        })
    for _, _, v in ctx.venue_conflicts:
        insights.append({
            "type": "critical",
            "category": "Schedule",
            "message": (
                f"Venue {v.venue_name if v else 'Unknown'} has overlapping "
                f"bookings. Reschedule one of the conflicting sessions."
            ),
        })

    # ── Incidents ──
    all_incidents = ctx.incidents
    active_critical = sum(
        1 for i in all_incidents
        if (i.priority or "").lower() == "critical"
        and (i.status or "").lower() not in ("resolved", "closed")
    )
    active_high = sum(
        1 for i in all_incidents
        if (i.priority or "").lower() == "high"
        and (i.status or "").lower() not in ("resolved", "closed")
    )
    open_inc = sum(
        1 for i in all_incidents
        if (i.status or "").lower() in ("reported", "acknowledged", "open", "escalated")
    )
    in_prog = sum(
        1 for i in all_incidents
        if (i.status or "").lower() in ("in progress", "in_progress")
    )

    if active_critical > 0:
        insights.append({
            "type": "critical",
            "category": "Incident",
            "message": (
                f"{active_critical} unresolved critical incident(s). "
                "Immediate senior escalation recommended."
            ),
        })
    elif active_high > 0:
        insights.append({
            "type": "warning",
            "category": "Incident",
            "message": (
                f"{active_high} high-priority incident(s) currently active. "
                "Monitor response progress."
            ),
        })
    elif (open_inc + in_prog) > 0:
        insights.append({
            "type": "info",
            "category": "Incident",
            "message": (
                f"{open_inc + in_prog} operational incident(s) active. "
                "All critical incidents have been successfully resolved."
            ),
        })

    # ── Sponsors ──
    today = date.today()
    for s in ctx.sponsors:
        end = _safe_date(s.end_date)
        if end and (end - today).days <= 3 and (end - today).days >= 0:
            insights.append({
                "type": "warning",
                "category": "Sponsor",
                "message": (
                    f"Sponsor '{s.company_name}' contract expires in "
                    f"{(end - today).days} day(s). Review renewal or deliverables."
                ),
            })

    # Fallback
    if not insights:
        insights.append({
            "type": "success",
            "category": "General",
            "message": "All systems operating normally. No critical issues detected.",
        })

    return insights


# ═══════════════════════════════════════════════════════════
#  CRITICAL ACTIONS
# ═══════════════════════════════════════════════════════════

def detect_critical_actions(db: DBSession, ctx: EventContext | None = None) -> list[dict[str, Any]]:
    """Return actionable items requiring immediate attention."""
    ctx = ctx or EventContext(db)
    actions: list[dict[str, Any]] = []

    # 1. Capacity warnings (in-memory evaluation)
    for sch in ctx.schedules:
        session = ctx.sessions_by_id.get(sch.session_id)
        venue = ctx.venues_by_id.get(sch.venue_id)
        if session and venue and venue.capacity:
            util = (session.expected_attendees or 0) / venue.capacity * 100
            if util > 90:
                # Find alternative in-memory
                exp = session.expected_attendees or 0
                alts = [
                    v for v in ctx.venues
                    if v.venue_id != venue.venue_id and v.available and v.capacity >= exp
                ]
                alts.sort(key=lambda x: x.capacity)
                alt = alts[0] if alts else None

                actions.append({
                    "severity": "high",
                    "category": "capacity",
                    "title": f"{venue.venue_name} at {util:.0f}% capacity",
                    "description": (
                        f"'{session.session_title}' expects "
                        f"{session.expected_attendees} attendees in a venue "
                        f"with capacity {venue.capacity}."
                    ),
                    "recommendation": (
                        f"Move to {alt.venue_name} (capacity: {alt.capacity})"
                        if alt
                        else "No larger venue available — consider limiting registrations"
                    ),
                })

    # 2. Speaker conflicts (in-memory detected)
    for _, _, sp in ctx.speaker_conflicts:
        actions.append({
            "severity": "critical",
            "category": "speaker_conflict",
            "title": f"Speaker conflict: {sp.name if sp else 'Unknown'}",
            "description": (
                f"{sp.name if sp else 'Unknown'} is assigned to "
                f"overlapping sessions."
            ),
            "recommendation": (
                "Reschedule one of the conflicting sessions or "
                "assign an alternative speaker."
            ),
        })

    # 3. Open critical incidents (in-memory evaluation)
    critical_incidents = [
        inc for inc in ctx.incidents
        if (inc.priority or "").lower() == "critical"
        and (inc.status or "").lower() not in ("resolved", "closed")
    ]
    for inc in critical_incidents:
        actions.append({
            "severity": "critical",
            "category": "incident",
            "title": f"Critical incident: {inc.title}",
            "description": inc.description or "No description provided",
            "recommendation": (
                f"Escalate immediately. Current status: {inc.status}. "
                f"Location: {inc.location or 'Unknown'}."
            ),
        })

    # 4. Overdue sponsor deliverables (in-memory evaluation)
    today = date.today()
    for s in ctx.sponsors:
        end = _safe_date(s.end_date)
        if end and end < today:
            completed = s.deliverables_completed or 0
            total = s.deliverables_total or 0
            if total > 0 and completed < total:
                actions.append({
                    "severity": "medium",
                    "category": "sponsor",
                    "title": f"Overdue: {s.company_name}",
                    "description": (
                        f"Contract expired on {end}. "
                        f"Deliverables: {completed}/{total} completed."
                    ),
                    "recommendation": "Contact sponsor to complete outstanding deliverables.",
                })

    # 5. Unread critical alerts
    critical_alerts = ctx.critical_unread_alerts
    if critical_alerts:
        actions.append({
            "severity": "high",
            "category": "alerts",
            "title": f"{critical_alerts} unread critical alert(s)",
            "description": "Critical operational alerts require immediate review.",
            "recommendation": "Review alerts in the Operations Center.",
        })

    return actions


# ═══════════════════════════════════════════════════════════
#  TREND DATA  (for charts)
# ═══════════════════════════════════════════════════════════

def get_attendance_trend(db: DBSession) -> list[dict]:
    """Daily registration counts for the last 30 days."""
    cutoff = datetime.now() - timedelta(days=30)
    rows = (
        db.query(
            func.date(Attendee.registration_date).label("day"),
            func.count(Attendee.attendee_id).label("count"),
        )
        .filter(Attendee.registration_date >= cutoff)
        .group_by(func.date(Attendee.registration_date))
        .order_by(func.date(Attendee.registration_date))
        .all()
    )
    return [{"date": str(r.day), "registrations": r.count} for r in rows]


def get_checkin_trend(db: DBSession) -> list[dict]:
    """Daily check-in counts for the last 30 days."""
    cutoff = datetime.now() - timedelta(days=30)
    rows = (
        db.query(
            func.date(Attendee.checkin_time).label("day"),
            func.count(Attendee.attendee_id).label("count"),
        )
        .filter(Attendee.checkin_time.isnot(None))
        .filter(Attendee.checkin_time >= cutoff)
        .group_by(func.date(Attendee.checkin_time))
        .order_by(func.date(Attendee.checkin_time))
        .all()
    )
def get_incident_trend(db: DBSession) -> list[dict]:
    """Daily incident counts for the last 30 days."""
    cutoff = datetime.now() - timedelta(days=30)
    rows = (
        db.query(
            func.date(Incident.created_at).label("day"),
            func.count(Incident.incident_id).label("count"),
        )
        .filter(Incident.created_at >= cutoff)
        .group_by(func.date(Incident.created_at))
        .order_by(func.date(Incident.created_at))
        .all()
    )
    return [{"date": str(r.day), "incidents": r.count} for r in rows]


def get_venue_utilization_data(db: DBSession, ctx: EventContext | None = None) -> list[dict]:
    """Venue capacity utilization per scheduled session."""
    ctx = ctx or EventContext(db)
    results = []
    for sch in ctx.schedules:
        session = ctx.sessions_by_id.get(sch.session_id)
        venue = ctx.venues_by_id.get(sch.venue_id)
        if session and venue and venue.capacity:
            util = round((session.expected_attendees or 0) / venue.capacity * 100, 1)
            results.append({
                "venue": venue.venue_name,
                "session": session.session_title,
                "utilization": min(util, 100),
                "expected": session.expected_attendees or 0,
                "capacity": venue.capacity,
            })
    return results


def get_sponsor_performance_data(db: DBSession, ctx: EventContext | None = None) -> list[dict]:
    """Sponsor deliverable progress for executive view."""
    ctx = ctx or EventContext(db)
    results = []
    for s in ctx.sponsors:
        completed = s.deliverables_completed or 0
        total = s.deliverables_total or 0
        rate = round(completed / total * 100, 1) if total > 0 else 0
        results.append({
            "company": s.company_name,
            "package": s.package or "Standard",
            "amount": s.amount or 0,
            "completed": completed,
            "total": total,
            "fulfillment_rate": rate,
            "status": s.status or "Lead",
        })
    return results


# ═══════════════════════════════════════════════════════════
#  EXECUTIVE KPIS  (aggregated)
# ═══════════════════════════════════════════════════════════

def get_executive_kpis(db: DBSession, ctx: EventContext | None = None) -> dict[str, Any]:
    """Return top-level KPIs for the executive dashboard."""
    ctx = ctx or EventContext(db)
    total_attendees = ctx.total_attendees
    checked_in = ctx.checked_in_attendees
    attendance_rate = (
        round(checked_in / total_attendees * 100, 1)
        if total_attendees > 0 else 0
    )

    total_sessions = len(ctx.sessions)
    scheduled_sessions = len(ctx.schedules)

    speakers = ctx.speakers
    total_speakers = len(speakers)
    available_speakers = sum(1 for s in speakers if s.available)

    venues = ctx.venues
    total_venues = len(venues)
    available_venues = sum(1 for v in venues if v.available)

    incidents = ctx.incidents
    total_incidents_count = len(incidents)

    # Use EXACT definitions from incident_routes.py (Single Source of Truth)
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

    critical_incidents = sum(
        1 for i in incidents
        if (i.priority or "").lower() == "critical"
    )

    high_priority = sum(
        1 for i in incidents
        if (i.priority or "").lower() == "high"
    )

    escalated_count = sum(
        1 for i in incidents
        if (i.escalation_level and i.escalation_level > 0) or (i.status and i.status.lower() == "escalated")
    )

    unresolved_critical = sum(
        1 for i in incidents
        if (i.priority or "").lower() == "critical"
        and (i.status or "").lower() not in ("resolved", "closed")
    )

    sponsors = ctx.sponsors
    total_sponsors = len(sponsors)
    active_sponsors = sum(
        1 for s in sponsors
        if (s.status or "").lower() in ("active", "confirmed", "completed")
    )
    total_sponsorship = sum(s.amount or 0 for s in sponsors)

    # Sponsor ROI / deliverable fulfillment rate
    total_deliv = sum(s.deliverables_total or 0 for s in sponsors)
    comp_deliv = sum(s.deliverables_completed or 0 for s in sponsors)
    sponsor_roi_rate = (
        round(comp_deliv / total_deliv * 100, 1)
        if total_deliv > 0 else 0.0
    )

    # Scheduling conflicts count (in-memory detected)
    conflicts = ctx.total_conflicts_count
    unread_alerts = ctx.unread_alerts

    return {
        # Core Executive KPIs
        "registrations": total_attendees,
        "checkins": checked_in,
        "attendance_rate": attendance_rate,
        "sponsors": total_sponsors,
        "active_sponsors": active_sponsors,
        "open_incidents": open_incidents,
        "critical_incidents": critical_incidents,
        "unresolved_critical_incidents": unresolved_critical,
        "high_priority_incidents": high_priority,
        "in_progress_incidents": in_progress,
        "resolved_incidents": resolved_count,
        "closed_incidents": closed_count,
        "escalated_incidents": escalated_count,
        "total_incidents": total_incidents_count,
        "sponsor_roi": f"{sponsor_roi_rate}%",
        "sponsor_roi_rate": sponsor_roi_rate,
        "total_sponsorship": total_sponsorship,
        # Operational secondary KPIs
        "total_attendees": total_attendees,
        "checked_in": checked_in,
        "total_sessions": total_sessions,
        "scheduled_sessions": scheduled_sessions,
        "total_speakers": total_speakers,
        "available_speakers": available_speakers,
        "total_venues": total_venues,
        "available_venues": available_venues,
        "active_incidents": open_incidents,
        "scheduling_conflicts": conflicts,
        "total_sponsors": total_sponsors,
        "unread_alerts": unread_alerts,
    }


# ═══════════════════════════════════════════════════════════
#  HELPERS
# ═══════════════════════════════════════════════════════════

def _safe_date(val) -> date | None:
    """Normalize datetime / date / str → date, or None."""
    if val is None:
        return None
    if isinstance(val, datetime):
        return val.date()
    if isinstance(val, date):
        return val
    try:
        return datetime.fromisoformat(str(val)).date()
    except (ValueError, TypeError):
        return None
