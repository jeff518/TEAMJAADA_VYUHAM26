"""Three-way matching models for Purchase Orders, Goods Receipts, and Invoices."""

import enum
from datetime import date
from typing import Any, Dict, List, Optional
from sqlalchemy import Boolean, Date, Enum, Float, ForeignKey, Numeric, String
from sqlalchemy.types import JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, CommonMixin


class MatchStatus(str, enum.Enum):
    MATCHED = "matched"
    PARTIAL_MATCH = "partial_match"
    DISCREPANCY = "discrepancy"
    NOT_MATCHED = "not_matched"


class PurchaseOrder(Base, CommonMixin):
    __tablename__ = "purchase_orders"

    po_number: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False)
    vendor_name: Mapped[str] = mapped_column(String(255), index=True, nullable=False)
    order_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    total_amount: Mapped[float] = mapped_column(Float, nullable=False)
    currency: Mapped[str] = mapped_column(String(10), default="USD", nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="OPEN", nullable=False)
    line_items: Mapped[List[Dict[str, Any]]] = mapped_column(JSON, default=list, nullable=False)

    def __repr__(self) -> str:
        return f"<PurchaseOrder {self.po_number} vendor={self.vendor_name} total={self.total_amount}>"


class GoodsReceipt(Base, CommonMixin):
    __tablename__ = "goods_receipts"

    receipt_number: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False)
    po_number: Mapped[str] = mapped_column(String(100), index=True, nullable=False)
    vendor_name: Mapped[str] = mapped_column(String(255), index=True, nullable=False)
    receipt_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    status: Mapped[str] = mapped_column(String(50), default="RECEIVED", nullable=False)
    line_items: Mapped[List[Dict[str, Any]]] = mapped_column(JSON, default=list, nullable=False)

    def __repr__(self) -> str:
        return f"<GoodsReceipt {self.receipt_number} po={self.po_number}>"


class MatchRecord(Base, CommonMixin):
    __tablename__ = "match_records"

    document_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("documents.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    po_number: Mapped[Optional[str]] = mapped_column(String(100), nullable=True, index=True)
    receipt_number: Mapped[Optional[str]] = mapped_column(String(100), nullable=True, index=True)

    status: Mapped[MatchStatus] = mapped_column(
        Enum(MatchStatus, values_callable=lambda obj: [e.value for e in obj]),
        default=MatchStatus.NOT_MATCHED,
        nullable=False,
    )
    match_score: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    is_matched: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # Discrepancies and matching breakdown details
    discrepancies: Mapped[List[Dict[str, Any]]] = mapped_column(JSON, default=list, nullable=False)
    match_details: Mapped[Dict[str, Any]] = mapped_column(JSON, default=dict, nullable=False)

    # Relationships
    document: Mapped["Document"] = relationship("Document", back_populates="matches")

    def __repr__(self) -> str:
        return f"<MatchRecord doc={self.document_id} status={self.status} score={self.match_score}>"
