import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.database import engine, Base, SessionLocal
from app.models import User
from app.auth import get_password_hash
from app.routers import auth, routes, traffic, safety, carbon, cost, alerts, chat, community, admin

# Create tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.PROJECT_VERSION,
    description="AI-Powered Smart City Mobility & Safety Ecosystem"
)

# Set CORS origins
_default_origins = [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:5175",
    "http://localhost:5176",
    "http://localhost:5177",
    "http://localhost:3000",
]
_extra_origins = [o.strip() for o in os.getenv("CORS_ORIGINS", "").split(",") if o.strip()]

app.add_middleware(
       CORSMiddleware,
       allow_origins=_default_origins + _extra_origins,
       allow_origin_regex=r"https://.*\.vercel\.app",
       allow_credentials=True,
       allow_methods=["*"],
       allow_headers=["*"],
   )

# Include Routers
app.include_router(auth.router, prefix=settings.API_V1_STR)
app.include_router(routes.router, prefix=settings.API_V1_STR)
app.include_router(traffic.router, prefix=settings.API_V1_STR)
app.include_router(safety.router, prefix=settings.API_V1_STR)
app.include_router(carbon.router, prefix=settings.API_V1_STR)
app.include_router(cost.router, prefix=settings.API_V1_STR)
app.include_router(alerts.router, prefix=settings.API_V1_STR)
app.include_router(chat.router, prefix=settings.API_V1_STR)
app.include_router(community.router, prefix=settings.API_V1_STR)
app.include_router(admin.router, prefix=settings.API_V1_STR)

@app.on_event("startup")
def seed_database():
    db = SessionLocal()
    try:
        # Check if database users already seeded
        user_count = db.query(User).count()
        if user_count == 0:
            print("Seeding database with default user credentials...")
            # Seed basic user
            default_user = User(
                name="Jane Doe",
                email="user@urbanflow.ai",
                hashed_password=get_password_hash("password123"),
                role="user",
                emergency_contacts="Mom:555-0199;Dad:555-0188",
                sustainability_points=120
            )
            # Seed admin user
            admin_user = User(
                name="City Manager",
                email="admin@urbanflow.ai",
                hashed_password=get_password_hash("adminpassword"),
                role="admin",
                emergency_contacts="Control Room:555-9999",
                sustainability_points=0
            )
            db.add(default_user)
            db.add(admin_user)
            db.commit()
            print("Database seeding completed.")
    except Exception as e:
        print(f"Error during seeding: {e}")
    finally:
        db.close()

@app.get("/")
def root():
    return {
        "status": "online",
        "service": settings.PROJECT_NAME,
        "version": settings.PROJECT_VERSION,
        "docs_url": "/docs"
    }
