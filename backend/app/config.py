import os

class Settings:
    PROJECT_NAME: str = "UrbanFlow AI"
    PROJECT_VERSION: str = "1.0.0"
    API_V1_STR: str = "/api"
    
    # JWT Auth settings
    SECRET_KEY: str = os.getenv("SECRET_KEY", "URBANFLOW_AI_SUPER_SECRET_KEY_987654321")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 1 day

    # Database
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL", 
        "sqlite:///./urbanflow.db"
    )

    # ── SMTP email (set these env vars for real password-reset emails) ────────
    SMTP_HOST: str     = os.getenv("SMTP_HOST", "smtp.gmail.com")
    SMTP_PORT: int     = int(os.getenv("SMTP_PORT", "587"))
    SMTP_USER: str     = os.getenv("SMTP_USER", "")
    SMTP_PASSWORD: str = os.getenv("SMTP_PASSWORD", "")
    SMTP_FROM: str     = os.getenv("SMTP_FROM", "noreply@urbanflow.ai")
    # Public-facing URL used in reset links
    APP_BASE_URL: str  = os.getenv("APP_BASE_URL", "http://localhost:5173")

settings = Settings()
