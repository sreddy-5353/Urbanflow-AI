from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models import Incident, User
from app.schemas import IncidentCreate, IncidentResponse
from app.auth import get_current_user
import datetime

router = APIRouter(prefix="/community", tags=["community"])

@router.get("/incidents", response_model=List[IncidentResponse])
def get_incidents(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    incidents = db.query(Incident).order_by(Incident.timestamp.desc()).all()
    
    # Seed mock incidents for initial render if empty
    if not incidents:
        mock_inc = [
            Incident(
                type="Accident",
                description="Car collides with scooter, traffic piling up.",
                latitude=17.3616,
                longitude=78.4747,
                severity="High",
                upvotes=5,
                is_verified=True,
                reporter_id=1
            ),
            Incident(
                type="Unsafe Area",
                description="Streetlights are completely out under the bridge. Extreme dark zone.",
                latitude=17.4137,
                longitude=78.5283,
                severity="Moderate",
                upvotes=12,
                is_verified=True,
                reporter_id=1
            ),
            Incident(
                type="Flooded Road",
                description="Heavy pooling in the right lane after cloudburst.",
                latitude=17.4435,
                longitude=78.3772,
                severity="Moderate",
                upvotes=3,
                is_verified=False,
                reporter_id=1
            )
        ]
        for inc in mock_inc:
            db.add(inc)
        db.commit()
        incidents = db.query(Incident).order_by(Incident.timestamp.desc()).all()
        
    return incidents

@router.post("/report", response_model=IncidentResponse)
def report_incident(
    incident_in: IncidentCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Instantly verify if submitted by an admin, else wait for crowd upvotes
    is_verified = (current_user.role == "admin")
    
    db_incident = Incident(
        type=incident_in.type,
        description=incident_in.description,
        latitude=incident_in.latitude,
        longitude=incident_in.longitude,
        severity=incident_in.severity,
        image_url=incident_in.image_url,
        is_verified=is_verified,
        reporter_id=current_user.id
    )
    db.add(db_incident)
    db.commit()
    db.refresh(db_incident)
    return db_incident

@router.post("/upvote/{incident_id}", response_model=IncidentResponse)
def upvote_incident(
    incident_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    incident = db.query(Incident).filter(Incident.id == incident_id).first()
    if not incident:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Incident report not found"
        )
    
    incident.upvotes += 1
    # Auto-verify report if it gains more than 5 community upvotes
    if incident.upvotes >= 5:
        incident.is_verified = True
        
    db.add(incident)
    db.commit()
    db.refresh(incident)
    return incident
