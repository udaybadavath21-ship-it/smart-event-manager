from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime


class AttendeeCreate(BaseModel):
    # Personal Details
    name: str
    email: EmailStr

    phone: str = Field(
        ...,
        pattern=r"^\d{10}$",
        description="Phone number must contain exactly 10 digits"
    )

    organization: Optional[str] = None

    age: Optional[int] = Field(
        None,
        ge=18,
        le=100
    )

    gender: Optional[str] = None

    city: Optional[str] = None

    # Event Details
    event: Optional[str] = None

    ticket_type: Optional[str] = None

    # Emergency Contact
    emergency_contact_name: Optional[str] = None

    emergency_contact_number: Optional[str] = Field(
        None,
        pattern=r"^\d{10}$",
        description="Emergency phone number must contain exactly 10 digits"
    )

    relationship: Optional[str] = None

    # Accessibility
    disabled: Optional[bool] = False
    accessibility_type: Optional[str] = None


class AttendeeUpdate(BaseModel):
    name: str

    phone: Optional[str] = Field(
        None,
        pattern=r"^\d{10}$",
        description="Phone number must contain exactly 10 digits"
    )

    organization: Optional[str] = None
    age: Optional[int] = None
    gender: Optional[str] = None
    city: Optional[str] = None
    event: Optional[str] = None
    ticket_type: Optional[str] = None

    emergency_contact_name: Optional[str] = None

    emergency_contact_number: Optional[str] = Field(
        None,
        pattern=r"^\d{10}$",
        description="Emergency contact must contain exactly 10 digits"
    )

    relationship: Optional[str] = None

    disabled: Optional[bool] = False

    accessibility_type: Optional[str] = None

class QRScanRequest(BaseModel):
    event_id: str
    class VenueCreate(BaseModel):
     venue_name: str
     location: str
     capacity: int
     facilities: Optional[str] = None
     accessibility: bool = False
     available: bool = True
# =========================================================
# MILESTONE 2 - VENUE SCHEMAS
# =========================================================

class VenueCreate(BaseModel):
    venue_name: str
    location: str
    capacity: int
    facilities: Optional[str] = None
    accessibility: bool = False
    available: bool = True


class VenueUpdate(BaseModel):
    venue_name: str
    location: str
    capacity: int
    facilities: Optional[str] = None
    accessibility: bool = False
    available: bool = True

class VenueRecommendationRequest(BaseModel):
    expected_attendees: int
    required_facilities: list[str] = []
    accessibility_required: bool = False
# =========================================================
# MILESTONE 2 - SPEAKER SCHEMAS
# =========================================================

class SpeakerCreate(BaseModel):
    name: str
    email: EmailStr
    organization: Optional[str] = None
    expertise: Optional[str] = None
    experience_years: Optional[int] = None
    phone: Optional[str] = None
    city: Optional[str] = None
    available: bool = True


class SpeakerUpdate(BaseModel):
    name: str
    email: EmailStr
    organization: Optional[str] = None
    expertise: Optional[str] = None
    experience_years: Optional[int] = None
    phone: Optional[str] = None
    city: Optional[str] = None
    available: bool = True
# =========================================================
# MILESTONE 2 - SPEAKER AGENT
# =========================================================

class SpeakerRecommendationRequest(BaseModel):
    required_expertise: list[str] = []
    minimum_experience_years: int = 0
# =========================================================
# MILESTONE 2 - SESSION SCHEDULING
# =========================================================

class SessionCreate(BaseModel):
    event: str
    session_title: str
    session_type: Optional[str] = None
    description: Optional[str] = None
    expected_attendees: Optional[int] = None
    start_time: datetime
    end_time: datetime
    required_facilities: list[str] = []
    accessibility_required: bool = False


class ScheduleCreate(BaseModel):
    session_id: int
    venue_id: int
    speaker_id: int
    start_time: datetime
    end_time: datetime
    venue_match_score: Optional[int] = None

class ScheduleUpdate(BaseModel):
    session_id: int
    venue_id: int
    speaker_id: int
    start_time: datetime
    end_time: datetime
    venue_match_score: Optional[int] = None


# =========================================================
# SPONSOR SCHEMAS
# =========================================================

class SponsorCreate(BaseModel):
    company_name: str
    contact_person: Optional[str] = None
    email: str
    phone: Optional[str] = None
    category: Optional[str] = None
    package: Optional[str] = None
    amount: Optional[float] = 0.0
    event: Optional[str] = None
    status: Optional[str] = "Lead"
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    benefits: Optional[str] = None
    deliverables: Optional[str] = None
    deliverables_completed: Optional[int] = 0
    deliverables_total: Optional[int] = 0
    notes: Optional[str] = None


class SponsorUpdate(BaseModel):
    company_name: str
    contact_person: Optional[str] = None
    email: str
    phone: Optional[str] = None
    category: Optional[str] = None
    package: Optional[str] = None
    amount: Optional[float] = 0.0
    event: Optional[str] = None
    status: Optional[str] = "Lead"
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    benefits: Optional[str] = None
    deliverables: Optional[str] = None
    deliverables_completed: Optional[int] = 0
    deliverables_total: Optional[int] = 0
    notes: Optional[str] = None


class SponsorRecommendationRequest(BaseModel):
    event: Optional[str] = None
    category: Optional[str] = None
    budget_min: Optional[float] = 0
    budget_max: Optional[float] = 0
    package: Optional[str] = None


# =========================================================
# INCIDENT SCHEMAS
# =========================================================

class IncidentCreate(BaseModel):
    event: Optional[str] = None
    title: str
    description: Optional[str] = None
    category: Optional[str] = None
    location: Optional[str] = None
    reported_by: Optional[str] = None
    assigned_team: Optional[str] = None
    priority: Optional[str] = "Medium"
    severity: Optional[int] = 3
    priority_reason: Optional[str] = None
    notes: Optional[str] = None


class IncidentUpdate(BaseModel):
    event: Optional[str] = None
    title: str
    description: Optional[str] = None
    category: Optional[str] = None
    location: Optional[str] = None
    reported_by: Optional[str] = None
    assigned_team: Optional[str] = None
    priority: Optional[str] = "Medium"
    severity: Optional[int] = 3
    priority_reason: Optional[str] = None
    status: Optional[str] = None
    escalation_level: Optional[int] = None
    resolution: Optional[str] = None
    notes: Optional[str] = None


class IncidentPriorityRequest(BaseModel):
    category: str
    description: Optional[str] = None
    severity: Optional[int] = 3
    affected_people: Optional[int] = 0
    event: Optional[str] = None


class IncidentResolveRequest(BaseModel):
    resolution: Optional[str] = None