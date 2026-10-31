"""Schemas for Three-Way Matching (PO, Receipt, Invoice)."""

from datetime import date
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field
from app.models.matching import MatchStatus


class PurchaseOrderItem(BaseModel):
    item_code: Optional[str] = None
    description: str
    quantity: float
    unit_price: float
    amount: float


class PurchaseOrderCreate(BaseModel):
    po_number: str
    vendor_name: str
    order_date: Optional[date] = None
    total_amount: float
    currency: str = "USD"
    status: str = "OPEN"
    line_items: List[PurchaseOrderItem] = Field(default_factory=list)


class PurchaseOrderResponse(PurchaseOrderCreate):
    model_config = ConfigDict(from_attributes=True)
    id: str


class GoodsReceiptItem(BaseModel):
    item_code: Optional[str] = None
    description: str
    quantity_received: float


class GoodsReceiptCreate(BaseModel):
    receipt_number: str
    po_number: str
    vendor_name: str
    receipt_date: Optional[date] = None
    status: str = "RECEIVED"
    line_items: List[GoodsReceiptItem] = Field(default_factory=list)


class GoodsReceiptResponse(GoodsReceiptCreate):
    model_config = ConfigDict(from_attributes=True)
    id: str


class MatchDiscrepancyItem(BaseModel):
    field: str
    invoice_val: Any
    po_val: Any
    receipt_val: Any = None
    discrepancy_type: str  # amount_mismatch, qty_mismatch, vendor_mismatch, date_sequence
    severity: str = "critical"  # critical, major, minor
    message: str


class ThreeWayMatchReport(BaseModel):
    document_id: str
    po_number: Optional[str]
    receipt_number: Optional[str]
    status: MatchStatus
    overall_score: float  # 0.0 to 100.0
    vendor_score: float
    po_match_score: float
    amount_score: float
    items_score: float
    discrepancies: List[MatchDiscrepancyItem] = Field(default_factory=list)
    details: Dict[str, Any] = Field(default_factory=dict)
