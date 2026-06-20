"""
UrbanFlow AI – Real Road Routing via OSRM

Uses the public OSRM demo server (router.project-osrm.org) which is free,
requires no API key, and returns actual OpenStreetMap road geometry.

OSRM profiles used:
  driving  → auto, taxi, ride_sharing, bus
  cycling  → bicycle
  foot     → walking

Metro: synthetic (metro rails are not in OSRM road graph); we calculate
straight-line distance and apply metro speed/cost constants, but flag the
path as metro so the frontend can style it differently.

For bus we use the driving profile (buses follow roads) with bus-specific
speed, cost, and emission constants.
"""

import math
import httpx
import logging
from typing import List, Dict, Any, Optional
from app.schemas import RoutePoint, ModeRouteDetails, RouteResponse

logger = logging.getLogger(__name__)

# ── Constants ─────────────────────────────────────────────────────────────────

OSRM_BASE = "https://router.project-osrm.org"

MODE_SPECS = {
    "walking":      {"profile": "foot",    "speed": 5.0,  "cost_per_km": 0.0,  "co2_per_km": 0.0,   "safety": 85.0},
    "bicycle":      {"profile": "cycling", "speed": 15.0, "cost_per_km": 0.0,  "co2_per_km": 0.0,   "safety": 75.0},
    "bus":          {"profile": "driving", "speed": 25.0, "cost_per_km": 3.0,  "co2_per_km": 30.0,  "safety": 90.0},
    "metro":        {"profile": None,      "speed": 40.0, "cost_per_km": 5.0,  "co2_per_km": 15.0,  "safety": 95.0},
    "auto":         {"profile": "driving", "speed": 30.0, "cost_per_km": 15.0, "co2_per_km": 80.0,  "safety": 70.0},
    "taxi":         {"profile": "driving", "speed": 40.0, "cost_per_km": 22.0, "co2_per_km": 120.0, "safety": 85.0},
    "ride_sharing": {"profile": "driving", "speed": 40.0, "cost_per_km": 18.0, "co2_per_km": 70.0,  "safety": 80.0},
}

# Hyderabad Metro stations (approx.)
METRO_STATIONS = [
    {"name": "Miyapur",        "lat": 17.4969, "lng": 78.3550},
    {"name": "KPHB Colony",    "lat": 17.4923, "lng": 78.3920},
    {"name": "Kukatpally",     "lat": 17.4849, "lng": 78.4108},
    {"name": "Moosapet",       "lat": 17.4632, "lng": 78.4275},
    {"name": "Erragadda",      "lat": 17.4505, "lng": 78.4380},
    {"name": "Ameerpet",       "lat": 17.4374, "lng": 78.4487},
    {"name": "Punjagutta",     "lat": 17.4257, "lng": 78.4519},
    {"name": "Khairatabad",    "lat": 17.4123, "lng": 78.4621},
    {"name": "Lakdikapul",     "lat": 17.4053, "lng": 78.4631},
    {"name": "Nampally",       "lat": 17.3911, "lng": 78.4669},
    {"name": "MG Bus Station", "lat": 17.3753, "lng": 78.4823},
    {"name": "Malakpet",       "lat": 17.3705, "lng": 78.4985},
    {"name": "Dilsukhnagar",   "lat": 17.3687, "lng": 78.5247},
    {"name": "LB Nagar",       "lat": 17.3477, "lng": 78.5535},
    {"name": "Raidurg",        "lat": 17.4324, "lng": 78.3702},
    {"name": "HITEC City",     "lat": 17.4483, "lng": 78.3796},
    {"name": "Madhapur",       "lat": 17.4486, "lng": 78.3914},
    {"name": "Begumpet",       "lat": 17.4434, "lng": 78.4615},
    {"name": "Parade Ground",  "lat": 17.4434, "lng": 78.4994},
    {"name": "Tarnaka",        "lat": 17.4308, "lng": 78.5183},
    {"name": "Uppal",          "lat": 17.4007, "lng": 78.5592},
    {"name": "Nagole",         "lat": 17.3725, "lng": 78.5575},
]
METRO_PROXIMITY_KM = 2.0

# ── Helpers ───────────────────────────────────────────────────────────────────

