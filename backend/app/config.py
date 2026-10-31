"""Application configuration using Pydantic Settings."""

import os
from functools import lru_cache
from pathlib import Path
from typing import List, Union

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # General
    PROJECT_NAME: str = "SecureDoc Pipeline"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    PORT: int = 8001
    HOST: str = "0.0.0.0"

    # Database
    DATABASE_URL: str = "sqlite+aiosqlite:///./securedoc.db"
    DB_ECHO: bool = False

    # Redis & Celery
    CELERY_ENABLED: bool = False  # Set to True when Redis/Celery broker is running
    REDIS_URL: str = "redis://localhost:6379/0"
    CELERY_BROKER_URL: str = "redis://localhost:6379/0"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/1"

    # JWT Authentication
    JWT_SECRET_KEY: str = "super-secret-jwt-key-replace-with-at-least-32-random-characters-in-prod"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Extension Security & CORS
    CHROME_EXTENSION_ID: str = "chrome-extension://*"
    CORS_ORIGINS: List[str] = [
        "chrome-extension://*",
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:8000",
        "http://localhost:8000",
        "http://127.0.0.1:8001",
        "http://localhost:8001",
    ]

    # File Storage Paths
    BASE_DIR: Path = Path(__file__).resolve().parent.parent
    QUARANTINE_DIR: Path = Path("./quarantine")
    PROCESSED_DIR: Path = Path("./processed")
    SANDBOX_TMP_DIR: Path = Path("./sandbox_tmp")

    # Security & Upload Limits - Expanded for large files and all document types
    MAX_UPLOAD_SIZE_BYTES: int = 250 * 1024 * 1024  # 250 MB
    MAX_PDF_PAGES: int = 1000
    ALLOWED_MIME_TYPES: List[str] = [
        "application/pdf",
        "image/png",
        "image/jpeg",
        "image/jpg",
        "image/webp",
        "image/tiff",
        "image/bmp",
        "image/gif",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/vnd.ms-excel",
        "text/plain",
        "text/csv",
        "application/octet-stream",
        "*/*",
    ]

    # ClamAV Antivirus
    CLAMAV_ENABLED: bool = True
    CLAMAV_SOCKET_PATH: str = "/var/run/clamav/clamd.ctl"
    CLAMAV_HOST: str = "localhost"
    CLAMAV_PORT: int = 3310
    CLAMAV_TIMEOUT_SECONDS: int = 10

    # AI & VLM Extraction
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-2.0-flash"
    GEMINI_SECURITY_MODEL: str = "gemini-2.0-flash"

    # Docker Sandbox Processing
    DOCKER_SANDBOX_IMAGE: str = "securedoc-sandbox:latest"
    SANDBOX_TIMEOUT_SECONDS: int = 60
    SANDBOX_MEMORY_LIMIT: str = "512m"
    SANDBOX_CPU_LIMIT: float = 1.0
    SANDBOX_ENABLED: bool = False  # Set to True when Docker daemon is accessible

    # Rate Limiting
    RATE_LIMIT_DEFAULT: str = "100/minute"
    RATE_LIMIT_UPLOAD: str = "20/minute"
    RATE_LIMIT_AUTH: str = "10/minute"

    # Fraud Detection Rules
    BENFORD_TOLERANCE_CHI2: float = 15.51  # 95% confidence critical value with 8 degrees of freedom
    AMOUNT_Z_SCORE_THRESHOLD: float = 3.0
    VELOCITY_MAX_INVOICES: int = 5
    VELOCITY_WINDOW_DAYS: int = 7
    ROUND_NUMBER_THRESHOLD_PERCENT: float = 0.8  # Flag if vendor invoices are >80% round numbers

    # Three-way matching tolerances
    MATCH_AMOUNT_TOLERANCE_PERCENT: float = 0.02  # 2%
    MATCH_QTY_TOLERANCE_PERCENT: float = 0.00     # 0% exact quantity
    MATCH_DATE_TOLERANCE_DAYS: int = 30           # Invoice within 30 days of PO
    MATCH_VENDOR_FUZZY_RATIO: float = 0.85       # Levenshtein similarity

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",")]
        elif isinstance(v, (list, str)):
            return v  # type: ignore
        raise ValueError(v)

    def init_directories(self) -> None:
        """Ensure necessary storage directories exist with restricted permissions."""
        for path in [self.QUARANTINE_DIR, self.PROCESSED_DIR, self.SANDBOX_TMP_DIR]:
            p = Path(path).resolve()
            p.mkdir(parents=True, exist_ok=True)


@lru_cache()
def get_settings() -> Settings:
    settings = Settings()
    settings.init_directories()
    return settings
