import React from 'react';
import { useMobility } from '../context/MobilityContext';
import { Leaf, Award, Footprints, Sparkles, TrendingDown } from 'lucide-react';

export default function CarbonTracker() {
  const { carbonStats } = useMobility();

  if (!carbonStats) {
    return (
      <div className="glass-panel p-6 rounded-2xl text-center text-xs text-slate-400">
        Loading sustainability ledger metrics...
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 w-full max-w-4xl mx-auto">
      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-panel p-5 rounded-2xl flex flex-col gap-1 relative overflow-hidden">
          <Leaf className="w-5 h-5 text-brand-green absolute top-4 right-4" />
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">CO2 Saved</span>
          <span className="text-2xl font-black text-slate-100">{carbonStats.co2_saved_kg} kg</span>
          <span className="text-[10px] text-brand-green font-semibold">vs standard SUV driving</span>
        </div>

        <div className="glass-panel p-5 rounded-2xl flex flex-col gap-1 relative overflow-hidden">
          <TrendingDown className="w-5 h-5 text-brand-neonCyan absolute top-4 right-4" />
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Trees Equivalent</span>
          <span className="text-2xl font-black text-slate-100">{carbonStats.trees_planted_equivalent}</span>
          <span className="text-[10px] text-slate-400">yearly offset carbon absorption</span>
        </div>

        <div className="glass-panel p-5 rounded-2xl flex flex-col gap-1 relative overflow-hidden">
          <Award className="w-5 h-5 text-yellow-500 absolute top-4 right-4" />
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Green Rewards Balance</span>
          <span className="text-2xl font-black text-slate-100">{carbonStats.sustainability_points} XP</span>
          <span className="text-[10px] text-brand-teal font-semibold">Redeemable for transit discounts</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Achievements and Badges */}
        <div className="glass-panel p-5 rounded-2xl flex flex-col gap-4">
          <h3 className="text-sm font-bold text-slate-200 border-b border-darkBg-border pb-2 flex items-center gap-2">
            <Award className="w-4 h-4 text-brand-teal" />
            Sustainability Milestones
          </h3>
          
          <div className="flex flex-col gap-3">
            {carbonStats.badges.map((badge, i) => (
              <div key={i} className="bg-darkBg-deep/50 border border-darkBg-border p-3.5 rounded-xl flex items-center gap-3">
                <span className="text-2xl">🏆</span>
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-brand-neonCyan">{badge}</span>
                  <span className="text-[10px] text-slate-400">Awarded for eco-friendly route choices.</span>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-brand-teal/10 border border-brand-teal/30 p-3 rounded-xl flex items-center justify-between text-xs mt-2">
            <span className="text-slate-300">Next tier unlocks at:</span>
            <span className="font-extrabold text-brand-neonCyan">{carbonStats.next_tier_points} XP</span>
          </div>
        </div>

        {/* Travel splits and green comparison */}
        <div className="glass-panel p-5 rounded-2xl flex flex-col gap-4">
          <h3 className="text-sm font-bold text-slate-200 border-b border-darkBg-border pb-2 flex items-center gap-2">
            <Footprints className="w-4 h-4 text-brand-green" />
            Mode Shares & Emissions
          </h3>

          <div className="flex flex-col gap-3">
            {Object.entries(carbonStats.transport_split).map(([mode, pct]) => (
              <div key={mode} className="flex flex-col gap-1">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-300 capitalize">{mode}</span>
                  <span className="text-brand-green font-bold">{pct}</span>
                </div>
                <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-brand-green" 
                    style={{ width: pct }}
                  />
                </div>
              </div>
            ))}
          </div>

          <p className="text-[10px] text-slate-400 mt-2">
            Tip: Swapping a single taxi trip with walking or cycling reduces emissions by nearly 92% per kilometer traveled. Keep moving green!
          </p>
        </div>
      </div>
    </div>
  );
}
