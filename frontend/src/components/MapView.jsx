import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { useMobility } from '../context/MobilityContext';

import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

// Colour per transport mode (base mode name, strip _alt1/_alt2 etc.)
function modeColor(mode, isSelected) {
  const base = mode.replace(/_alt\d+$/, '');
  const palette = {
    walking:      '#10B981',
    bicycle:      '#22D3EE',
    bus:          '#A78BFA',
    metro:        '#3B82F6',
    auto:         '#F59E0B',
    taxi:         '#F97316',
    ride_sharing: '#EC4899',
  };
  const col = palette[base] || '#5BC0BE';
  return isSelected ? col : col + '55'; // dim unselected
}

export default function MapView() {
  const mapContainerRef  = useRef(null);
  const mapInstanceRef   = useRef(null);
  const tileLayerRef     = useRef(null);
  const layersRef        = useRef({
    routes: [],        // all alternative polylines
    incidents: [],
    congestion: [],
    safetyGrid: [],
    startMarker: null,
    endMarker: null,
  });

  const [mapStyle, setMapStyle]           = useState('roadmap');
  const [stepsOpen, setStepsOpen]         = useState(false);

  const {
    currentLocation,
    routesData,
    selectedRouteOption,
    setSelectedRouteOption,
    congestionHotspots,
    safetyHotspots,
    communityIncidents,
    activeTab,
    upvoteIncident,
    startPoint,
    setStartPoint,
    endPoint,
    setEndPoint,
    snapToRoad,
  } = useMobility();

  // ── 1. Init map ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapContainerRef.current) return;
    const map = L.map(mapContainerRef.current, {
      center: [currentLocation.lat, currentLocation.lng],
      zoom: 13,
      zoomControl: false,
    });
    L.control.zoom({ position: 'bottomright' }).addTo(map);
    mapInstanceRef.current = map;
    return () => { map.remove(); mapInstanceRef.current = null; };
  }, []);

  // ── 1b. Tile layer ─────────────────────────────────────────────────────────
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    if (tileLayerRef.current) map.removeLayer(tileLayerRef.current);
    let lyrs = 'm';
    if (mapStyle === 'satellite') lyrs = 's';
    else if (mapStyle === 'hybrid')    lyrs = 'y';
    else if (mapStyle === 'terrain')   lyrs = 'p';
    tileLayerRef.current = L.tileLayer(
      `https://{s}.google.com/vt/lyrs=${lyrs}&x={x}&y={y}&z={z}`,
      { attribution: '© Google Maps', subdomains: ['mt0','mt1','mt2','mt3'], maxZoom: 20 }
    ).addTo(map);
  }, [mapStyle]);

  // ── 2. Center on location ─────────────────────────────────────────────────
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (map && currentLocation) map.setView([currentLocation.lat, currentLocation.lng], 13);
  }, [currentLocation]);

  // ── 3. Draw ALL route alternatives ───────────────────────────────────────
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Remove old route polylines
    layersRef.current.routes.forEach(pl => map.removeLayer(pl));
    layersRef.current.routes = [];

    if (!routesData || !routesData.options || routesData.options.length === 0) return;

    const allPolylines = [];
    const bounds = L.latLngBounds();

    routesData.options.forEach(opt => {
      if (!opt.path || opt.path.length < 2) return;

      const isSelected = selectedRouteOption && opt.mode === selectedRouteOption.mode;
      const color  = modeColor(opt.mode, isSelected);
      const weight = isSelected ? 7 : 4;
      const zIndex = isSelected ? 500 : 200;

      const latlngs = opt.path.map(p => [p.lat, p.lng]);

      // Outline for selected route
      if (isSelected) {
        const outline = L.polyline(latlngs, {
          color: '#000000',
          weight: weight + 4,
          opacity: 0.25,
          lineCap: 'round',
          lineJoin: 'round',
        }).addTo(map);
        outline.setZIndexOffset?.(zIndex - 1);
        allPolylines.push(outline);
        latlngs.forEach(ll => bounds.extend(ll));
      }

      const polyline = L.polyline(latlngs, {
        color,
        weight,
        opacity: isSelected ? 0.95 : 0.55,
        lineCap: 'round',
        lineJoin: 'round',
        dashArray: isSelected ? null : '8 6',
      }).addTo(map);

      // Click on any route to select it
      polyline.on('click', () => setSelectedRouteOption(opt));
      polyline.bindTooltip(
        `<b>${opt.mode.replace(/_alt\d+/, ' (alt)').replace('_', ' ')}</b><br/>` +
        `${opt.distance_km} km · ${opt.duration_mins} min · ` +
        `${opt.cost === 0 ? 'FREE' : '₹' + opt.cost}`,
        { sticky: true, className: 'osm-tooltip' }
      );

      allPolylines.push(polyline);
      if (!isSelected) latlngs.forEach(ll => bounds.extend(ll));
    });

    layersRef.current.routes = allPolylines;

    // Fit to show all routes
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [routesData, selectedRouteOption]);

  // ── 3b. Start / End markers ───────────────────────────────────────────────
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (layersRef.current.startMarker) { map.removeLayer(layersRef.current.startMarker); layersRef.current.startMarker = null; }
    if (layersRef.current.endMarker)   { map.removeLayer(layersRef.current.endMarker);   layersRef.current.endMarker   = null; }

    if (startPoint) {
      const icon = L.divIcon({
        html: `<div style="width:32px;height:32px;border-radius:50%;background:#5BC0BE;border:2px solid white;display:flex;align-items:center;justify-content:center;font-size:16px;box-shadow:0 2px 8px rgba(0,0,0,0.5)">📍</div>`,
        className: '', iconSize: [32,32], iconAnchor: [16,32],
      });
      const m = L.marker([startPoint.lat, startPoint.lng], { icon, draggable: true }).addTo(map);
      m.bindPopup(`<b style="color:#5BC0BE">Pickup</b><br/>${startPoint.name}<br/><i style="font-size:10px">Drag to adjust</i>`).openPopup();
      m.on('dragend', e => {
        const pos = e.target.getLatLng();
        const snapped = snapToRoad(pos.lat, pos.lng);
        setStartPoint({ name: snapped.name, lat: snapped.lat, lng: snapped.lng, isSnapped: true });
      });
      layersRef.current.startMarker = m;
    }

    if (endPoint) {
      const icon = L.divIcon({
        html: `<div style="width:32px;height:32px;border-radius:50%;background:#EF4444;border:2px solid white;display:flex;align-items:center;justify-content:center;font-size:16px;box-shadow:0 2px 8px rgba(0,0,0,0.5)">🏁</div>`,
        className: '', iconSize: [32,32], iconAnchor: [16,32],
      });
      const m = L.marker([endPoint.lat, endPoint.lng], { icon, draggable: true }).addTo(map);
      m.bindPopup(`<b style="color:#EF4444">Destination</b><br/>${endPoint.name}<br/><i style="font-size:10px">Drag to adjust</i>`);
      m.on('dragend', e => {
        const pos = e.target.getLatLng();
        const snapped = snapToRoad(pos.lat, pos.lng);
        setEndPoint({ name: snapped.name, lat: snapped.lat, lng: snapped.lng, isSnapped: true });
      });
      layersRef.current.endMarker = m;
    }
  }, [startPoint, endPoint]);

  // ── 4. Congestion circles ─────────────────────────────────────────────────
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    layersRef.current.congestion.forEach(c => map.removeLayer(c));
    layersRef.current.congestion = [];
    if (activeTab === 'traffic' && congestionHotspots?.length) {
      congestionHotspots.forEach(zone => {
        const c = L.circle([zone.latitude, zone.longitude], {
          radius: zone.radius_meters,
          fillColor: '#EF4444', fillOpacity: zone.congestion_level * 0.5,
          color: '#EF4444', weight: 1, opacity: 0.8,
        }).addTo(map);
        c.bindPopup(`<b style="color:#EF4444">${zone.name}</b><br/>Congestion: ${Math.round(zone.congestion_level*100)}%<br/>Speed: ${zone.current_speed_kmh}/${zone.speed_limit_kmh} km/h`);
        layersRef.current.congestion.push(c);
      });
    }
  }, [congestionHotspots, activeTab]);

  // ── 5. Safety zones ───────────────────────────────────────────────────────
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    layersRef.current.safetyGrid.forEach(s => map.removeLayer(s));
    layersRef.current.safetyGrid = [];
    if (activeTab === 'safety' && safetyHotspots?.length) {
      safetyHotspots.forEach(pt => {
        const col = pt.risk_level === 'High Risk' ? '#EF4444' : pt.risk_level === 'Moderate Risk' ? '#F59E0B' : '#10B981';
        const c = L.circle([pt.latitude, pt.longitude], {
          radius: 200, fillColor: col, fillOpacity: 0.2,
          color: col, weight: 1.5, opacity: 0.6,
        }).addTo(map);
        c.bindPopup(`<b style="color:${col}">Safety: ${pt.safety_score}/100</b><br/>Risk: ${pt.risk_level}<br/>Lighting: ${pt.lighting_rating}/10`);
        layersRef.current.safetyGrid.push(c);
      });
    }
  }, [safetyHotspots, activeTab]);

  // ── 6. Community incidents ────────────────────────────────────────────────
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    layersRef.current.incidents.forEach(m => map.removeLayer(m));
    layersRef.current.incidents = [];
    if (communityIncidents?.length) {
      communityIncidents.forEach(inc => {
        let col = '#EF4444';
        if (inc.type === 'Unsafe Area')         col = '#F59E0B';
        if (inc.type === 'Flooded Road')        col = '#3B82F6';
        if (inc.type === 'Traffic Congestion')  col = '#10B981';
        const emoji = inc.type === 'Accident' ? '🚗' : inc.type === 'Unsafe Area' ? '🔦' : inc.type === 'Flooded Road' ? '🌊' : '⚠️';
        const icon = L.divIcon({
          html: `<div style="width:24px;height:24px;border-radius:50%;background:${col};border:2px solid white;display:flex;align-items:center;justify-content:center;font-size:12px;box-shadow:0 2px 6px rgba(0,0,0,0.4)">${emoji}</div>`,
          className: '', iconSize: [24,24], iconAnchor: [12,12],
        });
        const marker = L.marker([inc.latitude, inc.longitude], { icon }).addTo(map);
        const popup = document.createElement('div');
        popup.style.width = '180px';
        popup.innerHTML = `<h4 style="color:${col};margin:0 0 4px">${inc.type}</h4><p style="margin:0 0 6px;font-size:12px">${inc.description}</p><div style="font-size:11px;margin-bottom:6px"><b>Severity:</b> ${inc.severity}<br/><b>Upvotes:</b> <span id="votes-${inc.id}">${inc.upvotes}</span> ${inc.is_verified ? '✅' : '⏳'}</div>`;
        const btn = document.createElement('button');
        btn.innerText = '👍 Support Report';
        btn.style.cssText = 'width:100%;padding:4px 8px;background:#5BC0BE;color:#0B132B;border:none;border-radius:4px;font-size:11px;font-weight:700;cursor:pointer';
        btn.onclick = () => { upvoteIncident(inc.id); const el = document.getElementById(`votes-${inc.id}`); if (el) el.innerText = +el.innerText + 1; };
        popup.appendChild(btn);
        marker.bindPopup(popup);
        layersRef.current.incidents.push(marker);
      });
    }
  }, [communityIncidents]);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const baseMode = m => m ? m.replace(/_alt\d+$/, '') : '';
  const modeLabel = m => {
    if (!m) return '';
    const base = baseMode(m);
    const labels = { walking:'Walking', bicycle:'Bicycle', bus:'Bus', metro:'Metro', auto:'Auto', taxi:'Taxi', ride_sharing:'Ride Share' };
    const alt = m.match(/_alt(\d+)$/);
    return (labels[base] || base) + (alt ? ` (Route ${alt[1]})` : '');
  };

  const trafficBadge = level => {
    if (level === 'low')    return { label: 'Light Traffic', color: '#10B981' };
    if (level === 'medium') return { label: 'Moderate Traffic', color: '#F59E0B' };
    return { label: 'Heavy Traffic', color: '#EF4444' };
  };

  return (
    <div className="relative w-full h-full min-h-[400px] lg:min-h-0 rounded-2xl overflow-hidden border border-darkBg-border shadow-glass shadow-black">
      {/* Map canvas */}
      <div ref={mapContainerRef} className="w-full h-full z-10" />

      {/* Map style switcher */}
      <div className="absolute top-4 right-4 z-20 flex gap-1 bg-darkBg-card/85 backdrop-blur-md border border-darkBg-border p-1 rounded-xl shadow-lg">
        {[{id:'roadmap',label:'Map'},{id:'satellite',label:'Satellite'},{id:'hybrid',label:'Hybrid'},{id:'terrain',label:'Terrain'}].map(s => (
          <button key={s.id} onClick={() => setMapStyle(s.id)}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold cursor-pointer transition-all border-none ${mapStyle===s.id ? 'bg-brand-teal text-darkBg-deep' : 'bg-transparent text-slate-300 hover:text-slate-100'}`}>
            {s.label}
          </button>
        ))}
      </div>

      {/* Live network badge */}
      <div className="absolute top-4 left-4 z-20 pointer-events-none">
        <div className="glass-panel px-4 py-2 rounded-xl flex items-center gap-2 border border-[#6FFFE9]/20 shadow-lg">
          <div className={`w-2.5 h-2.5 rounded-full ${activeTab==='safety' ? 'bg-red-500 animate-pulse' : 'bg-brand-neonCyan animate-ping'}`} />
          <span className="text-xs uppercase font-semibold tracking-wider text-slate-300">
            Smart City Live Network Grid
          </span>
        </div>
      </div>

      {/* ── Active route info panel ── */}
      {selectedRouteOption && (
        <div className="absolute bottom-4 left-4 z-20 max-w-sm w-[90%] pointer-events-auto">
          <div className="glass-panel rounded-2xl border border-brand-teal/30 shadow-lg overflow-hidden">

            {/* Header row */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-darkBg-border">
              <div className="flex items-center gap-2">
                <span className="text-sm font-black text-brand-neonCyan uppercase tracking-wide">
                  {modeLabel(selectedRouteOption.mode)}
                </span>
                {(() => { const t = trafficBadge(selectedRouteOption.traffic_level); return (
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{background: t.color+'22', color: t.color, border: `1px solid ${t.color}55`}}>
                    {t.label}
                  </span>
                ); })()}
              </div>
              <button
                onClick={() => setStepsOpen(v => !v)}
                className="text-[10px] text-brand-teal font-bold bg-brand-teal/10 border border-brand-teal/30 px-2 py-1 rounded-lg cursor-pointer hover:bg-brand-teal/20 transition-all"
              >
                {stepsOpen ? 'Hide Steps' : 'Turn-by-Turn ▲'}
              </button>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-4 gap-0 divide-x divide-darkBg-border px-0 py-2">
              {[
                { label: 'Distance',  value: `${selectedRouteOption.distance_km} km` },
                { label: 'Time',      value: `${selectedRouteOption.duration_mins} min` },
                { label: 'Cost',      value: selectedRouteOption.cost === 0 ? 'FREE' : `₹${selectedRouteOption.cost}` },
                { label: 'CO₂',       value: `${(selectedRouteOption.carbon_emissions_kg * 1000).toFixed(0)}g` },
              ].map(s => (
                <div key={s.label} className="flex flex-col items-center py-1 px-2">
                  <span className="text-[9px] text-slate-400 uppercase tracking-wider">{s.label}</span>
                  <span className="text-xs font-black text-brand-neonCyan">{s.value}</span>
                </div>
              ))}
            </div>

            {/* Safety bar */}
            <div className="px-4 pb-2 flex items-center gap-2">
              <span className="text-[9px] text-slate-400 uppercase tracking-wider whitespace-nowrap">Safety</span>
              <div className="flex-1 h-1.5 bg-darkBg-deep rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{
                  width: `${selectedRouteOption.safety_score}%`,
                  background: selectedRouteOption.safety_score >= 80 ? '#10B981' : selectedRouteOption.safety_score >= 60 ? '#F59E0B' : '#EF4444',
                }} />
              </div>
              <span className="text-[9px] font-bold text-slate-300">{selectedRouteOption.safety_score}/100</span>
            </div>

            {/* Route summary */}
            {selectedRouteOption.summary && (
              <div className="px-4 pb-2">
                <p className="text-[10px] text-slate-400 leading-relaxed">{selectedRouteOption.summary}</p>
              </div>
            )}

            {/* Turn-by-turn steps */}
            {stepsOpen && selectedRouteOption.instructions?.length > 0 && (
              <div className="border-t border-darkBg-border px-4 py-3 max-h-48 overflow-y-auto">
                <p className="text-[9px] text-brand-teal font-bold uppercase tracking-widest mb-2">Turn-by-Turn Directions</p>
                <div className="flex flex-col gap-1.5">
                  {selectedRouteOption.instructions.map((step, i) => (
                    <div key={i} className="flex gap-2 items-start text-xs text-slate-300">
                      <span className="text-brand-teal font-bold text-[10px] mt-0.5 w-4 shrink-0">{i + 1}.</span>
                      <span className="leading-snug">{step}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Route alternatives legend (when multiple routes visible) */}
      {routesData?.options && routesData.options.length > 1 && (
        <div className="absolute top-16 right-4 z-20 pointer-events-auto">
          <div className="glass-panel p-2 rounded-xl border border-darkBg-border shadow-lg flex flex-col gap-1 max-w-[140px]">
            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Routes</p>
            {routesData.options.slice(0, 6).map((opt, i) => {
              const isSelected = selectedRouteOption?.mode === opt.mode;
              return (
                <button
                  key={i}
                  onClick={() => setSelectedRouteOption(opt)}
                  className="flex items-center gap-1.5 cursor-pointer text-left rounded-lg px-1.5 py-1 transition-all border-none"
                  style={{ background: isSelected ? modeColor(opt.mode, true) + '22' : 'transparent' }}
                >
                  <div className="w-3 h-1.5 rounded-full shrink-0" style={{ background: modeColor(opt.mode, true) }} />
                  <span className={`text-[9px] font-semibold ${isSelected ? 'text-white' : 'text-slate-400'}`}>
                    {modeLabel(opt.mode)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
