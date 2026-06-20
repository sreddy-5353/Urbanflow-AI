import React, { useState } from 'react';
import { useMobility } from './context/MobilityContext';
import Sidebar from './components/Sidebar';
import MapView from './components/MapView';
import SOSButton from './components/SOSButton';
import AIChat from './components/AIChat';
import TrafficDashboard from './components/TrafficDashboard';
import CarbonTracker from './components/CarbonTracker';
import CostOptimizer from './components/CostOptimizer';
import AlertSystem from './components/AlertSystem';
import AdminDashboard from './components/AdminDashboard';
import CommunityReportModal from './components/CommunityReportModal';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertOctagon, Bot, ShieldAlert, Sparkles, Plus, Shield } from 'lucide-react';

export default function App() {
  const {
    currentUser,
    isAuthenticated,
    authLoading,
    activeTab,
    setActiveTab,
    adminViewActive,
    setAdminViewActive,
    sosActive,
    triggerSOS
  } = useMobility();

  // Dialog controls
  const [chatOpen, setChatOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

  if (authLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-darkBg-deep">
        <div className="flex flex-col items-center gap-3">
          <span className="w-8 h-8 rounded-full border-4 border-brand-teal border-t-transparent animate-spin" />
          <span className="text-xs text-brand-neonCyan font-bold uppercase tracking-widest animate-pulse">
            Connecting to UrbanFlow AI Central Net...
          </span>
        </div>
      </div>
    );
  }


  // 2. MAIN APPLICATION WORKSPACE
  return (
    <div className="flex flex-col lg:flex-row h-screen w-screen overflow-hidden bg-darkBg-deep relative">
      
      {/* Dynamic pulse background if SOS is active */}
      {sosActive && (
        <div className="absolute inset-0 bg-brand-red/5 border-4 border-brand-red animate-pulse pointer-events-none z-50" />
      )}

      {/* Main Sidebar controls */}
      <Sidebar onOpenChat={() => setChatOpen(true)} />

      {/* Main content grid */}
      <div className="flex-1 flex flex-col h-full overflow-y-auto lg:overflow-hidden">
        
        {/* Top Control Bar */}
        <header className="p-4 border-b border-darkBg-border flex items-center justify-between bg-darkBg-card/40 relative">
          <div className="flex items-center gap-4">
            <span className="text-xs font-bold text-slate-400">
              Active Control Node: <b className="text-brand-neonCyan">{activeTab.toUpperCase()}</b>
            </span>
            
            {/* Show Admin View toggle toggle if user has admin credentials */}
            {currentUser?.role === 'admin' && (
              <button
                onClick={() => {
                  setAdminViewActive(!adminViewActive);
                  setActiveTab(adminViewActive ? 'routes' : 'admin');
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[10px] font-bold cursor-pointer transition-all ${
                  adminViewActive 
                    ? 'bg-brand-neonCyan text-darkBg-deep border-brand-neonCyan shadow-neonCyan' 
                    : 'bg-slate-800 text-slate-300 border-darkBg-border'
                }`}
              >
                <Shield className="w-3.5 h-3.5" />
                {adminViewActive ? "City Admin Panel: Active" : "Go to Admin Panel"}
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Log Community Incident button */}
            <button
              onClick={() => setReportOpen(true)}
              className="bg-brand-teal/20 hover:bg-brand-teal/30 text-brand-neonCyan border border-brand-teal/40 px-3.5 py-1.5 rounded-xl text-[10px] font-bold cursor-pointer flex items-center gap-1.5 transition-all duration-200"
            >
              <Plus className="w-3.5 h-3.5" /> Report Hazard
            </button>

            {/* Top Shortcut SOS Trigger Button */}
            <button
              onClick={() => {
                if (sosActive) {
                  setActiveTab('safety');
                } else {
                  triggerSOS();
                  setActiveTab('safety');
                }
              }}
              className={`px-4 py-1.5 rounded-xl text-[10px] font-black cursor-pointer border flex items-center gap-1.5 transition-all duration-300 ${
                sosActive 
                  ? 'bg-slate-900 border-slate-700 text-slate-400 animate-pulse'
                  : 'bg-brand-red hover:bg-brand-red/90 text-white border-brand-red shadow-neonRed'
              }`}
            >
              <AlertOctagon className="w-3.5 h-3.5" /> 
              {sosActive ? "SOS ON AIR" : "PANIC SOS"}
            </button>
          </div>
        </header>

        {/* Workspace Body splits */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-visible lg:overflow-hidden p-4 gap-4">
          
          {/* Dashboard Panels Left */}
          <div className="w-full lg:w-[48%] overflow-y-auto pr-1">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="h-full"
              >
                {activeTab === 'routes' && (
                  <div className="glass-panel p-5 rounded-2xl h-full flex items-center justify-center text-center">
                    <div className="flex flex-col items-center gap-3 max-w-sm">
                      <div className="bg-brand-teal/20 p-4 rounded-full border border-brand-teal/30">
                        <Sparkles className="w-8 h-8 text-brand-neonCyan animate-spin" />
                      </div>
                      <h3 className="text-sm font-bold text-slate-200">Interactive Map Directions</h3>
                      <p className="text-xs text-slate-400">
                        Enter starting coordinates and destinations in the sidebar to plot fastest safety corridors, compare CO2 metrics, and calculate municipal public fares.
                      </p>
                    </div>
                  </div>
                )}
                {activeTab === 'traffic' && <TrafficDashboard />}
                {activeTab === 'safety' && <SOSButton />}
                {activeTab === 'carbon' && <CarbonTracker />}
                {activeTab === 'cost' && <CostOptimizer />}
                {activeTab === 'alerts' && <AlertSystem />}
                {activeTab === 'admin' && <AdminDashboard />}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Interactive Map Right */}
          <div className="w-full lg:w-[52%] h-[480px] lg:h-full">
            <MapView />
          </div>

        </div>

      </div>

      {/* Floating chatbot bubble */}
      {!chatOpen && (
        <button
          onClick={() => setChatOpen(true)}
          className="fixed bottom-6 right-6 z-30 bg-brand-teal text-darkBg-deep p-4 rounded-full shadow-lg shadow-black cursor-pointer hover:scale-105 hover:bg-brand-teal/90 transition-all duration-200 border-none"
        >
          <Bot className="w-6 h-6" />
        </button>
      )}

      {/* AI Assistant Chat slide-out */}
      <AIChat isOpen={chatOpen} onClose={() => setChatOpen(false)} />

      {/* Community Report dialog modal */}
      <CommunityReportModal isOpen={reportOpen} onClose={() => setReportOpen(false)} />

    </div>
  );
}
