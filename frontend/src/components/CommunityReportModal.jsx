import React, { useState } from 'react';
import { useMobility } from '../context/MobilityContext';
import { AlertTriangle, MapPin, Eye, Camera } from 'lucide-react';

export default function CommunityReportModal({ isOpen, onClose }) {
  const { submitIncidentReport, currentLocation } = useMobility();

  const [type, setType] = useState("Accident");
  const [description, setDescription] = useState("");
  const [severity, setSeverity] = useState("Moderate");
  const [imagePreview, setImagePreview] = useState(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!description.trim()) return;

    // Simulate GPS Tagging near current location coordinates with slight randomness
    // to populate different nodes on the map for demonstration
    const offsetLat = (Math.random() - 0.5) * 0.02;
    const offsetLng = (Math.random() - 0.5) * 0.02;
    const taggedLat = currentLocation.lat + offsetLat;
    const taggedLng = currentLocation.lng + offsetLng;

    submitIncidentReport(type, description, taggedLat, taggedLng, severity);
    
    // reset form
    setDescription("");
    setType("Accident");
    setSeverity("Moderate");
    setImagePreview(null);
    onClose();
    alert("Report logged! Once verified by community upvotes, it will become a public safety indicator.");
  };

  const handleSimulatePhoto = () => {
    setImagePreview("https://images.unsplash.com/photo-1596464716127-f2a82984de30?w=300"); // mock image
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="glass-panel p-6 rounded-3xl max-w-md w-full border border-brand-teal/30 shadow-2xl relative">
        <h3 className="text-lg font-black text-slate-100 flex items-center gap-2 border-b border-darkBg-border pb-2.5">
          <AlertTriangle className="w-5 h-5 text-brand-neonCyan" />
          Log Safety/Traffic Incident
        </h3>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-4 text-xs">
          {/* Incident Type */}
          <div className="flex flex-col gap-1.5">
            <label className="text-slate-300 font-semibold uppercase tracking-wider">Hazard / Event Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="glass-input p-2.5 rounded-xl border border-darkBg-border text-slate-100"
            >
              <option value="Accident">Accident / Collision</option>
              <option value="Unsafe Area">Unsafe Area / No Streetlights</option>
              <option value="Traffic Congestion">Traffic Congestion / Gridlock</option>
              <option value="Road Damage">Road Damage / Potholes</option>
              <option value="Flooded Road">Flooded Road / Waterlogging</option>
              <option value="Harassment">Harassment / Unsafe Behavior</option>
            </select>
          </div>

          {/* Severity */}
          <div className="flex flex-col gap-1.5">
            <label className="text-slate-300 font-semibold uppercase tracking-wider">Severity Level</label>
            <div className="grid grid-cols-3 gap-2">
              {["Low", "Moderate", "High"].map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => setSeverity(level)}
                  className={`py-2 rounded-xl font-bold cursor-pointer transition-all border ${
                    severity === level
                      ? level === "High"
                        ? "bg-brand-red text-white border-brand-red"
                        : level === "Moderate"
                        ? "bg-brand-teal text-darkBg-deep border-brand-teal"
                        : "bg-slate-700 text-white border-slate-600"
                      : "bg-slate-800/40 text-slate-400 border-darkBg-border"
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div className="flex flex-col gap-1.5">
            <label className="text-slate-300 font-semibold uppercase tracking-wider">Event Details</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              rows={3}
              placeholder="Provide context (e.g. tree fallen blocking right lane, metro station elevator broken, streetlights out for 100 meters)"
              className="glass-input p-3 rounded-xl resize-none text-slate-200 text-xs w-full"
            />
          </div>

          {/* GPS tag notification */}
          <div className="bg-darkBg-deep/50 border border-darkBg-border p-3 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-300">
              <MapPin className="w-4 h-4 text-brand-neonCyan" />
              <span>GPS Coordinates Tagged</span>
            </div>
            <span className="text-[10px] font-bold text-slate-400">
              ({currentLocation.lat.toFixed(4)}, {currentLocation.lng.toFixed(4)})
            </span>
          </div>

          {/* Photo upload mock */}
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between items-center">
              <label className="text-slate-300 font-semibold uppercase tracking-wider">Verification Photo</label>
              <button
                type="button"
                onClick={handleSimulatePhoto}
                className="text-brand-neonCyan text-[10px] font-bold underline cursor-pointer bg-transparent border-none"
              >
                Simulate Camera Snapshot
              </button>
            </div>
            {imagePreview ? (
              <div className="h-20 w-full rounded-xl overflow-hidden border border-brand-teal/40 relative">
                <img src={imagePreview} className="w-full h-full object-cover" alt="Verification" />
                <span className="absolute bottom-1 right-1 text-[8px] bg-darkBg-deep/75 px-1.5 py-0.5 rounded text-brand-neonCyan font-bold uppercase">
                  GPS Verified
                </span>
              </div>
            ) : (
              <div className="h-12 border border-dashed border-darkBg-border rounded-xl flex items-center justify-center text-slate-500 gap-1.5">
                <Camera className="w-4 h-4" />
                <span>Upload Snapshot (Optional)</span>
              </div>
            )}
          </div>

          {/* Form Actions */}
          <div className="grid grid-cols-2 gap-3 mt-2 border-t border-darkBg-border pt-4">
            <button
              type="button"
              onClick={onClose}
              className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-2.5 rounded-xl cursor-pointer transition-all border-none"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-brand-teal hover:bg-brand-teal/80 text-darkBg-deep font-bold py-2.5 rounded-xl cursor-pointer transition-all border-none"
            >
              Submit Report
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
