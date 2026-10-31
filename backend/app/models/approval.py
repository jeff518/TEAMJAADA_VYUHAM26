"""Approval workflow model for document verification, approval, or rejection."""

import enum
from typing import Optional
from sqlalchemy import Enum, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, CommonMixin


class ApprovalAction(str, enum.Enum):
    APPROVE = "approve"
    REJECT = "reject"
    REQUEST_VERIFICATION = "request_verification"


class ApprovalRecord(Base, CommonMixin):
    __tablename__ = "approval_records"

    document_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("documents.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    user_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    action: Mapped[ApprovalAction] = mapped_column(
        Enum(ApprovalAction, values_callable=lambda obj: [e.value for e in obj]),
        nullable=False,
    )
    comment: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    escalation_level: Mapped[int] = mapped_column(Integer, default=1, nullable=False)

    # Relationships
    document: Mapped["Document"] = relationship("Document", back_populates="approvals")
    user: Mapped["User"] = relationship("User", back_populates="approvals")

    def __repr__(self) -> str:
        return f"<ApprovalRecord id={self.id} doc={self.document_id} action={self.action}>"
