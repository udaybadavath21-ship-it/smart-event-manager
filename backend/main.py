import os
import smtplib

from dotenv import load_dotenv
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

load_dotenv("../.env")
from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session
from fastapi.middleware.cors import CORSMiddleware
from email_service import send_registration_email
from qr_utils import generate_qr
from auth import router as auth_router
from security import verify_token
from fastapi import UploadFile, File
import pandas as pd
from models import (
    Base,
    Attendee,
    Venue,
    Speaker,
    Session,
    SessionSchedule
)
from schemas import (
    AttendeeCreate,
    AttendeeUpdate,
    QRScanRequest,
    VenueCreate,
    VenueUpdate,
    VenueRecommendationRequest,
    SpeakerCreate,
    SpeakerUpdate,
    SpeakerRecommendationRequest,
    SessionCreate,
    ScheduleCreate,
    ScheduleUpdate,
)
from database import engine, get_db
from datetime import datetime

app = FastAPI()
app.include_router(auth_router)

# New feature routers
from sponsor_routes import router as sponsor_router
from incident_routes import router as incident_router
from alert_routes import router as alert_router
from operations_routes import router as operations_router
from m4_routes import router as m4_router
from config import CORS_ORIGINS

app.include_router(sponsor_router)
app.include_router(incident_router)
app.include_router(alert_router)
app.include_router(operations_router)
app.include_router(m4_router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

Base.metadata.create_all(bind=engine)

@app.get("/")
def home():
    return {"message": "Connected to MySQL successfully!"}

def normalize(value):
    if value is None:
        return None

    value = value.strip().lower()

    return value.title()


def normalize_ticket(ticket):
    if ticket is None:
        return None

    ticket = ticket.strip().lower()

    if ticket == "vip":
        return "VIP"

    return ticket.title()
def send_schedule_email(
    speaker_email,
    speaker_name,
    session_title,
    venue_name,
    start_time,
    end_time,
    email_type="update"
):
    sender_email = os.getenv("EMAIL_USER")
    sender_password = os.getenv("EMAIL_PASSWORD")

    message = MIMEMultipart()

    message["From"] = sender_email
    message["To"] = speaker_email

    if email_type == "reminder":
        message["Subject"] = "Session Reminder"
        
        body = f"""
Hello {speaker_name},

This is a reminder about your upcoming session.

Session: {session_title}
Venue: {venue_name}
Start Time: {start_time}
End Time: {end_time}

Please be available at the scheduled time.

Thank you,
Event Management Team
"""
    else:
        message["Subject"] = "Session Schedule Update"

        body = f"""
Hello {speaker_name},

Your session has been scheduled/updated.

Session: {session_title}
Venue: {venue_name}
Start Time: {start_time}
End Time: {end_time}

Please be available at the scheduled time.

Thank you,
Event Management Team
"""

    message.attach(
        MIMEText(body, "plain")
    )

    with smtplib.SMTP(
        "smtp.gmail.com",
        587
    ) as server:

        server.starttls()

        server.login(
            sender_email,
            sender_password
        )

        server.send_message(message)
@app.post("/register")
def register_attendee(attendee: AttendeeCreate, db: Session = Depends(get_db)):

    existing_attendee = db.query(Attendee).filter(
        Attendee.email == attendee.email
    ).first()

    if existing_attendee:
        raise HTTPException(
            status_code=400,
            detail="Email is already registered."
        )

    new_attendee = Attendee(
        
    name=attendee.name.strip().title(),

    email=attendee.email.strip().lower(),

    phone=attendee.phone,

    organization=normalize(attendee.organization),

    age=attendee.age,

    gender=normalize(attendee.gender),

    city=normalize(attendee.city),

    event=normalize(attendee.event),

    ticket_type=normalize_ticket(attendee.ticket_type),

    emergency_contact_name=normalize(
        attendee.emergency_contact_name
    ),

    emergency_contact_number=attendee.emergency_contact_number,

    relationship=normalize(
        attendee.relationship
    ),

    disabled=attendee.disabled,
    accessibility_type=attendee.accessibility_type,
)

    db.add(new_attendee)
    db.commit()
    db.refresh(new_attendee)
    new_attendee.event_id = f"SEM-2026-{new_attendee.attendee_id:04d}"

    db.commit()
    db.refresh(new_attendee)
    qr_path = generate_qr(new_attendee.event_id)
    print("Returned path:", qr_path)
    send_registration_email(
    new_attendee.email,
    new_attendee.name,
    new_attendee.event_id,
    new_attendee.ticket_type,
    qr_path
)

    return {
    "message": "Registration successful!",
    "attendee_id": new_attendee.attendee_id,
    "event_id": new_attendee.event_id
}
@app.get("/attendees")
def get_all_attendees(
    db: Session = Depends(get_db),
    user: str = Depends(verify_token),
):
    attendees = db.query(Attendee).all()
    return attendees
@app.get("/attendee/{attendee_id}")
def get_attendee(attendee_id: int, db: Session = Depends(get_db)):

    attendee = db.query(Attendee).filter(
        Attendee.attendee_id == attendee_id
    ).first()

    if attendee is None:
        raise HTTPException(
            status_code=404,
            detail="Attendee not found."
        )

    return attendee
@app.put("/attendee/{attendee_id}")
def update_attendee(
    attendee_id: int,
    updated_data: AttendeeUpdate,
    db: Session = Depends(get_db),
    user: str = Depends(verify_token),
):
    attendee = db.query(Attendee).filter(
        Attendee.attendee_id == attendee_id
    ).first()

    if attendee is None:
        raise HTTPException(
            status_code=404,
            detail="Attendee not found."
        )

    attendee.name = updated_data.name
    attendee.phone = updated_data.phone
    attendee.organization = updated_data.organization
    attendee.age = updated_data.age

    attendee.gender = (
        normalize(updated_data.gender)
        if updated_data.gender
        else None
    )

    attendee.city = (
        normalize(updated_data.city)
        if updated_data.city
        else None
    )

    attendee.event = (
        normalize(updated_data.event)
        if updated_data.event
        else None
    )

    attendee.ticket_type = (
        normalize_ticket(updated_data.ticket_type)
        if updated_data.ticket_type
        else None
    )

    attendee.emergency_contact_name = (
        normalize(updated_data.emergency_contact_name)
        if updated_data.emergency_contact_name
        else None
    )

    attendee.emergency_contact_number = (
        updated_data.emergency_contact_number
    )

    attendee.relationship = (
        normalize(updated_data.relationship)
        if updated_data.relationship
        else None
    )

    attendee.disabled = (
        updated_data.disabled
        if updated_data.disabled is not None
        else False
    )

    attendee.accessibility_type = (
        updated_data.accessibility_type
    )

    db.commit()
    db.refresh(attendee)

    return {
        "message": "Attendee updated successfully!",
        "attendee": attendee
    }
@app.delete("/attendee/{attendee_id}")
def delete_attendee(
    attendee_id: int,
    db: Session = Depends(get_db),
    user: str = Depends(verify_token),
):

    attendee = db.query(Attendee).filter(
        Attendee.attendee_id == attendee_id
    ).first()

    if attendee is None:
        raise HTTPException(
            status_code=404,
            detail="Attendee not found."
        )

    db.delete(attendee)
    db.commit()

    return {
        "message": "Attendee deleted successfully!"
    }
@app.put("/checkin/{id}")
def checkin_attendee(
    id: int,
    db: Session = Depends(get_db),
    user: str = Depends(verify_token),
):
    attendee = db.query(Attendee).filter(
        Attendee.attendee_id == id
    ).first()

    if not attendee:
        raise HTTPException(
            status_code=404,
            detail="Attendee not found"
        )

    if attendee.checkin_status:
        raise HTTPException(
            status_code=400,
            detail="Attendee is already checked in."
        )

    attendee.checkin_status = True
    attendee.checkin_time = datetime.now()

    db.commit()
    db.refresh(attendee)

    return {
        "message": "Check-in successful",
        "attendee": attendee
    }
@app.post("/scan-qr")
def scan_qr(data: QRScanRequest, db: Session = Depends(get_db)):

    attendee = db.query(Attendee).filter(
        Attendee.event_id == data.event_id
    ).first()

    if not attendee:
        raise HTTPException(
            status_code=404,
            detail="Attendee not found."
        )

    return {
        "attendee_id": attendee.attendee_id,
        "event_id": attendee.event_id,
        "name": attendee.name,
        "email": attendee.email,
        "city": attendee.city,
        "ticket_type": attendee.ticket_type,
        "checkin_status": attendee.checkin_status,
    }
@app.put("/undo-checkin/{id}")
def undo_checkin(
    id: int,
    db: Session = Depends(get_db),
    user: str = Depends(verify_token),
):

    attendee = db.query(Attendee).filter(
        Attendee.attendee_id == id
    ).first()

    if not attendee:
        raise HTTPException(
            status_code=404,
            detail="Attendee not found."
        )

    attendee.checkin_status = False
    attendee.checkin_time = None

    db.commit()
    db.refresh(attendee)

    return {
        "message": "Check-in has been undone successfully.",
        "attendee": attendee
    }
# =========================================================
# MILESTONE 2 - VENUE MANAGEMENT
# =========================================================

@app.post("/venues")
def create_venue(
    venue_data: VenueCreate,
    db: Session = Depends(get_db),
    user: str = Depends(verify_token),
):
    existing = db.query(Venue).filter(
        Venue.venue_name == venue_data.venue_name
    ).first()

    if existing:
        raise HTTPException(
            status_code=400,
            detail="Venue already exists."
        )

    venue = Venue(
        venue_name=venue_data.venue_name.strip(),
        location=venue_data.location.strip(),
        capacity=venue_data.capacity,
        facilities=venue_data.facilities,
        accessibility=venue_data.accessibility,
        available=venue_data.available,
    )

    db.add(venue)
    db.commit()
    db.refresh(venue)

    return {
        "message": "Venue created successfully!",
        "venue": venue
    }


@app.get("/venues")
def get_venues(
    db: Session = Depends(get_db),
    user: str = Depends(verify_token),
):
    return db.query(Venue).all()


@app.get("/venue/{venue_id}")
def get_venue(
    venue_id: int,
    db: Session = Depends(get_db),
    user: str = Depends(verify_token),
):
    venue = db.query(Venue).filter(
        Venue.venue_id == venue_id
    ).first()

    if not venue:
        raise HTTPException(
            status_code=404,
            detail="Venue not found."
        )

    return venue


@app.put("/venue/{venue_id}")
def update_venue(
    venue_id: int,
    venue_data: VenueUpdate,
    db: Session = Depends(get_db),
    user: str = Depends(verify_token),
):
    venue = db.query(Venue).filter(
        Venue.venue_id == venue_id
    ).first()

    if not venue:
        raise HTTPException(
            status_code=404,
            detail="Venue not found."
        )

    venue.venue_name = venue_data.venue_name.strip()
    venue.location = venue_data.location.strip()
    venue.capacity = venue_data.capacity
    venue.facilities = venue_data.facilities
    venue.accessibility = venue_data.accessibility
    venue.available = venue_data.available

    db.commit()
    db.refresh(venue)

    return {
        "message": "Venue updated successfully!",
        "venue": venue
    }


@app.delete("/venue/{venue_id}")
def delete_venue(
    venue_id: int,
    db: Session = Depends(get_db),
    user: str = Depends(verify_token),
):
    venue = db.query(Venue).filter(
        Venue.venue_id == venue_id
    ).first()

    if not venue:
        raise HTTPException(
            status_code=404,
            detail="Venue not found."
        )

    db.delete(venue)
    db.commit()

    return {
        "message": "Venue deleted successfully!"
    }
# =========================================================
#  VENUE AGENT
# =========================================================

@app.post("/venue-agent/recommend")
def recommend_venue(
    requirements: VenueRecommendationRequest,
    db: Session = Depends(get_db),
    user: str = Depends(verify_token),
):
    venues = db.query(Venue).filter(
        Venue.available == True
    ).all()

    if not venues:
        raise HTTPException(
            status_code=404,
            detail="No available venues found."
        )

    recommendations = []

    required_facilities = {
        facility.strip().lower()
        for facility in requirements.required_facilities
    }

    for venue in venues:

        score = 0
        checks = {}

         # -------------------------------------------------
        # 1. Capacity Efficiency
        # -------------------------------------------------

        if venue.capacity >= requirements.expected_attendees:

            utilization = (
                requirements.expected_attendees / venue.capacity
            ) * 100

            # Prefer venues that are appropriately sized
            if utilization >= 70:
                capacity_score = 30
            elif utilization >= 50:
                capacity_score = 28
            elif utilization >= 30:
                capacity_score = 24
            elif utilization >= 20:
                capacity_score = 18
            else:
                capacity_score = 10

            checks["capacity"] = True
            checks["capacity_utilization"] = round(
                utilization, 2
            )

        else:
            capacity_score = 0
            checks["capacity"] = False
            checks["capacity_utilization"] = 0

        score += capacity_score

        # -------------------------------------------------
        # 2. Facilities
        # -------------------------------------------------

        venue_facilities = {
            facility.strip().lower()
            for facility in (venue.facilities or "").split(",")
            if facility.strip()
        }

        if required_facilities:
            matched_facilities = (
                required_facilities & venue_facilities
            )

            facility_score = int(
                30 * (
                    len(matched_facilities)
                    / len(required_facilities)
                )
            )

            checks["facilities"] = (
                matched_facilities == required_facilities
            )
        else:
            facility_score = 30
            matched_facilities = set()
            checks["facilities"] = True

        score += facility_score

        # -------------------------------------------------
        # 3. Accessibility
        # -------------------------------------------------

        if requirements.accessibility_required:

            if venue.accessibility:
                accessibility_score = 20
                checks["accessibility"] = True
            else:
                accessibility_score = 0
                checks["accessibility"] = False

        else:
            accessibility_score = 20
            checks["accessibility"] = True

        score += accessibility_score

        # -------------------------------------------------
        # 4. Availability
        # -------------------------------------------------

        score += 20
        checks["availability"] = True

        # -------------------------------------------------
        # Recommendation
        # -------------------------------------------------

        recommendations.append({
            "venue_id": venue.venue_id,
            "venue_name": venue.venue_name,
            "location": venue.location,
            "capacity": venue.capacity,
            "facilities": venue.facilities,
            "accessibility": venue.accessibility,
            "available": venue.available,
            "match_score": score,
            "checks": checks,
        })

    # Highest score first
    recommendations.sort(
        key=lambda x: x["match_score"],
        reverse=True
    )

    return {
        "message": "Venue recommendations generated successfully.",
        "requirements": {
            "expected_attendees":
                requirements.expected_attendees,
            "required_facilities":
                requirements.required_facilities,
            "accessibility_required":
                requirements.accessibility_required,
        },
        "best_venue": recommendations[0],
        "alternatives": recommendations[1:],
    }
@app.post("/venue-agent/room-suggestion")
def room_suggestion(
    expected_attendees: int,
    current_venue_id: int,
    db: Session = Depends(get_db),
    user: str = Depends(verify_token),
):
    current_venue = db.query(Venue).filter(
        Venue.venue_id == current_venue_id
    ).first()

    if not current_venue:
        raise HTTPException(
            status_code=404,
            detail="Venue not found."
        )

    # Upgrade
    if expected_attendees > current_venue.capacity:
        better_venues = db.query(Venue).filter(
            Venue.available == True,
            Venue.capacity >= expected_attendees,
            Venue.venue_id != current_venue_id
        ).order_by(Venue.capacity.asc()).all()

        if better_venues:
            venue = better_venues[0]

            return {
                "recommendation": "UPGRADE",
                "message": (
                    f"Upgrade recommended. "
                    f"Current venue capacity is {current_venue.capacity}, "
                    f"but {expected_attendees} attendees are expected."
                ),
                "current_venue": current_venue.venue_name,
                "current_capacity": current_venue.capacity,
                "expected_attendees": expected_attendees,
                "suggested_venue": {
                    "venue_id": venue.venue_id,
                    "venue_name": venue.venue_name,
                    "capacity": venue.capacity,
                    "facilities": venue.facilities,
                }
            }

        return {
            "recommendation": "UPGRADE_REQUIRED",
            "message": "A larger venue is required, but no suitable venue is currently available.",
            "current_venue": current_venue.venue_name,
            "current_capacity": current_venue.capacity,
            "expected_attendees": expected_attendees,
            "suggested_venue": None
        }

    # Downgrade
    utilization = (
        expected_attendees / current_venue.capacity
    ) * 100

    if utilization < 30:
        smaller_venues = db.query(Venue).filter(
            Venue.available == True,
            Venue.capacity >= expected_attendees,
            Venue.capacity < current_venue.capacity
        ).order_by(Venue.capacity.asc()).all()

        if smaller_venues:
            venue = smaller_venues[0]

            return {
                "recommendation": "DOWNGRADE",
                "message": (
                    f"Downgrade recommended. "
                    f"Current venue utilization is {round(utilization, 2)}%."
                ),
                "current_venue": current_venue.venue_name,
                "current_capacity": current_venue.capacity,
                "expected_attendees": expected_attendees,
                "utilization_percent": round(utilization, 2),
                "suggested_venue": {
                    "venue_id": venue.venue_id,
                    "venue_name": venue.venue_name,
                    "capacity": venue.capacity,
                    "facilities": venue.facilities,
                }
            }

    # Suitable
    return {
        "recommendation": "KEEP",
        "message": "Current venue is suitable for the expected attendance.",
        "current_venue": current_venue.venue_name,
        "current_capacity": current_venue.capacity,
        "expected_attendees": expected_attendees,
        "utilization_percent": round(utilization, 2),
        "suggested_venue": None
    }
# =========================================================
#  SPEAKER MANAGEMENT
# =========================================================

@app.post("/speakers")
def create_speaker(
    speaker_data: SpeakerCreate,
    db: Session = Depends(get_db),
    user: str = Depends(verify_token),
):
    existing = db.query(Speaker).filter(
        Speaker.email == speaker_data.email
    ).first()

    if existing:
        raise HTTPException(
            status_code=400,
            detail="Speaker with this email already exists."
        )

    speaker = Speaker(
        name=speaker_data.name.strip(),
        email=speaker_data.email,
        organization=speaker_data.organization,
        expertise=speaker_data.expertise,
        experience_years=speaker_data.experience_years,
        phone=speaker_data.phone,
        city=speaker_data.city,
        available=speaker_data.available,
    )

    db.add(speaker)
    db.commit()
    db.refresh(speaker)

    return {
        "message": "Speaker created successfully!",
        "speaker": speaker
    }


@app.get("/speakers")
def get_speakers(
    db: Session = Depends(get_db),
    user: str = Depends(verify_token),
):
    return db.query(Speaker).all()


@app.get("/speaker/{speaker_id}")
def get_speaker(
    speaker_id: int,
    db: Session = Depends(get_db),
    user: str = Depends(verify_token),
):
    speaker = db.query(Speaker).filter(
        Speaker.speaker_id == speaker_id
    ).first()

    if not speaker:
        raise HTTPException(
            status_code=404,
            detail="Speaker not found."
        )

    return speaker


@app.put("/speaker/{speaker_id}")
def update_speaker(
    speaker_id: int,
    speaker_data: SpeakerUpdate,
    db: Session = Depends(get_db),
    user: str = Depends(verify_token),
):
    speaker = db.query(Speaker).filter(
        Speaker.speaker_id == speaker_id
    ).first()

    if not speaker:
        raise HTTPException(
            status_code=404,
            detail="Speaker not found."
        )

    speaker.name = speaker_data.name.strip()
    speaker.email = speaker_data.email
    speaker.organization = speaker_data.organization
    speaker.expertise = speaker_data.expertise
    speaker.experience_years = speaker_data.experience_years
    speaker.phone = speaker_data.phone
    speaker.city = speaker_data.city
    speaker.available = speaker_data.available

    db.commit()
    db.refresh(speaker)

    return {
        "message": "Speaker updated successfully!",
        "speaker": speaker
    }


@app.delete("/speaker/{speaker_id}")
def delete_speaker(
    speaker_id: int,
    db: Session = Depends(get_db),
    user: str = Depends(verify_token),
):
    speaker = db.query(Speaker).filter(
        Speaker.speaker_id == speaker_id
    ).first()

    if not speaker:
        raise HTTPException(
            status_code=404,
            detail="Speaker not found."
        )

    db.delete(speaker)
    db.commit()

    return {
        "message": "Speaker deleted successfully!"
    }
# =========================================================
#  SPEAKER AGENT
# =========================================================

@app.post("/speaker-agent/recommend")
def recommend_speaker(
    requirements: SpeakerRecommendationRequest,
    db: Session = Depends(get_db),
    user: str = Depends(verify_token),
):
    speakers = db.query(Speaker).filter(
        Speaker.available == True
    ).all()

    if not speakers:
        raise HTTPException(
            status_code=404,
            detail="No available speakers found."
        )

    required_expertise = {
        item.strip().lower()
        for item in requirements.required_expertise
        if item.strip()
    }

    recommendations = []

    for speaker in speakers:

        score = 0
        checks = {}

        # -------------------------------------------------
        # 1. Expertise - 50 points
        # -------------------------------------------------

        speaker_expertise = {
            item.strip().lower()
            for item in (speaker.expertise or "").split(",")
            if item.strip()
        }

        if required_expertise:
            matched_expertise = (
                required_expertise & speaker_expertise
            )

            expertise_score = int(
                50 * (
                    len(matched_expertise)
                    / len(required_expertise)
                )
            )

            checks["expertise"] = (
                matched_expertise == required_expertise
            )
        else:
            expertise_score = 50
            matched_expertise = set()
            checks["expertise"] = True

        score += expertise_score

        # -------------------------------------------------
        # 2. Experience - 30 points
        # -------------------------------------------------

        experience = speaker.experience_years or 0

        minimum_experience = (
            requirements.minimum_experience_years
        )

        if minimum_experience <= 0:
            experience_score = 30
            checks["experience"] = True

        elif experience >= minimum_experience:
            experience_score = 30
            checks["experience"] = True

        else:
            experience_score = int(
                30 * (
                    experience /
                    minimum_experience
                )
            )

            experience_score = max(
                0,
                min(30, experience_score)
            )

            checks["experience"] = False

        score += experience_score

        # -------------------------------------------------
        # 3. Availability - 20 points
        # -------------------------------------------------

        score += 20
        checks["availability"] = True

        recommendations.append({
            "speaker_id": speaker.speaker_id,
            "name": speaker.name,
            "email": speaker.email,
            "organization": speaker.organization,
            "expertise": speaker.expertise,
            "experience_years": speaker.experience_years,
            "phone": speaker.phone,
            "city": speaker.city,
            "available": speaker.available,
            "match_score": score,
            "checks": checks,
        })

    # Highest score first
    recommendations.sort(
        key=lambda x: x["match_score"],
        reverse=True
    )

    return {
        "message": "Speaker recommendations generated successfully.",
        "requirements": {
            "required_expertise":
                requirements.required_expertise,
            "minimum_experience_years":
                requirements.minimum_experience_years,
        },
        "best_speaker": recommendations[0],
        "alternatives": recommendations[1:],
    }
# =========================================================
# SESSION MANAGEMENT
# =========================================================

@app.post("/sessions")
def create_session(
    session_data: SessionCreate,
    db: Session = Depends(get_db),
    user: str = Depends(verify_token),
):
    if session_data.end_time <= session_data.start_time:
        raise HTTPException(
            status_code=400,
            detail="End time must be after start time."
        )

    new_session = Session(
        event=session_data.event,
        session_title=session_data.session_title,
        session_type=session_data.session_type,
        description=session_data.description,
        expected_attendees=session_data.expected_attendees,
        start_time=session_data.start_time,
        end_time=session_data.end_time,
        required_facilities=", ".join(
            session_data.required_facilities
        ),
        accessibility_required=session_data.accessibility_required,
    )

    db.add(new_session)
    db.commit()
    db.refresh(new_session)

    return {
        "message": "Session created successfully!",
        "session": new_session
    }
@app.get("/sessions")
def get_sessions(
    db: Session = Depends(get_db),
    user: str = Depends(verify_token),
):
    return db.query(Session).all()
# =========================================================
# SPEAKER & VENUE SCHEDULING
# =========================================================
def calculate_venue_match_score(session, venue):
    score = 0

    # 1. Capacity
    capacity_ok = (
        session.expected_attendees is None
        or venue.capacity >= session.expected_attendees
    )

    # 2. Facilities
    facility_ok = True

    if session.required_facilities:
        required = [
            item.strip().lower()
            for item in session.required_facilities.split(",")
            if item.strip()
        ]

        available = [
            item.strip().lower()
            for item in venue.facilities.split(",")
        ] if venue.facilities else []

        facility_ok = all(
            req in available
            for req in required
        )

    # 3. Accessibility
    accessibility_ok = (
        not session.accessibility_required
        or venue.accessibility
    )

    # 4. Availability
    availability_ok = venue.available

    # 25 points for each successful check
    if capacity_ok:
        score += 25

    if facility_ok:
        score += 25

    if accessibility_ok:
        score += 25

    if availability_ok:
        score += 25

    return score
@app.post("/schedule")
def create_schedule(
    schedule_data: ScheduleCreate,
    db: Session = Depends(get_db),
    user: str = Depends(verify_token),
):

    # -----------------------------------------------------
    # 1. Check session
    # -----------------------------------------------------

    session = db.query(Session).filter(
        Session.session_id == schedule_data.session_id
    ).first()

    if not session:
        raise HTTPException(
            status_code=404,
            detail="Session not found."
        )
    # -----------------------------------------------------
# Check if session is already scheduled
# -----------------------------------------------------

    existing_schedule = db.query(SessionSchedule).filter(
    SessionSchedule.session_id == schedule_data.session_id
).first()

    if existing_schedule:
     raise HTTPException(
        status_code=409,
        detail="This session is already scheduled."
    )

    # -----------------------------------------------------
    # 2. Validate time
    # -----------------------------------------------------

    if schedule_data.end_time <= schedule_data.start_time:
        raise HTTPException(
            status_code=400,
            detail="End time must be after start time."
        )

    # -----------------------------------------------------
    # 3. Check speaker
    # -----------------------------------------------------

    speaker = db.query(Speaker).filter(
        Speaker.speaker_id == schedule_data.speaker_id
    ).first()

    if not speaker:
        raise HTTPException(
            status_code=404,
            detail="Speaker not found."
        )

    if not speaker.available:
        raise HTTPException(
            status_code=400,
            detail="Speaker is currently unavailable."
        )

    # -----------------------------------------------------
    # 4. Check venue
    # -----------------------------------------------------

    venue = db.query(Venue).filter(
        Venue.venue_id == schedule_data.venue_id
    ).first()

    if not venue:
        raise HTTPException(
            status_code=404,
            detail="Venue not found."
        )

    if not venue.available:
        raise HTTPException(
            status_code=400,
            detail="Venue is currently unavailable."
        )

    # -----------------------------------------------------
    # 5. Check speaker scheduling conflict
    # -----------------------------------------------------

    speaker_conflict = db.query(SessionSchedule).filter(
        SessionSchedule.speaker_id ==
        schedule_data.speaker_id,

        SessionSchedule.start_time <
        schedule_data.end_time,

        SessionSchedule.end_time >
        schedule_data.start_time
    ).first()

    if speaker_conflict:
        raise HTTPException(
            status_code=409,
            detail=(
                "Speaker scheduling conflict. "
                "This speaker already has another "
                "session during this time."
            )
        )

    # -----------------------------------------------------
    # 6. Check venue scheduling conflict
    # -----------------------------------------------------

    venue_conflict = db.query(SessionSchedule).filter(
        SessionSchedule.venue_id ==
        schedule_data.venue_id,

        SessionSchedule.start_time <
        schedule_data.end_time,

        SessionSchedule.end_time >
        schedule_data.start_time
    ).first()

    if venue_conflict:
        raise HTTPException(
            status_code=409,
            detail=(
                "Venue scheduling conflict. "
                "This venue is already booked during "
                "this time."
            )
        )

    # -----------------------------------------------------
    # 7. Create schedule
    # -----------------------------------------------------

    venue_match_score = calculate_venue_match_score(
    session,
    venue
 )

    new_schedule = SessionSchedule(
         session_id=schedule_data.session_id,
            venue_id=schedule_data.venue_id,
            speaker_id=schedule_data.speaker_id,
             start_time=schedule_data.start_time,
            end_time=schedule_data.end_time,
             venue_match_score=venue_match_score,
 )

    db.add(new_schedule)
    db.commit()
    db.refresh(new_schedule)
    send_schedule_email(
    speaker.email,
    speaker.name,
    session.session_title,
    venue.venue_name,
    new_schedule.start_time,
    new_schedule.end_time
)

    return {
        "message": "Session scheduled successfully!",
        "schedule": new_schedule,
        "speaker": {
            "speaker_id": speaker.speaker_id,
            "name": speaker.name,
        },
        "venue": {
            "venue_id": venue.venue_id,
            "venue_name": venue.venue_name,
        },
        "session": {
            "session_id": session.session_id,
            "session_title": session.session_title,
        }
    }
@app.post("/schedule/{schedule_id}/reminder")
def send_schedule_reminder(
    schedule_id: int,
    db: Session = Depends(get_db),
    user: str = Depends(verify_token),
):
    schedule = db.query(SessionSchedule).filter(
        SessionSchedule.schedule_id == schedule_id
    ).first()

    if not schedule:
        raise HTTPException(
            status_code=404,
            detail="Schedule not found."
        )

    session = db.query(Session).filter(
        Session.session_id == schedule.session_id
    ).first()

    speaker = db.query(Speaker).filter(
        Speaker.speaker_id == schedule.speaker_id
    ).first()

    venue = db.query(Venue).filter(
        Venue.venue_id == schedule.venue_id
    ).first()

    if not session or not speaker or not venue:
        raise HTTPException(
            status_code=404,
            detail="Schedule information is incomplete."
        )

    send_schedule_email(
        speaker.email,
        speaker.name,
        session.session_title,
        venue.venue_name,
        schedule.start_time,
        schedule.end_time,
        "reminder"
    )

    return {
        "message": "Schedule reminder sent successfully!",
        "schedule_id": schedule.schedule_id,
        "speaker": speaker.name,
        "email": speaker.email,
        "session": session.session_title,
        "venue": venue.venue_name,
        "start_time": schedule.start_time,
        "end_time": schedule.end_time,
    }
@app.put("/schedule/{schedule_id}")
def update_schedule(
     schedule_id: int,
     schedule_data: ScheduleUpdate,
     db: Session = Depends(get_db),
     user: str = Depends(verify_token),
):

    # -----------------------------------------------------
    # 1. Find existing schedule
    # -----------------------------------------------------

    schedule = db.query(SessionSchedule).filter(
        SessionSchedule.schedule_id == schedule_id
    ).first()

    if not schedule:
        raise HTTPException(
            status_code=404,
            detail="Schedule not found."
        )

    # -----------------------------------------------------
    # 2. Check session
    # -----------------------------------------------------

    session = db.query(Session).filter(
        Session.session_id == schedule_data.session_id
    ).first()

    if not session:
        raise HTTPException(
            status_code=404,
            detail="Session not found."
        )

    # -----------------------------------------------------
    # 3. Validate time
    # -----------------------------------------------------

    if schedule_data.end_time <= schedule_data.start_time:
        raise HTTPException(
            status_code=400,
            detail="End time must be after start time."
        )

    # -----------------------------------------------------
    # 4. Check speaker
    # -----------------------------------------------------

    speaker = db.query(Speaker).filter(
        Speaker.speaker_id == schedule_data.speaker_id
    ).first()

    if not speaker:
        raise HTTPException(
            status_code=404,
            detail="Speaker not found."
        )

    if not speaker.available:
        raise HTTPException(
            status_code=400,
            detail="Speaker is currently unavailable."
        )

    # -----------------------------------------------------
    # 5. Check venue
    # -----------------------------------------------------

    venue = db.query(Venue).filter(
        Venue.venue_id == schedule_data.venue_id
    ).first()

    if not venue:
        raise HTTPException(
            status_code=404,
            detail="Venue not found."
        )

    if not venue.available:
        raise HTTPException(
            status_code=400,
            detail="Venue is currently unavailable."
        )

    # -----------------------------------------------------
    # 6. Check speaker conflict
    #
    # IMPORTANT:
    # Exclude the schedule we are currently editing.
    # -----------------------------------------------------

    speaker_conflict = db.query(SessionSchedule).filter(
        SessionSchedule.speaker_id ==
            schedule_data.speaker_id,

        SessionSchedule.schedule_id !=
            schedule_id,

        SessionSchedule.start_time <
            schedule_data.end_time,

        SessionSchedule.end_time >
            schedule_data.start_time
    ).first()

    if speaker_conflict:
        raise HTTPException(
            status_code=409,
            detail=(
                "Speaker scheduling conflict. "
                "This speaker already has another "
                "session during this time."
            )
        )

    # -----------------------------------------------------
    # 7. Check venue conflict
    #
    # Also exclude the current schedule.
    # -----------------------------------------------------

    venue_conflict = db.query(SessionSchedule).filter(
        SessionSchedule.venue_id ==
            schedule_data.venue_id,

        SessionSchedule.schedule_id !=
            schedule_id,

        SessionSchedule.start_time <
            schedule_data.end_time,

        SessionSchedule.end_time >
            schedule_data.start_time
    ).first()

    if venue_conflict:
        raise HTTPException(
            status_code=409,
            detail=(
                "Venue scheduling conflict. "
                "This venue is already booked during "
                "this time."
            )
        )

    # -----------------------------------------------------
    # 8. Update schedule
    # -----------------------------------------------------

    schedule.session_id = schedule_data.session_id
    schedule.venue_id = schedule_data.venue_id
    schedule.speaker_id = schedule_data.speaker_id
    schedule.start_time = schedule_data.start_time
    schedule.end_time = schedule_data.end_time

    if schedule_data.venue_match_score is not None:
        schedule.venue_match_score = (
            schedule_data.venue_match_score
        )

    db.commit()
    db.refresh(schedule)

    return {
        "message": "Schedule updated successfully!",
        "schedule": schedule,

        "speaker": {
            "speaker_id": speaker.speaker_id,
            "name": speaker.name,
        },

        "venue": {
            "venue_id": venue.venue_id,
            "venue_name": venue.venue_name,
        },

        "session": {
            "session_id": session.session_id,
            "session_title": session.session_title,
        }
    }
@app.delete("/schedule/{schedule_id}")
def delete_schedule(
    schedule_id: int,
    db: Session = Depends(get_db),
    user: str = Depends(verify_token),
):
    schedule = db.query(SessionSchedule).filter(
        SessionSchedule.schedule_id == schedule_id
    ).first()

    if not schedule:
        raise HTTPException(
            status_code=404,
            detail="Schedule not found."
        )

    db.delete(schedule)
    db.commit()

    return {
        "message": "Schedule deleted successfully!"
    }
@app.post("/schedule/{schedule_id}/reminder")
def send_schedule_reminder(
    schedule_id: int,
    db: Session = Depends(get_db),
    user: str = Depends(verify_token),
):
    schedule = db.query(SessionSchedule).filter(
        SessionSchedule.schedule_id == schedule_id
    ).first()

    if not schedule:
        raise HTTPException(
            status_code=404,
            detail="Schedule not found."
        )

    session = db.query(Session).filter(
        Session.session_id == schedule.session_id
    ).first()

    speaker = db.query(Speaker).filter(
        Speaker.speaker_id == schedule.speaker_id
    ).first()

    venue = db.query(Venue).filter(
        Venue.venue_id == schedule.venue_id
    ).first()

    if not session or not speaker or not venue:
        raise HTTPException(
            status_code=404,
            detail="Schedule information is incomplete."
        )

    send_schedule_email(
        speaker.email,
        speaker.name,
        session.session_title,
        venue.venue_name,
        schedule.start_time,
        schedule.end_time,
        "reminder"
    )

    return {
        "message": "Schedule reminder sent successfully!",
        "schedule_id": schedule.schedule_id,
        "speaker": speaker.name,
        "email": speaker.email,
        "session": session.session_title,
        "venue": venue.venue_name,
        "start_time": schedule.start_time,
        "end_time": schedule.end_time,
    }
@app.get("/schedules")
def get_schedules(
    db: Session = Depends(get_db),
    user: str = Depends(verify_token),
):
    schedules = db.query(SessionSchedule).all()

    results = []

    for schedule in schedules:

        session = db.query(Session).filter(
            Session.session_id ==
            schedule.session_id
        ).first()

        speaker = db.query(Speaker).filter(
            Speaker.speaker_id ==
            schedule.speaker_id
        ).first()

        venue = db.query(Venue).filter(
            Venue.venue_id ==
            schedule.venue_id
        ).first()

        results.append({
            "schedule_id": schedule.schedule_id,

            "session_id": schedule.session_id,
            "session_title":
                session.session_title if session else None,

            "speaker_id": schedule.speaker_id,
            "speaker_name":
                speaker.name if speaker else None,

            "venue_id": schedule.venue_id,
            "venue_name":
                venue.venue_name if venue else None,

            "start_time": schedule.start_time,
            "end_time": schedule.end_time,

            "venue_match_score":
                schedule.venue_match_score,
        })

    return results
@app.get("/session-analytics")
def session_analytics(
    db: Session = Depends(get_db),
    user: str = Depends(verify_token),
):
    sessions = db.query(Session).all()
    speakers = db.query(Speaker).all()
    venues = db.query(Venue).all()
    schedules = db.query(SessionSchedule).all()

    # =====================================================
    # BASIC COUNTS
    # =====================================================

    total_sessions = len(sessions)
    total_speakers = len(speakers)
    total_venues = len(venues)
    scheduled_sessions = len(schedules)

    # =====================================================
    # ASSIGNED SPEAKERS / USED VENUES
    # =====================================================

    assigned_speaker_ids = {
        schedule.speaker_id
        for schedule in schedules
    }

    used_venue_ids = {
        schedule.venue_id
        for schedule in schedules
    }

    speakers_assigned = len(assigned_speaker_ids)
    venues_used = len(used_venue_ids)

    # =====================================================
    # SESSION DURATION
    # =====================================================

    durations = []

    for session in sessions:

        if session.start_time and session.end_time:

            duration = (
                session.end_time -
                session.start_time
            ).total_seconds() / 60

            durations.append(duration)

    average_session_duration = (
        round(
            sum(durations) / len(durations),
            2
        )
        if durations
        else 0
    )

    # =====================================================
    # EXPECTED ATTENDANCE
    # =====================================================

    attendance_values = [
        session.expected_attendees
        for session in sessions
        if session.expected_attendees is not None
    ]

    average_expected_attendance = (
        round(
            sum(attendance_values) /
            len(attendance_values),
            2
        )
        if attendance_values
        else 0
    )

    total_expected_attendance = sum(
        attendance_values
    )

    # =====================================================
    # ACCESSIBILITY
    # =====================================================

    accessibility_sessions = sum(
        1
        for session in sessions
        if session.accessibility_required
    )

    # =====================================================
    # SESSIONS BY TYPE
    # =====================================================

    sessions_by_type = {}

    for session in sessions:

        session_type = (
            session.session_type
            or "Other"
        )

        sessions_by_type[session_type] = (
            sessions_by_type.get(
                session_type,
                0
            ) + 1
        )

    # =====================================================
    # SPEAKER WORKLOAD
    # =====================================================

    speaker_workload = {}

    for schedule in schedules:

        speaker = db.query(Speaker).filter(
            Speaker.speaker_id ==
            schedule.speaker_id
        ).first()

        if speaker:

            name = speaker.name

            speaker_workload[name] = (
                speaker_workload.get(
                    name,
                    0
                ) + 1
            )

    # =====================================================
    # VENUE USAGE
    # =====================================================

    venue_usage = {}

    for schedule in schedules:

        venue = db.query(Venue).filter(
            Venue.venue_id ==
            schedule.venue_id
        ).first()

        if venue:

            name = venue.venue_name

            venue_usage[name] = (
                venue_usage.get(
                    name,
                    0
                ) + 1
            )

    # =====================================================
    # VENUE UTILIZATION
    # =====================================================

    venue_utilization = {}

    for venue in venues:

        usage_count = venue_usage.get(
            venue.venue_name,
            0
        )

        utilization = (
            round(
                (usage_count / scheduled_sessions)
                * 100,
                2
            )
            if scheduled_sessions > 0
            else 0
        )

        venue_utilization[
            venue.venue_name
        ] = utilization

    # =====================================================
    # ROOM OCCUPANCY
    #
    # Expected attendees / venue capacity
    # =====================================================

    room_occupancy = {}

    for schedule in schedules:

        venue = db.query(Venue).filter(
            Venue.venue_id ==
            schedule.venue_id
        ).first()

        session = db.query(Session).filter(
            Session.session_id ==
            schedule.session_id
        ).first()

        if venue and session:

            expected = (
                session.expected_attendees
                or 0
            )

            if venue.capacity > 0:

                occupancy = round(
                    (expected / venue.capacity)
                    * 100,
                    2
                )

            else:
                occupancy = 0

            room_occupancy[
                venue.venue_name
            ] = occupancy

    # =====================================================
    # SESSION ATTENDANCE ANALYSIS
    #
    # Based on expected attendance because actual
    # session attendance is not stored yet.
    # =====================================================

    session_attendance = []

    for session in sessions:

        expected = (
            session.expected_attendees
            or 0
        )

        session_attendance.append({
            "session_id":
                session.session_id,

            "session_title":
                session.session_title,

            "expected_attendees":
                expected,

            "session_type":
                session.session_type
                or "Other",

            "start_time":
                session.start_time,

            "end_time":
                session.end_time,
        })

    # =====================================================
    # MOST POPULAR SESSIONS
    #
    # Highest expected attendance
    # =====================================================

    popular_sessions = sorted(
        session_attendance,
        key=lambda x:
            x["expected_attendees"],
        reverse=True
    )

    # Keep top 5
    popular_sessions = popular_sessions[:5]

    # =====================================================
    # PEAK ATTENDANCE TIME
    #
    # Session with highest expected attendance
    # =====================================================

    peak_attendance_session = None

    if popular_sessions:

        peak = popular_sessions[0]

        peak_attendance_session = {
            "session_title":
                peak["session_title"],

            "expected_attendees":
                peak["expected_attendees"],

            "start_time":
                peak["start_time"],

            "end_time":
                peak["end_time"],
        }

    # =====================================================
    # SCHEDULE MATCH SCORES
    # =====================================================

    match_scores = [
        schedule.venue_match_score
        for schedule in schedules
        if schedule.venue_match_score is not None
    ]

    average_venue_match_score = (
        round(
            sum(match_scores) /
            len(match_scores),
            2
        )
        if match_scores
        else 0
    )

    # =====================================================
    # RETURN ANALYTICS
    # =====================================================

    return {

        "summary": {

            "total_sessions":
                total_sessions,

            "scheduled_sessions":
                scheduled_sessions,

            "total_speakers":
                total_speakers,

            "speakers_assigned":
                speakers_assigned,

            "total_venues":
                total_venues,

            "venues_used":
                venues_used,

            "average_session_duration_minutes":
                average_session_duration,

            "average_expected_attendance":
                average_expected_attendance,

            "total_expected_attendance":
                total_expected_attendance,

            "accessibility_sessions":
                accessibility_sessions,

            "average_venue_match_score":
                average_venue_match_score,
        },

        "sessions_by_type":
            sessions_by_type,

        "speaker_workload":
            speaker_workload,

        "venue_usage":
            venue_usage,

        "venue_utilization":
            venue_utilization,

        "room_occupancy":
            room_occupancy,

        "session_attendance":
            session_attendance,

        "popular_sessions":
            popular_sessions,

        "peak_attendance_session":
            peak_attendance_session,
    } 
@app.post("/upload-csv")
async def upload_csv(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user: str = Depends(verify_token),
):
    if not file.filename.endswith(".csv"):
        raise HTTPException(
            status_code=400,
            detail="Please upload a CSV file."
        )

    try:
        df = pd.read_csv(file.file)

        uploaded = 0
        skipped = 0

        for _, row in df.iterrows():

            existing = db.query(Attendee).filter(
                Attendee.email == row["email"]
            ).first()

            if existing:
                skipped += 1
                continue

            attendee = Attendee(
    name=row["name"],
    email=row["email"],
    phone=row["phone"],
    organization=row["organization"],
    age=int(row["age"]) if pd.notna(row["age"]) else None,
    gender=normalize(row["gender"]),
    city=normalize(row["city"]),
    event=normalize(row["event"]) if "event" in row else None,
    ticket_type=normalize_ticket(row["ticket_type"]),
    emergency_contact_name=(
    None if pd.isna(row.get("emergency_contact_name"))
    else row.get("emergency_contact_name")
),

emergency_contact_number=(
    None if pd.isna(row.get("emergency_contact_number"))
    else str(row.get("emergency_contact_number"))
),

relationship=(
    None if pd.isna(row.get("relationship"))
    else row.get("relationship")
),

accessibility_type=(
    None if pd.isna(row.get("accessibility_type"))
    else row.get("accessibility_type")
),
)

            db.add(attendee)
            db.flush()
            attendee.event_id = f"EVT{attendee.attendee_id:04d}"
            uploaded += 1

        db.commit()

        return {
            "message": f"{uploaded} attendees uploaded successfully.",
            "uploaded": uploaded,
            "skipped": skipped,
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=str(e),
        )