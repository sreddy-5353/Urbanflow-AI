from fastapi import APIRouter, Depends
from app.auth import get_current_user
from app.models import User
from typing import Dict, Any

router = APIRouter(prefix="/carbon", tags=["carbon"])

@router.get("/stats")
def get_carbon_statistics(current_user: User = Depends(get_current_user)):
    # Calculate simulated stats based on user's sustainability points
    # 1 sustainability point roughly equals 0.5 kg of CO2 saved
    co2_saved_kg = current_user.sustainability_points * 0.5
    
    # Calculate reward achievements
    badges = []
    if current_user.sustainability_points >= 200:
        badges.append("Green Legend 🌿")
    if current_user.sustainability_points >= 100:
        badges.append("Eco Warrior 🚴")
    if current_user.sustainability_points >= 30:
        badges.append("Urban Voyager 🚶")
    if not badges:
        badges.append("Eco Recruit 🌱")
        
    return {
        "sustainability_points": current_user.sustainability_points,
        "co2_saved_kg": round(co2_saved_kg, 1),
        "trees_planted_equivalent": round(co2_saved_kg / 21.7, 2), # 1 tree absorbs 21.7 kg CO2/year
        "weekly_emissions_kg": {
            "car_baseline": 42.5,
            "user_actual": round(max(5.0, 42.5 - co2_saved_kg * 0.2), 1)
        },
        "transport_split": {
            "metro": "45%",
            "walking": "25%",
            "bus": "20%",
            "taxi": "10%"
        },
        "badges": badges,
        "next_tier_points": 100 if current_user.sustainability_points < 100 else (200 if current_user.sustainability_points < 200 else 500)
    }
