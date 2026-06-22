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
    "shopping mall": (17.4330, 78.3828),
    # Major Telangana cities
    "warangal": (17.9784, 79.5941),
    "nizamabad": (18.6725, 78.0941),
    "karimnagar": (18.4386, 79.1288),
    "khammam": (17.2473, 80.1514),
    "nalgonda": (17.0575, 79.2671),
    "mahbubnagar": (16.7488, 77.9842),
    "adilabad": (19.6641, 78.5320),
    "siddipet": (18.1018, 78.8521),
    "suryapet": (17.1397, 79.6220),
    "miryalaguda": (16.8726, 79.5664),
    "jagtial": (18.7943, 78.9150),
    "mancherial": (18.8714, 79.4549),
    "nirmal": (19.0959, 78.3393),
    "ramagundam": (18.7553, 79.4740),
}

# ---------------------------------------------------------------------------
# Bounding boxes (Nominatim viewbox format: "minLng,maxLat,maxLng,minLat")
# ---------------------------------------------------------------------------
_HYDERABAD_VIEWBOX = "78.10,17.75,78.85,17.10"   # Hyderabad city (tight)
_TELANGANA_VIEWBOX = "77.2,19.9,81.3,15.8"        # All 33 Telangana districts


def _nominatim_query(query: str, viewbox: Optional[str], bounded: bool) -> Optional[Tuple[float, float]]:
    """
    Single Nominatim API call. Returns (lat, lng) or None.

    Args:
        query   : search string (may include city/state context already)
        viewbox : Nominatim viewbox string, or None to skip spatial filtering
        bounded : whether to restrict results strictly inside the viewbox
    """
    params: dict = {
        "q":      query,
        "format": "json",
        "limit":  1,
    }
    if viewbox:
        params["viewbox"] = viewbox
    if bounded:
        params["bounded"] = 1

    try:
        resp = httpx.get(
            "https://nominatim.openstreetmap.org/search",
            params=params,
            headers={
                "Accept-Language": "en",
                "User-Agent": "UrbanFlowAI/1.0 (urbanflow-project)",
            },
            timeout=6.0,
        )
    except httpx.TimeoutException:
        print(f"[geocode_place] Timeout querying Nominatim for '{query}'")
        return None
    except Exception as exc:
        print(f"[geocode_place] Network error for '{query}': {exc}")
        return None

    if resp.status_code != 200:
        print(f"[geocode_place] Nominatim HTTP {resp.status_code} for '{query}': {resp.text[:200]}")
        return None

    results = resp.json()
    if not results:
        print(f"[geocode_place] No results for '{query}' (viewbox={viewbox}, bounded={bounded})")
        return None

    return (float(results[0]["lat"]), float(results[0]["lon"]))


def geocode_place(text: str) -> Optional[Tuple[float, float]]:
    """
    Resolve any free-text place name to (lat, lng) using OpenStreetMap Nominatim.

    Search strategy — most-specific to most-general so common Hyderabad searches
    are fast and village/mandal/district searches across Telangana still work:

      1. Raw query, bounded to Hyderabad city box.
         → Catches "Madhapur", "Gachibowli", "LB Nagar", "Secunderabad" instantly.

      2. "<place>, Telangana, India", bounded to Telangana state box.
         → Catches all 33 districts, municipalities, mandals, and villages.
         Appending state context prevents Nominatim returning a same-named place
         in another Indian state (e.g. "Karimnagar" also exists in Karnataka).

      3. "<place>, Telangana, India", unbounded.
         → Catches places near state borders where the bounding box clips results.

      4. "<place>, India", unbounded.
         → National fallback for airports, famous landmarks, etc.
    """
    text = text.strip()
    if not text:
        return None

    state_query    = f"{text}, Telangana, India"
    national_query = f"{text}, India"

    # 1. Hyderabad city tight box
    result = _nominatim_query(text, _HYDERABAD_VIEWBOX, bounded=True)
    if result:
        return result

    # 2. Telangana state box (bounded)
    result = _nominatim_query(state_query, _TELANGANA_VIEWBOX, bounded=True)
    if result:
        return result

    # 3. Telangana state context, no bounding box
    result = _nominatim_query(state_query, viewbox=None, bounded=False)
    if result:
        return result

    # 4. India-wide fallback
    return _nominatim_query(national_query, viewbox=None, bounded=False)


class TravelAgentAssistant:
    def __init__(self):
        pass

    def process_message(
        self,
        message: str,
        current_lat: float = None,
        current_lng: float = None,
        origin_override: tuple = None,
        dest_override: tuple = None,
    ) -> ChatResponse:
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
        # Priority: client-resolved override (geocoded in the browser) >
        # hardcoded LANDMARKS list > server-side geocoding (best-effort,
        # may be blocked by Nominatim on some hosts -- see geocode_place).
        to_match   = re.search(r"to\s+([a-zA-Z\s]+)",   msg)
        from_match = re.search(r"from\s+([a-zA-Z\s]+)", msg)

        if origin_override:
            o_lat, o_lng, o_name = origin_override
            start_coord = (o_lat, o_lng)
            origin_name = (o_name or "Origin").title()
        elif from_match:
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

        if dest_override:
            d_lat, d_lng, d_name = dest_override
            end_coord = (d_lat, d_lng)
            destination_name = (d_name or "Destination").title()
            detected_route_intent = True
        elif to_match:
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
                best_opt = suggested_route.options[2]  # bus

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
            "Hello! I am your UrbanFlow AI Mobility Assistant. I can plan routes, predict traffic delays, find safety corridors, or calculate carbon footprints. Try asking: *'Find the safest route to Airport'* or *'How do I get to Warangal cheaply?'*",
            "I'm monitoring city conditions in real-time. Traffic on the Downtown Expressway is currently high (+15 min delays). How can I help you plan your commute?",
            "Remember, traveling via public transit (Metro/Bus) or active travel (Bicycle) awards you Green travel points! How can I assist you with your journey today?"
        ]

        return ChatResponse(reply=random.choice(generic_replies))


# Module-level singleton imported by routers/chat.py
travel_agent = TravelAgentAssistant()
