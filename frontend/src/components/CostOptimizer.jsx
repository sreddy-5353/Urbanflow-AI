import React from 'react';
import { useMobility } from '../context/MobilityContext';
import { IndianRupee, Flame, Lightbulb, TrendingUp } from 'lucide-react';

export default function CostOptimizer() {
  const { costComparison } = useMobility();

  if (!costComparison) {
    return (
      <div className="glass-panel p-6 rounded-2xl text-center text-xs text-slate-400">
        Plan a trip route to analyze cost-saving alternatives.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 w-full max-w-4xl mx-auto">
      {/* Dynamic savings insight banner */}
      <div className="bg-brand-teal/10 border border-brand-teal/40 p-4 rounded-2xl flex gap-3.5 items-start">
        <div className="bg-brand-teal p-2 rounded-xl text-darkBg-deep">
          <Lightbulb className="w-5 h-5 font-bold" />
        </div>
        <div className="flex flex-col gap-1">
          <h4 className="text-xs font-bold text-brand-neonCyan uppercase tracking-wide">Optimization Opportunity</h4>
          <p className="text-xs text-slate-200 leading-relaxed">
            {costComparison.insights.savings_opportunity}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Side: Summary & Insights */}
        <div className="glass-panel p-5 rounded-2xl md:col-span-1 flex flex-col justify-between gap-4">
          <div className="flex flex-col gap-3">
            <h3 className="text-sm font-bold text-slate-200 border-b border-darkBg-border pb-2 flex items-center gap-1">
              <IndianRupee className="w-4 h-4 text-brand-teal" />
              Fare Optimization
            </h3>
            
            <div className="flex flex-col gap-1.5 mt-2">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Cheapest Transport</span>
              <span className="text-sm font-black text-brand-neonCyan">{costComparison.insights.cheapest_alternative}</span>
            </div>

            <div className="flex flex-col gap-1.5 mt-1">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Best Cost-Time Ratio</span>
              <span className="text-sm font-black text-brand-teal">{costComparison.insights.best_value}</span>
            </div>
          </div>

          <p className="text-[10px] text-slate-400">
            Fares are dynamically calculated using active fuel indexes, public transit tariff lists, and average ride-share surge values.
          </p>
        </div>

        {/* Right Side: Detailed Mode Comparison */}
        <div className="glass-panel p-5 rounded-2xl md:col-span-2 flex flex-col gap-4">
          <h3 className="text-sm font-bold text-slate-200 border-b border-darkBg-border pb-2 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-brand-teal" />
            Transit Rates Comparison
          </h3>

          <div className="flex flex-col gap-3 max-h-[300px] overflow-y-auto pr-1">
            {costComparison.comparisons.map((c, i) => (
              <div key={i} className="bg-darkBg-deep/40 border border-darkBg-border p-3 rounded-xl flex items-center justify-between gap-3">
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs font-bold text-slate-200">{c.mode}</span>
                  <span className="text-[10px] text-slate-400">{c.time_mins} mins travel time</span>
                </div>
                <div className="flex items-center gap-6">
                  <div className="flex flex-col items-end">
                    <span className="text-xs font-black text-brand-neonCyan">
                      {c.cost === 0.0 ? "FREE" : `₹${c.cost.toFixed(2)}`}
                    </span>
                    <span className="text-[9px] text-slate-400">{c.carbon_kg} kg CO2</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
