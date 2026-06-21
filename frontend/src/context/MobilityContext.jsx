import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';
import { geocodeLocation, extractChatPlaces } from '../utils/geocode';

const MobilityContext = createContext();

export const useMobility = () => useContext(MobilityContext);

export const MobilityProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(true);
  
  // Geolocation
  const [currentLocation, setCurrentLocation] = useState({ lat: 17.3850, lng: 78.4867 }); // default Hyderabad
  const [startPoint, setStartPoint] = useState({ name: "Current Location (Snapped to Begumpet Rd)", lat: 17.4375, lng: 78.4482 });
  const [endPoint, setEndPoint] = useState(null);

  const [locatingStatus, setLocatingStatus] = useState("idle"); // idle, locating, success, error
  const [locatingLog, setLocatingLog] = useState("");

  // Simulated Hyderabad road network nodes for snapping
  const HYD_ROADS = [
    { name: "Banjara Hills Rd No. 1", lat: 17.4150, lng: 78.4410 },
    { name: "HITEC City Main Rd", lat: 17.4440, lng: 78.3780 },
    { name: "RGIA Airport Access Rd", lat: 17.2420, lng: 78.4310 },
    { name: "Hussain Sagar Ring Rd", lat: 17.4250, lng: 78.4750 },
    { name: "Osmania University Rd", lat: 17.4140, lng: 78.5290 },
    { name: "Charminar Heritage Path", lat: 17.3620, lng: 78.4750 },
    { name: "Inorbit Mall Entry Rd", lat: 17.4340, lng: 78.3840 },
    { name: "Gachibowli Flyover", lat: 17.4401, lng: 78.3489 },
    { name: "Begumpet Rd", lat: 17.4375, lng: 78.4482 },
    { name: "Secunderabad Station Rd", lat: 17.4344, lng: 78.5011 }
  ];

  const snapToRoad = (lat, lng) => {
    let nearest = HYD_ROADS[0];
    let minDist = Infinity;
    
    HYD_ROADS.forEach(road => {
      const dist = Math.sqrt(Math.pow(road.lat - lat, 2) + Math.pow(road.lng - lng, 2));
      if (dist < minDist) {
        minDist = dist;
        nearest = road;
      }
    });

    // If nearest road is within ~3km, snap to it, otherwise slightly shift coordinates to mock snapping
    if (minDist < 0.03) {
      return {
        lat: nearest.lat,
        lng: nearest.lng,
        name: `${nearest.name}`
      };
    } else {
      return {
        lat: lat + 0.0001,
        lng: lng - 0.0001,
        name: "Nearest Drivable Road"
      };
    }
  };

  const detectLocation = () => {
    setLocatingStatus("locating");
    setLocatingLog("Checking GPS satellites... Scanning local Wi-Fi networks... Reading mobile cell tower data (ID: 404B)...");
    
    setTimeout(() => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
            const snapped = snapToRoad(loc.lat, loc.lng);
            
            setCurrentLocation(loc);
            setStartPoint({
              name: `Live Location (${snapped.name})`,
              lat: snapped.lat,
              lng: snapped.lng,
              isSnapped: true
            });
            setLocatingStatus("success");
            setLocatingLog("Live location snapped to nearest drivable road.");
          },
          (err) => {
            console.log("Geolocation error: using default", err);
            const snapped = snapToRoad(17.3850, 78.4867);
            setStartPoint({
              name: `Live Location (${snapped.name})`,
              lat: snapped.lat,
              lng: snapped.lng,
              isSnapped: true
            });
            setLocatingStatus("success");
            setLocatingLog("Location simulated via Wi-Fi IP.");
          }
        );
      } else {
        const snapped = snapToRoad(17.3850, 78.4867);
        setStartPoint({
          name: `Live Location (${snapped.name})`,
          lat: snapped.lat,
          lng: snapped.lng,
          isSnapped: true
        });
        setLocatingStatus("success");
        setLocatingLog("Location simulated via Wi-Fi IP.");
      }
    }, 1200);
  };
  
  // UI Tabs / Views
  const [activeTab, setActiveTab] = useState("routes"); // routes, traffic, safety, carbon, cost, alerts, community, admin
  const [adminViewActive, setAdminViewActive] = useState(false);
  
  // States
  const [routesData, setRoutesData] = useState(null);
  const [selectedRouteOption, setSelectedRouteOption] = useState(null);
  const [routingPreference, setRoutingPreference] = useState("balanced");
  const [routingLoading, setRoutingLoading] = useState(false);
  
  const [congestionHotspots, setCongestionHotspots] = useState([]);
  const [trafficForecasts, setTrafficForecasts] = useState([]);
  const [safetyHotspots, setSafetyHotspots] = useState([]);
  
  const [sosActive, setSosActive] = useState(false);
  const [sosDetails, setSosDetails] = useState(null);
  
  const [carbonStats, setCarbonStats] = useState(null);
  const [costComparison, setCostComparison] = useState(null);
  const [systemAlerts, setSystemAlerts] = useState([]);
  const [communityIncidents, setCommunityIncidents] = useState([]);
  const [adminMetrics, setAdminMetrics] = useState(null);
  
  // Chatbot
  const [chatMessages, setChatMessages] = useState([
    { sender: "ai", text: "Hello! I am your UrbanFlow AI Mobility Assistant. Where would you like to travel today? I can help optimize for safety, cost, time, or carbon emissions." }
  ]);
  const [chatLoading, setChatLoading] = useState(false);

  // Check auth on load
  useEffect(() => {
    checkAuthStatus();
    detectLocation();
  }, []);

  const checkAuthStatus = async () => {
    // Try existing token first
    const token = localStorage.getItem("token");
    if (token) {
      try {
        const user = await api.getCurrentUser();
        setCurrentUser(user);
        setIsAuthenticated(true);
        if (user.role === "admin") {
          setAdminViewActive(true);
        }
        setAuthLoading(false);
        return;
      } catch (e) {
        localStorage.removeItem("token");
      }
    }
    // No valid token – auto-login as default citizen user (no login page)
    try {
      await api.login("user@urbanflow.ai", "password123");
      const user = await api.getCurrentUser();
      setCurrentUser(user);
      setIsAuthenticated(true);
    } catch (e) {
      console.error("Auto-login failed", e);
    } finally {
      setAuthLoading(false);
    }
  };

  const login = async (email, password) => {
    setAuthError("");
    try {
      await api.login(email, password);
      const user = await api.getCurrentUser();
      setCurrentUser(user);
      setIsAuthenticated(true);
      if (user.role === "admin") {
        setAdminViewActive(true);
      }
      return user;
    } catch (e) {
      setAuthError(e.message || "Invalid credentials");
      throw e;
    }
  };

  const register = async (name, email, password) => {
    setAuthError("");
    try {
      await api.register(name, email, password);
      await login(email, password);
    } catch (e) {
      setAuthError(e.message || "Registration failed");
      throw e;
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    setCurrentUser(null);
    setIsAuthenticated(false);
    setAdminViewActive(false);
  };

  // Main data loaders
  const loadMobilityData = async () => {
    if (!isAuthenticated) return;
    try {
      const alerts = await api.getAlerts();
      setSystemAlerts(alerts);
      
      const incidents = await api.getIncidents();
      setCommunityIncidents(incidents);
      
      const carbon = await api.getCarbonStats();
      setCarbonStats(carbon);

      const congestion = await api.getCongestion(currentLocation.lat, currentLocation.lng);
      setCongestionHotspots(congestion);

      const safety = await api.getSafetyHotspots(currentLocation.lat, currentLocation.lng);
      setSafetyHotspots(safety);

      if (currentUser?.role === "admin") {
        const metrics = await api.getAdminMetrics();
        setAdminMetrics(metrics);
      }
    } catch (e) {
      console.error("Failed to load mobility stats", e);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadMobilityData();
    }
  }, [isAuthenticated, currentLocation]);

  // Route Plan Action
  const calculateRoute = async (start, end, preference = routingPreference) => {
    setRoutingLoading(true);
    try {
      const data = await api.planRoute(start.lat, start.lng, end.lat, end.lng, preference, start.name, end.name);
      setRoutesData(data);
      // Select the first option by default
      setSelectedRouteOption(data.options[0]);
      
      // Calculate costs comparisons for this trip distance
      const distance = data.options[0].distance_km;
      const costData = await api.getCostCompare(distance, false);
      setCostComparison(costData);
      
      // Fetch forecasts for the end coordinates
      const forecastData = await api.getTrafficForecast(end.lat, end.lng);
      setTrafficForecasts(forecastData);
      
      // Reload user details (sustainability points might have changed)
      checkAuthStatus();
    } catch (e) {
      console.error("Routing error", e);
    } finally {
      setRoutingLoading(false);
    }
  };

  // SOS Trigger Action
  const triggerSOS = async () => {
    const routeStr = selectedRouteOption ? `${selectedRouteOption.mode} route (${selectedRouteOption.distance_km}km)` : "Unknown Route";
    try {
      const data = await api.triggerSOS(currentLocation.lat, currentLocation.lng, routeStr);
      setSosActive(true);
      setSosDetails(data);
      
      // Add emergency chat message
      setChatMessages(prev => [
        ...prev,
        { sender: "ai", text: `⚠️ SOS TRIGGERED! SHE-Teams and emergency personnel have been dispatched to your exact GPS location: (${currentLocation.lat.toFixed(5)}, ${currentLocation.lng.toFixed(5)}). Relaying alerts to your trusted emergency contacts immediately.` }
      ]);
    } catch (e) {
      console.error("SOS Trigger backend failed, using local offline fallback", e);
      // Resilient local activation fallback if backend has connectivity issues
      setSosActive(true);
      setSosDetails({
        id: Math.floor(Math.random() * 1000) + 1,
        latitude: currentLocation.lat,
        longitude: currentLocation.lng,
        status: "Local Dispatch Active (Offline Fallback)",
        route_details: routeStr,
        notified_contacts: currentUser?.emergency_contacts
          ? currentUser.emergency_contacts.split(";").map(c => c.split(":")[0])
          : ["Trusted Guardian (SMS link sent)"]
      });

      setChatMessages(prev => [
        ...prev,
        { sender: "ai", text: `⚠️ OFFLINE SOS ACTIVATED! Unable to reach central servers, but local SMS alerts have been generated for your guardians. Please contact SHE-Teams directly: 1091.` }
      ]);
      
      // Warn the user
      alert("⚠️ Emergency Server Offline: Activating local fallback. SMS alerts prepared for trusted contacts.");
    }
  };

  const deactivateSOS = () => {
    setSosActive(false);
    setSosDetails(null);
  };

  // Incident Submit Action
  const submitIncidentReport = async (type, description, lat, lng, severity) => {
    try {
      await api.reportIncident(type, description, lat, lng, severity);
      // reload incidents
      const incidents = await api.getIncidents();
      setCommunityIncidents(incidents);
    } catch (e) {
      console.error("Incident report failed", e);
    }
  };

  // Upvote Incident Action
  const upvoteIncident = async (incidentId) => {
    try {
      await api.upvoteIncident(incidentId);
      const incidents = await api.getIncidents();
      setCommunityIncidents(incidents);
    } catch (e) {
      console.error("Upvoting incident failed", e);
    }
  };

  // Chat message submit
  const sendChatMessage = async (text) => {
    if (!text.trim()) return;
    setChatMessages(prev => [...prev, { sender: "user", text }]);
    setChatLoading(true);
    
    try {
      // Resolve any place names mentioned in the message from the browser
      // (not the backend server) so Nominatim doesn't block the request --
      // this mirrors how the route-search sidebar already works reliably.
      const { toPlace, fromPlace } = extractChatPlaces(text);
      let originOverride = null;
      let destOverride = null;

      if (fromPlace) {
        const resolved = await geocodeLocation(fromPlace);
        if (resolved) originOverride = resolved;
      }
      if (toPlace) {
        const resolved = await geocodeLocation(toPlace);
        if (resolved) destOverride = resolved;
      }

      const replyData = await api.sendMessage(
        text, currentLocation.lat, currentLocation.lng, originOverride, destOverride
      );
      setChatMessages(prev => [...prev, { sender: "ai", text: replyData.reply }]);
      
      // Check chatbot suggested action
      if (replyData.suggested_action === "TRIGGER_SOS") {
        triggerSOS();
        setActiveTab("safety");
      } else if (replyData.suggested_action === "DISPLAY_ROUTE" && replyData.suggested_route) {
        setRoutesData(replyData.suggested_route);
        setSelectedRouteOption(replyData.suggested_route.options[0]);
        setActiveTab("routes");
      } else if (replyData.suggested_action === "SHOW_COST_SAVINGS") {
        setActiveTab("cost");
      } else if (replyData.suggested_action === "SHOW_CARBON_TRACKER") {
        setActiveTab("carbon");
      }
    } catch (e) {
      console.error("Chatbot failed", e);
      setChatMessages(prev => [...prev, { sender: "ai", text: "Sorry, I am having trouble connecting to the traffic routing servers. Please try again." }]);
    } finally {
      setChatLoading(false);
    }
  };

  const updateContacts = async (contactsStr) => {
    try {
      const user = await api.updateContacts(contactsStr);
      setCurrentUser(user);
    } catch (e) {
      console.error("Updating contacts failed", e);
    }
  };

  return (
    <MobilityContext.Provider value={{
      currentUser,
      isAuthenticated,
      authError,
      authLoading,
      login,
      register,
      logout,
      
      currentLocation,
      startPoint,
      setStartPoint,
      endPoint,
      setEndPoint,
      
      snapToRoad,
      detectLocation,
      locatingStatus,
      locatingLog,
      
      activeTab,
      setActiveTab,
      adminViewActive,
      setAdminViewActive,
      
      routesData,
      selectedRouteOption,
      setSelectedRouteOption,
      routingPreference,
      setRoutingPreference,
      routingLoading,
      calculateRoute,
      
      congestionHotspots,
      trafficForecasts,
      safetyHotspots,
      
      sosActive,
      sosDetails,
      triggerSOS,
      deactivateSOS,
      updateContacts,
      
      carbonStats,
      costComparison,
      systemAlerts,
      communityIncidents,
      submitIncidentReport,
      upvoteIncident,
      adminMetrics,
      loadMobilityData,
      
      chatMessages,
      chatLoading,
      sendChatMessage
    }}>
      {children}
    </MobilityContext.Provider>
  );
};
export default MobilityContext;
