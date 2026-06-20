from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.schemas import AreaSafetyScore, SOSCreate, SOSResponse
from app.ml.safety_scorer import safety_scorer
from app.auth import get_current_user
from app.models import User, SOSAlert, Incident
from app.notifications import send_sos_sms_to_contacts

router = APIRouter(prefix="/safety", tags=["safety"])

@router.get("/score", response_model=AreaSafetyScore)
def get_safety_score(
    lat: float, 
    lng: float, 
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Fetch active incidents in the area to calculate localized penalties
    incidents = db.query(Incident).filter(Incident.is_verified == True).all()
    return safety_scorer.evaluate_area_safety(lat, lng, incidents)

@router.get("/hotspots", response_model=List[AreaSafetyScore])
def get_safety_grid(
    lat: float, 
    lng: float, 
    current_user = Depends(get_current_user)
):
    return safety_scorer.get_safety_hotspots(lat, lng)

@router.post("/sos", response_model=SOSResponse)
def trigger_sos(
    sos_in: SOSCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Create SOS record in database
    db_sos = SOSAlert(
        latitude=sos_in.latitude,
        longitude=sos_in.longitude,
        route_details=sos_in.route_details or "",
        user_id=current_user.id
    )
    db.add(db_sos)
    db.commit()
    db.refresh(db_sos)
    
    # Parse trusted contacts and send real SMS alerts via Twilio
    contacts_list = []
    if current_user.emergency_contacts:
        contacts_list = [c.strip() for c in current_user.emergency_contacts.split(";") if c.strip()]

    notified_names = send_sos_sms_to_contacts(
        contacts_list,
        user_name=current_user.name,
        lat=sos_in.latitude,
        lng=sos_in.longitude
    )

    print(f"!!! EMERGENCY SHE-TEAMS DISPATCHED FOR {current_user.name} !!!")
    print(f"GPS Coordinates: ({sos_in.latitude}, {sos_in.longitude})")

    return SOSResponse(
        id=db_sos.id,
        user_id=current_user.id,
        user_name=current_user.name,
        latitude=db_sos.latitude,
        longitude=db_sos.longitude,
        timestamp=db_sos.timestamp,
        status=db_sos.status,
        route_details=db_sos.route_details,
        notified_contacts=notified_names
    )
