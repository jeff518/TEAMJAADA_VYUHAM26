"""Unit tests for DeterministicValidator mathematical rules and checks."""

import pytest
from app.schemas.extraction import ExtractedInvoiceData, LineItemData
from app.services.extraction.deterministic_validator import DeterministicValidator


def test_validator_arithmetic_success():
    data = ExtractedInvoiceData(
        invoice_number="INV-2024-101",
        invoice_date="2024-05-15",
        due_date="2024-06-15",
        vendor_name="TechCorp Solutions",
        currency="USD",
        subtotal=100.0,
        tax_amount=8.0,
        total_amount=108.0,
        line_items=[
            LineItemData(description="Item A", quantity=2.0, unit_price=25.0, amount=50.0),
            LineItemData(description="Item B", quantity=1.0, unit_price=50.0, amount=50.0),
        ],
    )

    report = DeterministicValidator.validate(data)
    assert report.is_valid is True
    assert report.failed_checks == 0


def test_validator_line_item_math_discrepancy():
    data = ExtractedInvoiceData(
        invoice_number="INV-2024-102",
        invoice_date="2024-05-15",
        vendor_name="TechCorp Solutions",
        currency="USD",
        total_amount=100.0,
        line_items=[
            LineItemData(description="Bad Math Item", quantity=3.0, unit_price=10.0, amount=50.0),  # 3 * 10 != 50
        ],
    )

    report = DeterministicValidator.validate(data)
    assert report.is_valid is False
    assert report.failed_checks >= 1
    assert any("line_item_math_check" in c.rule_name for c in report.checks if not c.passed)


def test_validator_due_date_before_invoice_date():
    data = ExtractedInvoiceData(
        invoice_number="INV-2024-103",
        invoice_date="2024-05-15",
        due_date="2024-05-01",  # Due date is before invoice date
        vendor_name="TechCorp Solutions",
        currency="USD",
        total_amount=50.0,
        line_items=[
            LineItemData(description="Service", quantity=1.0, unit_price=50.0, amount=50.0),
        ],
    )

    report = DeterministicValidator.validate(data)
    assert report.is_valid is False
    assert any("date_chronology_check" in c.rule_name for c in report.checks if not c.passed)
