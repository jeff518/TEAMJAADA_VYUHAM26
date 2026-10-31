"""Schemas for Document Approval Workflow."""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field
from app.models.approval import ApprovalAction


class ApprovalRequest(BaseModel):
    comment: Optional[str] = Field(None, max_length=1000, description="Reviewer comments or justification")


class VerificationRequest(BaseModel):
    reason: str = Field(..., min_length=5, max_length=1000, description="Reason verification is required")
    escalation_level: int = Field(2, ge=1, le=5)


class ApprovalRecordResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    document_id: str
    user_id: str
    action: ApprovalAction
    comment: Optional[str] = None
    escalation_level: int
    created_at: datetime


class ApprovalResponse(BaseModel):
    document_id: str
    status: str
    action_taken: ApprovalAction
    message: str
    approval_record: ApprovalRecordResponse
