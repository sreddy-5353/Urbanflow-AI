// Shared geocoding helper used by both the route-search sidebar and the AI
// chatbot. Runs from the browser (not the backend server) so requests go out
// under the user's own IP -- this matters because OpenStreetMap's free
// Nominatim service frequently blocks requests coming from shared cloud
// hosting IPs (Render, Heroku, etc.).

// ─── Preset landmarks (instant resolve, no network needed) ───────────────────
export const PRESETS = [
  { name: "Current Location",           lat: 17.3850, lng: 78.4867 },
  { name: "Home (Banjara Hills)",        lat: 17.4138, lng: 78.4398 },
  { name: "Office (HITEC City)",         lat: 17.4435, lng: 78.3772 },
  { name: "Rajiv Gandhi Int'l Airport", lat: 17.2403, lng: 78.4294 },
  { name: "Hussain Sagar Lake",          lat: 17.4239, lng: 78.4738 },
  { name: "Osmania University",          lat: 17.4137, lng: 78.5283 },
  { name: "Charminar (Downtown)",        lat: 17.3616, lng: 78.4747 },
  { name: "Inorbit Mall (Shopping)",     lat: 17.4330, lng: 78.3828 },
  // Major Telangana cities / district HQs
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
  { name: "Sangareddy",                  lat: 17.6248, lng: 78.0865 },
  { name: "Medak",                       lat: 18.0439, lng: 78.2624 },
  { name: "Vikarabad",                   lat: 17.3381, lng: 77.9031 },
  { name: "Wanaparthy",                  lat: 16.3630, lng: 78.0637 },
  { name: "Nagarkurnool",                lat: 16.4840, lng: 78.3250 },
  { name: "Bhadrachalam",                lat: 17.6686, lng: 80.8933 },
  { name: "Kothagudem",                  lat: 17.5519, lng: 80.6197 },
  { name: "Bhongir",                     lat: 17.5121, lng: 78.8894 },
  { name: "Jangaon",                     lat: 17.7239, lng: 79.1525 },
  { name: "Kamareddy",                   lat: 18.3195, lng: 78.3377 },
  { name: "Narayanpet",                  lat: 16.7439, lng: 77.4961 },
  { name: "Gadwal",                      lat: 16.2318, lng: 77.7957 },
  { name: "Tandur",                      lat: 17.2484, lng: 77.5791 },
  { name: "Shadnagar",                   lat: 17.0682, lng: 78.2083 },
  { name: "Zaheerabad",                  lat: 17.6797, lng: 77.6082 },
];

// ─── Bounding boxes (Nominatim format: "minLng,maxLat,maxLng,minLat") ────────
const HYDERABAD_VIEWBOX = "78.10,17.75,78.85,17.10"; // tight city box
const TELANGANA_VIEWBOX = "77.2,19.9,81.3,15.8";     // all 33 districts

// ─── Internal single Nominatim call ──────────────────────────────────────────
async function _nominatimSearch(query, viewbox, bounded) {
  const params = new URLSearchParams({
    q: query,
    format: "json",
    limit: "1",
    countrycodes: "in",
    addressdetails: "0",
    ...(viewbox ? { viewbox } : {}),
    ...(bounded ? { bounded: "1" } : {}),
  });
  try {
    const resp = await fetch(
      `https://nominatim.openstreetmap.org/search?${params}`,
      { headers: { "Accept-Language": "en", "User-Agent": "UrbanFlowAI/1.0 (urbanflow-project)" } }
    );
    if (!resp.ok) return null;
    const results = await resp.json();
    if (!results.length) return null;
    return { lat: parseFloat(results[0].lat), lng: parseFloat(results[0].lon) };
  } catch (e) {
    console.warn("Nominatim fetch error:", e);
    return null;
  }
}

// ─── Public geocoding entry point ─────────────────────────────────────────────
/**
 * Resolve any free-text location to { name, lat, lng }.
 *
 * 4-step cascade (most-specific → most-general):
 *  1. PRESETS fast-path — instant, no network.
 *  2. Nominatim: raw query, bounded to Hyderabad city box.
 *  3. Nominatim: "<place>, Telangana, India", bounded to Telangana state box.
 *  4. Nominatim: "<place>, Telangana, India", unbounded (border-area safety net).
 *  5. Nominatim: "<place>, India", India-wide fallback.
 *
 * Returns { name, lat, lng, isSnapped } or null if nothing resolves.
 */
export async function geocodeLocation(text) {
  const query = text.trim();
  if (!query) return null;

  // Step 1 — PRESETS (case-insensitive partial match)
  const lower = query.toLowerCase();
  const preset = PRESETS.find(p => p.name.toLowerCase().includes(lower));
  if (preset) return { ...preset };

  // Steps 2-5 — Nominatim cascade
  const stateQuery    = `${query}, Telangana, India`;
  const nationalQuery = `${query}, India`;

  const coords =
    (await _nominatimSearch(query,       HYDERABAD_VIEWBOX, true))  ||
    (await _nominatimSearch(stateQuery,  TELANGANA_VIEWBOX, true))  ||
    (await _nominatimSearch(stateQuery,  null,              false)) ||
    (await _nominatimSearch(nationalQuery, null,            false));

  if (coords) return { name: query, ...coords, isSnapped: false };
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
  if (toMatch) toPlace = toMatch[1].trim();

  return { toPlace, fromPlace };
}
