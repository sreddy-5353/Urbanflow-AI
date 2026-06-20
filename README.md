# UrbanFlow AI - AI-Powered Smart Mobility Ecosystem

UrbanFlow AI is an AI-powered smart mobility platform that helps citizens and city authorities travel **Faster, Safer, Cheaper, and Greener**. It combines journey planning, real-time traffic congestion forecasts, safety ratings, emergency alarms, and carbon accounting into an integrated dark-theme glassmorphism web and mobile dashboard.

---

## Key Features

1. **AI Multi-Objective Route Planner**: Evaluates Fastest, Cheapest, Safest, Eco-Friendly, and Balanced journeys for Walking, Bicycling, Bus, Metro, Train, Auto, Taxi, and Ride Sharing.
2. **AI Traffic Congestion Engine**: Predicts delays and traffic density hotspots using a Decision Tree Regressor model.
3. **Route Safety Scorer**: Employs an incident-weighted scorer classifying regions into Safe, Moderate Risk, and High Risk categories.
4. **Emergency SOS Console**: One-Tap Panic Alarm, trusted contacts manager, SHE Teams responder dispatch simulation, and Fake Call generator to deter harassment.
5. **Sustainability Tracker & Green Rewards**: Computes carbon offsets vs driving an SUV, monitors travel mode splits, and rewards points (XP) for green commutes.
6. **Smart Cost Optimization**: Displays fare breakdowns and details how swapping to public transit alternatives maximizes savings.
7. **Citizen Hazard Reporter**: Crowd-sources incident logging (collisions, flooded roads, streetlights out) with upvotes and automated verification.
8. **AI Travel Chatbot**: A natural language assistant that parses questions and automatically maps optimized routes.
9. **Smart City Admin Panel**: Aggregate municipal analytics for city managers including congestion heatmaps, daily incidents charts, and environmental savings.

---

## Project Structure

```
UrbanFlow-AI/
├── backend/                  # Python FastAPI Backend
│   ├── app/
│   │   ├── config.py         # App environment configuration
│   │   ├── database.py       # SQL SQLAlchemy database setup
│   │   ├── auth.py           # JWT and bcrypt hashing logic
│   │   ├── models/           # SQLAlchemy models
│   │   ├── schemas/          # Pydantic validation schemas
│   │   ├── routers/          # FastAPI routers (auth, routes, safety, traffic, carbon, etc.)
│   │   └── ml/               # Python ML models and Dijkstra graph router
│   ├── run.py                # Uvicorn launcher
│   └── requirements.txt      # Python dependencies list
├── frontend/                 # Vite + React + Tailwind CSS client
│   ├── src/
│   │   ├── components/       # UI (MapView, SOSButton, AIChat, CarbonTracker, etc.)
│   │   ├── context/          # MobilityContext global state provider
│   │   └── services/         # api.js fetch wrappers
│   └── tailwind.config.js    # Custom brand styles configuration
├── docker-compose.yml        # Multi-node container setup
└── README.md                 # System documentation
```

---

## Local Setup & Quick Run

### Prerequisites
- Node.js (v18+)
- Python (v3.10+)

### Step 1: Run the Backend
1. Navigate to the `backend` directory:
   ```bash
   cd backend
   ```
2. Create and activate a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Launch the FastAPI server:
   ```bash
   python run.py
   ```
   The backend will start on **`http://localhost:8000`** (Swagger docs are available at `http://localhost:8000/docs`).

### Step 2: Run the Frontend
1. Navigate to the `frontend` directory:
   ```bash
   cd ../frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the Vite development node:
   ```bash
   npm run dev
   ```
   Open **`http://localhost:5173`** in your browser to experience UrbanFlow AI!

---

## Seed Authentication Accounts
During startup, the database is auto-seeded with test accounts for quick evaluation:

### Citizen Account (Jane Doe)
- **Email**: `user@urbanflow.ai`
- **Password**: `password123`

### City Manager Admin Account
- **Email**: `admin@urbanflow.ai`
- **Password**: `adminpassword`

*(Alternatively, use the quick login buttons at the bottom of the sign-in form.)*
