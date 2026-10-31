"""Audit log inspection and cryptographic chain verification API endpoints."""

from typing import Any, List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.dependencies import get_current_active_user, require_role
from app.models.audit_log import AuditLog
from app.models.user import User, UserRole
from app.schemas.audit import (
    AuditLogResponse,
    AuditTrailVerificationResponse,
)
from app.services.audit_service import AuditService

router = APIRouter(prefix="/audit", tags=["Audit Trail"])


@router.get("", response_model=List[AuditLogResponse])
async def list_audit_logs(
    document_id: Optional[str] = Query(None),
    user_id: Optional[str] = Query(None),
    action: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.ADMIN, UserRole.REVIEWER])),
) -> Any:
    """Query and filter immutable audit log entries."""
    query = select(AuditLog)

    if document_id:
        query = query.where(AuditLog.document_id == document_id)
    if user_id:
        query = query.where(AuditLog.user_id == user_id)
    if action:
        query = query.where(AuditLog.action == action)

    query = query.order_by(desc(AuditLog.timestamp)).offset(offset).limit(limit)
    res = await db.execute(query)
    entries = res.scalars().all()
    return entries


@router.get("/verify-chain", response_model=AuditTrailVerificationResponse)
async def verify_chain_integrity(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.ADMIN, UserRole.REVIEWER])),
) -> Any:
    """Verify cryptographic hash-chain integrity from genesis to current head.
    Detects any database tampering, missing rows, or altered payloads.
    """
    verification = await AuditService.verify_chain(db)
    return verification


@router.get("/{document_id}", response_model=List[AuditLogResponse])
async def get_document_audit_trail(
    document_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """Retrieve full chronological audit trail for a specific document."""
    stmt = (
        select(AuditLog)
        .where(AuditLog.document_id == document_id)
        .order_by(AuditLog.timestamp.asc())
    )
    res = await db.execute(stmt)
    entries = res.scalars().all()
    return entries
