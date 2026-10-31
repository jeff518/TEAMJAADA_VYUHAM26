"""Door 4: Fraud Detection Engine.
Performs statistical anomaly detection, Benford's Law conformity,
duplicate invoice checking, historical vendor velocity analysis,
Z-score amount outlier detection, and round number bias testing.
"""

import math
import logging
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional, Tuple
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.models.document import Document

logger = logging.getLogger("securedoc.door4")
settings = get_settings()

# Theoretical probabilities according to Benford's Law for digits 1-9
BENFORD_EXPECTED = {
    1: 0.30103,
    2: 0.17609,
    3: 0.12494,
    4: 0.09691,
    5: 0.07918,
    6: 0.06695,
    7: 0.05799,
    8: 0.05115,
    9: 0.04576,
}


class FraudDetectionResult:
    def __init__(self):
        self.risk_score: int = 0
        self.is_flagged: bool = False
        self.decision: str = "ALLOW"  # ALLOW, FLAG, BLOCK
        self.reasons: List[str] = []
        self.warnings: List[str] = []
        self.benford_analysis: Dict[str, Any] = {}
        self.duplicate_check: Dict[str, Any] = {}
        self.velocity_check: Dict[str, Any] = {}
        self.amount_zscore_check: Dict[str, Any] = {}
        self.round_number_check: Dict[str, Any] = {}

    def to_dict(self) -> Dict[str, Any]:
        return {
            "risk_score": self.risk_score,
            "is_flagged": self.is_flagged,
            "decision": self.decision,
            "reasons": self.reasons,
            "warnings": self.warnings,
            "benford_analysis": self.benford_analysis,
            "duplicate_check": self.duplicate_check,
            "velocity_check": self.velocity_check,
            "amount_zscore_check": self.amount_zscore_check,
            "round_number_check": self.round_number_check,
        }


