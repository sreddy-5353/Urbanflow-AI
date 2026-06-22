import React, { useState, useEffect, useCallback } from 'react';
import { useMobility } from '../context/MobilityContext';
import { geocodeLocation, PRESETS } from '../utils/geocode';
import { 
  Navigation, TrafficCone, Shield, Leaf, IndianRupee, 
  Bell, AlertCircle, Bot, LogOut, Check, Sparkles, MapPin, 
  Activity, ShieldAlert, Award
} from 'lucide-react';


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
    locatingLog,
  } = useMobility();

  const [startInput, setStartInput] = useState("");
  const [endInput, setEndInput] = useState("");
  const [showStartSuggestions, setShowStartSuggestions] = useState(false);
  const [showEndSuggestions, setShowEndSuggestions] = useState(false);
  const [geocodeStatus, setGeocodeStatus] = useState(""); // "", "resolving", "error_start", "error_end"

  // ─── BUG FIX: Recent searches now store full { name, lat, lng } objects ────
  // The old code stored only the name string, then re-looked it up in PRESETS
  // on render. Any geocoded destination not in PRESETS was falling back to
  // Hyderabad centre coords (17.3850, 78.4867) — placing the marker in the
  // wrong city entirely.
  const [recentSearches, setRecentSearches] = useState(() => {
    try {
      const saved = localStorage.getItem("recentSearchesV2"); // new key avoids stale data
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    if (startPoint) setStartInput(startPoint.name);
  }, [startPoint]);

  useEffect(() => {
    if (endPoint) setEndInput(endPoint.name);
  }, [endPoint]);

  const getFilteredSuggestions = (input) => {
    if (!input.trim()) return [];
    return PRESETS.filter(p => p.name.toLowerCase().includes(input.toLowerCase()));
  };

  // ─── Save a geocoded place to recent searches (stores full coords) ─────────
  const saveToRecent = (place) => {
    if (!place?.name) return;
    const updated = [
      place,
      ...recentSearches.filter(r => r.name !== place.name),
    ].slice(0, 5); // keep last 5
    setRecentSearches(updated);
    localStorage.setItem("recentSearchesV2", JSON.stringify(updated));
  };

  const selectDestination = (place) => {
    setEndPoint(place);
    setEndInput(place.name);
    setShowEndSuggestions(false);
    saveToRecent(place);
  };

  const selectStartPoint = (place) => {
    setStartPoint(place);
    setStartInput(place.name);
    setShowStartSuggestions(false);
  };

  // ─── Main route search handler ────────────────────────────────────────────
  // BUG FIX: Old code skipped re-geocoding if endInput === endPoint.name.
  // This meant that if the user had previously selected a recent-search item
  // with wrong coords, those wrong coords would be used silently.
  // Fix: always re-geocode when the input text doesn't match an already-
  // verified geocoded point (we check by name AND that coords are valid).
  const handleRouteSearch = async (e) => {
    e.preventDefault();
    setGeocodeStatus("resolving");

    // 1. Resolve start point
    let start = startPoint;
    const startNeedsGeocode =
      !startPoint ||
      startInput.trim() !== startPoint.name ||
      !startPoint.lat ||
      !startPoint.lng;

    if (startNeedsGeocode) {
      const resolved = await geocodeLocation(startInput.trim());
      if (!resolved) {
        setGeocodeStatus("error_start");
        return;
      }
      start = resolved;
      setStartPoint(start);
    }

    // 2. Resolve end point
    // BUG FIX: Always geocode the destination unless we have a freshly
    // resolved object with matching name AND valid coordinates.
    let end = endPoint;
    const endNeedsGeocode =
      !endPoint ||
      endInput.trim() !== endPoint.name ||
      !endPoint.lat ||
      !endPoint.lng;

    if (endNeedsGeocode) {
      const resolved = await geocodeLocation(endInput.trim());
      if (!resolved) {
        setGeocodeStatus("error_end");
        return;
      }
      end = resolved;
      setEndPoint(end);
      saveToRecent(end);
    }

    setGeocodeStatus("");

    if (start && end) {
      calculateRoute(start, end, routingPreference);
    }
  };

  const menuItems = [
    { id: "routes",  label: "Route Planner",      icon: Navigation, color: "text-brand-neonCyan" },
    { id: "traffic", label: "Traffic Prediction",  icon: TrafficCone, color: "text-brand-neonCyan" },
    { id: "safety",  label: "Safety Scorer",       icon: Shield, color: "text-brand-neonCyan" },
    { id: "carbon",  label: "Carbon Tracker",      icon: Leaf, color: "text-brand-green" },
    { id: "cost",    label: "Cost Optimizer",       icon: IndianRupee, color: "text-brand-teal" },
    { id: "alerts",  label: "Road Alerts",          icon: Bell, color: "text-brand-red", badge: systemAlerts.length },
  ];

  return (
    <div className="w-full lg:w-96 glass-panel h-full flex flex-col justify-between overflow-y-auto shrink-0 border-r border-darkBg-border select-none">
      
      {/* 1. App logo */}
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

      {/* 2. Content */}
      <div className="flex-1 flex flex-col gap-4 p-4">
        
        {/* Nav tabs */}
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

        {/* Route planner form */}
        {activeTab === "routes" && (
          <div className="flex flex-col gap-3 mt-2">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              🧭 Trip Navigation setup
            </h3>
            
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

              {/* Start input */}
              <div className="flex flex-col gap-1 relative">
                <label className="text-[9px] text-slate-400 font-semibold tracking-wider flex items-center justify-between">
                  <span className="flex items-center gap-1"><MapPin className="w-3 h-3 text-brand-teal" /> START / PICKUP</span>
                  {startPoint?.isSnapped && <span className="text-brand-teal text-[8px] font-bold">Snapped to road</span>}
                </label>
                <div className="flex gap-1.5">
                  <input
                    value={startInput}
                    onChange={(e) => { setStartInput(e.target.value); setShowStartSuggestions(true); }}
                    onFocus={() => setShowStartSuggestions(true)}
                    type="text"
                    className="glass-input p-2.5 rounded-xl text-xs text-slate-200 flex-1"
                    placeholder="Enter pickup location..."
                  />
                  <button
                    type="button"
                    onClick={detectLocation}
                    title="Detect Current Location"
                    className="bg-brand-teal/15 hover:bg-brand-teal/30 text-brand-neonCyan border border-brand-teal/40 px-2.5 py-1.5 rounded-xl cursor-pointer transition-all flex items-center justify-center"
                  >
                    🎯
                  </button>
                </div>

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
                      <div className="p-2 text-[10px] text-slate-400 italic">No exact match — press Search to geocode.</div>
                    )}
                  </div>
                )}
              </div>

              {/* Destination input */}
              <div className="flex flex-col gap-1 relative">
                <label className="text-[9px] text-slate-400 font-semibold tracking-wider flex items-center justify-between">
                  <span className="flex items-center gap-1"><MapPin className="w-3 h-3 text-brand-red" /> DESTINATION / DROP-OFF</span>
                  {endPoint?.isSnapped && <span className="text-brand-teal text-[8px] font-bold">Snapped to road</span>}
                </label>
                <input
                  value={endInput}
                  onChange={(e) => { setEndInput(e.target.value); setShowEndSuggestions(true); }}
                  onFocus={() => setShowEndSuggestions(true)}
                  type="text"
                  className="glass-input p-2.5 rounded-xl text-xs text-slate-200"
                  placeholder="Enter drop-off destination..."
                />

                {showEndSuggestions && (
                  <div className="absolute top-full left-0 right-0 z-30 bg-darkBg-card/95 border border-darkBg-border p-1.5 rounded-xl mt-1 max-h-[220px] overflow-y-auto shadow-2xl backdrop-blur-lg">
                    <div className="flex justify-between items-center px-1.5 py-1 border-b border-darkBg-border/50 mb-1">
                      <span className="text-[8px] text-slate-400 font-bold uppercase tracking-wider">Search Results & Matches</span>
                      <button type="button" onClick={() => setShowEndSuggestions(false)} className="text-[8px] text-brand-red border-none bg-transparent hover:underline font-bold">Close</button>
                    </div>

                    {/* PRESET matches */}
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

                    {/* Popular places when input is empty */}
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

                    {/* Recent searches — now use stored coords, not fallback */}
                    {recentSearches.length > 0 && (
                      <>
                        <div className="px-1.5 py-1 text-[8px] text-slate-400 font-bold uppercase tracking-wider mt-1.5">Recent Searches</div>
                        {recentSearches.map((place, i) => (
                          <div
                            key={i}
                            onClick={() => selectDestination(place)}
                            className="p-2 text-xs text-slate-300 hover:text-white hover:bg-brand-teal/10 rounded-lg cursor-pointer flex items-center justify-between"
                          >
                            <span>🕒 {place.name}</span>
                            <span className="text-[8px] text-slate-600">
                              {place.lat?.toFixed(3)}, {place.lng?.toFixed(3)}
                            </span>
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Routing preference */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] text-slate-400 font-semibold tracking-wider">ROUTING PREFERENCE</label>
                <div className="grid grid-cols-5 gap-1">
                  {[
                    { id: "balanced", emoji: "⚖️", label: "Balanced" },
                    { id: "fastest",  emoji: "⚡", label: "Fastest"  },
                    { id: "cheapest", emoji: "💵", label: "Cheapest" },
                    { id: "safest",   emoji: "🛡️", label: "Safest"   },
                    { id: "eco",      emoji: "🌿", label: "Green"    },
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

              {/* Status messages */}
              {geocodeStatus === "resolving" && (
                <p className="text-[10px] text-brand-teal font-semibold text-center animate-pulse">
                  📍 Locating addresses on map...
                </p>
              )}
              {geocodeStatus === "error_start" && (
                <p className="text-[10px] text-brand-red font-semibold text-center">
                  ⚠️ Could not locate the start address. Try a different name or add "Telangana" after it.
                </p>
              )}
              {geocodeStatus === "error_end" && (
                <p className="text-[10px] text-brand-red font-semibold text-center">
                  ⚠️ Could not locate the destination. Try adding "Telangana" or a nearby district name.
                </p>
              )}

              <button
                type="submit"
                disabled={routingLoading || geocodeStatus === "resolving"}
                className="w-full bg-brand-teal hover:bg-brand-teal/80 text-darkBg-deep text-xs font-bold py-2.5 rounded-xl cursor-pointer transition-all duration-200 border-none mt-1"
              >
                {geocodeStatus === "resolving"
                  ? "Locating..."
                  : routingLoading
                  ? "Optimizing City Grid..."
                  : "Search Routes"}
              </button>
            </form>

            {/* Route results list */}
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
                    const emojiMap = { walking:'🚶', bicycle:'🚴', bike:'🚲', bus:'🚌', metro:'🚇', taxi:'🚕', auto:'🛺', ride_sharing:'🚖', car:'🚗' };
                    const labelMap = { walking:'Walking', bicycle:'Bicycle', bike:'Bike', bus:'Bus', metro:'Metro', taxi:'Taxi', auto:'Auto', ride_sharing:'Ride Share', car:'Car' };
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

        {/* Non-routes tab panel */}
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

      {/* 3. Footer */}
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
