// Shared geocoding helper used by both the route-search sidebar and the AI
// chatbot. Runs from the browser (not the backend server) so requests go out
// under the user's own IP -- this matters because OpenStreetMap's free
// Nominatim service frequently blocks requests coming from shared cloud
// hosting IPs (Render, Heroku, etc.), which is why server-side geocoding for
// the chatbot used to fail silently in production.

// Hardcoded landmark coordinate options matching NLP agent (Hyderabad, India)
export const PRESETS = [
  { name: "Current Location", lat: 17.3850, lng: 78.4867 },
  { name: "Home (Banjara Hills)", lat: 17.4138, lng: 78.4398 },
  { name: "Office (HITEC City)", lat: 17.4435, lng: 78.3772 },
  { name: "Rajiv Gandhi Int'l Airport", lat: 17.2403, lng: 78.4294 },
  { name: "Hussain Sagar Lake", lat: 17.4239, lng: 78.4738 },
  { name: "Osmania University", lat: 17.4137, lng: 78.5283 },
  { name: "Charminar (Downtown)", lat: 17.3616, lng: 78.4747 },
  { name: "Inorbit Mall (Shopping)", lat: 17.4330, lng: 78.3828 }
];

// Geocode a free-text location using OpenStreetMap Nominatim API.
// Falls back to the PRESETS list so known landmarks always resolve quickly.
export async function geocodeLocation(text) {
  // 1. Fast path: exact or partial match in local preset list
  const normalised = text.trim().toLowerCase();
  const preset = PRESETS.find(p => p.name.toLowerCase().includes(normalised));
  if (preset) return preset;

  // 2. Nominatim lookup (Hyderabad, India bias)
  try {
    const params = new URLSearchParams({
      q: text,
      format: "json",
      limit: "1",
      countrycodes: "in",
      viewbox: "78.20,17.60,78.75,17.20",  // Hyderabad bounding box
      bounded: "1",
    });
    const resp = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
      headers: { "Accept-Language": "en", "User-Agent": "UrbanFlowAI/1.0" }
    });
    if (resp.ok) {
      const results = await resp.json();
      if (results.length > 0) {
        const r = results[0];
        return {
          name: text,
          lat: parseFloat(r.lat),
          lng: parseFloat(r.lon),
          isSnapped: false
        };
      }
    }
  } catch (e) {
    console.warn("Nominatim geocoding failed:", e);
  }

  // 3. If Nominatim also fails (network error etc.) return null so the caller
  //    can show an error rather than plot a random point.
  return null;
}

// Lightweight extraction of "to X" / "from Y" place names from a free-text
// chat message, mirroring the backend's regex so the two stay in sync.
export function extractChatPlaces(message) {
  const msg = message.toLowerCase();
  let toPlace = null;
  let fromPlace = null;

  const toMatch = msg.match(/to\s+([a-zA-Z\s]+)/);
  const fromMatch = msg.match(/from\s+([a-zA-Z\s]+)/);

  if (fromMatch) {
    let place = fromMatch[1].trim();
    if (place.includes(" to ")) {
      place = place.split(" to ")[0].trim();
    }
    fromPlace = place;
  }
  if (toMatch) {
    toPlace = toMatch[1].trim();
  }

  return { toPlace, fromPlace };
}
