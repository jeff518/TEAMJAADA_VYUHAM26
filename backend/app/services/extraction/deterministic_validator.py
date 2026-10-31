"""Deterministic mathematical, temporal, and completeness validation for extracted invoices."""

from datetime import datetime
import logging
import re
from typing import Any, Dict, List, Optional
from app.schemas.extraction import (
    DeterministicValidationReport,
    ExtractedInvoiceData,
    ValidationCheckResult,
)

logger = logging.getLogger("securedoc.validator")


class DeterministicValidator:
    """Verifies internal mathematical consistency, date chronology, and field completeness."""

    @classmethod
    def normalize_date(cls, date_str: Optional[str]) -> Optional[str]:
        """Normalize disparate date strings to ISO-8601 YYYY-MM-DD."""
        if not date_str:
            return None
        cleaned = re.sub(r"[^\d\-/.]", "", date_str.strip())
        formats = [
            "%Y-%m-%d",
            "%Y/%m/%d",
            "%Y.%m.%d",
            "%m/%d/%Y",
            "%m-%d-%Y",
            "%d/%m/%Y",
            "%d-%m-%Y",
            "%d.%m.%Y",
        ]
        for fmt in formats:
            try:
                dt = datetime.strptime(cleaned, fmt)
                return dt.strftime("%Y-%m-%d")
            except ValueError:
                continue
        return None

    @classmethod
    def validate(cls, data: ExtractedInvoiceData) -> DeterministicValidationReport:
        """Run all deterministic rules against extracted invoice data."""
        checks: List[ValidationCheckResult] = []

        # 1. Required fields presence checks
        required_fields = [
            ("vendor_name", data.vendor_name),
            ("invoice_number", data.invoice_number),
            ("invoice_date", data.invoice_date),
            ("total_amount", data.total_amount),
        ]
        for field_name, val in required_fields:
            passed = val is not None and str(val).strip() != ""
            checks.append(
                ValidationCheckResult(
                    rule_name="required_field_check",
                    field=field_name,
                    expected="non-null value",
                    actual=str(val) if val is not None else None,
                    passed=passed,
                    message=f"Field '{field_name}' must be present and non-empty." if not passed else "Field present",
                    severity="error" if not passed else "info",
                )
            )

        # 2. Date format normalization and chronology check
        norm_inv_date = cls.normalize_date(data.invoice_date)
        if data.invoice_date:
            passed = norm_inv_date is not None
            checks.append(
                ValidationCheckResult(
                    rule_name="date_format_check",
                    field="invoice_date",
                    expected="valid date format",
                    actual=data.invoice_date,
                    passed=passed,
                    message="Invoice date normalized successfully" if passed else "Invalid invoice date format",
                    severity="error" if not passed else "info",
                )
            )

        norm_due_date = cls.normalize_date(data.due_date)
        if norm_inv_date and norm_due_date:
            try:
                inv_dt = datetime.strptime(norm_inv_date, "%Y-%m-%d")
                due_dt = datetime.strptime(norm_due_date, "%Y-%m-%d")
                passed = due_dt >= inv_dt
                checks.append(
                    ValidationCheckResult(
                        rule_name="date_chronology_check",
                        field="due_date",
                        expected=f">= {norm_inv_date}",
                        actual=norm_due_date,
                        passed=passed,
                        message="Payment due date is after or on invoice date" if passed else "Due date cannot be before invoice issue date",
                        severity="error" if not passed else "info",
                    )
                )
            except Exception:
                pass

        # 3. Line items arithmetic check (quantity * unit_price = amount)
        line_sum = 0.0
        for idx, item in enumerate(data.line_items):
            expected_amt = round(item.quantity * item.unit_price, 2)
            actual_amt = round(item.amount, 2)
            if actual_amt < 0:
                passed = abs(expected_amt - abs(actual_amt)) <= 0.05
            else:
                passed = abs(expected_amt - actual_amt) <= 0.05
            line_sum += actual_amt
            checks.append(
                ValidationCheckResult(
                    rule_name="line_item_math_check",
                    field=f"line_items[{idx}].amount",
                    expected=expected_amt if actual_amt >= 0 else -expected_amt,
                    actual=actual_amt,
                    passed=passed,
                    message=f"Line item #{idx+1} math correct" if passed else f"Line item #{idx+1} ({item.quantity} * {item.unit_price} = {expected_amt}) differs from stated amount {actual_amt}",
                    severity="error" if not passed else "info",
                )
            )

        # 4. Subtotal vs Line items sum
        if data.subtotal is not None and data.line_items:
            expected_sub = round(line_sum, 2)
            actual_sub = round(data.subtotal, 2)
            passed = abs(expected_sub - actual_sub) <= 0.05
            checks.append(
                ValidationCheckResult(
                    rule_name="subtotal_sum_check",
                    field="subtotal",
                    expected=expected_sub,
                    actual=actual_sub,
                    passed=passed,
                    message="Subtotal matches sum of line items" if passed else f"Stated subtotal {actual_sub} does not match sum of lines {expected_sub}",
                    severity="warning" if not passed else "info",
                )
            )

        # 5. Grand Total check (subtotal + tax = total)
        if data.total_amount is not None:
            sub = data.subtotal if data.subtotal is not None else line_sum
            tax = data.tax_amount if data.tax_amount is not None else 0.0
            expected_total = round(sub + tax, 2)
            actual_total = round(data.total_amount, 2)
            passed = abs(expected_total - actual_total) <= 0.05 or abs(actual_total - round(sub, 2)) <= 0.05
            checks.append(
                ValidationCheckResult(
                    rule_name="grand_total_arithmetic_check",
                    field="total_amount",
                    expected=expected_total,
                    actual=actual_total,
                    passed=passed,
                    message="Grand total calculation matches" if passed else f"Grand total {actual_total} differs from subtotal + tax ({expected_total})",
                    severity="error" if not passed else "info",
                )
            )

        # 6. Currency validity
        valid_currencies = {"USD", "EUR", "GBP", "CAD", "AUD", "JPY", "CHF", "CNY", "INR"}
        curr_passed = data.currency.upper() in valid_currencies
        checks.append(
            ValidationCheckResult(
                rule_name="currency_consistency_check",
                field="currency",
                expected="Valid ISO currency code",
                actual=data.currency,
                passed=curr_passed,
                message="Recognized currency" if curr_passed else f"Unrecognized currency code: '{data.currency}'",
                severity="warning" if not curr_passed else "info",
            )
        )

        total_checks = len(checks)
        failed_checks = sum(1 for c in checks if not c.passed and c.severity == "error")
        passed_checks = total_checks - sum(1 for c in checks if not c.passed)
        is_valid = failed_checks == 0

        # Construct normalized dictionary
        normalized = data.model_dump()
        normalized["invoice_date"] = norm_inv_date or data.invoice_date
        normalized["due_date"] = norm_due_date or data.due_date

        return DeterministicValidationReport(
            is_valid=is_valid,
            total_checks=total_checks,
            passed_checks=passed_checks,
            failed_checks=failed_checks,
            checks=checks,
            normalized_data=normalized,
        )
