"""Rate limiting support using slowapi."""

from fastapi import Request
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.config import get_settings

settings = get_settings()


def get_client_identifier(request: Request) -> str:
    """Extract client identifier: either authenticated user token or real client IP."""
    # Check for authorization header
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.split(" ")[1]
        return f"user:{token[:16]}"

    # Check for X-Forwarded-For if behind reverse proxy
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        client_ip = forwarded.split(",")[0].strip()
        return f"ip:{client_ip}"

    # Default to remote client IP
    client_ip = get_remote_address(request) or "127.0.0.1"
    return f"ip:{client_ip}"


limiter = Limiter(
    key_func=get_client_identifier,
    default_limits=[settings.RATE_LIMIT_DEFAULT],
)
