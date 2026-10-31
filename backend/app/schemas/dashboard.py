"""Schemas for Dashboard and Analytics."""

from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel


class StatusCount(BaseModel):
    status: str
    count: int


class DashboardStatsResponse(BaseModel):
    total_documents: int
    pending_approval: int
    approved_documents: int
    rejected_documents: int
    quarantined_documents: int
    blocked_documents: int
    fraud_flagged_documents: int
    status_breakdown: List[StatusCount]
    average_risk_score: float
    high_risk_count: int


class ActivityItem(BaseModel):
    id: str
    action: str
    timestamp: datetime
    document_id: Optional[str] = None
    user_id: Optional[str] = None
    details: Optional[Dict[str, Any]] = None


class RecentActivityResponse(BaseModel):
    activities: List[ActivityItem]