class Door4FraudDetection:
    """Door 4 statistical and behavioral fraud analysis service."""

    @classmethod
    def analyze_benford_law(cls, numbers: List[float]) -> Dict[str, Any]:
        """Compute Benford's Law leading-digit distribution conformity using Chi-Square test."""
        leading_digits: List[int] = []
        for num in numbers:
            val = abs(num)
            if val >= 1.0:
                # Extract first non-zero digit
                first_char = str(val).lstrip("0").replace(".", "")[0]
                d = int(first_char)
                if 1 <= d <= 9:
                    leading_digits.append(d)

        n = len(leading_digits)
        if n < 5:
            return {
                "applicable": False,
                "sample_size": n,
                "message": "Sample size too small for reliable Benford analysis (minimum 5 numbers required)",
                "conforms": True,
                "chi2_stat": 0.0,
            }

        counts = {d: 0 for d in range(1, 10)}
        for d in leading_digits:
            counts[d] += 1

        chi2_stat = 0.0
        observed_proportions = {}
        for d in range(1, 10):
            obs = counts[d]
            exp = n * BENFORD_EXPECTED[d]
            observed_proportions[d] = round(obs / n, 4)
            chi2_stat += ((obs - exp) ** 2) / exp

        # Chi-square with 8 degrees of freedom at p=0.05 critical value is ~15.51
        conforms = chi2_stat <= settings.BENFORD_TOLERANCE_CHI2

        return {
            "applicable": True,
            "sample_size": n,
            "chi2_stat": round(chi2_stat, 2),
            "threshold": settings.BENFORD_TOLERANCE_CHI2,
            "conforms": conforms,
            "observed_proportions": observed_proportions,
            "expected_proportions": {d: round(BENFORD_EXPECTED[d], 4) for d in range(1, 10)},
        }

    @classmethod
    async def check_duplicate_invoice(
        cls,
        db: AsyncSession,
        vendor_name: str,
        invoice_number: str,
        current_doc_id: str,
    ) -> Dict[str, Any]:
        """Check if identical vendor + invoice_number pair already exists in DB from a different document."""
        if not vendor_name or not invoice_number:
            return {"is_duplicate": False, "message": "Missing vendor or invoice number for duplicate check"}

        curr_stmt = select(Document).where(Document.id == current_doc_id)
        curr_res = await db.execute(curr_stmt)
        curr_doc = curr_res.scalar_one_or_none()
        curr_hash = curr_doc.sha256_hash if curr_doc else None

        stmt = select(Document).where(Document.id != current_doc_id)
        result = await db.execute(stmt)
        docs = result.scalars().all()

        matching_duplicates = []
        for doc in docs:
            # If the SHA256 matches, this is an identical file re-scan/test run, not duplicate billing fraud
            if curr_hash and doc.sha256_hash == curr_hash:
                continue
            if doc.extracted_data:
                ex_vendor = (doc.extracted_data.get("vendor_name") or "").strip().lower()
                ex_inv_num = (doc.extracted_data.get("invoice_number") or "").strip().lower()
                if ex_vendor == vendor_name.strip().lower() and ex_inv_num == invoice_number.strip().lower():
                    matching_duplicates.append(doc.id)

        is_dup = len(matching_duplicates) > 0
        return {
            "is_duplicate": is_dup,
            "existing_document_ids": matching_duplicates,
            "count": len(matching_duplicates),
        }

    @classmethod
    async def check_vendor_velocity(
        cls,
        db: AsyncSession,
        vendor_name: str,
        current_doc_id: str,
    ) -> Dict[str, Any]:
        """Check how many invoices have been received from this vendor within VELOCITY_WINDOW_DAYS."""
        if not vendor_name:
            return {"velocity_alert": False, "count": 0, "message": "Vendor name unknown"}

        window_start = datetime.now(timezone.utc) - timedelta(days=settings.VELOCITY_WINDOW_DAYS)
        stmt = select(Document).where(
            Document.id != current_doc_id,
            Document.created_at >= window_start,
        )
        result = await db.execute(stmt)
        docs = result.scalars().all()

        vendor_docs = []
        for doc in docs:
            if doc.extracted_data:
                v = (doc.extracted_data.get("vendor_name") or "").strip().lower()
                if v == vendor_name.strip().lower():
                    vendor_docs.append(doc.id)

        count = len(vendor_docs)
        alert = count >= settings.VELOCITY_MAX_INVOICES

        return {
            "velocity_alert": alert,
            "invoices_in_window": count,
            "threshold": settings.VELOCITY_MAX_INVOICES,
            "window_days": settings.VELOCITY_WINDOW_DAYS,
        }

    @classmethod
    async def check_amount_zscore(
        cls,
        db: AsyncSession,
        vendor_name: str,
        current_amount: float,
        current_doc_id: str,
    ) -> Dict[str, Any]:
        """Compute Z-score of current invoice amount against historical amounts from the same vendor."""
        if not vendor_name or current_amount <= 0:
            return {"is_anomaly": False, "z_score": 0.0, "message": "Insufficient data"}

        stmt = select(Document).where(Document.id != current_doc_id)
        result = await db.execute(stmt)
        docs = result.scalars().all()

        amounts = []
        for doc in docs:
            if doc.extracted_data:
                v = (doc.extracted_data.get("vendor_name") or "").strip().lower()
                if v == vendor_name.strip().lower():
                    tot = doc.extracted_data.get("total_amount")
                    if tot and isinstance(tot, (int, float)) and tot > 0:
                        amounts.append(float(tot))

        if len(amounts) < 3:
            return {
                "is_anomaly": False,
                "z_score": 0.0,
                "mean": 0.0,
                "historical_count": len(amounts),
                "message": "Fewer than 3 historical invoices for vendor; baseline not established",
            }

        mean = sum(amounts) / len(amounts)
        variance = sum((x - mean) ** 2 for x in amounts) / len(amounts)
        std_dev = math.sqrt(variance)

        if std_dev == 0:
            z_score = 0.0
        else:
            z_score = abs(current_amount - mean) / std_dev

        is_anomaly = z_score >= settings.AMOUNT_Z_SCORE_THRESHOLD

        return {
            "is_anomaly": is_anomaly,
            "z_score": round(z_score, 2),
            "historical_mean": round(mean, 2),
            "historical_std": round(std_dev, 2),
            "threshold": settings.AMOUNT_Z_SCORE_THRESHOLD,
            "historical_count": len(amounts),
        }

    @classmethod
    def check_round_numbers(cls, current_amount: float, line_item_amounts: List[float]) -> Dict[str, Any]:
        """Check for suspicious round-number patterns (e.g. $5,000.00 exact)."""
        all_amounts = [current_amount] + line_item_amounts
        round_count = 0
        for amt in all_amounts:
            if amt > 0 and (amt % 100 == 0 or amt % 50 == 0):
                round_count += 1

        ratio = round_count / max(1, len(all_amounts))
        is_suspicious = (current_amount >= 1000 and current_amount % 1000 == 0) or (ratio >= 0.8 and len(all_amounts) >= 3)

        return {
            "is_round_number_suspicious": is_suspicious,
            "total_amounts_analyzed": len(all_amounts),
            "round_amounts_count": round_count,
            "round_ratio": round(ratio, 2),
        }

    @classmethod
    async def analyze(
        cls,
        db: AsyncSession,
        extracted_data: Dict[str, Any],
        current_doc_id: str,
    ) -> FraudDetectionResult:
        """Run complete fraud evaluation battery across all statistical dimensions."""
        result = FraudDetectionResult()

        try:
            vendor = (extracted_data.get("vendor_name") or "").strip()
            inv_num = (extracted_data.get("invoice_number") or "").strip()
            total_amt = float(extracted_data.get("total_amount") or 0.0)

            # Collect line item amounts for Benford and round number tests
            line_amounts: List[float] = []
            for item in extracted_data.get("line_items", []):
                amt = item.get("amount") or (item.get("quantity", 0) * item.get("unit_price", 0))
                if amt and amt > 0:
                    line_amounts.append(float(amt))

            # 1. Benford's Law analysis
            benford_data = cls.analyze_benford_law([total_amt] + line_amounts)
            result.benford_analysis = benford_data
            if benford_data.get("applicable") and not benford_data.get("conforms"):
                result.warnings.append(
                    f"Benford's Law non-conformity detected (Chi2={benford_data.get('chi2_stat')} > {settings.BENFORD_TOLERANCE_CHI2})"
                )
                result.risk_score += 25

            # 2. Duplicate invoice check
            dup_check = await cls.check_duplicate_invoice(db, vendor, inv_num, current_doc_id)
            result.duplicate_check = dup_check
            if dup_check.get("is_duplicate"):
                result.reasons.append(
                    f"Duplicate invoice detected! Vendor '{vendor}' with invoice #{inv_num} already exists in DB ({dup_check.get('existing_document_ids')})"
                )
                result.risk_score += 60

            # 3. Vendor Velocity check
            velo_check = await cls.check_vendor_velocity(db, vendor, current_doc_id)
            result.velocity_check = velo_check
            if velo_check.get("velocity_alert"):
                result.warnings.append(
                    f"High invoice velocity from vendor '{vendor}': {velo_check.get('invoices_in_window')} invoices in last {velo_check.get('window_days')} days"
                )
                result.risk_score += 25

            # 4. Amount Z-score anomaly check
            zscore_check = await cls.check_amount_zscore(db, vendor, total_amt, current_doc_id)
            result.amount_zscore_check = zscore_check
            if zscore_check.get("is_anomaly"):
                result.warnings.append(
                    f"Statistical amount anomaly: Z-score is {zscore_check.get('z_score')} (Vendor historical mean: ${zscore_check.get('historical_mean')})"
                )
                result.risk_score += 30

            # 5. Round number bias check
            round_check = cls.check_round_numbers(total_amt, line_amounts)
            result.round_number_check = round_check
            if round_check.get("is_round_number_suspicious"):
                result.warnings.append(
                    f"Suspicious round number pattern identified for total amount: ${total_amt:.2f}"
                )
                result.risk_score += 15

            # Cap risk score
            result.risk_score = min(100, result.risk_score)

            # Decision Engine
            if result.reasons or result.risk_score >= 60:
                result.decision = "BLOCK"
                result.is_flagged = True
            elif result.risk_score >= 25:
                result.decision = "FLAG"
                result.is_flagged = True
            else:
                result.decision = "ALLOW"
                result.is_flagged = False

        except Exception as e:
            # FAIL-CLOSED: On error during fraud check, flag the document for human review
            logger.error("Fraud detection engine error (fail-closed): %s", str(e), exc_info=True)
            result.decision = "FLAG"
            result.is_flagged = True
            result.risk_score = 75
            result.reasons.append(f"Fraud detection engine error: {str(e)}")

        return result
