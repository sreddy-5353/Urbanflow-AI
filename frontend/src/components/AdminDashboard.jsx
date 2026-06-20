import React from 'react';
import { useMobility } from '../context/MobilityContext';
import { BarChart3, AlertOctagon, TrendingUp, Users, ShieldAlert, Sparkles } from 'lucide-react';

export default function AdminDashboard() {
  const { adminMetrics } = useMobility();

  if (!adminMetrics) {
    return (
      <div className="glass-panel p-6 rounded-2xl text-center text-xs text-slate-400">
        Accessing municipal data grid... Requires Admin Credentials.
      </div>
    );
  }

  const { summary, congestion_indices, hourly_incident_trends, environmental_metrics } = adminMetrics;

  return (
    <div className="flex flex-col gap-6 w-full max-w-4xl mx-auto pb-12">
      {/* Overview stats cards grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-panel p-4 rounded-xl flex flex-col gap-0.5">
          <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Citizen Accounts</span>
          <span className="text-xl font-black text-slate-100 flex items-center gap-1">
            <Users className="w-4 h-4 text-brand-teal" />
            {summary.total_registered_citizens}
          </span>
        </div>

        <div className="glass-panel p-4 rounded-xl flex flex-col gap-0.5">
          <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Total Hazards Reported</span>
          <span className="text-xl font-black text-slate-100">
            {summary.total_reported_incidents}
          </span>
        </div>

        <div className="glass-panel p-4 rounded-xl flex flex-col gap-0.5">
          <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">SOS Emergencies</span>
          <span className={`text-xl font-black ${summary.active_sos_emergencies > 0 ? 'text-brand-red animate-pulse' : 'text-slate-400'}`}>
            {summary.active_sos_emergencies} Active
          </span>
        </div>

        <div className="glass-panel p-4 rounded-xl flex flex-col gap-0.5">
          <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Total CO2 Saved</span>
          <span className="text-xl font-black text-emerald-400 flex items-center gap-1">
            🌿 {summary.total_co2_saved_kg} kg
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 1. Zone Congestion Indices */}
        <div className="glass-panel p-5 rounded-2xl flex flex-col gap-4">
          <h3 className="text-sm font-bold text-slate-200 border-b border-darkBg-border pb-2 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-brand-neonCyan" />
            Municipal Traffic Indices
          </h3>

          <div className="flex flex-col gap-3">
            {congestion_indices.map((idx, i) => (
              <div key={i} className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-300 font-semibold">{idx.zone}</span>
                  <span className="text-slate-400 font-bold">
                    Index: <b className="text-brand-neonCyan">{Math.round(idx.congestion * 100)}%</b> ({idx.flow_speed_kmh} km/h flow)
                  </span>
                </div>
                <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full ${idx.congestion > 0.6 ? 'bg-brand-red' : 'bg-brand-teal'}`}
                    style={{ width: `${idx.congestion * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 2. Citizens Incident Trends */}
        <div className="glass-panel p-5 rounded-2xl flex flex-col justify-between gap-4">
          <div className="flex flex-col gap-3">
            <h3 className="text-sm font-bold text-slate-200 border-b border-darkBg-border pb-2 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-brand-red animate-pulse" />
              Peak-Hour Safety Incident Trends
            </h3>

            {/* Simulated bar chart representation */}
            <div className="flex items-end justify-between h-32 pt-4 px-2 border-b border-darkBg-border">
              {hourly_incident_trends.map((t, i) => {
                const heightPct = (t.incidents / 10) * 100;
                return (
                  <div key={i} className="flex flex-col items-center gap-1.5 w-[10%]">
                    <span className="text-[8px] text-slate-400 font-bold">{t.incidents}</span>
                    <div 
                      className="w-full bg-brand-red rounded-t-sm" 
                      style={{ height: `${heightPct}%`, minHeight: '4px' }}
                    />
                    <span className="text-[8px] text-slate-500 font-bold tracking-wider">{t.hour}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex justify-between items-center bg-darkBg-deep/50 p-3 rounded-xl text-[10px]">
            <span className="text-slate-400">Green commute citizen share:</span>
            <span className="text-emerald-400 font-extrabold flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5" />
              {environmental_metrics.green_commute_share_pct}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
