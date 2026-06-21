from pydantic import BaseModel, EmailStr
from typing import List, Optional
from datetime import datetime

# Auth Schemas
class UserBase(BaseModel):
    name: str
    email: EmailStr

class UserCreate(UserBase):
    password: str

class UserResponse(UserBase):
    id: int
    role: str
    sustainability_points: int
    emergency_contacts: str

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None
    role: Optional[str] = None

class EmergencyContactsUpdate(BaseModel):
    contacts: str  # Format: "Name:Phone;Name:Phone"

# Routing Schemas
class RouteRequest(BaseModel):
    start_lat: float
    start_lng: float
    end_lat: float
    end_lng: float
    preference: str  # "fastest", "cheapest", "safest", "eco", "balanced"
    start_name: Optional[str] = "Origin"
    end_name: Optional[str] = "Destination"

class RoutePoint(BaseModel):
    lat: float
    lng: float

class ModeRouteDetails(BaseModel):
    mode: str  # "walking", "bicycle", "bus", "metro", "auto", "taxi", "ride_sharing"
    duration_mins: float
    cost: float
    distance_km: float
    safety_score: float  # 0 to 100
    carbon_emissions_kg: float
    traffic_level: str  # "low", "medium", "heavy"
    path: List[RoutePoint]
    instructions: List[str]
    summary: Optional[str] = None

class RouteResponse(BaseModel):
    preference: str
    options: List[ModeRouteDetails]
    metro_available: bool = True

# Traffic Predict Schemas
class CongestionZone(BaseModel):
    id: str
    name: str
    latitude: float
    longitude: float
    radius_meters: float
    congestion_level: float  # 0 to 1
    speed_limit_kmh: int
    current_speed_kmh: float
    peak_hours: str

class TrafficForecast(BaseModel):
    hour: int
    predicted_delay_mins: float
    congestion_probability: float

# Safety Schemas
class AreaSafetyScore(BaseModel):
    latitude: float
    longitude: float
    safety_score: float
    crime_rate_index: float
    lighting_rating: float
    crowd_density: float
    risk_level: str  # "Safe", "Moderate Risk", "High Risk"

# SOS Schemas
class SOSCreate(BaseModel):
    latitude: float
    longitude: float
    route_details: Optional[str] = ""

class SOSResponse(BaseModel):
    id: int
    user_id: int
    user_name: str
    latitude: float
    longitude: float
    timestamp: datetime
    status: str
    route_details: str
    notified_contacts: List[str]

    class Config:
        from_attributes = True

# Community Reporting Schemas
class IncidentCreate(BaseModel):
    type: str
    description: str
    latitude: float
    longitude: float
    severity: str
    image_url: Optional[str] = None

class IncidentResponse(BaseModel):
    id: int
    type: str
    description: str
    latitude: float
    longitude: float
    timestamp: datetime
    severity: str
    upvotes: int
    image_url: Optional[str] = None
    is_verified: bool
    reporter_id: int

    class Config:
        from_attributes = True

# Live Alert Schemas
class LiveAlertCreate(BaseModel):
    title: str
    description: str
    type: str
    latitude: float
    longitude: float

class LiveAlertResponse(BaseModel):
    id: int
    title: str
    description: str
    type: str
    latitude: float
    longitude: float
    timestamp: datetime
    is_active: bool

    class Config:
        from_attributes = True

# AI Chat Schemas
class ChatRequest(BaseModel):
    message: str
    current_lat: Optional[float] = None
    current_lng: Optional[float] = None
    origin_lat: Optional[float] = None
    origin_lng: Optional[float] = None
    origin_name: Optional[str] = None
    dest_lat: Optional[float] = None
    dest_lng: Optional[float] = None
    dest_name: Optional[str] = None

class ChatResponse(BaseModel):
    reply: str
    suggested_action: Optional[str] = None
    suggested_route: Optional[RouteResponse] = None
