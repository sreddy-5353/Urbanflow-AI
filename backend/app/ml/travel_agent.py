import re
import random
import httpx
from typing import Dict, Any, Tuple, Optional
from app.ml.routing_algo import router
from app.schemas import ChatResponse, RouteResponse

# Key landmarks in our simulated city map (Hyderabad, India)
# Fast path only -- anything not listed here falls back to live geocoding below.
LANDMARKS = {
    "home": (17.4138, 78.4398),
    "office": (17.4435, 78.3772),
    "work": (17.4435, 78.3772),
    "airport": (17.2403, 78.4294),
    "central park": (17.4239, 78.4738),
    "hussain sagar": (17.4239, 78.4738),
    "university": (17.4137, 78.5283),
    "osmania": (17.4137, 78.5283),
    "downtown": (17.3616, 78.4747),
    "charminar": (17.3616, 78.4747),
    "shopping mall": (17.4330, 78.3828)
}

# Hyderabad bounding box used to bias/limit geocoding results
_HYD_VIEWBOX = "78.2,17.6,78.7,17.2"


def geocode_place(text: str) -> Optional[Tuple[float, float]]:
    """Resolve any free-text place name to (lat, lng) using OpenStreetMap
    Nominatim, the same geocoder the route-search sidebar uses. This lets
    the chatbot understand places beyond the small hardcoded LANDMARKS list."""
    text = text.strip()
    if not text:
        return None
    try:
        resp = httpx.get(
            "https://nominatim.openstreetmap.org/search",
            params={
                "q": f"{text}, Hyderabad, India",
                "format": "json",
                "limit": 1,
                "viewbox": _HYD_VIEWBOX,
                "bounded": 1,
            },
            headers={"Accept-Language": "en", "User-Agent": "UrbanFlowAI/1.0"},
            timeout=5.0,
        )
        if resp.status_code == 200:
            results = resp.json()
            if results:
                return (float(results[0]["lat"]), float(results[0]["lon"]))
    except Exception:
        pass
    return None

