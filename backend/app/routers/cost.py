from fastapi import APIRouter, Depends
from app.auth import get_current_user
from typing import Dict, Any

router = APIRouter(prefix="/cost", tags=["cost"])

@router.get("/compare")
def get_cost_comparisons(
    distance_km: float = 10.0,
    metro_available: bool = True,
    current_user = Depends(get_current_user)
):
    # Generates a realistic INR cost comparison breakdown for a specific trip distance
    car_fuel = distance_km * 8.0 + 50.0  # fuel + toll/parking
    metro_fare = 40.0
    bus_fare = 20.0
    taxi_fare = 100.0 + distance_km * 22.0
    auto_fare = 30.0 + distance_km * 15.0
    ride_share = 50.0 + distance_km * 18.0
    
    cheapest = "Bus"
    # Metro is only the best cost/time tradeoff when metro connectivity actually
    # exists for this route; otherwise fall back to Bus.
    best_tradeoff = "Metro" if metro_available else "Bus"
    
    comparisons = [
        {"mode": "Walking", "cost": 0.0, "time_mins": int(distance_km * 12), "carbon_kg": 0.0},
        {"mode": "Bicycle", "cost": 0.0, "time_mins": int(distance_km * 4), "carbon_kg": 0.0},
        {"mode": "Bus", "cost": round(bus_fare, 2), "time_mins": int(distance_km * 2.5), "carbon_kg": round(distance_km * 0.03, 2)},
    ]
    
    # Only show Metro fare information when metro stations are available
    # for the selected source and destination.
    if metro_available:
        comparisons.append(
            {"mode": "Metro", "cost": round(metro_fare, 2), "time_mins": int(distance_km * 1.5), "carbon_kg": round(distance_km * 0.015, 2)}
        )
    
    comparisons += [
        {"mode": "Auto Rickshaw", "cost": round(auto_fare, 2), "time_mins": int(distance_km * 2.0), "carbon_kg": round(distance_km * 0.08, 2)},
        {"mode": "Ride Sharing", "cost": round(ride_share, 2), "time_mins": int(distance_km * 1.5), "carbon_kg": round(distance_km * 0.07, 2)},
        {"mode": "Taxi Cab", "cost": round(taxi_fare, 2), "time_mins": int(distance_km * 1.5), "carbon_kg": round(distance_km * 0.12, 2)},
        {"mode": "Personal Car", "cost": round(car_fuel, 2), "time_mins": int(distance_km * 1.6), "carbon_kg": round(distance_km * 0.18, 2)}
    ]
    
    if metro_available:
        savings_opportunity = f"Swapping standard Taxi with Metro saves you ₹{taxi_fare - metro_fare:.2f} and reduces carbon by {(distance_km * 0.105):.2f} kg CO2."
    else:
        savings_opportunity = f"Swapping standard Taxi with Bus saves you ₹{taxi_fare - bus_fare:.2f} and reduces carbon by {(distance_km * 0.09):.2f} kg CO2."
    
    return {
        "distance_km": distance_km,
        "comparisons": comparisons,
        "insights": {
            "cheapest_alternative": cheapest,
            "best_value": best_tradeoff,
            "savings_opportunity": savings_opportunity
        }
    }
