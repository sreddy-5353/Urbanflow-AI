import numpy as np
import pandas as pd
from sklearn.tree import DecisionTreeRegressor
from typing import List, Dict, Any
from app.schemas import CongestionZone, TrafficForecast
import random

class TrafficPredictionEngine:
    def __init__(self):
        # We will train a simple decision tree model on startup with synthetic data
        self.model = DecisionTreeRegressor(max_depth=5, random_state=42)
        self._train_model()
        
    def _train_model(self):
        # Generate 1000 synthetic samples
        # Features: [Hour (0-23), DayOfWeek (0-6), WeatherCondition (0=Clear, 1=Rain, 2=Storm), ActiveIncident (0/1)]
        np.random.seed(42)
        X_data = []
        y_data = []
        
        for _ in range(1200):
            hour = np.random.randint(0, 24)
            day = np.random.randint(0, 7)
            weather = np.random.choice([0, 1, 2], p=[0.7, 0.2, 0.1])
            incident = np.random.choice([0, 1], p=[0.9, 0.1])
            
            # Base congestion formula with noise
            congestion = 0.1  # base
            # Peak hours: 8-10 AM, 5-7 PM (17-19)
            if (8 <= hour <= 10) or (17 <= hour <= 19):
                congestion += 0.5 if day < 5 else 0.2  # less traffic on weekends
            else:
                congestion += 0.1
                
            # Weather penalty
            congestion += weather * 0.15
            # Incident penalty
            congestion += incident * 0.3
            
            # Random noise
            congestion += np.random.normal(0, 0.05)
            congestion = max(0.0, min(1.0, congestion))
            
            X_data.append([hour, day, weather, incident])
            y_data.append(congestion)
            
        df_x = pd.DataFrame(X_data, columns=['hour', 'day', 'weather', 'incident'])
        df_y = pd.Series(y_data)
        
        self.model.fit(df_x, df_y)
        print("ML Traffic Congestion Model successfully trained.")

    def predict_congestion_score(self, hour: int, day_of_week: int, weather: int, incident: int) -> float:
        # returns 0 to 1 value representing congestion density
        query = pd.DataFrame([[hour, day_of_week, weather, incident]], 
                             columns=['hour', 'day', 'weather', 'incident'])
        prediction = self.model.predict(query)[0]
        return float(max(0.0, min(1.0, prediction)))

    def get_congestion_heatmap(self, center_lat: float, center_lng: float) -> List[CongestionZone]:
        # Generate 5-6 key congestion zones around user coordinate for map display
        names = ["Downtown Expressway", "Metro Central Circle", "East Bypass Interchange", 
                 "Tech Corridor Boulevard", "Riverside Parkway", "Westside Transit Hub"]
        
        zones = []
        random.seed(101)
        for i, name in enumerate(names):
            # Place zones within 0.02 deg of center
            offset_lat = (random.random() - 0.5) * 0.04
            offset_lng = (random.random() - 0.5) * 0.04
            
            # Simulate a live prediction for peak hour vs current hour (e.g. 17:00, Wednesday)
            congestion = self.predict_congestion_score(hour=17, day_of_week=2, weather=1, incident=(1 if i==2 else 0))
            
            speed_limit = 60 if "Expressway" in name or "Bypass" in name else 40
            current_speed = max(5, speed_limit * (1.0 - congestion * 0.8))
            
            zones.append(CongestionZone(
                id=f"zone_{i}",
                name=name,
                latitude=center_lat + offset_lat,
                longitude=center_lng + offset_lng,
                radius_meters=random.randint(200, 600),
                congestion_level=round(congestion, 2),
                speed_limit_kmh=speed_limit,
                current_speed_kmh=round(current_speed, 1),
                peak_hours="08:00-10:00, 17:00-19:00"
            ))
        return zones

    def get_hourly_forecast(self, lat: float, lng: float) -> List[TrafficForecast]:
        forecasts = []
        # Predict congestion for the next 8 hours starting from 8 AM
        for h in range(8, 22, 2):
            congestion = self.predict_congestion_score(hour=h, day_of_week=1, weather=0, incident=0)
            delay = congestion * 25.0  # Max 25 mins delay
            forecasts.append(TrafficForecast(
                hour=h,
                predicted_delay_mins=round(delay, 1),
                congestion_probability=round(congestion, 2)
            ))
        return forecasts

traffic_engine = TrafficPredictionEngine()