class TravelAgentAssistant:
    def __init__(self):
        pass

    def process_message(self, message: str, current_lat: float = None, current_lng: float = None) -> ChatResponse:
        msg = message.lower().strip()
        
        # Default start and end coordinates if none detected
        start_coord = (current_lat or 17.4138, current_lng or 78.4398)
        end_coord = (17.4435, 78.3772)  # office (HITEC City)
        
        preference = "balanced"
        detected_route_intent = False
        destination_name = "Office"
        origin_name = "Current Location"
        
        # 1. Detect route preferences
        if "safest" in msg or "safe" in msg:
            preference = "safest"
        elif "cheapest" in msg or "cheap" in msg or "cost" in msg or "fare" in msg:
            preference = "cheapest"
        elif "eco" in msg or "green" in msg or "carbon" in msg or "emission" in msg:
            preference = "eco"
        elif "fastest" in msg or "fast" in msg or "quick" in msg:
            preference = "fastest"

        # 2. Extract origin and destination landmarks
        # Simple regex matching for "to X" or "from Y to Z"
        to_match = re.search(r"to\s+([a-zA-Z\s]+)", msg)
        from_match = re.search(r"from\s+([a-zA-Z\s]+)", msg)
        
        if from_match:
            from_place = from_match.group(1).strip()
            # Clean up trailing strings (e.g. "from home to work" -> from_place="home")
            if " to " in from_place:
                from_place = from_place.split(" to ")[0].strip()
            
            matched = False
            for name, coord in LANDMARKS.items():
                if name in from_place:
                    start_coord = coord
                    origin_name = name.title()
                    matched = True
                    break

            if not matched and from_place:
                geocoded = geocode_place(from_place)
                if geocoded:
                    start_coord = geocoded
                    origin_name = from_place.title()
                    
        if to_match:
            to_place = to_match.group(1).strip()
            matched = False
            for name, coord in LANDMARKS.items():
                if name in to_place:
                    end_coord = coord
                    destination_name = name.title()
                    detected_route_intent = True
                    matched = True
                    break

            if not matched and to_place:
                geocoded = geocode_place(to_place)
                if geocoded:
                    end_coord = geocoded
                    destination_name = to_place.title()
                    detected_route_intent = True
        else:
            # Check if any landmark itself is in the query (assumed destination)
            for name, coord in LANDMARKS.items():
                if name in msg and name != "home" and name != "work":
                    end_coord = coord
                    destination_name = name.title()
                    detected_route_intent = True
                    break
                    
        # Check explicit keywords like "route", "trip", "plan"
        if "route" in msg or "plan a trip" in msg or "how do i get" in msg or "navigate" in msg:
            detected_route_intent = True

        # Handle specific common questions
        if "sos" in msg or "panic" in msg or "emergency" in msg:
            return ChatResponse(
                reply="⚠️ SOS PANIC MODE DETECTED. Please click the red SOS button in the top menu immediately to notify your trusted emergency contacts and local SHE teams. I am standing by to assist with emergency routing to the nearest police station or hospital.",
                suggested_action="TRIGGER_SOS"
            )
            
        if "reduce travel cost" in msg or "cheapest way" in msg:
            return ChatResponse(
                reply="To reduce travel costs, I recommend choosing the **Cheapest Route** option. Public transport like the **Metro** and **Bus** are up to 85% cheaper than Auto or Taxi. You can save approximately ₹250 per trip by swapping taxi rides with Metro transit.",
                suggested_action="SHOW_COST_SAVINGS"
            )

        if "carbon" in msg or "emission" in msg or "footprint" in msg:
            return ChatResponse(
                reply="Reducing carbon emissions is easy! By opting for walking, bicycling, or Metro transit, your carbon footprint is virtually zero. Travel via Metro emits only 15g CO2/km, whereas a conventional taxi emits 120g CO2/km. Try using the **Eco-Friendly Route** tab to inspect green route alternatives.",
                suggested_action="SHOW_CARBON_TRACKER"
            )
            
        if detected_route_intent:
            # Call router to generate actual paths
            suggested_route = router.plan_routes(
                start_lat=start_coord[0],
                start_lng=start_coord[1],
                end_lat=end_coord[0],
                end_lng=end_coord[1],
                preference=preference
            )
            
            # Find the best option for the selected preference
            best_opt = None
            for opt in suggested_route.options:
                if opt.mode == "metro" and preference in ["cheapest", "eco"]:
                    best_opt = opt
                    break
            if not best_opt:
                # Fallback to first option (walking/cycling/bus)
                best_opt = suggested_route.options[2] # bus
                
            reply = (
                f"🗺️ **Route Planned Successfully!**\n\n"
                f"I've mapped a path from **{origin_name}** to **{destination_name}** optimized for your requested preference: **{preference.upper()}**.\n\n"
                f"- **Recommended Mode**: {best_opt.mode.title()}\n"
                f"- **Est. Duration**: {best_opt.duration_mins} mins\n"
                f"- **Est. Cost**: ₹{best_opt.cost:.2f}\n"
                f"- **Distance**: {best_opt.distance_km} km\n"
                f"- **Safety Score**: {best_opt.safety_score}/100\n"
                f"- **Emissions**: {best_opt.carbon_emissions_kg} kg CO2\n\n"
                f"I have marked this route directly on your map view. Have a safe journey!"
            )
            
            return ChatResponse(
                reply=reply,
                suggested_action="DISPLAY_ROUTE",
                suggested_route=suggested_route
            )
            
        # General response mapping if no specific command detected
        generic_replies = [
            "Hello! I am your UrbanFlow AI Mobility Assistant. I can plan routes, predict traffic delays, find safety corridors, or calculate carbon footprints. Try asking: *'Find the safest route to Airport'* or *'How do I get to Central Park cheaply?'*",
            "I'm monitoring city conditions in real-time. Traffic on the Downtown Expressway is currently high (+15 min delays). How can I help you plan your commute?",
            "Remember, traveling via public transit (Metro/Bus) or active travel (Bicycle) awards you Green travel points! How can I assist you with your journey today?"
        ]
        
        return ChatResponse(reply=random.choice(generic_replies))

travel_agent = TravelAgentAssistant()
