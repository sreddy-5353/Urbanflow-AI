from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.auth import get_current_admin
from app.models import Incident, SOSAlert, User
from typing import Dict, Any, List

router = APIRouter(prefix="/admin", tags=["admin"])

@router.get("/metrics")
def get_admin_metrics(
    db: Session = Depends(get_db),
    admin_user = Depends(get_current_admin)
):
    # Retrieve safety report count
    total_incidents = db.query(Incident).count()
    active_incidents = db.query(Incident).filter(Incident.is_verified == True).count()
    
    # Retrieve active SOS alerts
    active_sos = db.query(SOSAlert).filter(SOSAlert.status == "Active").count()
    
    # Aggregate green metrics
    users = db.query(User).all()
    total_sustainability_points = sum([u.sustainability_points for u in users])
    total_co2_saved_kg = total_sustainability_points * 0.5
    
    # Generate mock congestion reports for analytics
    congestion_indices = [
        {"zone": "Downtown Sector A", "congestion": 0.72, "flow_speed_kmh": 14.5},
        {"zone": "Residential North", "congestion": 0.28, "flow_speed_kmh": 41.2},
        {"zone": "Commercial Bypass", "congestion": 0.81, "flow_speed_kmh": 9.8},
        {"zone": "Greenwood Suburbs", "congestion": 0.12, "flow_speed_kmh": 48.0}
    ]
    
    # Generate hourly incident trend counts
    hourly_trends = [
        {"hour": "08:00", "incidents": 2},
        {"hour": "10:00", "incidents": 5},
        {"hour": "12:00", "incidents": 3},
        {"hour": "14:00", "incidents": 1},
        {"hour": "16:00", "incidents": 4},
        {"hour": "18:00", "incidents": 9},
        {"hour": "20:00", "incidents": 6}
    ]
    
    return {
        "summary": {
            "total_reported_incidents": total_incidents,
            "active_verified_incidents": active_incidents,
            "active_sos_emergencies": active_sos,
            "total_co2_saved_kg": round(total_co2_saved_kg, 1),
            "total_registered_citizens": len(users)
        },
        "congestion_indices": congestion_indices,
        "hourly_incident_trends": hourly_trends,
        "environmental_metrics": {
            "equivalent_trees_planted": round(total_co2_saved_kg / 21.7, 1),
            "green_commute_share_pct": 58.5  # 58.5% citizen commute share via green transport
        }
    }