def haversine_km(lat1, lng1, lat2, lng2) -> float:
    R = 6371.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp = math.radians(lat2 - lat1)
    dl = math.radians(lng2 - lng1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def decode_polyline(encoded: str) -> List[Dict[str, float]]:
    """Decode a Google-encoded polyline string into [{lat, lng}, …]."""
    coords = []
    index = 0
    lat = 0
    lng = 0
    while index < len(encoded):
        for is_lng in (False, True):
            shift = 0
            result = 0
            while True:
                b = ord(encoded[index]) - 63
                index += 1
                result |= (b & 0x1F) << shift
                shift += 5
                if b < 0x20:
                    break
            delta = ~(result >> 1) if (result & 1) else (result >> 1)
            if is_lng:
                lng += delta
            else:
                lat += delta
        coords.append({"lat": lat / 1e5, "lng": lng / 1e5})
    return coords


def nearest_metro(lat: float, lng: float) -> Optional[Dict]:
    best, best_d = None, float("inf")
    for s in METRO_STATIONS:
        d = haversine_km(lat, lng, s["lat"], s["lng"])
        if d < best_d:
            best_d, best = d, s
    return best, best_d


def is_metro_available(slat, slng, elat, elng) -> bool:
    _, sd = nearest_metro(slat, slng)
    _, ed = nearest_metro(elat, elng)
    return sd <= METRO_PROXIMITY_KM and ed <= METRO_PROXIMITY_KM


# ── OSRM fetcher ──────────────────────────────────────────────────────────────

def fetch_osrm_routes(profile: str, slat: float, slng: float, elat: float, elng: float) -> List[Dict]:
    """
    Call OSRM route API with alternatives=true.
    Returns a list of OSRM route objects (up to 3).
    Each object has: distance (m), duration (s), geometry (encoded polyline),
    and legs[0].steps (turn-by-turn).
    """
    url = (
        f"{OSRM_BASE}/route/v1/{profile}"
        f"/{slng},{slat};{elng},{elat}"
        f"?overview=full&geometries=polyline&steps=true&alternatives=true"
    )
    try:
        with httpx.Client(timeout=10.0) as client:
            resp = client.get(url)
            resp.raise_for_status()
            data = resp.json()
            if data.get("code") == "Ok":
                return data.get("routes", [])
    except Exception as exc:
        logger.warning("OSRM request failed (%s %s→%s): %s", profile, (slat, slng), (elat, elng), exc)
    return []


# ── Route builder ─────────────────────────────────────────────────────────────

def build_route_option(
    mode: str,
    osrm_route: Optional[Dict],
    slat: float, slng: float,
    elat: float, elng: float,
    start_name: str,
    end_name: str,
    route_index: int = 0,
) -> Dict[str, Any]:
    spec = MODE_SPECS[mode]

    # ── Geometry & distance ──────────────────────────────────────────────────
    if osrm_route:
        dist_km = osrm_route["distance"] / 1000.0
        # Use OSRM duration only as a sanity baseline; override with mode speed
        # so e.g. bus on a driving-profile route gets bus speed, not car speed.
        raw_duration_h = osrm_route["duration"] / 3600.0
        # Effective speed: mode speed adjusted by observed ratio vs driving
        duration_h = dist_km / spec["speed"]

        raw_coords = decode_polyline(osrm_route["geometry"])
        path = [RoutePoint(lat=c["lat"], lng=c["lng"]) for c in raw_coords]

        # Turn-by-turn steps
        steps = []
        for leg in osrm_route.get("legs", []):
            for step in leg.get("steps", []):
                name = step.get("name", "").strip()
                maneuver = step.get("maneuver", {})
                mtype = maneuver.get("type", "")
                modifier = maneuver.get("modifier", "")

                if mtype == "depart":
                    instr = f"Start on {name}" if name else f"Depart from {start_name}"
                elif mtype == "arrive":
                    instr = f"Arrive at {end_name}"
                elif mtype == "turn":
                    instr = f"Turn {modifier} onto {name}" if name else f"Turn {modifier}"
                elif mtype in ("new name", "continue"):
                    instr = f"Continue on {name}" if name else "Continue straight"
                elif mtype == "roundabout":
                    exit_n = step.get("maneuver", {}).get("exit", "")
                    instr = f"At the roundabout, take exit {exit_n}" + (f" onto {name}" if name else "")
                elif mtype == "merge":
                    instr = f"Merge onto {name}" if name else "Merge"
                elif mtype == "fork":
                    instr = f"Keep {modifier}" + (f" onto {name}" if name else "")
                elif mtype == "end of road":
                    instr = f"At the end of the road, turn {modifier}" + (f" onto {name}" if name else "")
                else:
                    if name:
                        instr = f"{mtype.capitalize()} – {name}"
                    else:
                        continue  # skip empty/useless steps

                if instr:
                    steps.append(instr)
    else:
        # Fallback: straight line
        dist_km = haversine_km(slat, slng, elat, elng)
        duration_h = dist_km / spec["speed"]
        path = [RoutePoint(lat=slat, lng=slng), RoutePoint(lat=elat, lng=elng)]
        steps = [
            f"Depart from {start_name}",
            f"Head towards {end_name}",
            f"Arrive at {end_name}",
        ]

    duration_mins = duration_h * 60.0

    # ── Cost ────────────────────────────────────────────────────────────────
    if mode in ("walking", "bicycle"):
        cost = 0.0
    elif mode == "bus":
        cost = max(10.0, min(40.0, dist_km * 4.0))
    elif mode == "metro":
        cost = max(15.0, min(60.0, dist_km * 5.0))
    elif mode == "auto":
        cost = 30.0 + dist_km * 15.0
    elif mode == "taxi":
        cost = 100.0 + dist_km * 22.0
    elif mode == "ride_sharing":
        cost = 50.0 + dist_km * 18.0
    else:
        cost = dist_km * spec["cost_per_km"]

    # ── Safety ──────────────────────────────────────────────────────────────
    # Slightly vary safety per alternative so routes feel distinct
    safety_score = max(10.0, min(100.0, spec["safety"] - route_index * 3.0))

    # ── Emissions ───────────────────────────────────────────────────────────
    co2_kg = dist_km * spec["co2_per_km"] / 1000.0

    # ── Traffic ─────────────────────────────────────────────────────────────
    if mode in ("walking", "bicycle", "metro"):
        traffic_level = "low"
    else:
        # Simple heuristic: longer routes hit more traffic
        if dist_km < 5:
            traffic_level = "low"
        elif dist_km < 15:
            traffic_level = "medium"
        else:
            traffic_level = "heavy"

    # ── Route summary label ─────────────────────────────────────────────────
    # Derive a landmark waypoint list from path midpoints using step names
    # We just use start → end as minimum; steps provide the real narrative
    summary = f"Route {route_index + 1}: {start_name} → {end_name}"

    return {
        "mode": mode,
        "duration_mins": round(duration_mins, 1),
        "cost": round(cost, 2),
        "distance_km": round(dist_km, 2),
        "safety_score": round(safety_score, 1),
        "carbon_emissions_kg": round(co2_kg, 3),
        "traffic_level": traffic_level,
        "path": path,
        "instructions": steps if steps else [summary],
        "summary": summary,
        "route_index": route_index,
    }


# ── Main router ───────────────────────────────────────────────────────────────

class SmartCityRouter:

    def plan_routes(
        self,
        start_lat: float, start_lng: float,
        end_lat: float, end_lng: float,
        preference: str,
        start_name: str = "Origin",
        end_name: str = "Destination",
    ) -> RouteResponse:

        metro_ok = is_metro_available(start_lat, start_lng, end_lat, end_lng)

        # Fetch OSRM routes per road profile (cache by profile to avoid dup calls)
        profile_routes: Dict[str, List[Dict]] = {}
        for profile in {"driving", "cycling", "foot"}:
            profile_routes[profile] = fetch_osrm_routes(
                profile, start_lat, start_lng, end_lat, end_lng
            )

        options: List[ModeRouteDetails] = []

        modes_to_plan = ["walking", "bicycle", "bus", "auto", "taxi", "ride_sharing"]
        if metro_ok:
            modes_to_plan.append("metro")

        for mode in modes_to_plan:
            spec = MODE_SPECS[mode]
            profile = spec["profile"]

            if mode == "metro":
                # Metro: use straight-line distance with metro constants
                osrm_routes_for_mode = []
            else:
                osrm_routes_for_mode = profile_routes.get(profile, [])

            if mode in ("auto", "taxi", "ride_sharing"):
                # For road vehicles we expose up to 3 real road alternatives
                n_alts = min(3, len(osrm_routes_for_mode)) if osrm_routes_for_mode else 1
                for idx in range(max(1, n_alts)):
                    osrm_r = osrm_routes_for_mode[idx] if idx < len(osrm_routes_for_mode) else None
                    result = build_route_option(
                        mode, osrm_r,
                        start_lat, start_lng, end_lat, end_lng,
                        start_name, end_name, route_index=idx
                    )
                    # Give each alt a distinct label
                    if n_alts > 1:
                        result["mode"] = f"{mode}_alt{idx + 1}" if idx > 0 else mode
                    options.append(ModeRouteDetails(**{k: v for k, v in result.items() if k != "route_index"}))
            else:
                osrm_r = osrm_routes_for_mode[0] if osrm_routes_for_mode else None
                result = build_route_option(
                    mode, osrm_r,
                    start_lat, start_lng, end_lat, end_lng,
                    start_name, end_name, route_index=0
                )
                options.append(ModeRouteDetails(**{k: v for k, v in result.items() if k != "route_index"}))

        # Sort: prefer the user's preference
        def sort_key(opt):
            if preference == "fastest":
                return opt.duration_mins
            elif preference == "cheapest":
                return opt.cost
            elif preference == "safest":
                return -opt.safety_score
            elif preference == "eco":
                return opt.carbon_emissions_kg
            else:  # balanced
                return opt.duration_mins * 0.4 + opt.cost * 0.3 + (100 - opt.safety_score) * 0.3

        options.sort(key=sort_key)

        return RouteResponse(
            preference=preference,
            options=options,
            metro_available=metro_ok,
        )


# Singleton
router = SmartCityRouter()
