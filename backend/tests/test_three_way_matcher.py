import uuid
import pytest
from app.db.session import AsyncSessionLocal, init_db
from app.models.matching import GoodsReceipt, MatchStatus, PurchaseOrder
from app.schemas.extraction import ExtractedInvoiceData, LineItemData
from app.services.extraction.three_way_matcher import ThreeWayMatcher


@pytest.mark.asyncio
async def test_three_way_match_success():
    await init_db()
    async with AsyncSessionLocal() as db:
        uid = uuid.uuid4().hex[:6]
        po_num = f"PO-{uid}"
        gr_num = f"GR-{uid}"

        # Create PO
        po = PurchaseOrder(
            po_number=po_num,
            vendor_name="Acme Industrial Supplies Inc.",
            total_amount=1500.00,
            currency="USD",
            line_items=[{"description": "Industrial Widgets", "quantity": 10, "unit_price": 150.0}],
        )
        # Create Goods Receipt
        receipt = GoodsReceipt(
            receipt_number=gr_num,
            po_number=po_num,
            vendor_name="Acme Industrial Supplies Inc.",
            line_items=[{"description": "Industrial Widgets", "quantity_received": 10}],
        )
        db.add(po)
        db.add(receipt)
        await db.commit()

        # Invoice matching PO and GR
        inv_data = ExtractedInvoiceData(
            invoice_number=f"INV-{uid}",
            po_number=po_num,
            vendor_name="Acme Industrial Supplies",  # Slight fuzzy difference
            currency="USD",
            total_amount=1500.00,
            line_items=[
                LineItemData(description="Industrial Widgets", quantity=10.0, unit_price=150.0, amount=1500.0)
            ],
        )

        report = await ThreeWayMatcher.match(db, document_id=f"doc-match-test-{uid}", invoice_data=inv_data)
        assert report.status == MatchStatus.MATCHED
        assert report.overall_score >= 85.0
        assert report.po_match_score == 100.0


@pytest.mark.asyncio
async def test_three_way_match_quantity_discrepancy():
    await init_db()
    async with AsyncSessionLocal() as db:
        uid = uuid.uuid4().hex[:6]
        po_num = f"PO-DISC-{uid}"
        gr_num = f"GR-DISC-{uid}"

        po = PurchaseOrder(
            po_number=po_num,
            vendor_name="Global Logistics Corp",
            total_amount=2000.00,
            line_items=[{"description": "Pallet Boxes", "quantity": 20, "unit_price": 100.0}],
        )
        receipt = GoodsReceipt(
            receipt_number=gr_num,
            po_number=po_num,
            vendor_name="Global Logistics Corp",
            line_items=[{"description": "Pallet Boxes", "quantity_received": 15}],  # Only 15 received
        )
        db.add(po)
        db.add(receipt)
        await db.commit()

        # Billed for 20 when only 15 were received
        inv_data = ExtractedInvoiceData(
            invoice_number=f"INV-DISC-{uid}",
            po_number=po_num,
            vendor_name="Global Logistics Corp",
            currency="USD",
            total_amount=2000.00,
            line_items=[
                LineItemData(description="Pallet Boxes", quantity=20.0, unit_price=100.0, amount=2000.0)
            ],
        )

        report = await ThreeWayMatcher.match(db, document_id=f"doc-match-disc-{uid}", invoice_data=inv_data)
        assert report.status == MatchStatus.DISCREPANCY
        assert any(d.discrepancy_type == "qty_mismatch" for d in report.discrepancies)
