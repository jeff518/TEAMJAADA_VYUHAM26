"""Custom application exceptions and FastAPI exception handlers."""

from typing import Any, Dict, Optional
from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse


class SecureDocBaseException(Exception):
    """Base exception for all domain-specific SecureDoc pipeline errors."""

    def __init__(
        self,
        message: str,
        status_code: int = status.HTTP_400_BAD_REQUEST,
        details: Optional[Dict[str, Any]] = None,
    ):
        self.message = message
        self.status_code = status_code
        self.details = details or {}
        super().__init__(message)


class Door1SecurityException(SecureDocBaseException):
    """Raised when Door 1 file security checks fail (malware, illegal structure, corrupt)."""

    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(
            message=message,
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            details=details,
        )


class Door2SecurityException(SecureDocBaseException):
    """Raised when Door 2 prompt injection or social engineering attacks are detected."""

    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(
            message=message,
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            details=details,
        )


class FraudDetectedException(SecureDocBaseException):
    """Raised when Door 4 fraud anomaly scoring exceeds critical thresholds."""

    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(
            message=message,
            status_code=status.HTTP_409_CONFLICT,
            details=details,
        )


class DocumentNotFoundException(SecureDocBaseException):
    def __init__(self, document_id: str):
        super().__init__(
            message=f"Document '{document_id}' was not found.",
            status_code=status.HTTP_404_NOT_FOUND,
            details={"document_id": document_id},
        )


class DuplicateDocumentException(SecureDocBaseException):
    def __init__(self, sha256_hash: str, existing_document_id: Optional[str] = None):
        super().__init__(
            message=f"Duplicate document detected with SHA-256: {sha256_hash}",
            status_code=status.HTTP_409_CONFLICT,
            details={"sha256_hash": sha256_hash, "existing_document_id": existing_document_id},
        )


class PipelineProcessingException(SecureDocBaseException):
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(
            message=message,
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            details=details,
        )


class FileValidationException(SecureDocBaseException):
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(
            message=message,
            status_code=status.HTTP_400_BAD_REQUEST,
            details=details,
        )


class UnauthorizedException(SecureDocBaseException):
    def __init__(self, message: str = "Authentication credentials required"):
        super().__init__(
            message=message,
            status_code=status.HTTP_401_UNAUTHORIZED,
        )


class ForbiddenException(SecureDocBaseException):
    def __init__(self, message: str = "Insufficient permissions"):
        super().__init__(
            message=message,
            status_code=status.HTTP_403_FORBIDDEN,
        )


def register_exception_handlers(app: FastAPI) -> None:
    """Register domain exception handlers with the FastAPI application."""

    @app.exception_handler(SecureDocBaseException)
    async def custom_base_exception_handler(request: Request, exc: SecureDocBaseException):
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "error": exc.__class__.__name__,
                "message": exc.message,
                "details": exc.details,
            },
        )
