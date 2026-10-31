"""Document model tracking processing pipeline status and security scan results."""

import enum
from typing import Any, Dict, List, Optional
from sqlalchemy import BigInteger, Enum, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.sqlite import JSON as SQLiteJSON
from sqlalchemy.types import JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, CommonMixin


class DocumentStatus(str, enum.Enum):
    UPLOADED = "uploaded"
    DOOR1_SCANNING = "door1_scanning"
    DOOR1_PASSED = "door1_passed"
    DOOR1_BLOCKED = "door1_blocked"
    DOOR1_QUARANTINED = "door1_quarantined"
    PROCESSING = "processing"
    PROCESSED = "processed"
    DOOR2_SCANNING = "door2_scanning"
    DOOR2_PASSED = "door2_passed"
    DOOR2_BLOCKED = "door2_blocked"
    DOOR2_QUARANTINED = "door2_quarantined"
    EXTRACTING = "extracting"
    EXTRACTED = "extracted"
    VALIDATING = "validating"
    VALIDATED = "validated"
    MATCHING = "matching"
    MATCHED = "matched"
    FRAUD_CHECKING = "fraud_checking"
    READY_FOR_APPROVAL = "ready_for_approval"
    FRAUD_FLAGGED = "fraud_flagged"
    APPROVED = "approved"
    REJECTED = "rejected"
    VERIFICATION_REQUESTED = "verification_requested"
    FAILED = "failed"


class SecurityDecision(str, enum.Enum):
    PENDING = "PENDING"
    ALLOW = "ALLOW"
    QUARANTINE = "QUARANTINE"
    BLOCK = "BLOCK"


class Document(Base, CommonMixin):
    __tablename__ = "documents"

    filename: Mapped[str] = mapped_column(String(255), nullable=False)
    storage_path: Mapped[str] = mapped_column(String(1024), nullable=False)
    mime_type: Mapped[str] = mapped_column(String(100), nullable=False)
    file_size: Mapped[int] = mapped_column(BigInteger, nullable=False)
    sha256_hash: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    page_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    status: Mapped[DocumentStatus] = mapped_column(
        Enum(DocumentStatus, values_callable=lambda obj: [e.value for e in obj]),
        default=DocumentStatus.UPLOADED,
        index=True,
        nullable=False,
    )
    status_message: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    # Security decisions per door
    door1_decision: Mapped[SecurityDecision] = mapped_column(
        Enum(SecurityDecision, values_callable=lambda obj: [e.value for e in obj]),
        default=SecurityDecision.PENDING,
        nullable=False,
    )
    door2_decision: Mapped[SecurityDecision] = mapped_column(
        Enum(SecurityDecision, values_callable=lambda obj: [e.value for e in obj]),
        default=SecurityDecision.PENDING,
        nullable=False,
    )
    final_decision: Mapped[SecurityDecision] = mapped_column(
        Enum(SecurityDecision, values_callable=lambda obj: [e.value for e in obj]),
        default=SecurityDecision.PENDING,
        nullable=False,
    )

    # Detailed results stored as JSON
    security_metadata: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, default=dict, nullable=True)
    extracted_text: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    extracted_data: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, default=dict, nullable=True)
    validation_results: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, default=dict, nullable=True)
    match_results: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, default=dict, nullable=True)
    fraud_results: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, default=dict, nullable=True)

    # Risk score calculated across security & fraud checks (0-100)
    risk_score: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    # Owner / Uploader
    uploaded_by_id: Mapped[Optional[str]] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    # Relationships
    uploader: Mapped[Optional["User"]] = relationship("User", back_populates="documents")
    approvals: Mapped[List["ApprovalRecord"]] = relationship("ApprovalRecord", back_populates="document", cascade="all, delete-orphan")
    audit_logs: Mapped[List["AuditLog"]] = relationship("AuditLog", back_populates="document")
    matches: Mapped[List["MatchRecord"]] = relationship("MatchRecord", back_populates="document", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<Document id={self.id} filename={self.filename} status={self.status}>"
