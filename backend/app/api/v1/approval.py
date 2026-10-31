"""Document approval, rejection, and verification workflow endpoints."""

from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.dependencies import get_current_active_user, require_role
from app.models.approval import ApprovalAction, ApprovalRecord
from app.models.user import User, UserRole
from app.schemas.approval import (
    ApprovalRecordResponse,
    ApprovalRequest,
    ApprovalResponse,
    VerificationRequest,
)
from app.services.approval_service import ApprovalService

router = APIRouter(prefix="/approval", tags=["Approval Workflow"])


@router.post("/{doc_id}/approve", response_model=ApprovalResponse)
async def approve_document(
    doc_id: str,
    payload: ApprovalRequest = ApprovalRequest(),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.ADMIN, UserRole.REVIEWER])),
) -> Any:
    """Approve a document and clear it for disbursement."""
    doc = await ApprovalService.process_action(
        db=db,
        document_id=doc_id,
        user=current_user,
        action=ApprovalAction.APPROVE,
        comment=payload.comment,
    )

    # Fetch newly created record
    stmt = (
        select(ApprovalRecord)
        .where(ApprovalRecord.document_id == doc_id)
        .order_by(desc(ApprovalRecord.created_at))
        .limit(1)
    )
    res = await db.execute(stmt)
    record = res.scalar_one()

    return ApprovalResponse(
        document_id=doc.id,
        status=doc.status.value,
        action_taken=ApprovalAction.APPROVE,
        message="Document approved successfully.",
        approval_record=record,
    )


@router.post("/{doc_id}/reject", response_model=ApprovalResponse)
async def reject_document(
    doc_id: str,
    payload: ApprovalRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.ADMIN, UserRole.REVIEWER])),
) -> Any:
    """Reject a document with reviewer explanation."""
    if not payload.comment:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A justification comment is required when rejecting a document.",
        )

    doc = await ApprovalService.process_action(
        db=db,
        document_id=doc_id,
        user=current_user,
        action=ApprovalAction.REJECT,
        comment=payload.comment,
    )

    stmt = (
        select(ApprovalRecord)
        .where(ApprovalRecord.document_id == doc_id)
        .order_by(desc(ApprovalRecord.created_at))
        .limit(1)
    )
    res = await db.execute(stmt)
    record = res.scalar_one()

    return ApprovalResponse(
        document_id=doc.id,
        status=doc.status.value,
        action_taken=ApprovalAction.REJECT,
        message="Document rejected.",
        approval_record=record,
    )


@router.post("/{doc_id}/request-verification", response_model=ApprovalResponse)
async def request_verification(
    doc_id: str,
    payload: VerificationRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.ADMIN, UserRole.REVIEWER])),
) -> Any:
    """Escalate a suspicious or discrepancy-heavy document for higher verification."""
    doc = await ApprovalService.process_action(
        db=db,
        document_id=doc_id,
        user=current_user,
        action=ApprovalAction.REQUEST_VERIFICATION,
        comment=payload.reason,
        escalation_level=payload.escalation_level,
    )

    stmt = (
        select(ApprovalRecord)
        .where(ApprovalRecord.document_id == doc_id)
        .order_by(desc(ApprovalRecord.created_at))
        .limit(1)
    )
    res = await db.execute(stmt)
    record = res.scalar_one()

    return ApprovalResponse(
        document_id=doc.id,
        status=doc.status.value,
        action_taken=ApprovalAction.REQUEST_VERIFICATION,
        message=f"Verification requested (Level {payload.escalation_level}).",
        approval_record=record,
    )


@router.get("/{doc_id}/history", response_model=List[ApprovalRecordResponse])
async def get_approval_history(
    doc_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """Retrieve full audit history of approval actions taken for a document."""
    stmt = (
        select(ApprovalRecord)
        .where(ApprovalRecord.document_id == doc_id)
        .order_by(desc(ApprovalRecord.created_at))
    )
    res = await db.execute(stmt)
    records = res.scalars().all()
    return records
