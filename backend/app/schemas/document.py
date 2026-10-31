"""Schemas for Document metadata, status, and full details."""

from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict
from app.models.document import DocumentStatus, SecurityDecision


class DocumentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    filename: str
    file_size: int
    mime_type: str
    sha256_hash: str
    page_count: int
    status: DocumentStatus
    status_message: Optional[str] = None
    door1_decision: SecurityDecision
    door2_decision: SecurityDecision
    final_decision: SecurityDecision
    risk_score: int
    uploaded_by_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class DocumentDetailResponse(DocumentResponse):
    security_metadata: Optional[Dict[str, Any]] = None
    extracted_text: Optional[str] = None
    extracted_data: Optional[Dict[str, Any]] = None
    validation_results: Optional[Dict[str, Any]] = None
    match_results: Optional[Dict[str, Any]] = None
    fraud_results: Optional[Dict[str, Any]] = None


class DocumentListResponse(BaseModel):
    items: List[DocumentResponse]
    total: int
    page: int
    size: int
    pages: int


class DocumentFilter(BaseModel):
    status: Optional[DocumentStatus] = None
    final_decision: Optional[SecurityDecision] = None
    search: Optional[str] = None
    page: int = 1
    size: int = 20


class DocumentStatusUpdate(BaseModel):
    status: DocumentStatus
    status_message: Optional[str] = None
