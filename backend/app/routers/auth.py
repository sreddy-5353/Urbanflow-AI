from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import timedelta, datetime
import secrets
from app.database import get_db
from app.models import User, PasswordResetToken
from app.schemas import UserCreate, UserResponse, Token, EmergencyContactsUpdate
from app.auth import get_password_hash, verify_password, create_access_token, get_current_user
from app.notifications import send_password_reset_email

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/register", response_model=UserResponse)
def register(user_in: UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.email == user_in.email).first()
    if db_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Assign admin role to designated email, otherwise user
    role = "admin" if user_in.email.startswith("admin@") else "user"
    
    hashed_pwd = get_password_hash(user_in.password)
    db_user = User(
        name=user_in.name,
        email=user_in.email,
        hashed_password=hashed_pwd,
        role=role,
        emergency_contacts="Mom:555-0199;Dad:555-0188" # default mockup contacts
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

@router.post("/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token = create_access_token(
        data={"sub": user.email, "role": user.role}
    )
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/me", response_model=UserResponse)
def read_users_me(current_user: User = Depends(get_current_user)):
    return current_user

@router.put("/contacts", response_model=UserResponse)
def update_emergency_contacts(
    contacts_in: EmergencyContactsUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    current_user.emergency_contacts = contacts_in.contacts
    db.add(current_user)
    db.commit()
    db.refresh(current_user)
    return current_user


# ── Forgot Password ────────────────────────────────────────────────────────────

@router.post("/forgot-password")
def forgot_password(payload: dict, db: Session = Depends(get_db)):
    """
    Request a password-reset email.
    Body: { "email": "user@example.com" }

    Always returns 200 so we don't leak whether an email is registered.
    """
    email = payload.get("email", "").strip().lower()
    user = db.query(User).filter(User.email == email).first()

    if user:
        # Invalidate any existing unused tokens for this user
        db.query(PasswordResetToken).filter(
            PasswordResetToken.email == email,
            PasswordResetToken.used == False
        ).delete()
        db.commit()

        raw_token = secrets.token_urlsafe(32)
        expires = datetime.utcnow() + timedelta(minutes=30)

        reset_record = PasswordResetToken(
            email=email,
            token=raw_token,
            expires_at=expires,
            used=False
        )
        db.add(reset_record)
        db.commit()

        result = send_password_reset_email(email, raw_token, user.name)
        # In dev mode (no SMTP) the function returns the reset link so we can
        # surface it in the response for easier testing.
        if isinstance(result, str):
            return {"message": "Reset link generated (dev mode – no SMTP configured).", "dev_reset_link": result}

    return {"message": "If an account with that email exists, a reset link has been sent."}


@router.post("/reset-password")
def reset_password(payload: dict, db: Session = Depends(get_db)):
    """
    Consume a reset token and set a new password.
    Body: { "token": "...", "new_password": "..." }
    """
    token_str = payload.get("token", "").strip()
    new_password = payload.get("new_password", "").strip()

    if not token_str or not new_password:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Token and new_password are required.")

    if len(new_password) < 6:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Password must be at least 6 characters.")

    record = db.query(PasswordResetToken).filter(
        PasswordResetToken.token == token_str,
        PasswordResetToken.used == False
    ).first()

    if not record:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or already-used reset token.")

    if datetime.utcnow() > record.expires_at:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Reset token has expired. Please request a new one.")

    user = db.query(User).filter(User.email == record.email).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

    user.hashed_password = get_password_hash(new_password)
    record.used = True
    db.commit()

    return {"message": "Password updated successfully. You can now log in with your new password."}
