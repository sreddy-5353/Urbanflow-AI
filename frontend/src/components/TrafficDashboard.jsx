import React from 'react';
import { useMobility } from '../context/MobilityContext';
import { AlertTriangle, Clock, Gauge, Navigation } from 'lucide-react';

export default function TrafficDashboard() {
  const {
    congestionHotspots,
    trafficForecasts
  } = useMobility();

  return (
    <div className="flex flex-col gap-6 w-full max-w-4xl mx-auto">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="glass-panel p-5 rounded-2xl flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Average City Speed</span>
            <span className="text-2xl font-black text-slate-100">32.4 km/h</span>
          </div>
          <Gauge className="w-8 h-8 text-brand-neonCyan" />
        </div>
        
        <div className="glass-panel p-5 rounded-2xl flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Active Congestion Points</span>
            <span className="text-2xl font-black text-brand-red">{congestionHotspots.length} Zones</span>
          </div>
          <AlertTriangle className="w-8 h-8 text-brand-red" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 1. Live Congestion Hotspots list */}
        <div className="glass-panel p-5 rounded-2xl flex flex-col gap-4">
          <h3 className="text-sm font-bold text-slate-200 border-b border-darkBg-border pb-2 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-brand-red animate-pulse" />
            Detected Bottlenecks
          </h3>
          
          <div className="flex flex-col gap-3 max-h-[300px] overflow-y-auto pr-1">
            {congestionHotspots.length === 0 ? (
              <span className="text-xs text-slate-500 py-4 text-center">No major congestion zones detected.</span>
            ) : (
              congestionHotspots.map((zone) => (
                <div key={zone.id} className="bg-darkBg-deep/40 border border-darkBg-border p-3.5 rounded-xl flex items-center justify-between gap-3">
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-bold text-slate-200">{zone.name}</span>
                    <span className="text-[10px] text-slate-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> Peak: {zone.peak_hours}
                    </span>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-xs font-extrabold text-brand-red">
                      {Math.round(zone.congestion_level * 100)}% Congested
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {zone.current_speed_kmh} / {zone.speed_limit_kmh} km/h
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* 2. Future Travel Delays Forecast Chart/List */}
        <div className="glass-panel p-5 rounded-2xl flex flex-col gap-4">
          <h3 className="text-sm font-bold text-slate-200 border-b border-darkBg-border pb-2 flex items-center gap-2">
            <Clock className="w-4 h-4 text-brand-neonCyan" />
            Hourly Congestion Forecast
          </h3>

          <div className="flex flex-col gap-3">
            {trafficForecasts.length === 0 ? (
              <span className="text-xs text-slate-500 py-4 text-center">Plan a route to display hourly forecasts.</span>
            ) : (
              trafficForecasts.map((f, index) => (
                <div key={index} className="flex flex-col gap-1.5">
                  <div className="flex justify-between items-center text-xs font-semibold">
                    <span className="text-slate-300">{f.hour}:00 hrs</span>
                    <span className="text-brand-neonCyan">+{f.predicted_delay_mins} min delay</span>
                  </div>
                  {/* Progress bar graph */}
                  <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-brand-teal rounded-full" 
                      style={{ width: `${f.congestion_probability * 100}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
