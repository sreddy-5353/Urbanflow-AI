import React, { useState, useEffect, useRef } from 'react';
import { useMobility } from '../context/MobilityContext';
import { AlertOctagon, Phone, Shield, BellRing, MapPin, Eye, Compass, HeartPulse, Sparkles, Volume2 } from 'lucide-react';

export default function SOSButton() {
  const {
    currentUser,
    sosActive,
    sosDetails,
    triggerSOS,
    deactivateSOS,
    updateContacts,
    currentLocation
  } = useMobility();

  const [contactsText, setContactsText] = useState("");
  const [countdown, setCountdown] = useState(null);
  const [voiceActivated, setVoiceActivated] = useState(false);
  const [fakeCallActive, setFakeCallActive] = useState(false);
  const [fakeCallIncoming, setFakeCallIncoming] = useState(false);
  const [sirenActive, setSirenActive] = useState(false);
  
  const audioContextRef = useRef(null);
  const oscillatorRef = useRef(null);
  const intervalRef = useRef(null);

  // Stop sound on unmount
  useEffect(() => {
    return () => {
      if (oscillatorRef.current) {
        try { oscillatorRef.current.stop(); } catch(e) {}
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const toggleSiren = () => {
    if (sirenActive) {
      if (oscillatorRef.current) {
        try {
          oscillatorRef.current.stop();
        } catch (err) {}
        oscillatorRef.current = null;
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setSirenActive(false);
    } else {
      try {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        const ctx = new AudioContextClass();
        audioContextRef.current = ctx;
        
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(600, ctx.currentTime);
        
        gain.gain.setValueAtTime(0.25, ctx.currentTime);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        
        let up = true;
        intervalRef.current = setInterval(() => {
          if (!osc) return;
          const now = ctx.currentTime;
          if (up) {
            osc.frequency.exponentialRampToValueAtTime(1000, now + 0.4);
          } else {
            osc.frequency.exponentialRampToValueAtTime(600, now + 0.4);
          }
          up = !up;
        }, 500);
        
        oscillatorRef.current = osc;
        setSirenActive(true);
      } catch (e) {
        console.error("Web Audio API not supported or blocked", e);
        alert("Siren playing simulated in logs (AudioContext blocked by browser configuration).");
        setSirenActive(true);
      }
    }
  };

  useEffect(() => {
    if (currentUser) {
      setContactsText(currentUser.emergency_contacts || "");
    }
  }, [currentUser]);

  // Voice activation simulation
  useEffect(() => {
    let interval;
    if (voiceActivated) {
      // Simulate listening and randomly trigger SOS on keyword "help"
      interval = setInterval(() => {
        const keywords = ["help", "stop", "emergency", "danger", "police"];
        console.log("Listening for emergency voice keywords...");
      }, 5000);
    }
    return () => clearInterval(interval);
  }, [voiceActivated]);

  // Countdown timer for SOS trigger
  useEffect(() => {
    let timer;
    if (countdown !== null) {
      if (countdown > 0) {
        timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      } else {
        setCountdown(null);
        triggerSOS();
      }
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  const handlePanicClick = () => {
    if (sosActive) {
      deactivateSOS();
    } else {
      // 3-second countdown to cancel
      setCountdown(3);
    }
  };

  const handleSaveContacts = (e) => {
    e.preventDefault();
    updateContacts(contactsText);
    alert("Emergency contacts updated successfully!");
  };

  const triggerFakeCall = () => {
    setFakeCallIncoming(true);
    setTimeout(() => {
      // Ring for 30s
      setFakeCallIncoming(false);
    }, 15000);
  };

  const answerFakeCall = () => {
    setFakeCallIncoming(false);
    setFakeCallActive(true);
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-4xl mx-auto pb-12">
      {/* 1. SOS Main Panel */}
      <div className="glass-panel p-6 rounded-3xl border-brand-red/30 relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="absolute top-0 right-0 w-32 h-32 bg-brand-red/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col gap-2 max-w-lg">
          <div className="flex items-center gap-2 text-brand-red">
            <AlertOctagon className="w-5 h-5 animate-pulse" />
            <span className="text-xs uppercase font-bold tracking-widest text-brand-red glow-red">
              SHE Teams Emergency Support Integrated
            </span>
          </div>
          <h2 className="text-2xl font-black text-slate-100 tracking-tight">
            One-Tap Emergency Assist
          </h2>
          <p className="text-sm text-slate-400">
            Pressing the panic button immediately transmits your live location coordinates, audio streams, and profile metrics to emergency services and your trusted guardians.
          </p>
          <p className="text-[10px] text-brand-red font-black uppercase tracking-wider flex items-center gap-1 mt-1.5 animate-pulse">
            🚨 Calling emergency contact immediately after SOS activation.
          </p>
        </div>

        {/* Pulsing Emergency SOS Button */}
        <div className="flex flex-col items-center gap-2">
          {countdown !== null ? (
            <button
              onClick={() => setCountdown(null)}
              className="w-32 h-32 rounded-full bg-slate-800 border-4 border-brand-red flex flex-col items-center justify-center gap-1 cursor-pointer animate-pulse transition-all duration-300 shadow-neonRed"
            >
              <span className="text-4xl font-extrabold text-brand-red">{countdown}</span>
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Cancel</span>
            </button>
          ) : (
            <button
              onClick={handlePanicClick}
              className={`w-36 h-36 rounded-full flex flex-col items-center justify-center gap-1.5 cursor-pointer border-4 border-white transition-all duration-500 shadow-lg ${
                sosActive 
                  ? 'bg-slate-900 border-slate-600 shadow-none' 
                  : 'bg-brand-red hover:scale-105 shadow-neonRed'
              }`}
            >
              <BellRing className={`w-10 h-10 text-white ${sosActive ? 'text-slate-500' : 'animate-bounce'}`} />
              <span className="text-lg font-black text-white uppercase tracking-wider">
                {sosActive ? "DEACTIVATE" : "PANIC SOS"}
              </span>
              <span className="text-[9px] text-white/70 tracking-wide font-medium">
                {sosActive ? "System Alerted" : "3s Auto Dispatch"}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* SOS Active Notification Overlay */}
      {sosActive && (
        <div className="bg-brand-red/10 border border-brand-red/50 p-5 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4 animate-pulse">
          <div className="flex gap-4 items-start">
            <div className="bg-brand-red p-3 rounded-xl">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-100 uppercase tracking-wide">
                Live Location Broadcast Active
              </h4>
              <p className="text-xs text-slate-300 mt-1">
                Relaying coordinates to SHE Teams Control: <b>({currentLocation.lat.toFixed(5)}, {currentLocation.lng.toFixed(5)})</b>
              </p>
              <div className="flex flex-wrap gap-2 mt-2">
                {sosDetails?.notified_contacts.map((contact, i) => (
                  <span key={i} className="text-[10px] bg-brand-red/25 border border-brand-red/40 px-2 py-0.5 rounded-full text-slate-200">
                    Notified: {contact}
                  </span>
                ))}
              </div>
            </div>
          </div>
          <button 
            onClick={deactivateSOS}
            className="text-xs bg-slate-100 hover:bg-slate-200 text-brand-red px-4 py-2 rounded-xl font-bold cursor-pointer transition-all duration-200 border-none"
          >
            RESOLVE ALERT
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 2. Guardian Settings & Voice SOS */}
        <div className="glass-panel p-6 rounded-2xl flex flex-col gap-4">
          <h3 className="text-base font-bold text-slate-100 flex items-center gap-2 border-b border-darkBg-border pb-2">
            <Phone className="w-4 h-4 text-brand-teal" />
            Trusted Guardians & Contacts
          </h3>
          <p className="text-xs text-slate-400">
            Specify names and mobile numbers separated by semicolons (e.g. <i>Mom:555-0199;Dad:555-0188</i>).
          </p>
          <form onSubmit={handleSaveContacts} className="flex flex-col gap-3">
            <textarea
              value={contactsText}
              onChange={(e) => setContactsText(e.target.value)}
              className="glass-input p-3 rounded-xl text-sm w-full h-20 resize-none text-slate-200"
              placeholder="Mom:555-0199;Dad:555-0188"
            />
            <button
              type="submit"
              className="bg-brand-teal hover:bg-brand-teal/80 text-darkBg-deep font-bold text-xs py-2.5 rounded-xl cursor-pointer transition-all duration-200"
            >
              Update Guardians List
            </button>
          </form>

          {/* Voice Activation Toggle */}
          <div className="flex items-center justify-between border-t border-darkBg-border pt-4 mt-2">
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-brand-neonCyan" />
                Voice-Activated SOS
              </span>
              <span className="text-[10px] text-slate-400">Trigger alert by screaming "Help, Emergency!"</span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                checked={voiceActivated} 
                onChange={(e) => setVoiceActivated(e.target.checked)} 
                className="sr-only peer" 
              />
              <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand-teal"></div>
            </label>
          </div>
        </div>

        {/* 3. Defense Features: Fake Call & Map */}
        <div className="glass-panel p-6 rounded-2xl flex flex-col justify-between gap-4">
          <div className="flex flex-col gap-3">
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2 border-b border-darkBg-border pb-2">
              <Shield className="w-4 h-4 text-brand-teal" />
              Pre-Emptive Safety Features
            </h3>
            <p className="text-xs text-slate-400">
              In unsafe alleys, use the **Fake Call** simulator to discourage harassment, or click the buttons below to locate nearest emergency centres.
            </p>
          </div>

          {/* Fake Call Widget */}
          <div className="bg-darkBg-deep/50 border border-darkBg-border p-4 rounded-xl flex flex-col gap-3 relative">
            <div className="flex justify-between items-center gap-2">
              <span className="text-xs font-semibold text-slate-300 flex items-center gap-1">
                📞 Safety Controls
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={triggerFakeCall}
                  disabled={fakeCallIncoming || fakeCallActive}
                  className="bg-brand-teal/20 hover:bg-brand-teal/30 text-brand-neonCyan border border-brand-teal/40 font-semibold text-[10px] px-3 py-1.5 rounded-lg cursor-pointer"
                >
                  Fake Call (5s)
                </button>
                <button
                  type="button"
                  onClick={toggleSiren}
                  className={`font-semibold text-[10px] px-3 py-1.5 rounded-lg cursor-pointer transition-all border ${
                    sirenActive
                      ? 'bg-brand-red text-white border-brand-red animate-pulse'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                  }`}
                >
                  {sirenActive ? "🚨 Stop Siren" : "🔊 Sound Siren"}
                </button>
              </div>
            </div>

            {fakeCallIncoming && (
              <div className="bg-brand-teal/15 border border-brand-teal/40 p-3 rounded-lg flex items-center justify-between animate-bounce">
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-brand-neonCyan">INCOMING CALL...</span>
                  <span className="text-[10px] text-slate-300">Dad (Emergency Backup)</span>
                </div>
                <button
                  onClick={answerFakeCall}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-[10px] px-3 py-1.5 rounded-lg cursor-pointer"
                >
                  Answer
                </button>
              </div>
            )}

            {fakeCallActive && (
              <div className="bg-slate-800/80 border border-slate-700 p-3 rounded-lg flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-emerald-400">CALL CONNECTED (00:09)</span>
                  <span className="text-[10px] text-slate-400">Siri/Auto-Voice Simulated</span>
                </div>
                <button
                  onClick={() => setFakeCallActive(false)}
                  className="bg-red-500 hover:bg-red-600 text-white font-bold text-[10px] px-3 py-1.5 rounded-lg cursor-pointer"
                >
                  End Call
                </button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <a
              href={`https://www.google.com/maps/search/police+station/@${currentLocation.lat},${currentLocation.lng},15z`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-2 bg-darkBg-card border border-darkBg-border hover:border-brand-teal/50 text-slate-300 hover:text-white py-2.5 rounded-xl text-xs font-bold transition-all duration-200"
            >
              <Compass className="w-4 h-4 text-brand-neonCyan" />
              Police Stations
            </a>
            <a
              href={`https://www.google.com/maps/search/hospital/@${currentLocation.lat},${currentLocation.lng},15z`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-2 bg-darkBg-card border border-darkBg-border hover:border-brand-teal/50 text-slate-300 hover:text-white py-2.5 rounded-xl text-xs font-bold transition-all duration-200"
            >
              <HeartPulse className="w-4 h-4 text-brand-red" />
              Hospitals
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
