"""Schemas for Cryptographic Audit Logs and Chain Verification."""

from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict


class AuditLogResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    previous_hash: str
    current_hash: str
    action: str
    timestamp: datetime
    document_id: Optional[str] = None
    user_id: Optional[str] = None
    details: Optional[Dict[str, Any]] = None


class AuditLogFilter(BaseModel):
    document_id: Optional[str] = None
    user_id: Optional[str] = None
    action: Optional[str] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    limit: int = 100
    offset: int = 0


class ChainVerificationError(BaseModel):
    entry_id: str
    index: int
    reason: str
    expected_hash: str
    actual_hash: str


class AuditTrailVerificationResponse(BaseModel):
    is_valid: bool
    total_entries_verified: int
    genesis_hash: Optional[str] = None
    latest_hash: Optional[str] = None
    tamper_detected: bool
    errors: List[ChainVerificationError] = []
