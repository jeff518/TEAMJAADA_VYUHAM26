"""Unit tests for cryptographic audit hash-chain integrity and tamper detection."""

import pytest
from datetime import datetime, timezone
from app.models.audit_log import AuditLog, GENESIS_PREVIOUS_HASH
from app.services.audit_service import AuditService
from app.db.session import AsyncSessionLocal, init_db


@pytest.mark.asyncio
async def test_audit_hash_chain_creation_and_verification():
    await init_db()
    async with AsyncSessionLocal() as db:
        # 1. Verify chain on fresh DB (or existing)
        initial_verif = await AuditService.verify_chain(db)
        assert initial_verif.is_valid is True

        # 2. Add 3 chained audit log entries
        e1 = await AuditService.log_action(
            db=db,
            action="TEST_ACTION_1",
            user_id="user-123",
            details={"step": 1, "note": "initial setup"},
        )
        assert e1.current_hash != ""
        assert e1.verify_hash() is True

        e2 = await AuditService.log_action(
            db=db,
            action="TEST_ACTION_2",
            user_id="user-123",
            document_id="doc-999",
            details={"step": 2, "status": "processed"},
        )
        assert e2.previous_hash == e1.current_hash
        assert e2.verify_hash() is True

        e3 = await AuditService.log_action(
            db=db,
            action="TEST_ACTION_3",
            user_id="user-456",
            document_id="doc-999",
            details={"step": 3, "approved": True},
        )
        assert e3.previous_hash == e2.current_hash
        assert e3.verify_hash() is True

        # 3. Verify entire chain integrity
        verif = await AuditService.verify_chain(db)
        assert verif.is_valid is True
        assert verif.tamper_detected is False
        assert len(verif.errors) == 0


@pytest.mark.asyncio
async def test_audit_tamper_detection():
    await init_db()
    async with AsyncSessionLocal() as db:
        entry = await AuditService.log_action(
            db=db,
            action="TAMPER_TEST_BASE",
            details={"amount": 1000},
        )

        try:
            # Deliberately modify details without updating current_hash
            entry.details = {"amount": 999999}
            await db.commit()

            verif = await AuditService.verify_chain(db)
            assert verif.is_valid is False
            assert verif.tamper_detected is True
            assert any(e.entry_id == entry.id for e in verif.errors)
        finally:
            await db.delete(entry)
            await db.commit()
