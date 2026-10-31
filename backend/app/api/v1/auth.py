"""Authentication API routes."""

from datetime import timedelta
from typing import Any
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.core.rate_limiter import limiter
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    generate_api_key,
    get_password_hash,
    verify_password,
)
from app.db.session import get_db
from app.dependencies import get_current_active_user
from app.models.user import User, UserRole
from app.schemas.auth import (
    RefreshTokenRequest,
    Token,
    UserCreate,
    UserLogin,
    UserResponse,
)
from app.services.audit_service import AuditService

router = APIRouter(prefix="/auth", tags=["Authentication"])
settings = get_settings()


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit(settings.RATE_LIMIT_AUTH)
async def register(
    request: Request,
    user_in: UserCreate,
    db: AsyncSession = Depends(get_db),
) -> Any:
    """Register a new user account."""
    stmt = select(User).where(or_(User.email == user_in.email, User.username == user_in.username))
    res = await db.execute(stmt)
    if res.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A user with this email or username already exists.",
        )

    user = User(
        email=user_in.email,
        username=user_in.username,
        hashed_password=get_password_hash(user_in.password),
        role=user_in.role or UserRole.USER,
        is_active=True,
        api_key=generate_api_key(),
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    await AuditService.log_action(
        db=db,
        action="USER_REGISTERED",
        user_id=user.id,
        details={"username": user.username, "email": user.email, "role": user.role.value},
    )

    return user


@router.post("/login", response_model=Token)
@limiter.limit(settings.RATE_LIMIT_AUTH)
async def login(
    request: Request,
    credentials: UserLogin,
    db: AsyncSession = Depends(get_db),
) -> Any:
    """Authenticate credentials and issue JWT access and refresh tokens."""
    stmt = select(User).where(
        or_(User.username == credentials.username_or_email, User.email == credentials.username_or_email)
    )
    res = await db.execute(stmt)
    user = res.scalar_one_or_none()

    if not user or not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Account is disabled")

    access_token = create_access_token(
        subject=user.id,
        extra_claims={"role": user.role.value, "email": user.email, "username": user.username},
    )
    refresh_token = create_refresh_token(subject=user.id)

    await AuditService.log_action(
        db=db,
        action="USER_LOGIN",
        user_id=user.id,
        details={"username": user.username},
    )

    return Token(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )


@router.post("/refresh", response_model=Token)
async def refresh_token(
    payload: RefreshTokenRequest,
    db: AsyncSession = Depends(get_db),
) -> Any:
    """Issue a new access token using a valid refresh token."""
    token_claims = decode_token(payload.refresh_token)
    if token_claims.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid token type: refresh token expected",
        )

    user_id = token_claims.get("sub")
    stmt = select(User).where(User.id == user_id)
    res = await db.execute(stmt)
    user = res.scalar_one_or_none()

    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User inactive or not found")

    new_access_token = create_access_token(
        subject=user.id,
        extra_claims={"role": user.role.value, "email": user.email, "username": user.username},
    )
    new_refresh_token = create_refresh_token(subject=user.id)

    return Token(
        access_token=new_access_token,
        refresh_token=new_refresh_token,
        token_type="bearer",
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_active_user)) -> Any:
    """Retrieve details of the currently authenticated user."""
    return current_user


@router.post("/logout")
async def logout(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
) -> Any:
    """Acknowledge logout session."""
    await AuditService.log_action(
        db=db,
        action="USER_LOGOUT",
        user_id=current_user.id,
        details={"username": current_user.username},
    )
    return {"message": "Successfully logged out"}


@router.post("/generate-api-key")
async def regenerate_api_key(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
) -> Any:
    """Generate or roll a new API key for developer and extension access."""
    new_key = generate_api_key()
    current_user.api_key = new_key
    await db.commit()
    await db.refresh(current_user)

    await AuditService.log_action(
        db=db,
        action="API_KEY_GENERATED",
        user_id=current_user.id,
    )
    return {"api_key": new_key}
