from fastapi import APIRouter, Depends
from typing import List
from app.schemas import CongestionZone, TrafficForecast
from app.ml.traffic_model import traffic_engine
from app.auth import get_current_user

router = APIRouter(prefix="/traffic", tags=["traffic"])

@router.get("/congestion", response_model=List[CongestionZone])
def get_congestion_heatmap(
    lat: float, 
    lng: float, 
    current_user = Depends(get_current_user)
):
    # Returns congestion hotspots near user's position
    return traffic_engine.get_congestion_heatmap(lat, lng)

@router.get("/forecast", response_model=List[TrafficForecast])
def get_traffic_forecast(
    lat: float, 
    lng: float, 
    current_user = Depends(get_current_user)
):
    # Forecasts delays and probabilities over future hours
    return traffic_engine.get_hourly_forecast(lat, lng)
