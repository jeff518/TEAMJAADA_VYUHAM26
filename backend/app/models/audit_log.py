"""Audit log model with cryptographic hash-chaining for tamper evidence."""

import hashlib
import json
from datetime import datetime, timezone
from typing import Any, Dict, Optional
from sqlalchemy import DateTime, ForeignKey, Index, String, Text
from sqlalchemy.types import JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, CommonMixin, utc_now

GENESIS_PREVIOUS_HASH = "0" * 64


class AuditLog(Base, CommonMixin):
    __tablename__ = "audit_logs"

    # Cryptographic chaining fields
    previous_hash: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    current_hash: Mapped[str] = mapped_column(String(64), nullable=False, unique=True, index=True)

    action: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=utc_now,
        nullable=False,
        index=True,
    )

    # Context fields
    document_id: Mapped[Optional[str]] = mapped_column(
        String(36),
        ForeignKey("documents.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    user_id: Mapped[Optional[str]] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    details: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, default=dict, nullable=True)

    # Relationships
    user: Mapped[Optional["User"]] = relationship("User", back_populates="audit_logs")
    document: Mapped[Optional["Document"]] = relationship("Document", back_populates="audit_logs")

    __table_args__ = (
        Index("ix_audit_logs_timestamp_action", "timestamp", "action"),
    )

    @staticmethod
    def compute_hash(
        previous_hash: str,
        action: str,
        timestamp: datetime,
        user_id: Optional[str],
        details: Optional[Dict[str, Any]],
    ) -> str:
        """Compute SHA-256 hash chaining this record with the previous log record."""
        # Normalize timestamp format for exact reproducibility across both aware and naive UTC datetimes
        if timestamp.tzinfo is not None:
            ts_norm = timestamp.astimezone(timezone.utc).replace(tzinfo=None)
        else:
            ts_norm = timestamp
        ts_iso = ts_norm.isoformat()
        u_id = user_id or "anonymous"
        details_json = json.dumps(details or {}, sort_keys=True)
        payload = f"{previous_hash}|{action}|{ts_iso}|{u_id}|{details_json}".encode("utf-8")
        return hashlib.sha256(payload).hexdigest()

    def verify_hash(self) -> bool:
        """Verify the integrity of this audit record's current hash."""
        expected = self.compute_hash(
            previous_hash=self.previous_hash,
            action=self.action,
            timestamp=self.timestamp,
            user_id=self.user_id,
            details=self.details,
        )
        return self.current_hash == expected

    def __repr__(self) -> str:
        return f"<AuditLog id={self.id} action={self.action} hash={self.current_hash[:8]}...>"
