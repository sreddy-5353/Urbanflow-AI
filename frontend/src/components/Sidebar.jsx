import React, { useState, useEffect, useCallback } from 'react';
import { useMobility } from '../context/MobilityContext';
import { 
  Navigation, TrafficCone, Shield, Leaf, IndianRupee, 
  Bell, AlertCircle, Bot, LogOut, Check, Sparkles, MapPin, 
  Activity, ShieldAlert, Award
} from 'lucide-react';

// Hardcoded landmark coordinate options matching NLP agent (Hyderabad, India)
const PRESETS = [
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
async function geocodeLocation(text) {
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

export default function Sidebar({ onOpenChat }) {
  const {
    currentUser,
    logout,
    activeTab,
    setActiveTab,
    adminViewActive,
    setAdminViewActive,
    
    startPoint,
    setStartPoint,
    endPoint,
    setEndPoint,
    
    routesData,
    selectedRouteOption,
    setSelectedRouteOption,
    routingPreference,
    setRoutingPreference,
    routingLoading,
    calculateRoute,
    systemAlerts,
    detectLocation,
    locatingStatus,
    locatingLog
  } = useMobility();

  const [startInput, setStartInput] = useState("");
  const [endInput, setEndInput] = useState("");
  const [showStartSuggestions, setShowStartSuggestions] = useState(false);
  const [showEndSuggestions, setShowEndSuggestions] = useState(false);
  const [geocodeStatus, setGeocodeStatus] = useState(""); // "", "resolving", "error"
  const [recentSearches, setRecentSearches] = useState(() => {
    const saved = localStorage.getItem("recentSearches");
    return saved ? JSON.parse(saved) : ["Charminar (Downtown)", "Rajiv Gandhi Int'l Airport"];
  });

  useEffect(() => {
    if (startPoint) {
      setStartInput(startPoint.name);
    }
  }, [startPoint]);

  useEffect(() => {
    if (endPoint) {
      setEndInput(endPoint.name);
    }
  }, [endPoint]);

  const getFilteredSuggestions = (input) => {
    if (!input.trim()) return [];
    return PRESETS.filter(p => p.name.toLowerCase().includes(input.toLowerCase()));
  };

  const selectDestination = (preset) => {
    setEndPoint(preset);
    setEndInput(preset.name);
    setShowEndSuggestions(false);
    
    if (!recentSearches.includes(preset.name)) {
      const updated = [preset.name, ...recentSearches.slice(0, 3)];
      setRecentSearches(updated);
      localStorage.setItem("recentSearches", JSON.stringify(updated));
    }
  };

  const selectStartPoint = (preset) => {
    setStartPoint(preset);
    setStartInput(preset.name);
    setShowStartSuggestions(false);
  };

  const handleRouteSearch = async (e) => {
    e.preventDefault();
    setGeocodeStatus("resolving");

    // 1. Geocode Start Point
    let start = startPoint;
    if (!startPoint || startInput !== startPoint.name) {
      const resolved = await geocodeLocation(startInput);
      if (!resolved) {
        setGeocodeStatus("error_start");
        return;
      }
      start = resolved;
      setStartPoint(start);
    }

    // 2. Geocode End Point (Destination)
    let end = endPoint;
    if (!end || endInput !== endPoint.name) {
      const resolved = await geocodeLocation(endInput);
      if (!resolved) {
        setGeocodeStatus("error_end");
        return;
      }
      end = resolved;
      setEndPoint(end);
    }

    setGeocodeStatus("");

    if (start && end) {
      calculateRoute(start, end, routingPreference);

      if (!recentSearches.includes(end.name)) {
        const updated = [end.name, ...recentSearches.slice(0, 3)];
        setRecentSearches(updated);
        localStorage.setItem("recentSearches", JSON.stringify(updated));
      }
    }
  };

  const menuItems = [
    { id: "routes", label: "Route Planner", icon: Navigation, color: "text-brand-neonCyan" },
    { id: "traffic", label: "Traffic Prediction", icon: TrafficCone, color: "text-brand-neonCyan" },
    { id: "safety", label: "Safety Scorer", icon: Shield, color: "text-brand-neonCyan" },
    { id: "carbon", label: "Carbon Tracker", icon: Leaf, color: "text-brand-green" },
    { id: "cost", label: "Cost Optimizer", icon: IndianRupee, color: "text-brand-teal" },
    { id: "alerts", label: "Road Alerts", icon: Bell, color: "text-brand-red", badge: systemAlerts.length }
  ];

  return (
    <div className="w-full lg:w-96 glass-panel h-full flex flex-col justify-between overflow-y-auto shrink-0 border-r border-darkBg-border select-none">
      
      {/* 1. App logo section */}
      <div className="p-5 border-b border-darkBg-border flex flex-col gap-1 relative">
        <div className="absolute top-0 right-0 w-16 h-16 bg-brand-neonCyan/5 rounded-full blur-2xl pointer-events-none" />
        <div className="flex items-center gap-2">
          <span className="text-xl">🌐</span>
          <h1 className="text-lg font-black tracking-tight text-white flex items-center gap-1.5">
            UrbanFlow AI
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-brand-teal/20 text-brand-neonCyan border border-brand-teal/40 font-bold uppercase tracking-wider">
              AI Smart City
            </span>
          </h1>
        </div>
        <p className="text-[10px] text-slate-400 font-medium leading-relaxed">
          AI-Powered Smart Commutes: Safer, Faster, Cheaper, Greener
        </p>
      </div>

      {/* 2. Mode Select Tabs */}
      <div className="flex-1 flex flex-col gap-4 p-4">
        
        {/* Navigation list */}
        <div className="grid grid-cols-3 gap-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  if (item.id === "admin") setAdminViewActive(true);
                  else if (item.id !== "admin" && currentUser?.role !== "admin") setAdminViewActive(false);
                }}
                className={`flex flex-col items-center justify-center p-2.5 rounded-xl border cursor-pointer gap-1 transition-all duration-200 ${
                  active 
                    ? 'bg-brand-teal/15 border-brand-teal/50 shadow-glass' 
                    : 'bg-darkBg-card/40 border-darkBg-border/55 hover:border-brand-teal/30 hover:bg-darkBg-card/70'
                }`}
              >
                <div className="relative">
                  <Icon className={`w-4 h-4 ${item.color}`} />
                  {item.badge > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 bg-brand-red text-white text-[8px] font-bold px-1 rounded-full border border-darkBg-deep">
                      {item.badge}
                    </span>
                  )}
                </div>
                <span className="text-[9px] font-semibold text-slate-300 tracking-wide text-center leading-none">
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Dynamic Context Side controls */}
        {activeTab === "routes" && (
          <div className="flex flex-col gap-3 mt-2">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              🧭 Trip Navigation setup
            </h3>
            
            {/* Live Location Scan Status */}
            {locatingStatus === "locating" && (
              <div className="bg-brand-teal/5 border border-brand-teal/20 p-2.5 rounded-xl flex flex-col gap-1 text-[10px]">
                <span className="text-brand-neonCyan font-bold animate-pulse">📡 GPS CELLULAR TRIANGULATION SCANNING...</span>
                <span className="text-slate-400 leading-tight">{locatingLog}</span>
              </div>
            )}
            {locatingStatus === "success" && (
              <div className="bg-emerald-500/10 border border-emerald-500/20 p-2.5 rounded-xl flex flex-col gap-0.5 text-[10px]">
                <span className="text-emerald-400 font-bold">✓ live location verified</span>
                <span className="text-slate-400 leading-tight">{locatingLog}</span>
              </div>
            )}

            <form onSubmit={handleRouteSearch} className="flex flex-col gap-3">
              {/* Pickup Point Input */}
              <div className="flex flex-col gap-1 relative">
                <label className="text-[9px] text-slate-400 font-semibold tracking-wider flex items-center justify-between">
                  <span className="flex items-center gap-1"><MapPin className="w-3 h-3 text-brand-teal" /> START / PICKUP</span>
                  {startPoint?.isSnapped && <span className="text-brand-teal text-[8px] font-bold">Snapped to road</span>}
                </label>
                <div className="flex gap-1.5">
                  <input
                    value={startInput}
                    onChange={(e) => {
                      setStartInput(e.target.value);
                      setShowStartSuggestions(true);
                    }}
                    onFocus={() => setShowStartSuggestions(true)}
                    type="text"
                    className="glass-input p-2.5 rounded-xl text-xs text-slate-200 flex-1"
                    placeholder="Enter pickup location..."
                  />
                  <button
                    type="button"
                    onClick={detectLocation}
                    title="Detect Current Location (Simulated GPS/Wi-Fi/Cell)"
                    className="bg-brand-teal/15 hover:bg-brand-teal/30 text-brand-neonCyan border border-brand-teal/40 px-2.5 py-1.5 rounded-xl cursor-pointer transition-all flex items-center justify-center"
                  >
                    🎯
                  </button>
                </div>

                {/* Pickup Autocomplete */}
                {showStartSuggestions && (
                  <div className="absolute top-full left-0 right-0 z-30 bg-darkBg-card/95 border border-darkBg-border p-1.5 rounded-xl mt-1 max-h-[160px] overflow-y-auto shadow-2xl backdrop-blur-lg">
                    <div className="flex justify-between items-center px-1.5 py-1 border-b border-darkBg-border/50 mb-1">
                      <span className="text-[8px] text-slate-400 font-bold uppercase tracking-wider">Suggested Places</span>
                      <button type="button" onClick={() => setShowStartSuggestions(false)} className="text-[8px] text-brand-red border-none bg-transparent hover:underline font-bold">Close</button>
                    </div>
                    {PRESETS.filter(p => p.name.toLowerCase().includes(startInput.toLowerCase())).map((p, i) => (
                      <div
                        key={i}
                        onClick={() => selectStartPoint(p)}
                        className="p-2 text-xs text-slate-300 hover:text-white hover:bg-brand-teal/10 rounded-lg cursor-pointer flex items-center justify-between"
                      >
                        <span>📍 {p.name}</span>
                      </div>
                    ))}
                    {PRESETS.filter(p => p.name.toLowerCase().includes(startInput.toLowerCase())).length === 0 && (
                      <div className="p-2 text-[10px] text-slate-400 italic">No exact match found (press search to geocode).</div>
                    )}
                  </div>
                )}
              </div>

              {/* Destination Input */}
              <div className="flex flex-col gap-1 relative">
                <label className="text-[9px] text-slate-400 font-semibold tracking-wider flex items-center justify-between">
                  <span className="flex items-center gap-1"><MapPin className="w-3 h-3 text-brand-red" /> DESTINATION / DROP-OFF</span>
                  {endPoint?.isSnapped && <span className="text-brand-teal text-[8px] font-bold">Snapped to road</span>}
                </label>
                <input
                  value={endInput}
                  onChange={(e) => {
                    setEndInput(e.target.value);
                    setShowEndSuggestions(true);
                  }}
                  onFocus={() => setShowEndSuggestions(true)}
                  type="text"
                  className="glass-input p-2.5 rounded-xl text-xs text-slate-200"
                  placeholder="Enter drop-off destination..."
                />

                {/* Destination Autocomplete */}
                {showEndSuggestions && (
                  <div className="absolute top-full left-0 right-0 z-30 bg-darkBg-card/95 border border-darkBg-border p-1.5 rounded-xl mt-1 max-h-[220px] overflow-y-auto shadow-2xl backdrop-blur-lg">
                    <div className="flex justify-between items-center px-1.5 py-1 border-b border-darkBg-border/50 mb-1">
                      <span className="text-[8px] text-slate-400 font-bold uppercase tracking-wider">Search Results & Matches</span>
                      <button type="button" onClick={() => setShowEndSuggestions(false)} className="text-[8px] text-brand-red border-none bg-transparent hover:underline font-bold">Close</button>
                    </div>

                    {/* Landmark matches */}
                    {getFilteredSuggestions(endInput).map((p, i) => (
                      <div
                        key={i}
                        onClick={() => selectDestination(p)}
                        className="p-2 text-xs text-slate-300 hover:text-white hover:bg-brand-teal/10 rounded-lg cursor-pointer flex items-center justify-between font-semibold"
                      >
                        <span>🏁 {p.name}</span>
                        <span className="text-[8px] text-slate-500 font-bold">Landmark</span>
                      </div>
                    ))}

                    {/* Popular Places Suggestions (if typed text is short/empty) */}
                    {!endInput.trim() && (
                      <>
                        <div className="px-1.5 py-1 text-[8px] text-slate-400 font-bold uppercase tracking-wider">Popular Places</div>
                        {PRESETS.slice(1, 5).map((p, i) => (
                          <div
                            key={i}
                            onClick={() => selectDestination(p)}
                            className="p-2 text-xs text-slate-300 hover:text-white hover:bg-brand-teal/10 rounded-lg cursor-pointer"
                          >
                            ⭐ {p.name}
                          </div>
                        ))}
                      </>
                    )}

                    {/* Recent Searches */}
                    {recentSearches.length > 0 && (
                      <>
                        <div className="px-1.5 py-1 text-[8px] text-slate-400 font-bold uppercase tracking-wider mt-1.5">Recent Searches</div>
                        {recentSearches.map((term, i) => {
                          const preset = PRESETS.find(p => p.name === term) || { name: term, lat: 17.3850, lng: 78.4867 };
                          return (
                            <div
                              key={i}
                              onClick={() => selectDestination(preset)}
                              className="p-2 text-xs text-slate-300 hover:text-white hover:bg-brand-teal/10 rounded-lg cursor-pointer flex items-center justify-between"
                            >
                              <span>🕒 {term}</span>
                            </div>
                          );
                        })}
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Preference selector */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] text-slate-400 font-semibold tracking-wider">ROUTING PREFERENCE</label>
                <div className="grid grid-cols-5 gap-1">
                  {[
                    { id: "balanced", emoji: "⚖️", label: "Balanced" },
                    { id: "fastest", emoji: "⚡", label: "Fastest" },
                    { id: "cheapest", emoji: "💵", label: "Cheapest" },
                    { id: "safest", emoji: "🛡️", label: "Safest" },
                    { id: "eco", emoji: "🌿", label: "Green" }
                  ].map((pref) => (
                    <button
                      key={pref.id}
                      type="button"
                      onClick={() => setRoutingPreference(pref.id)}
                      title={pref.label}
                      className={`py-1.5 rounded-lg border text-xs cursor-pointer flex flex-col items-center justify-center transition-all ${
                        routingPreference === pref.id
                          ? 'bg-brand-teal text-darkBg-deep font-bold border-brand-teal'
                          : 'bg-slate-800/40 text-slate-300 border-darkBg-border'
                      }`}
                    >
                      <span>{pref.emoji}</span>
                    </button>
                  ))}
                </div>
              </div>

              {geocodeStatus === "resolving" && (
                <p className="text-[10px] text-brand-teal font-semibold text-center animate-pulse">
                  📍 Locating addresses on map...
                </p>
              )}
              {geocodeStatus === "error_start" && (
                <p className="text-[10px] text-brand-red font-semibold text-center">
                  ⚠️ Could not locate the start address. Try a different name.
                </p>
              )}
              {geocodeStatus === "error_end" && (
                <p className="text-[10px] text-brand-red font-semibold text-center">
                  ⚠️ Could not locate the destination. Try a different name.
                </p>
              )}

              <button
                type="submit"
                disabled={routingLoading || geocodeStatus === "resolving"}
                className="w-full bg-brand-teal hover:bg-brand-teal/80 text-darkBg-deep text-xs font-bold py-2.5 rounded-xl cursor-pointer transition-all duration-200 border-none mt-1"
              >
                {geocodeStatus === "resolving" ? "Locating..." : routingLoading ? "Optimizing City Grid..." : "Search Routes"}
              </button>
            </form>

            {/* Path details listing if mapped */}
            {routesData && (
              <div className="flex flex-col gap-2 mt-2">
                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">
                  Available Routes ({routesData.options.length})
                </span>
                
                <div className="flex flex-col gap-2 max-h-[320px] overflow-y-auto pr-1">
                  {routesData.options.map((opt, i) => {
                    const isSelected = selectedRouteOption?.mode === opt.mode;
                    const base = opt.mode.replace(/_alt\d+$/, '');
                    const altMatch = opt.mode.match(/_alt(\d+)$/);
                    const emojiMap = { walking:'🚶', bicycle:'🚴', bike:'🚲', bus:'🚌', taxi:'🚕', car:'🚗' };
                    const labelMap = { walking:'Walking', bicycle:'Bicycle', bike:'Bike', bus:'Bus', taxi:'Taxi', car:'Car' };
                    const emoji = emojiMap[base] || '🚗';
                    const label = (labelMap[base] || base) + (altMatch ? ` (Route ${altMatch[1]})` : '');
                    const trafficColor = opt.traffic_level === 'low' ? '#10B981' : opt.traffic_level === 'medium' ? '#F59E0B' : '#EF4444';
                    const safetyColor = opt.safety_score >= 80 ? '#10B981' : opt.safety_score >= 60 ? '#F59E0B' : '#EF4444';
                    
                    return (
                      <div
                        key={i}
                        onClick={() => setSelectedRouteOption(opt)}
                        className={`rounded-xl border cursor-pointer transition-all overflow-hidden ${
                          isSelected
                            ? 'bg-brand-teal/10 border-brand-teal/60 shadow-glass'
                            : 'bg-darkBg-card/30 border-darkBg-border/40 hover:border-brand-teal/30'
                        }`}
                      >
                        {/* Top row */}
                        <div className="flex items-center justify-between px-3 pt-2.5 pb-1">
                          <div className="flex items-center gap-2">
                            <span className="text-base">{emoji}</span>
                            <div className="flex flex-col leading-none">
                              <span className="text-xs font-bold text-slate-200">{label}</span>
                              {opt.summary && (
                                <span className="text-[9px] text-slate-400 mt-0.5 leading-tight">{opt.summary}</span>
                              )}
                            </div>
                          </div>
                          {isSelected && (
                            <span className="text-[9px] font-bold text-brand-teal border border-brand-teal/40 bg-brand-teal/10 px-1.5 py-0.5 rounded-full">
                              Selected
                            </span>
                          )}
                        </div>

                        {/* Stats grid */}
                        <div className="grid grid-cols-4 gap-0 divide-x divide-darkBg-border/50 px-3 pb-2 pt-1 border-t border-darkBg-border/30 mt-1">
                          <div className="flex flex-col items-center pr-2">
                            <span className="text-[8px] text-slate-500 uppercase">Dist</span>
                            <span className="text-[10px] font-black text-slate-200">{opt.distance_km}km</span>
                          </div>
                          <div className="flex flex-col items-center px-2">
                            <span className="text-[8px] text-slate-500 uppercase">Time</span>
                            <span className="text-[10px] font-black text-brand-neonCyan">{opt.duration_mins}m</span>
                          </div>
                          <div className="flex flex-col items-center px-2">
                            <span className="text-[8px] text-slate-500 uppercase">Cost</span>
                            <span className="text-[10px] font-black text-emerald-400">{opt.cost === 0 ? 'FREE' : `₹${opt.cost}`}</span>
                          </div>
                          <div className="flex flex-col items-center pl-2">
                            <span className="text-[8px] text-slate-500 uppercase">CO₂</span>
                            <span className="text-[10px] font-black text-slate-300">{(opt.carbon_emissions_kg * 1000).toFixed(0)}g</span>
                          </div>
                        </div>

                        {/* Safety + traffic row */}
                        <div className="flex items-center gap-2 px-3 pb-2">
                          <div className="flex items-center gap-1 flex-1">
                            <span className="text-[8px] text-slate-500">Safety</span>
                            <div className="flex-1 h-1 bg-darkBg-deep rounded-full overflow-hidden">
                              <div className="h-full rounded-full" style={{ width: `${opt.safety_score}%`, background: safetyColor }} />
                            </div>
                            <span className="text-[8px] font-bold" style={{ color: safetyColor }}>{opt.safety_score}</span>
                          </div>
                          <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: trafficColor + '22', color: trafficColor }}>
                            {opt.traffic_level}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Context panel for tabs with no forms (quick advice) */}
        {activeTab !== "routes" && (
          <div className="bg-darkBg-deep/40 border border-darkBg-border p-3.5 rounded-xl flex flex-col gap-2.5 mt-2">
            <span className="text-[9px] font-bold text-brand-teal uppercase tracking-wider flex items-center gap-1">
              <Activity className="w-3.5 h-3.5 animate-pulse text-brand-neonCyan" /> Smart Mobility Index
            </span>
            <p className="text-[10px] text-slate-300 leading-relaxed">
              Your commute calculations are updated using live machine learning algorithms. Swap options inside panels to evaluate different routes.
            </p>
          </div>
        )}
      </div>

      {/* 3. Footer / Auth User Profile Panel */}
      <div className="p-4 border-t border-darkBg-border flex flex-col gap-3">
        {currentUser ? (
          <div className="flex items-center justify-between bg-darkBg-card/50 border border-darkBg-border p-3 rounded-2xl">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-brand-teal/20 border border-brand-teal/30 flex items-center justify-center text-brand-neonCyan font-bold text-sm">
                {currentUser.name.charAt(0)}
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-bold text-slate-200">{currentUser.name}</span>
                <span className="text-[9px] text-slate-400 font-medium flex items-center gap-1.5">
                  <Award className="w-3.5 h-3.5 text-yellow-500" />
                  {currentUser.sustainability_points} XP
                </span>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={onOpenChat}
                title="AI Travel Assistant Chat"
                className="bg-brand-teal/20 hover:bg-brand-teal/30 text-brand-neonCyan border border-brand-teal/40 p-2 rounded-xl cursor-pointer transition-all duration-200"
              >
                <Bot className="w-4 h-4" />
              </button>
              
              <button
                onClick={logout}
                title="Sign Out"
                className="bg-slate-800 hover:bg-slate-700/80 text-slate-300 border border-darkBg-border p-2 rounded-xl cursor-pointer transition-all duration-200"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          <span className="text-[10px] text-slate-500 text-center font-medium">UrbanFlow Secure Session Node</span>
        )}
      </div>
    </div>
  );
}
