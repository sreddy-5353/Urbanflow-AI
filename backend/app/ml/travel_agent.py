# ─────────────────────────────────────────────────────────────────────────────
# PATCH for: backend/app/ml/travel_agent.py
#
# Replace the two constants and the two functions below with this version.
# Everything else in travel_agent.py stays unchanged.
# ─────────────────────────────────────────────────────────────────────────────

import re
import random
import httpx
from typing import Dict, Any, Tuple, Optional

# ---------------------------------------------------------------------------
# Bounding boxes (Nominatim viewbox format: "minLng,maxLat,maxLng,minLat")
# ---------------------------------------------------------------------------
_HYDERABAD_VIEWBOX  = "78.10,17.75,78.85,17.10"   # Hyderabad city (tight)
_TELANGANA_VIEWBOX  = "77.2,19.9,81.3,15.8"        # All 33 Telangana districts


def _nominatim_query(query: str, viewbox: str | None, bounded: bool) -> Optional[Tuple[float, float]]:
    """
    Single Nominatim call. Returns (lat, lng) or None.

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
        print(f"[geocode_place] No Nominatim results for '{query}' (viewbox={viewbox}, bounded={bounded})")
        return None

    return (float(results[0]["lat"]), float(results[0]["lon"]))


def geocode_place(text: str) -> Optional[Tuple[float, float]]:
    """
    Resolve any free-text place name to (lat, lng).

    Search strategy — most-specific first so common city searches are fast,
    and village/mandal/district searches in outer Telangana still work:

      1. Raw query, bounded to Hyderabad city box.
         → Catches "Madhapur", "Gachibowli", "LB Nagar" instantly.

      2. "<place>, Telangana, India", bounded to Telangana state box.
         → Catches any of the 33 districts, municipalities, mandals.
         Appending state context prevents Nominatim from returning a
         same-named place in another Indian state (e.g. Karimnagar, Kurnool).

      3. "<place>, Telangana, India", unbounded.
         → Catches places near state borders where the bounding box clips.

      4. "<place>, India", unbounded.
         → National fallback — airports, famous landmarks, etc.
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

# ─────────────────────────────────────────────────────────────────────────────
# HOW TO APPLY:
#
# In backend/app/ml/travel_agent.py:
#   1. Delete the line:  _HYD_VIEWBOX = "78.2,17.6,78.7,17.2"
#   2. Replace the existing _nominatim_query() function with the one above.
#   3. Replace the existing geocode_place() function with the one above.
#   4. Keep all other code (LANDMARKS dict, TravelAgentAssistant class, etc.)
#      exactly as-is.
# ─────────────────────────────────────────────────────────────────────────────
