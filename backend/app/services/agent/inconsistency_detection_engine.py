"""Stage 4c: Inconsistency Detection Engine.
Identifies intra-document conflicts and cross-document batch anomalies.
Assigns severity ratings (low, medium, high) with concise explanations citing conflicting values.
"""

from datetime import datetime
import difflib
import logging
from typing import Any, Dict, List, Optional

logger = logging.getLogger("securedoc.agent.inconsistency")


class InconsistencyDetectionEngine:
    """Detects internal conflicts within a document and inter-document anomalies across batches."""

    @classmethod
    def detect_inconsistencies(
        cls,
        doc_id: str,
        current_doc_data: Dict[str, Any],
        batch_history: Optional[List[Dict[str, Any]]] = None,
    ) -> List[Dict[str, Any]]:
        """Run intra-document and cross-batch inconsistency analysis."""
        flags: List[Dict[str, Any]] = []
        fields = current_doc_data.get("fields", {})
        line_items = current_doc_data.get("line_items", [])

        def get_v(key: str) -> Any:
            f = fields.get(key)
            if isinstance(f, dict):
                return f.get("value")
            return f

        # =============================================================
        # 1. INTRA-DOCUMENT INCONSISTENCIES
        # =============================================================

        # A. Total vs Line Items Conflict
        subtotal_val = get_v("subtotal")
        total_val = get_v("total_amount")
        if line_items and total_val is not None:
            items_sum = sum(float(it.get("amount") or (float(it.get("quantity", 1)) * float(it.get("unit_price", 0)))) for it in line_items)
            subtotal_num = float(subtotal_val) if subtotal_val is not None else items_sum
            tax_num = float(get_v("tax_amount") or 0.0)
            calculated_total = round(subtotal_num + tax_num, 2)
            total_num = float(total_val)

            if abs(calculated_total - total_num) > 1.0:
                flags.append({
                    "id": f"INC-INTRA-MATH-{doc_id[:8]}",
                    "category": "intra_document",
                    "type": "math_discrepancy",
                    "severity": "high",
                    "explanation": f"Calculated total (${calculated_total:,.2f}) does not match stated total (${total_num:,.2f}). Line items sum to ${items_sum:,.2f}.",
                    "conflicting_values": {
                        "line_items_sum": items_sum,
                        "subtotal": subtotal_num,
                        "tax": tax_num,
                        "calculated_total": calculated_total,
                        "stated_total": total_num,
                    },
                })

        # B. Chronological Date Inversion
        inv_date_str = str(get_v("invoice_date") or "").strip()
        due_date_str = str(get_v("due_date") or "").strip()
        if inv_date_str and due_date_str:
            d_inv = cls._parse_date(inv_date_str)
            d_due = cls._parse_date(due_date_str)
            if d_inv and d_due and d_due < d_inv:
                flags.append({
                    "id": f"INC-INTRA-DATE-{doc_id[:8]}",
                    "category": "intra_document",
                    "type": "date_chronology_inversion",
                    "severity": "medium",
                    "explanation": f"Due date ({due_date_str}) occurs prior to the invoice issue date ({inv_date_str}).",
                    "conflicting_values": {
                        "invoice_date": inv_date_str,
                        "due_date": due_date_str,
                    },
                })

        # C. Vendor Name vs Payment Address / Text mismatch
        vendor_name = str(get_v("vendor_name") or "").strip()
        vendor_tax_id = str(get_v("vendor_tax_id") or "").strip()
        if vendor_name and len(vendor_name) < 3:
            flags.append({
                "id": f"INC-INTRA-NAME-{doc_id[:8]}",
                "category": "intra_document",
                "type": "ambiguous_entity_name",
                "severity": "low",
                "explanation": f"Vendor name '{vendor_name}' is unusually brief or ambiguous.",
                "conflicting_values": {"vendor_name": vendor_name},
            })

        # =============================================================
        # 2. CROSS-DOCUMENT / BATCH INCONSISTENCIES
        # =============================================================
        history = batch_history or []
        for prev in history:
            prev_doc_id = prev.get("doc_id", "")
            if prev_doc_id == doc_id:
                continue

            prev_fields = prev.get("extracted_fields", {}).get("fields", {})

            def get_prev_v(k: str) -> Any:
                f = prev_fields.get(k)
                return f.get("value") if isinstance(f, dict) else f

            # A. Duplicate Invoice Number with conflicting details
            cur_inv = str(get_v("invoice_number") or "").strip().lower()
            prev_inv = str(get_prev_v("invoice_number") or "").strip().lower()
            if cur_inv and prev_inv and cur_inv == prev_inv and len(cur_inv) >= 3:
                cur_tot = get_v("total_amount")
                prev_tot = get_prev_v("total_amount")
                cur_date = get_v("invoice_date")
                prev_date = get_prev_v("invoice_date")

                if cur_tot != prev_tot or cur_date != prev_date:
                    flags.append({
                        "id": f"INC-BATCH-DUP-{doc_id[:8]}-{prev_doc_id[:8]}",
                        "category": "batch_cross_check",
                        "type": "duplicate_id_conflicting_attributes",
                        "severity": "high",
                        "explanation": f"Invoice '{cur_inv.upper()}' was previously submitted in document {prev_doc_id[:8]} with conflicting details.",
                        "conflicting_values": {
                            "invoice_number": cur_inv.upper(),
                            "current_document": {"id": doc_id, "total": cur_tot, "date": cur_date},
                            "previous_document": {"id": prev_doc_id, "total": prev_tot, "date": prev_date},
                        },
                    })
                else:
                    flags.append({
                        "id": f"INC-BATCH-EXACT-DUP-{doc_id[:8]}-{prev_doc_id[:8]}",
                        "category": "batch_cross_check",
                        "type": "exact_duplicate_submission",
                        "severity": "medium",
                        "explanation": f"Identical invoice submission '{cur_inv.upper()}' detected against previous document {prev_doc_id[:8]}.",
                        "conflicting_values": {
                            "invoice_number": cur_inv.upper(),
                            "current_id": doc_id,
                            "previous_id": prev_doc_id,
                        },
                    })

            # B. Same Student ID or PO with conflicting Customer / Vendor Name
            cur_stu = str(get_v("student_id") or "").strip().upper()
            prev_stu = str(get_prev_v("student_id") or "").strip().upper()
            if cur_stu and prev_stu and cur_stu == prev_stu:
                cur_name = str(get_v("customer_name") or "").strip()
                prev_name = str(get_prev_v("customer_name") or "").strip()
                if cur_name and prev_name and cur_name.lower() != prev_name.lower():
                    flags.append({
                        "id": f"INC-BATCH-ENTITY-{doc_id[:8]}",
                        "category": "batch_cross_check",
                        "type": "entity_name_discrepancy",
                        "severity": "high",
                        "explanation": f"Student ID '{cur_stu}' is registered to '{cur_name}' in this file, but was submitted as '{prev_name}' in prior file {prev_doc_id[:8]}.",
                        "conflicting_values": {
                            "student_id": cur_stu,
                            "current_name": cur_name,
                            "previous_name": prev_name,
                        },
                    })

            # C. Same Vendor with completely different Tax ID or Address
            cur_ven = str(get_v("vendor_name") or "").strip().lower()
            prev_ven = str(get_prev_v("vendor_name") or "").strip().lower()
            if cur_ven and prev_ven and (cur_ven == prev_ven or difflib.SequenceMatcher(None, cur_ven, prev_ven).ratio() > 0.85):
                cur_tax = str(get_v("vendor_tax_id") or "").strip()
                prev_tax = str(get_prev_v("vendor_tax_id") or "").strip()
                if cur_tax and prev_tax and cur_tax != prev_tax:
                    flags.append({
                        "id": f"INC-BATCH-TAXID-{doc_id[:8]}",
                        "category": "batch_cross_check",
                        "type": "vendor_tax_id_mismatch",
                        "severity": "high",
                        "explanation": f"Vendor '{cur_ven.title()}' has tax ID '{cur_tax}' here, but '{prev_tax}' in document {prev_doc_id[:8]}.",
                        "conflicting_values": {
                            "vendor": cur_ven.title(),
                            "current_tax_id": cur_tax,
                            "previous_tax_id": prev_tax,
                        },
                    })

        return flags

    @staticmethod
    def _parse_date(date_str: str) -> Optional[datetime]:
        for fmt in ("%Y-%m-%d", "%m/%d/%Y", "%d/%m/%Y", "%Y/%m/%d", "%d-%m-%Y"):
            try:
                return datetime.strptime(date_str, fmt)
            except ValueError:
                pass
        return None
