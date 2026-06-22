// Shared geocoding helper used by both the route-search sidebar and the AI
// chatbot. Runs from the browser (not the backend server) so requests go out
// under the user's own IP -- this matters because OpenStreetMap's free
// Nominatim service frequently blocks requests coming from shared cloud
// hosting IPs (Render, Heroku, etc.), which is why server-side geocoding for
// the chatbot used to fail silently in production.

// Hardcoded landmark coordinate options (Hyderabad + key Telangana cities)
export const PRESETS = [
  { name: "Current Location",           lat: 17.3850, lng: 78.4867 },
  { name: "Home (Banjara Hills)",        lat: 17.4138, lng: 78.4398 },
  { name: "Office (HITEC City)",         lat: 17.4435, lng: 78.3772 },
  { name: "Rajiv Gandhi Int'l Airport", lat: 17.2403, lng: 78.4294 },
  { name: "Hussain Sagar Lake",          lat: 17.4239, lng: 78.4738 },
  { name: "Osmania University",          lat: 17.4137, lng: 78.5283 },
  { name: "Charminar (Downtown)",        lat: 17.3616, lng: 78.4747 },
  { name: "Inorbit Mall (Shopping)",     lat: 17.4330, lng: 78.3828 },
  // Major Telangana cities/districts
  { name: "Warangal",                    lat: 17.9784, lng: 79.5941 },
  { name: "Nizamabad",                   lat: 18.6725, lng: 78.0941 },
  { name: "Karimnagar",                  lat: 18.4386, lng: 79.1288 },
  { name: "Khammam",                     lat: 17.2473, lng: 80.1514 },
  { name: "Nalgonda",                    lat: 17.0575, lng: 79.2671 },
  { name: "Mahbubnagar",                 lat: 16.7488, lng: 77.9842 },
  { name: "Adilabad",                    lat: 19.6641, lng: 78.5320 },
  { name: "Siddipet",                    lat: 18.1018, lng: 78.8521 },
  { name: "Suryapet",                    lat: 17.1397, lng: 79.6220 },
  { name: "Miryalaguda",                 lat: 16.8726, lng: 79.5664 },
  { name: "Jagtial",                     lat: 18.7943, lng: 78.9150 },
  { name: "Mancherial",                  lat: 18.8714, lng: 79.4549 },
  { name: "Nirmal",                      lat: 19.0959, lng: 78.3393 },
  { name: "Ramagundam",                  lat: 18.7553, lng: 79.4740 },
];

// ─── Bounding boxes ───────────────────────────────────────────────────────────
// Nominatim viewbox format: "minLng,maxLat,maxLng,minLat"
// Telangana state bounds (covers all 33 districts)
const TELANGANA_VIEWBOX = "77.2,19.9,81.3,15.8";
// Hyderabad city tight bounds (kept for fast nearby lookups)
const HYDERABAD_VIEWBOX = "78.10,17.75,78.85,17.10";

// ─── Internal Nominatim call ──────────────────────────────────────────────────
async function _nominatimSearch(query, viewbox, bounded) {
  const params = new URLSearchParams({
    q: query,
    format: "json",
    limit: "1",
    countrycodes: "in",
    addressdetails: "0",
    ...(viewbox  ? { viewbox }  : {}),
    ...(bounded  ? { bounded: "1" } : {}),
  });
  const resp = await fetch(
    `https://nominatim.openstreetmap.org/search?${params}`,
    { headers: { "Accept-Language": "en", "User-Agent": "UrbanFlowAI/1.0 (urbanflow-project)" } }
  );
  if (!resp.ok) return null;
  const results = await resp.json();
  if (results.length === 0) return null;
  return { lat: parseFloat(results[0].lat), lng: parseFloat(results[0].lon) };
}

// ─── Public geocoding function ────────────────────────────────────────────────
/**
 * Geocode a free-text location string.
 *
 * Search strategy (most-specific to most-general):
 *  1. PRESETS fast-path (instant, no network).
 *  2. Nominatim — query as-is, bounded to Hyderabad city box.
 *  3. Nominatim — append ", Telangana, India" and search bounded to Telangana.
 *  4. Nominatim — append ", Telangana, India", unbounded (catches edge cases
 *     near state borders where the bounding box clips results).
 *  5. Nominatim — plain "text, India" countrywide fallback (airports, national
 *     landmarks the user might name without state context).
 *
 * Returns { name, lat, lng } or null if nothing resolves.
 */
export async function geocodeLocation(text) {
  const query = text.trim();
  if (!query) return null;

  // ── Step 1: PRESETS exact/partial match ───────────────────────────────────
  const normalised = query.toLowerCase();
  const preset = PRESETS.find(p => p.name.toLowerCase().includes(normalised));
  if (preset) return preset;

  try {
    // ── Step 2: Hyderabad city tight box (fast path for city searches) ────
    let result = await _nominatimSearch(query, HYDERABAD_VIEWBOX, true);
    if (result) return { name: query, ...result, isSnapped: false };

    // ── Step 3: Telangana-wide bounded search ─────────────────────────────
    // Append state context so Nominatim ranks Telangana results above same-name
    // places in other states (e.g. "Karimnagar" exists in multiple states).
    const stateQuery = `${query}, Telangana, India`;
    result = await _nominatimSearch(stateQuery, TELANGANA_VIEWBOX, true);
    if (result) return { name: query, ...result, isSnapped: false };

    // ── Step 4: Telangana-wide unbounded (catches border-area places) ─────
    result = await _nominatimSearch(stateQuery, null, false);
    if (result) return { name: query, ...result, isSnapped: false };

    // ── Step 5: India-wide fallback (national landmarks, airports, etc.) ──
    result = await _nominatimSearch(`${query}, India`, null, false);
    if (result) return { name: query, ...result, isSnapped: false };

  } catch (e) {
    console.warn("Nominatim geocoding failed:", e);
  }

  // Nothing resolved — return null so the caller can show a meaningful error.
  return null;
}

// ─── Chat place extractor ─────────────────────────────────────────────────────
// Lightweight extraction of "to X" / "from Y" place names from a free-text
// chat message, mirroring the backend's regex so the two stay in sync.
export function extractChatPlaces(message) {
  const msg = message.toLowerCase();
  let toPlace   = null;
  let fromPlace = null;

  const toMatch   = msg.match(/to\s+([a-zA-Z\s]+)/);
  const fromMatch = msg.match(/from\s+([a-zA-Z\s]+)/);

  if (fromMatch) {
    let place = fromMatch[1].trim();
    if (place.includes(" to ")) place = place.split(" to ")[0].trim();
    fromPlace = place;
  }
  if (toMatch) {
    toPlace = toMatch[1].trim();
  }

  return { toPlace, fromPlace };
}
