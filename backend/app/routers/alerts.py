from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models import LiveAlert
from app.schemas import LiveAlertResponse
from app.auth import get_current_user
import datetime

router = APIRouter(prefix="/alerts", tags=["alerts"])

@router.get("", response_model=List[LiveAlertResponse])
def get_active_alerts(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    # Retrieve active alerts
    alerts = db.query(LiveAlert).filter(LiveAlert.is_active == True).all()
    
    # If database is empty, seed mock alerts for rich experience
    if not alerts:
        mock_alerts = [
            LiveAlert(
                title="Banjara Hills Congestion",
                description="Heavy congestion near road no 12 due to construction.",
                type="Traffic",
                latitude=17.4138,
                longitude=78.4398,
                timestamp=datetime.datetime.utcnow(),
                is_active=True
            ),
            LiveAlert(
                title="Metro Purple Line Delay",
                description="Signaling fault causing 10-15 minute delay on Purple Line.",
                type="Delay",
                latitude=17.4239,
                longitude=78.4738,
                timestamp=datetime.datetime.utcnow(),
                is_active=True
            ),
            LiveAlert(
                title="Flooding Warning - HITEC City Underpass",
                description="Minor water logging reported on Cyber Towers underpass. Avoid low paths.",
                type="Flood",
                latitude=17.4435,
                longitude=78.3772,
                timestamp=datetime.datetime.utcnow(),
                is_active=True
            )
        ]
        for a in mock_alerts:
            db.add(a)
        db.commit()
        alerts = db.query(LiveAlert).filter(LiveAlert.is_active == True).all()
        
    return alerts
