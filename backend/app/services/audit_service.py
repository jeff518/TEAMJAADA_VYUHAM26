"""Audit service managing immutable, cryptographically chained audit records."""

import hashlib
import json
import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit_log import AuditLog, GENESIS_PREVIOUS_HASH
from app.schemas.audit import AuditTrailVerificationResponse, ChainVerificationError

logger = logging.getLogger("securedoc.audit")


class AuditService:
    @staticmethod
    async def get_latest_hash(db: AsyncSession) -> str:
        """Fetch the most recent audit entry's hash, or genesis hash if table is empty."""
        stmt = select(AuditLog.current_hash).order_by(desc(AuditLog.timestamp), desc(AuditLog.created_at)).limit(1)
        result = await db.execute(stmt)
        latest = result.scalar_one_or_none()
        return latest if latest else GENESIS_PREVIOUS_HASH

    @classmethod
    async def log_action(
        cls,
        db: AsyncSession,
        action: str,
        user_id: Optional[str] = None,
        document_id: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
        commit: bool = True,
    ) -> AuditLog:
        """Create a new tamper-evident audit record cryptographically linked to the previous entry."""
        previous_hash = await cls.get_latest_hash(db)
        now = datetime.now(timezone.utc)
        safe_details = details or {}

        current_hash = AuditLog.compute_hash(
            previous_hash=previous_hash,
            action=action,
            timestamp=now,
            user_id=user_id,
            details=safe_details,
        )

        entry = AuditLog(
            previous_hash=previous_hash,
            current_hash=current_hash,
            action=action,
            timestamp=now,
            user_id=user_id,
            document_id=document_id,
            details=safe_details,
        )

        db.add(entry)
        if commit:
            await db.commit()
            await db.refresh(entry)

        logger.info(
            "Audit entry created: action=%s doc=%s hash=%s...",
            action,
            document_id,
            current_hash[:12],
        )
        return entry

    @classmethod
    async def verify_chain(cls, db: AsyncSession) -> AuditTrailVerificationResponse:
        """Walk the entire audit log sequence and verify that no record was altered or removed."""
        stmt = select(AuditLog).order_by(AuditLog.timestamp.asc(), AuditLog.created_at.asc())
        result = await db.execute(stmt)
        entries: List[AuditLog] = list(result.scalars().all())

        if not entries:
            return AuditTrailVerificationResponse(
                is_valid=True,
                total_entries_verified=0,
                genesis_hash=GENESIS_PREVIOUS_HASH,
                latest_hash=GENESIS_PREVIOUS_HASH,
                tamper_detected=False,
                errors=[],
            )

        errors: List[ChainVerificationError] = []
        expected_prev = GENESIS_PREVIOUS_HASH

        for idx, entry in enumerate(entries):
            # 1. Verify link to previous entry
            if entry.previous_hash != expected_prev:
                errors.append(
                    ChainVerificationError(
                        entry_id=entry.id,
                        index=idx,
                        reason="Broken chain link: previous_hash does not match preceding record's current_hash",
                        expected_hash=expected_prev,
                        actual_hash=entry.previous_hash,
                    )
                )

            # 2. Re-compute and verify current hash
            recomputed = AuditLog.compute_hash(
                previous_hash=entry.previous_hash,
                action=entry.action,
                timestamp=entry.timestamp,
                user_id=entry.user_id,
                details=entry.details,
            )

            if entry.current_hash != recomputed:
                errors.append(
                    ChainVerificationError(
                        entry_id=entry.id,
                        index=idx,
                        reason="Corrupted payload: current_hash does not match recomputed SHA-256",
                        expected_hash=recomputed,
                        actual_hash=entry.current_hash,
                    )
                )

            expected_prev = entry.current_hash

        is_valid = len(errors) == 0
        return AuditTrailVerificationResponse(
            is_valid=is_valid,
            total_entries_verified=len(entries),
            genesis_hash=entries[0].previous_hash,
            latest_hash=entries[-1].current_hash,
            tamper_detected=not is_valid,
            errors=errors,
        )
