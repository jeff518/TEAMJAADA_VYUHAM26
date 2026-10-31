"""Core package exports."""

from app.core.security import (
    verify_password,
    get_password_hash,
    create_access_token,
    create_refresh_token,
    decode_token,
    is_origin_allowed,
    generate_api_key,
)
from app.core.rate_limiter import limiter
from app.core.exceptions import (
    SecureDocBaseException,
    Door1SecurityException,
    Door2SecurityException,
    FraudDetectedException,
    DocumentNotFoundException,
    DuplicateDocumentException,
    PipelineProcessingException,
    FileValidationException,
    UnauthorizedException,
    ForbiddenException,
    register_exception_handlers,
)

__all__ = [
    "verify_password",
    "get_password_hash",
    "create_access_token",
    "create_refresh_token",
    "decode_token",
    "is_origin_allowed",
    "generate_api_key",
    "limiter",
    "SecureDocBaseException",
    "Door1SecurityException",
    "Door2SecurityException",
    "FraudDetectedException",
    "DocumentNotFoundException",
    "DuplicateDocumentException",
    "PipelineProcessingException",
    "FileValidationException",
    "UnauthorizedException",
    "ForbiddenException",
    "register_exception_handlers",
]
