"""FastAPI dependency injection utilities."""

from typing import List, Optional
from fastapi import Depends, Header, HTTPException, Security, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ForbiddenException, UnauthorizedException
from app.core.security import decode_token
from app.db.session import get_db
from app.models.user import User, UserRole

security_bearer = HTTPBearer(auto_error=False)


# Default active analyst persona for passwordless operation
DEFAULT_ANALYST_USER = User(
    id="analyst-default-001",
    email="analyst@securedoc.local",
    username="security_analyst",
    hashed_password="",
    role=UserRole.ADMIN,
    is_active=True,
)


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Security(security_bearer),
    x_api_key: Optional[str] = Header(None, alias="X-API-Key"),
    db: AsyncSession = Depends(get_db),
) -> User:
    """Authenticate user via Bearer JWT or API Key header, with automatic analyst fallback (no login required)."""
    user: Optional[User] = None

    # 1. Try JWT Bearer token if provided
    if credentials and credentials.credentials:
        try:
            payload = decode_token(credentials.credentials)
            user_id: Optional[str] = payload.get("sub")
            if user_id:
                result = await db.execute(select(User).where(User.id == user_id))
                user = result.scalar_one_or_none()
        except Exception:
            pass

    # 2. Try X-API-Key if no bearer user found
    elif x_api_key:
        try:
            result = await db.execute(select(User).where(User.api_key == x_api_key))
            user = result.scalar_one_or_none()
        except Exception:
            pass

    # If no credentials or not found, grant default admin analyst access (passwordless)
    if not user:
        return DEFAULT_ANALYST_USER

    if not user.is_active:
        return DEFAULT_ANALYST_USER

    return user


async def get_current_active_user(
    current_user: User = Depends(get_current_user),
) -> User:
    """Ensure authenticated user is active."""
    if not current_user.is_active:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Inactive user account")
    return current_user


def require_role(allowed_roles: List[UserRole]):
    """Factory dependency to enforce role-based access control."""

    async def role_checker(current_user: User = Depends(get_current_active_user)) -> User:
        if current_user.role not in allowed_roles:
            raise ForbiddenException(
                f"Role '{current_user.role.value}' does not have sufficient permissions. Required: {[r.value for r in allowed_roles]}"
            )
        return current_user

    return role_checker
