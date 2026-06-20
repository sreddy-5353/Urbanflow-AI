import React from 'react';
import { useMobility } from '../context/MobilityContext';
import { AlertTriangle, CloudRain, ShieldAlert, TramFront } from 'lucide-react';

export default function AlertSystem() {
  const { systemAlerts } = useMobility();

  const getAlertIcon = (type) => {
    switch (type) {
      case "Traffic":
        return <AlertTriangle className="w-5 h-5 text-yellow-500 animate-bounce" />;
      case "Flood":
      case "Weather":
        return <CloudRain className="w-5 h-5 text-blue-400" />;
      case "Delay":
        return <TramFront className="w-5 h-5 text-brand-neonCyan" />;
      default:
        return <ShieldAlert className="w-5 h-5 text-brand-red animate-pulse" />;
    }
  };

  const getAlertBorder = (type) => {
    switch (type) {
      case "Traffic":
        return "border-yellow-500/35 bg-yellow-500/5";
      case "Flood":
      case "Weather":
        return "border-blue-500/35 bg-blue-500/5";
      case "Delay":
        return "border-brand-teal/35 bg-brand-teal/5";
      default:
        return "border-brand-red/35 bg-brand-red/5";
    }
  };

  return (
    <div className="flex flex-col gap-5 w-full max-w-4xl mx-auto">
      <div className="flex flex-col gap-2">
        <h2 className="text-xl font-black text-slate-100 flex items-center gap-2">
          <span>🔔</span> City Road & Transit Alerts
        </h2>
        <p className="text-xs text-slate-400">
          Real-time safety broadcasts, accident reports, flood notices, and transit delays dispatched by municipal transit servers.
        </p>
      </div>

      <div className="flex flex-col gap-4">
        {systemAlerts.length === 0 ? (
          <div className="glass-panel p-8 rounded-2xl text-center text-xs text-slate-500">
            No active municipal alerts. City traffic flow is free.
          </div>
        ) : (
          systemAlerts.map((alert) => (
            <div
              key={alert.id}
              className={`border p-4.5 rounded-2xl flex gap-4 items-start ${getAlertBorder(alert.type)}`}
            >
              <div className="p-2.5 rounded-xl bg-darkBg-deep/60 border border-darkBg-border">
                {getAlertIcon(alert.type)}
              </div>
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-100">{alert.title}</span>
                  <span className="text-[8px] font-bold px-2 py-0.5 rounded-full bg-slate-800 border border-darkBg-border text-slate-400 uppercase tracking-wider">
                    {alert.type}
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed mt-0.5">
                  {alert.description}
                </p>
                <span className="text-[9px] text-slate-500 font-semibold mt-1.5 uppercase tracking-wider">
                  Reported at: {new Date(alert.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
