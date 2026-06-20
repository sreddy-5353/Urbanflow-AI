from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas import RouteRequest, RouteResponse
from app.ml.routing_algo import router as path_router
from app.auth import get_current_user
from app.models import User
import random

router = APIRouter(prefix="/routes", tags=["routes"])

@router.post("/plan", response_model=RouteResponse)
def plan_route(
    request: RouteRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        response = path_router.plan_routes(
            start_lat=request.start_lat,
            start_lng=request.start_lng,
            end_lat=request.end_lat,
            end_lng=request.end_lng,
            preference=request.preference,
            start_name=getattr(request, "start_name", "Origin"),
            end_name=getattr(request, "end_name", "Destination"),
        )
        
        # Award sustainability points for green routes
        is_green = any(opt.mode in ["walking", "bicycle", "bus", "metro"] for opt in response.options)
        if is_green and request.preference in ["eco", "balanced"]:
            points_awarded = random.randint(10, 30)
            current_user.sustainability_points += points_awarded
            db.add(current_user)
            db.commit()
            
        return response
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Route planning failed: {str(e)}"
        )
