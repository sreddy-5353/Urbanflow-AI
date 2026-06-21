const BASE_URL = `${import.meta.env.VITE_API_URL || "http://localhost:8000"}/api`;

async function request(endpoint, options = {}) {
  const token = localStorage.getItem("token");
  
  const headers = {
    "Content-Type": "application/json",
    ...options.headers,
  };
  
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  
  const config = {
    ...options,
    headers,
  };
  
  const response = await fetch(`${BASE_URL}${endpoint}`, config);
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || "Request failed");
  }
  
  return response.json();
}

export const api = {
  // Auth API
  register: (name, email, password) => {
    return request("/auth/register", {
      method: "POST",
      body: JSON.stringify({ name, email, password }),
    });
  },
  
  login: async (email, password) => {
    const formData = new URLSearchParams();
    formData.append("username", email);
    formData.append("password", password);
    
    const response = await fetch(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData,
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || "Login failed");
    }
    
    const data = await response.json();
    localStorage.setItem("token", data.access_token);
    return data;
  },
  
  getCurrentUser: () => {
    return request("/auth/me");
  },

  forgotPassword: (email) => {
    return request("/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  },

  resetPassword: (token, newPassword) => {
    return request("/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ token, new_password: newPassword }),
    });
  },
  
  updateContacts: (contacts) => {
    return request("/auth/contacts", {
      method: "PUT",
      body: JSON.stringify({ contacts }),
    });
  },
  
  // Route planning API
  planRoute: (startLat, startLng, endLat, endLng, preference, startName = "Origin", endName = "Destination") => {
    return request("/routes/plan", {
      method: "POST",
      body: JSON.stringify({
        start_lat: startLat,
        start_lng: startLng,
        end_lat: endLat,
        end_lng: endLng,
        preference,
        start_name: startName,
        end_name: endName,
      }),
    });
  },
  
  // Traffic predict API
  getCongestion: (lat, lng) => {
    return request(`/traffic/congestion?lat=${lat}&lng=${lng}`);
  },
  
  getTrafficForecast: (lat, lng) => {
    return request(`/traffic/forecast?lat=${lat}&lng=${lng}`);
  },
  
  // Safety API
  getSafetyScore: (lat, lng) => {
    return request(`/safety/score?lat=${lat}&lng=${lng}`);
  },
  
  getSafetyHotspots: (lat, lng) => {
    return request(`/safety/hotspots?lat=${lat}&lng=${lng}`);
  },
  
  triggerSOS: (lat, lng, routeDetails = "") => {
    return request("/safety/sos", {
      method: "POST",
      body: JSON.stringify({
        latitude: lat,
        longitude: lng,
        route_details: routeDetails
      }),
    });
  },
  
  // Sustainability & Carbon API
  getCarbonStats: () => {
    return request("/carbon/stats");
  },
  
  // Cost API
  getCostCompare: (distanceKm, metroAvailable = true) => {
    return request(`/cost/compare?distance_km=${distanceKm}&metro_available=${metroAvailable}`);
  },
  
  // Live Alerts API
  getAlerts: () => {
    return request("/alerts");
  },
  
  // Chat API
  sendMessage: (message, lat = null, lng = null, originOverride = null, destOverride = null) => {
    return request("/chat", {
      method: "POST",
      body: JSON.stringify({
        message,
        current_lat: lat,
        current_lng: lng,
        origin_lat: originOverride?.lat ?? null,
        origin_lng: originOverride?.lng ?? null,
        origin_name: originOverride?.name ?? null,
        dest_lat: destOverride?.lat ?? null,
        dest_lng: destOverride?.lng ?? null,
        dest_name: destOverride?.name ?? null,
      }),
    });
  },
  
  // Community Reporting API
  getIncidents: () => {
    return request("/community/incidents");
  },
  
  reportIncident: (type, description, lat, lng, severity, imageUrl = null) => {
    return request("/community/report", {
      method: "POST",
      body: JSON.stringify({
        type,
        description,
        latitude: lat,
        longitude: lng,
        severity,
        image_url: imageUrl
      }),
    });
  },
  
  upvoteIncident: (incidentId) => {
    return request(`/community/upvote/${incidentId}`, {
      method: "POST"
    });
  },
  
  // Admin API
  getAdminMetrics: () => {
    return request("/admin/metrics");
  }
};
export default api;
