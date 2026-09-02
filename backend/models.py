from sqlalchemy import Column, Integer, String, Boolean, DateTime, TIMESTAMP, Float, Text, Date, func
from sqlalchemy.orm import declarative_base

Base = declarative_base()

class Attendee(Base):
    __tablename__ = "attendees"

    attendee_id = Column(Integer, primary_key=True, index=True)
    event_id = Column(String(20), unique=True, nullable=True)

    # Personal Details
    name = Column(String(100), nullable=False)
    email = Column(String(100), unique=True, nullable=False)
    phone = Column(String(15))
    organization = Column(String(100))
    age = Column(Integer)
    gender = Column(String(20))
    city = Column(String(50))

    # Event Details
    event = Column(String(100))
    ticket_type = Column(String(50))

    # Emergency Contact
    emergency_contact_name = Column(String(100))
    emergency_contact_number = Column(String(15))
    relationship = Column(String(50))

    # Accessibility
    disabled = Column(Boolean, default=False)
    accessibility_type = Column(String(100))

    # Registration
    registration_date = Column(
        TIMESTAMP,
        server_default=func.now(),
        nullable=False
    )

    checkin_status = Column(
        Boolean,
        default=False,
        nullable=False,
        index=True
    )

    checkin_time = Column(DateTime)
    # =========================================================
# MILESTONE 2 - VENUE MANAGEMENT
# =========================================================

class Venue(Base):
    __tablename__ = "venues"

    venue_id = Column(Integer, primary_key=True, index=True)

    venue_name = Column(String(100), nullable=False)
    location = Column(String(150), nullable=False)

    capacity = Column(Integer, nullable=False)

    # Example:
    # "Projector, WiFi, Audio, AC"
    facilities = Column(String(500))

    accessibility = Column(Boolean, default=False, nullable=False)

    available = Column(Boolean, default=True, nullable=False, index=True)

    created_at = Column(
        TIMESTAMP,
        server_default=func.now(),
        nullable=False
    )


# =========================================================
# MILESTONE 2 - SPEAKER MANAGEMENT
# =========================================================

class Speaker(Base):
    __tablename__ = "speakers"

    speaker_id = Column(Integer, primary_key=True, index=True)

    name = Column(String(100), nullable=False)
    email = Column(String(100), unique=True, nullable=False)

    organization = Column(String(100))

    # Example:
    # "Artificial Intelligence, Machine Learning"
    expertise = Column(String(500))

    experience_years = Column(Integer)

    phone = Column(String(15))

    city = Column(String(50))

    available = Column(Boolean, default=True, nullable=False, index=True)

    created_at = Column(
        TIMESTAMP,
        server_default=func.now(),
        nullable=False
    )


# =========================================================
# MILESTONE 2 - SESSIONS
# =========================================================

class Session(Base):
    __tablename__ = "sessions"

    session_id = Column(Integer, primary_key=True, index=True)

    event = Column(String(100), nullable=False)

    session_title = Column(String(200), nullable=False)

    session_type = Column(String(50))

    description = Column(String(500))

    expected_attendees = Column(Integer)

    start_time = Column(DateTime, nullable=False)
    end_time = Column(DateTime, nullable=False)

    # Required venue facilities
    required_facilities = Column(String(500))

    accessibility_required = Column(
        Boolean,
        default=False,
        nullable=False
    )

    created_at = Column(
        TIMESTAMP,
        server_default=func.now(),
        nullable=False
    )


# =========================================================
# MILESTONE 2 - SESSION SCHEDULE
# =========================================================

class SessionSchedule(Base):
    __tablename__ = "session_schedules"

    schedule_id = Column(Integer, primary_key=True, index=True)

    session_id = Column(Integer, nullable=False)

    venue_id = Column(Integer, nullable=False)

    speaker_id = Column(Integer, nullable=False)

    start_time = Column(DateTime, nullable=False)

    end_time = Column(DateTime, nullable=False)

    # AI-generated matching score
    venue_match_score = Column(Integer)

    created_at = Column(
        TIMESTAMP,
        server_default=func.now(),
        nullable=False
    )


# =========================================================
# SPONSOR MANAGEMENT
# =========================================================

class Sponsor(Base):
    __tablename__ = "sponsors"

    sponsor_id = Column(Integer, primary_key=True, index=True)

    company_name = Column(String(150), nullable=False)
    contact_person = Column(String(100))
    email = Column(String(100), nullable=False)
    phone = Column(String(15))

    category = Column(String(100))

    package = Column(String(50))

    amount = Column(Float, default=0.0)

    event = Column(String(100))

    status = Column(String(50), default="Lead", index=True)

    start_date = Column(Date)
    end_date = Column(Date)

    benefits = Column(Text)
    deliverables = Column(Text)
    deliverables_completed = Column(Integer, default=0)
    deliverables_total = Column(Integer, default=0)

    notes = Column(Text)

    created_at = Column(
        TIMESTAMP,
        server_default=func.now(),
        nullable=False
    )


# =========================================================
# INCIDENT MANAGEMENT
# =========================================================

class Incident(Base):
    __tablename__ = "incidents"

    incident_id = Column(Integer, primary_key=True, index=True)

    event = Column(String(100))

    title = Column(String(200), nullable=False)
    description = Column(Text)

    category = Column(String(100))

    location = Column(String(150))
    reported_by = Column(String(100))
    assigned_team = Column(String(100))

    priority = Column(String(50), default="Medium", index=True)

    severity = Column(String(20), default="3")
    priority_reason = Column(Text)
    status = Column(String(50), default="Reported", index=True)

    escalation_level = Column(Integer, default=0)

    created_at = Column(
        TIMESTAMP,
        server_default=func.now(),
        nullable=False
    )
    updated_at = Column(DateTime)
    resolved_time = Column(DateTime)

    resolution = Column(Text)
    notes = Column(Text)


# =========================================================
# OPERATIONAL ALERTS
# =========================================================

class OperationalAlert(Base):
    __tablename__ = "operational_alerts"

    alert_id = Column(Integer, primary_key=True, index=True)

    # Type: incident, escalation, sponsor_deadline, sponsor_overdue, venue_conflict, speaker_conflict, operational
    alert_type = Column(String(50), nullable=False)

    # Priority: Low, Medium, High, Critical
    priority = Column(String(50), default="Medium")

    message = Column(Text, nullable=False)

    related_event = Column(String(100))

    related_incident_id = Column(Integer)
    related_sponsor_id = Column(Integer)

    is_read = Column(Boolean, default=False, nullable=False, index=True)

    created_at = Column(
        TIMESTAMP,
        server_default=func.now(),
        nullable=False
    )