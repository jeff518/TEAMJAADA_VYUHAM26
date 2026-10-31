"""Three-way matching engine for Purchase Order, Goods Receipt, and Invoice reconciliation."""

from datetime import date, datetime
import difflib
import logging
from typing import Any, Dict, List, Optional, Tuple
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.models.matching import GoodsReceipt, MatchRecord, MatchStatus, PurchaseOrder
from app.schemas.extraction import ExtractedInvoiceData
from app.schemas.matching import MatchDiscrepancyItem, ThreeWayMatchReport

logger = logging.getLogger("securedoc.matcher")
settings = get_settings()


def re_clean(text: str) -> str:
    """Normalize and clean string for fuzzy comparison."""
    import re
    return re.sub(r"[^a-z0-9]", "", text.lower()) if text else ""


class ThreeWayMatcher:
    """Reconciles Invoices against Purchase Orders and Goods Receipts with tolerance thresholds."""

    @staticmethod
    def fuzzy_vendor_similarity(s1: str, s2: str) -> float:
        """Compute normalized similarity ratio between two vendor strings (0.0 to 1.0)."""
        clean1 = re_clean(s1)
        clean2 = re_clean(s2)
        if not clean1 or not clean2:
            return 0.0
        if clean1 == clean2:
            return 1.0
        matcher = difflib.SequenceMatcher(None, clean1, clean2)
        return matcher.ratio()

    @classmethod
    async def match(
        cls,
        db: AsyncSession,
        document_id: str,
        invoice_data: ExtractedInvoiceData,
    ) -> ThreeWayMatchReport:
        """Execute three-way matching against database PO and Goods Receipt records."""
        po_number = (invoice_data.po_number or "").strip()
        vendor_name = (invoice_data.vendor_name or "").strip()
        inv_total = invoice_data.total_amount or 0.0

        discrepancies: List[MatchDiscrepancyItem] = []
        vendor_score = 0.0
        po_match_score = 0.0
        amount_score = 0.0
        items_score = 100.0

        # 1. Fetch matching Purchase Order from DB
        po: Optional[PurchaseOrder] = None
        if po_number:
            stmt = select(PurchaseOrder).where(PurchaseOrder.po_number == po_number)
            res = await db.execute(stmt)
            po = res.scalar_one_or_none()

        receipt: Optional[GoodsReceipt] = None
        if po_number:
            stmt_rcpt = select(GoodsReceipt).where(GoodsReceipt.po_number == po_number)
            res_rcpt = await db.execute(stmt_rcpt)
            receipt = res_rcpt.scalar_one_or_none()

        # If PO is not found in database, check for discrepancy
        if not po:
            discrepancies.append(
                MatchDiscrepancyItem(
                    field="po_number",
                    invoice_val=po_number,
                    po_val=None,
                    discrepancy_type="po_not_found",
                    severity="critical",
                    message=f"Purchase Order '{po_number}' not found in purchasing system." if po_number else "No Purchase Order referenced on invoice.",
                )
            )
            overall_status = MatchStatus.NOT_MATCHED
            report = ThreeWayMatchReport(
                document_id=document_id,
                po_number=po_number or None,
                receipt_number=None,
                status=overall_status,
                overall_score=0.0,
                vendor_score=0.0,
                po_match_score=0.0,
                amount_score=0.0,
                items_score=0.0,
                discrepancies=discrepancies,
                details={"reason": "Purchase order does not exist in database"},
            )
            await cls._save_match_record(db, document_id, report)
            return report

        # 2. PO match confirmed
        po_match_score = 100.0

        # 3. Vendor verification
        sim = cls.fuzzy_vendor_similarity(vendor_name, po.vendor_name)
        vendor_score = round(sim * 100, 1)
        if sim < settings.MATCH_VENDOR_FUZZY_RATIO:
            discrepancies.append(
                MatchDiscrepancyItem(
                    field="vendor_name",
                    invoice_val=vendor_name,
                    po_val=po.vendor_name,
                    discrepancy_type="vendor_mismatch",
                    severity="major",
                    message=f"Vendor '{vendor_name}' does not sufficiently match PO vendor '{po.vendor_name}' (similarity {sim:.2f})",
                )
            )

        # 4. Total Amount tolerance check
        po_amount = po.total_amount
        diff_amount = abs(inv_total - po_amount)
        max_allowed_diff = po_amount * settings.MATCH_AMOUNT_TOLERANCE_PERCENT

        if diff_amount <= max_allowed_diff:
            amount_score = 100.0
        else:
            pct_diff = (diff_amount / max(0.01, po_amount)) * 100
            amount_score = max(0.0, round(100.0 - pct_diff, 1))
            discrepancies.append(
                MatchDiscrepancyItem(
                    field="total_amount",
                    invoice_val=inv_total,
                    po_val=po_amount,
                    discrepancy_type="amount_mismatch",
                    severity="critical" if pct_diff > 10 else "major",
                    message=f"Invoice total ${inv_total:.2f} deviates from PO total ${po_amount:.2f} by {pct_diff:.2f}% (tolerance: {settings.MATCH_AMOUNT_TOLERANCE_PERCENT*100}%)",
                )
            )

        # 5. Goods Receipt verification
        rcpt_number = receipt.receipt_number if receipt else None
        if not receipt:
            discrepancies.append(
                MatchDiscrepancyItem(
                    field="receipt_number",
                    invoice_val=None,
                    po_val=po.po_number,
                    discrepancy_type="goods_receipt_missing",
                    severity="major",
                    message=f"No Goods Receipt registered yet for PO '{po.po_number}'",
                )
            )
        else:
            # Line items quantity check against Goods Receipt
            receipt_qtys = {re_clean(item.get("description", "")): float(item.get("quantity_received", 0)) for item in receipt.line_items}
            item_penalties = 0

            for inv_item in invoice_data.line_items:
                clean_desc = re_clean(inv_item.description)
                # Find matching receipt item
                best_match_key = None
                best_score = 0.0
                for r_desc in receipt_qtys:
                    s = cls.fuzzy_vendor_similarity(clean_desc, r_desc)
                    if s > best_score and s > 0.6:
                        best_score = s
                        best_match_key = r_desc

                if best_match_key:
                    rcv_qty = receipt_qtys[best_match_key]
                    if inv_item.quantity > rcv_qty:
                        item_penalties += 20
                        discrepancies.append(
                            MatchDiscrepancyItem(
                                field=f"item_qty[{inv_item.description[:20]}]",
                                invoice_val=inv_item.quantity,
                                po_val=None,
                                receipt_val=rcv_qty,
                                discrepancy_type="qty_mismatch",
                                severity="critical",
                                message=f"Billed qty {inv_item.quantity} exceeds goods received qty {rcv_qty} for '{inv_item.description}'",
                            )
                        )

            items_score = max(0.0, float(100 - item_penalties))

        # 6. Overall Match Score Calculation
        overall_score = round(
            (po_match_score * 0.25) +
            (vendor_score * 0.25) +
            (amount_score * 0.30) +
            (items_score * 0.20),
            1
        )

        critical_count = sum(1 for d in discrepancies if d.severity == "critical")
        if critical_count > 0:
            status = MatchStatus.DISCREPANCY
        elif overall_score >= 85.0 and len(discrepancies) == 0:
            status = MatchStatus.MATCHED
        elif overall_score >= 60.0:
            status = MatchStatus.PARTIAL_MATCH
        else:
            status = MatchStatus.DISCREPANCY

        report = ThreeWayMatchReport(
            document_id=document_id,
            po_number=po_number,
            receipt_number=rcpt_number,
            status=status,
            overall_score=overall_score,
            vendor_score=vendor_score,
            po_match_score=po_match_score,
            amount_score=amount_score,
            items_score=items_score,
            discrepancies=discrepancies,
            details={
                "po_id": po.id if po else None,
                "receipt_id": receipt.id if receipt else None,
                "po_amount": po.total_amount if po else None,
            },
        )

        await cls._save_match_record(db, document_id, report)
        return report

    @classmethod
    async def _save_match_record(cls, db: AsyncSession, doc_id: str, report: ThreeWayMatchReport) -> None:
        """Persist matching record in DB."""
        stmt = select(MatchRecord).where(MatchRecord.document_id == doc_id)
        res = await db.execute(stmt)
        record = res.scalar_one_or_none()

        if not record:
            record = MatchRecord(
                document_id=doc_id,
                po_number=report.po_number,
                receipt_number=report.receipt_number,
                status=report.status,
                match_score=report.overall_score,
                is_matched=(report.status == MatchStatus.MATCHED),
                discrepancies=[d.model_dump() for d in report.discrepancies],
                match_details=report.details,
            )
            db.add(record)
        else:
            record.po_number = report.po_number
            record.receipt_number = report.receipt_number
            record.status = report.status
            record.match_score = report.overall_score
            record.is_matched = (report.status == MatchStatus.MATCHED)
            record.discrepancies = [d.model_dump() for d in report.discrepancies]
            record.match_details = report.details

        await db.commit()
