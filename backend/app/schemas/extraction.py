"""Schemas for structured invoice extraction and deterministic validation."""

from datetime import date
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class LineItemData(BaseModel):
    description: str = Field(..., description="Item or service description")
    quantity: float = Field(..., ge=0, description="Quantity of items")
    unit_price: float = Field(..., ge=0, description="Price per unit")
    amount: float = Field(..., description="Line total (quantity * unit_price)")
    item_code: Optional[str] = None
    category: Optional[str] = None
    tax_rate: Optional[float] = None


class ExtractedInvoiceData(BaseModel):
    invoice_number: Optional[str] = Field(None, description="Invoice or reference number")
    invoice_date: Optional[str] = Field(None, description="Invoice issue date in YYYY-MM-DD")
    due_date: Optional[str] = Field(None, description="Payment due date in YYYY-MM-DD")
    po_number: Optional[str] = Field(None, description="Associated Purchase Order number")
    vendor_name: Optional[str] = Field(None, description="Vendor or supplier company name")
    vendor_address: Optional[str] = Field(None, description="Vendor street or mailing address")
    vendor_tax_id: Optional[str] = Field(None, description="Tax ID / EIN / VAT number")
    customer_name: Optional[str] = Field(None, description="Billing customer or company name")
    customer_address: Optional[str] = Field(None, description="Customer billing/shipping address")
    currency: str = Field("USD", description="Currency code (e.g. USD, EUR, GBP)")
    subtotal: Optional[float] = Field(None, description="Subtotal before taxes and fees")
    tax_rate: Optional[float] = Field(None, description="Tax percentage rate (e.g. 0.08 for 8%)")
    tax_amount: Optional[float] = Field(None, description="Total tax amount")
    total_amount: Optional[float] = Field(None, description="Grand total invoice amount")
    payment_terms: Optional[str] = Field(None, description="Payment terms (e.g. Net 30)")
    line_items: List[LineItemData] = Field(default_factory=list, description="Extracted line items")
    confidence_score: float = Field(1.0, ge=0.0, le=1.0, description="Extraction confidence score")
    raw_response: Optional[Dict[str, Any]] = None


class ValidationCheckResult(BaseModel):
    rule_name: str
    passed: bool
    field: str
    expected: Any
    actual: Any
    message: str
    severity: str = "error"  # error, warning, info


class DeterministicValidationReport(BaseModel):
    is_valid: bool
    total_checks: int
    passed_checks: int
    failed_checks: int
    checks: List[ValidationCheckResult] = Field(default_factory=list)
    normalized_data: Optional[Dict[str, Any]] = None
