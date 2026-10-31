"""Dedicated SHA-256 Hash and File Integrity Service for DocuPilot AI (Vyuham).

Provides:
- Chunked SHA-256 calculation
- Duplicate hash detection
- Disk file integrity verification against stored hashes
- Audit logging of integrity verification outcomes
"""

import hashlib
import os
import re
from typing import Any, Dict, Optional
from sqlalchemy import select, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.document import Document
from app.models.audit_log import AuditLog, GENESIS_PREVIOUS_HASH
from app.models.base import utc_now


class HashService:
    """Service handling cryptographic hashing and integrity validation for files."""

    HASH_PATTERN = re.compile(r"^[a-fA-F0-9]{64}$")

    @staticmethod
    def calculate_sha256(filepath: str, chunk_size: int = 65536) -> str:
        """Calculate the 64-character hex SHA-256 hash of a file reading in chunks."""
        if not os.path.exists(filepath):
            raise FileNotFoundError(f"File not found for hash calculation: {filepath}")

        hasher = hashlib.sha256()
        with open(filepath, "rb") as f:
            while chunk := f.read(chunk_size):
                hasher.update(chunk)
        return hasher.hexdigest().lower()

    @staticmethod
    def calculate_bytes_sha256(data: bytes) -> str:
        """Calculate SHA-256 hash from in-memory byte buffer."""
        return hashlib.sha256(data).hexdigest().lower()

    @classmethod
    async def find_duplicate_hash(
        cls,
        db: AsyncSession,
        sha256_hash: str,
        exclude_doc_id: Optional[str] = None,
    ) -> Optional[Document]:
        """Find if a document with identical SHA-256 hash already exists."""
        clean = sha256_hash.lower()
        stmt = select(Document).where(
            or_(
                Document.sha256_hash == clean,
                Document.sha256_hash.like(f"{clean[:56]}%"),
            )
        )
        if exclude_doc_id:
            stmt = stmt.where(Document.id != exclude_doc_id)
        result = await db.execute(stmt)
        return result.scalars().first()

    @classmethod
    async def verify_file_integrity(
        cls,
        db: AsyncSession,
        doc_id: str,
        user_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Verify the integrity of a stored document file against its recorded original SHA-256 hash.
        
        Records any integrity failure or verification into the tamper-evident audit log.
        """
        stmt = select(Document).where(Document.id == doc_id)
        res = await db.execute(stmt)
        doc = res.scalar_one_or_none()

        if not doc:
            return {
                "verified": False,
                "document_id": doc_id,
                "status": "NOT_FOUND",
                "message": f"Document {doc_id} not found in database",
            }

        meta = doc.security_metadata or {}
        original_hash = (meta.get("original_sha256") or doc.sha256_hash or "").lower()
        storage_path = doc.storage_path

        if not storage_path or not os.path.exists(storage_path):
            # Record integrity failure
            await cls._record_integrity_audit(
                db=db,
                document_id=doc.id,
                user_id=user_id,
                action="INTEGRITY_CHECK_FILE_MISSING",
                details={
                    "expected_hash": original_hash,
                    "storage_path": storage_path,
                    "status": "FILE_MISSING",
                },
            )
            return {
                "verified": False,
                "document_id": doc_id,
                "filename": doc.filename,
                "expected_hash": original_hash,
                "status": "FILE_MISSING",
                "message": f"Storage file missing at {storage_path}",
            }

        # Calculate current hash from disk
        current_hash = cls.calculate_sha256(storage_path)

        if current_hash != original_hash:
            # Hash mismatch! Tampering detected!
            await cls._record_integrity_audit(
                db=db,
                document_id=doc.id,
                user_id=user_id,
                action="INTEGRITY_VERIFICATION_FAILED",
                details={
                    "expected_hash": original_hash,
                    "actual_hash": current_hash,
                    "status": "TAMPERING_SUSPECTED",
                    "file_size": os.path.getsize(storage_path),
                },
            )
            return {
                "verified": False,
                "document_id": doc_id,
                "filename": doc.filename,
                "expected_hash": original_hash,
                "actual_hash": current_hash,
                "status": "TAMPERING_SUSPECTED",
                "message": "File integrity verification failed! Current file hash does not match original fingerprint.",
            }

        # Successful verification
        await cls._record_integrity_audit(
            db=db,
            document_id=doc.id,
            user_id=user_id,
            action="INTEGRITY_VERIFIED",
            details={
                "sha256_hash": original_hash,
                "status": "VERIFIED",
                "storage_path": storage_path,
            },
        )

        return {
            "verified": True,
            "document_id": doc_id,
            "filename": doc.filename,
            "sha256_hash": original_hash,
            "status": "VERIFIED",
            "message": "File integrity verified successfully. Fingerprint matches original hash.",
        }

    @classmethod
    async def store_original_hash(
        cls,
        db: AsyncSession,
        doc_id: str,
        sha256_hash: str,
    ) -> None:
        """Store or validate the original SHA-256 hash for a document."""
        clean_hash = sha256_hash.strip().lower()
        if not cls.HASH_PATTERN.match(clean_hash):
            raise ValueError(f"Invalid SHA-256 format: {sha256_hash}")

        stmt = select(Document).where(Document.id == doc_id)
        res = await db.execute(stmt)
        doc = res.scalar_one_or_none()
        if not doc:
            raise ValueError(f"Document {doc_id} not found")

        if not doc.sha256_hash:
            doc.sha256_hash = clean_hash
            await db.commit()
            await db.refresh(doc)
        elif doc.sha256_hash.lower() != clean_hash:
            raise ValueError(
                f"Unauthorized modification attempt: existing hash {doc.sha256_hash} does not match {clean_hash}"
            )

    @classmethod
    async def _record_integrity_audit(
        cls,
        db: AsyncSession,
        document_id: str,
        user_id: Optional[str],
        action: str,
        details: Dict[str, Any],
    ) -> None:
        """Helper to create chained audit log for integrity events."""
        # Get latest log entry for previous_hash
        latest_stmt = select(AuditLog).order_by(AuditLog.timestamp.desc(), AuditLog.id.desc()).limit(1)
        latest_res = await db.execute(latest_stmt)
        latest_entry = latest_res.scalars().first()

        prev_hash = latest_entry.current_hash if latest_entry else GENESIS_PREVIOUS_HASH
        ts = utc_now()
        cur_hash = AuditLog.compute_hash(
            previous_hash=prev_hash,
            action=action,
            timestamp=ts,
            user_id=user_id,
            details=details,
        )

        audit_entry = AuditLog(
            previous_hash=prev_hash,
            current_hash=cur_hash,
            action=action,
            timestamp=ts,
            document_id=document_id,
            user_id=user_id,
            details=details,
        )
        db.add(audit_entry)
        await db.commit()
