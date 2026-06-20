from app.database import Base
from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Boolean
from sqlalchemy.orm import relationship
import datetime

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    is_active = Column(Boolean, default=True)
    role = Column(String, default="user")  # user, admin
    
    # Emergency Contacts stored as semi-colon separated: "Name:Phone;Name:Phone"
    emergency_contacts = Column(String, default="")
    sustainability_points = Column(Integer, default=0)
    
    incidents = relationship("Incident", back_populates="reporter")
    sos_alerts = relationship("SOSAlert", back_populates="user")

class Incident(Base):
    __tablename__ = "incidents"

    id = Column(Integer, primary_key=True, index=True)
    type = Column(String)
    description = Column(String)
    latitude = Column(Float)
    longitude = Column(Float)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    severity = Column(String)
    upvotes = Column(Integer, default=0)
    image_url = Column(String, nullable=True)
    is_verified = Column(Boolean, default=False)
    
    reporter_id = Column(Integer, ForeignKey("users.id"))
    reporter = relationship("User", back_populates="incidents")

class SOSAlert(Base):
    __tablename__ = "sos_alerts"

    id = Column(Integer, primary_key=True, index=True)
    latitude = Column(Float)
    longitude = Column(Float)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    status = Column(String, default="Active")
    route_details = Column(String, default="")
    
    user_id = Column(Integer, ForeignKey("users.id"))
    user = relationship("User", back_populates="sos_alerts")

class PasswordResetToken(Base):
    __tablename__ = "password_reset_tokens"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, index=True)
    token = Column(String, unique=True, index=True)
    expires_at = Column(DateTime)
    used = Column(Boolean, default=False)

class LiveAlert(Base):
    __tablename__ = "live_alerts"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String)
    description = Column(String)
    type = Column(String)
    latitude = Column(Float)
    longitude = Column(Float)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    is_active = Column(Boolean, default=True)
