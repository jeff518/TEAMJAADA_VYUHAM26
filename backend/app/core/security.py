"""Security core: JWT handling, password hashing, and origin validation."""

from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional, Union
import secrets
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import HTTPException, status

from app.config import get_settings

settings = get_settings()

import bcrypt

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plain password against the stored bcrypt hash."""
    try:
        pwd_bytes = plain_password.encode("utf-8")[:72]
        hash_bytes = hashed_password.encode("utf-8")
        return bcrypt.checkpw(pwd_bytes, hash_bytes)
    except Exception:
        return False


def get_password_hash(password: str) -> str:
    """Generate bcrypt hash for a password."""
    pwd_bytes = password.encode("utf-8")[:72]
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(pwd_bytes, salt).decode("utf-8")


def generate_api_key() -> str:
    """Generate a high-entropy 64-char API key."""
    return secrets.token_hex(32)


def create_access_token(subject: Union[str, Any], extra_claims: Optional[Dict[str, Any]] = None, expires_delta: Optional[timedelta] = None) -> str:
    """Create JWT access token with subject and optional claims."""
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)

    to_encode: Dict[str, Any] = {
        "sub": str(subject),
        "exp": expire,
        "iat": datetime.now(timezone.utc),
        "type": "access",
    }
    if extra_claims:
        to_encode.update(extra_claims)

    encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
    return encoded_jwt


def create_refresh_token(subject: Union[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    """Create JWT refresh token with extended validity."""
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)

    to_encode: Dict[str, Any] = {
        "sub": str(subject),
        "exp": expire,
        "iat": datetime.now(timezone.utc),
        "type": "refresh",
    }
    encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
    return encoded_jwt


def decode_token(token: str) -> Dict[str, Any]:
    """Decode and validate JWT token signature and expiration."""
    try:
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        return payload
    except JWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid or expired authentication credentials: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )


def is_origin_allowed(origin: Optional[str]) -> bool:
    """Check if origin matches the allowed Chrome extension ID or CORS whitelist."""
    if not origin:
        return False

    # Check exact match
    if origin in settings.CORS_ORIGINS:
        return True

    # Check Chrome extension protocol
    if origin.startswith("chrome-extension://"):
        # If wildcard extension allowed
        if "chrome-extension://*" in settings.CORS_ORIGINS or settings.CHROME_EXTENSION_ID == "chrome-extension://*":
            return True
        # Specific extension ID check
        if origin == settings.CHROME_EXTENSION_ID:
            return True

    return False
