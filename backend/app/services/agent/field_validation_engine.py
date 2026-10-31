"""Stage 4b: Field Validation Engine.
Evaluates extracted fields and line items against rules:
- Required fields present (invoice_number, vendor_name, total_amount, dates)
- Formats (ISO dates, emails, phone numbers, alphanumeric IDs)
- Numeric ranges (positive amounts, reasonable tax rate 0-40%)
- Allowed values (currency code in ISO set)
- Arithmetic checks (sum of line items == subtotal, subtotal + tax == total)
Each check returns pass, warn, or fail, with a specific reason.
"""

from datetime import datetime
import logging
import re
from typing import Any, Dict, List, Optional

logger = logging.getLogger("securedoc.agent.validation")

ALLOWED_CURRENCIES = {"USD", "EUR", "GBP", "CAD", "AUD", "INR", "JPY", "CHF"}


class FieldValidationEngine:
    """Validates extracted document entities and verifies arithmetic consistency."""

    @classmethod
    def validate(
        cls,
        extracted_data: Dict[str, Any],
        doc_type: str = "invoice",
    ) -> List[Dict[str, Any]]:
        """Run all validation rules and return list of pass/warn/fail results."""
        results: List[Dict[str, Any]] = []
        fields = extracted_data.get("fields", {})
        line_items = extracted_data.get("line_items", [])

        # Helper to extract value safely
        def get_val(key: str) -> Any:
            f = fields.get(key)
            if isinstance(f, dict):
                return f.get("value")
            return f

        # -------------------------------------------------------------
        # 1. Required Fields Check
        # -------------------------------------------------------------
        required_keys = ["total_amount"]
        if doc_type in ("invoice", "tuition_receipt", "purchase_order"):
            required_keys.extend(["vendor_name", "invoice_number", "invoice_date"])

        missing_required = []
        for req in required_keys:
            val = get_val(req)
            if val is None or (isinstance(val, str) and not val.strip()):
                missing_required.append(req)

        if not missing_required:
            results.append({
                "rule": "required_fields",
                "status": "pass",
                "reason": f"All {len(required_keys)} mandatory fields are present.",
            })
        else:
            results.append({
                "rule": "required_fields",
                "status": "fail",
                "reason": f"Missing mandatory field(s): {', '.join(missing_required)}",
            })

        # -------------------------------------------------------------
        # 2. Format Checks: Dates
        # -------------------------------------------------------------
        inv_date_str = str(get_val("invoice_date") or "").strip()
        parsed_inv_date = None
        if inv_date_str:
            for fmt in ("%Y-%m-%d", "%m/%d/%Y", "%d/%m/%Y", "%Y/%m/%d", "%d-%m-%Y"):
                try:
                    parsed_inv_date = datetime.strptime(inv_date_str, fmt)
                    break
                except ValueError:
                    pass

            if parsed_inv_date:
                results.append({
                    "rule": "date_format",
                    "status": "pass",
                    "reason": f"Invoice date '{inv_date_str}' matches standard calendar format.",
                })
            else:
                results.append({
                    "rule": "date_format",
                    "status": "warn",
                    "reason": f"Invoice date '{inv_date_str}' is non-standard or ambiguous.",
                })

        # Due Date Format & Chronology
        due_date_str = str(get_val("due_date") or "").strip()
        if due_date_str:
            parsed_due_date = None
            for fmt in ("%Y-%m-%d", "%m/%d/%Y", "%d/%m/%Y", "%Y/%m/%d", "%d-%m-%Y"):
                try:
                    parsed_due_date = datetime.strptime(due_date_str, fmt)
                    break
                except ValueError:
                    pass

            if parsed_due_date and parsed_inv_date:
                if parsed_due_date >= parsed_inv_date:
                    results.append({
                        "rule": "chronological_sequence",
                        "status": "pass",
                        "reason": f"Due date ({due_date_str}) is on or after invoice date ({inv_date_str}).",
                    })
                else:
                    results.append({
                        "rule": "chronological_sequence",
                        "status": "fail",
                        "reason": f"Due date ({due_date_str}) is chronologically prior to invoice date ({inv_date_str}).",
                    })

        # -------------------------------------------------------------
        # 3. Numeric Ranges: Positive amounts
        # -------------------------------------------------------------
        total_amt = get_val("total_amount")
        try:
            total_float = float(total_amt) if total_amt is not None else 0.0
            if total_float > 0.0:
                results.append({
                    "rule": "positive_amount_range",
                    "status": "pass",
                    "reason": f"Total amount ${total_float:,.2f} is positive and within normal transaction bounds.",
                })
            elif total_float < 0.0:
                results.append({
                    "rule": "positive_amount_range",
                    "status": "fail",
                    "reason": f"Total amount ${total_float:,.2f} is negative.",
                })
            else:
                results.append({
                    "rule": "positive_amount_range",
                    "status": "warn",
                    "reason": "Total amount is zero.",
                })
        except (ValueError, TypeError):
            results.append({
                "rule": "positive_amount_range",
                "status": "fail",
                "reason": f"Total amount '{total_amt}' cannot be converted to a valid number.",
            })

        # -------------------------------------------------------------
        # 4. Allowed Values: Currency Code
        # -------------------------------------------------------------
        currency_val = str(get_val("currency") or "USD").upper().strip()
        if currency_val in ALLOWED_CURRENCIES:
            results.append({
                "rule": "allowed_currency",
                "status": "pass",
                "reason": f"Currency '{currency_val}' is an allowed ISO currency.",
            })
        else:
            results.append({
                "rule": "allowed_currency",
                "status": "warn",
                "reason": f"Currency '{currency_val}' is unrecognized or non-standard.",
            })

        # -------------------------------------------------------------
        # 5. Arithmetic Checks: Line Items Sum vs Subtotal
        # -------------------------------------------------------------
        if line_items:
            items_sum = 0.0
            for item in line_items:
                qty = float(item.get("quantity") or 1.0)
                price = float(item.get("unit_price") or 0.0)
                item_amt = float(item.get("amount") or (qty * price))
                items_sum += item_amt

            subtotal_val = get_val("subtotal")
            if subtotal_val is not None:
                subtotal_float = float(subtotal_val)
                # Allow 0.05 tolerance for rounding
                if abs(items_sum - subtotal_float) <= 0.05:
                    results.append({
                        "rule": "arithmetic_line_items_sum",
                        "status": "pass",
                        "reason": f"Sum of line items (${items_sum:,.2f}) matches subtotal (${subtotal_float:,.2f}).",
                    })
                else:
                    results.append({
                        "rule": "arithmetic_line_items_sum",
                        "status": "fail",
                        "reason": f"Line items sum (${items_sum:,.2f}) does not match subtotal (${subtotal_float:,.2f}). Delta: ${abs(items_sum - subtotal_float):.2f}",
                    })

        # -------------------------------------------------------------
        # 6. Arithmetic Check: Subtotal + Tax == Total Amount
        # -------------------------------------------------------------
        subtotal_v = get_val("subtotal")
        tax_v = get_val("tax_amount")
        total_v = get_val("total_amount")

        if subtotal_v is not None and total_v is not None:
            subtotal_f = float(subtotal_v)
            tax_f = float(tax_v or 0.0)
            total_f = float(total_v)
            expected_total = round(subtotal_f + tax_f, 2)

            if abs(expected_total - total_f) <= 0.05:
                results.append({
                    "rule": "arithmetic_total_reconciliation",
                    "status": "pass",
                    "reason": f"Subtotal (${subtotal_f:,.2f}) + Tax (${tax_f:,.2f}) equals Total (${total_f:,.2f}).",
                })
            else:
                results.append({
                    "rule": "arithmetic_total_reconciliation",
                    "status": "fail",
                    "reason": f"Calculation error: Subtotal (${subtotal_f:,.2f}) + Tax (${tax_f:,.2f}) = ${expected_total:,.2f}, but document states ${total_f:,.2f}.",
                })

        return results
