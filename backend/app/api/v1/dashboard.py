"""Dashboard analytics and reporting API endpoints."""

from typing import Any, List
from fastapi import APIRouter, Depends, Query
from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.dependencies import get_current_active_user
from app.models.audit_log import AuditLog
from app.models.document import Document, DocumentStatus, SecurityDecision
from app.models.user import User
from app.schemas.dashboard import (
    ActivityItem,
    DashboardStatsResponse,
    RecentActivityResponse,
    StatusCount,
)

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/stats", response_model=DashboardStatsResponse)
async def get_dashboard_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """Retrieve top-level document pipeline metrics and security distributions."""
    # Status counts aggregation
    stmt = select(Document.status, func.count(Document.id)).group_by(Document.status)
    res = await db.execute(stmt)
    status_map = {row[0]: row[1] for row in res.all()}

    # Total documents
    tot_stmt = select(func.count(Document.id))
    tot_res = await db.execute(tot_stmt)
    total_docs = tot_res.scalar_one()

    # High risk count
    hr_stmt = select(func.count(Document.id)).where(Document.risk_score >= 50)
    hr_res = await db.execute(hr_stmt)
    high_risk_count = hr_res.scalar_one()

    # Average risk score
    avg_stmt = select(func.avg(Document.risk_score))
    avg_res = await db.execute(avg_stmt)
    avg_score = avg_res.scalar_one() or 0.0

    # Counts by decision
    blk_stmt = select(func.count(Document.id)).where(Document.final_decision == SecurityDecision.BLOCK)
    blk_res = await db.execute(blk_stmt)
    blocked_count = blk_res.scalar_one()

    qur_stmt = select(func.count(Document.id)).where(Document.final_decision == SecurityDecision.QUARANTINE)
    qur_res = await db.execute(qur_stmt)
    quarantined_count = qur_res.scalar_one()

    status_breakdown = [
        StatusCount(status=s.value, count=status_map.get(s, 0)) for s in DocumentStatus
    ]

    return DashboardStatsResponse(
        total_documents=total_docs,
        pending_approval=status_map.get(DocumentStatus.READY_FOR_APPROVAL, 0),
        approved_documents=status_map.get(DocumentStatus.APPROVED, 0),
        rejected_documents=status_map.get(DocumentStatus.REJECTED, 0),
        quarantined_documents=quarantined_count,
        blocked_documents=blocked_count,
        fraud_flagged_documents=status_map.get(DocumentStatus.FRAUD_FLAGGED, 0),
        status_breakdown=status_breakdown,
        average_risk_score=round(float(avg_score), 1),
        high_risk_count=high_risk_count,
    )


@router.get("/activity", response_model=RecentActivityResponse)
async def get_recent_activity(
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """Retrieve real-time event stream from immutable audit log."""
    stmt = select(AuditLog).order_by(desc(AuditLog.timestamp)).limit(limit)
    res = await db.execute(stmt)
    entries = res.scalars().all()

    activities = [
        ActivityItem(
            id=entry.id,
            action=entry.action,
            timestamp=entry.timestamp,
            document_id=entry.document_id,
            user_id=entry.user_id,
            details=entry.details,
        )
        for entry in entries
    ]

    return RecentActivityResponse(activities=activities)
