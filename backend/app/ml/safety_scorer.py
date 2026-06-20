from typing import List, Dict, Any
from app.schemas import AreaSafetyScore
import random

class SafetyScorer:
    def __init__(self):
        pass

    def evaluate_area_safety(self, lat: float, lng: float, incidents_list: List[Any] = None) -> AreaSafetyScore:
        # Base safety calculations
        # Introduce simulated local features based on coordinates
        # Crime rate scale: 0 to 10
        # Lighting rating scale: 0 to 10 (10 = brightest)
        # Crowd density scale: 0 to 10 (10 = dense/crowded)
        
        # Simple coordinate-based hashing for deterministic values for testing
        lat_hash = int(abs(lat) * 1000) % 10
        lng_hash = int(abs(lng) * 1000) % 10
        
        crime_rate = float(lat_hash) / 2.0  # 0 to 4.5
        lighting = float(10 - lng_hash)     # 1 to 10
        crowd = float((lat_hash + lng_hash) % 10) # 0 to 9
        
        # Modify safety based on active local incident count
        incident_penalty = 0.0
        if incidents_list:
            for inc in incidents_list:
                # Calculate distance to incident
                # Simple approximation: 0.01 deg is approx 1 km
                dist = ((inc.latitude - lat)**2 + (inc.longitude - lng)**2)**0.5
                if dist < 0.01:  # within ~1 km
                    if inc.severity == "High":
                        incident_penalty += 25.0
                    elif inc.severity == "Moderate":
                        incident_penalty += 15.0
                    else:
                        incident_penalty += 5.0

        # Calculate final safety score
        # Formula: Base 100, reduce for high crime, poor lighting, extreme low/high crowd, incident penalty
        base_score = 100.0
        base_score -= (crime_rate * 8)          # max -36
        base_score -= ((10.0 - lighting) * 4)   # max -36
        
        # Crowd density penalty: extreme loneliness (<2) is risky for safety; normal-high crowd is safe
        if crowd < 2:
            base_score -= 15.0 # lonely alley risk
            
        base_score -= incident_penalty
        
        # Clamp safety score
        safety_score = max(5.0, min(100.0, base_score))
        
        # Classify
        if safety_score >= 75:
            risk_level = "Safe"
        elif safety_score >= 45:
            risk_level = "Moderate Risk"
        else:
            risk_level = "High Risk"
            
        return AreaSafetyScore(
            latitude=lat,
            longitude=lng,
            safety_score=round(safety_score, 1),
            crime_rate_index=round(crime_rate, 2),
            lighting_rating=round(lighting, 1),
            crowd_density=round(crowd, 1),
            risk_level=risk_level
        )

    def get_safety_hotspots(self, center_lat: float, center_lng: float) -> List[AreaSafetyScore]:
        hotspots = []
        random.seed(42)
        # Create a grid of points to evaluate
        offsets = [-0.03, -0.015, 0.0, 0.015, 0.03]
        for lat_off in offsets:
            for lng_off in offsets:
                lat = center_lat + lat_off
                lng = center_lng + lng_off
                hotspots.append(self.evaluate_area_safety(lat, lng))
        return hotspots

safety_scorer = SafetyScorer()
