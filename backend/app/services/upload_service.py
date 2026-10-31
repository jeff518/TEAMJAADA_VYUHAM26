"""Upload service handling file quarantine, hashing, duplicate detection, and pipeline trigger."""

import hashlib
import logging
import os
import shutil
import uuid
from pathlib import Path
from typing import BinaryIO, Dict, Optional, Tuple
import aiofiles
from fastapi import UploadFile
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.core.exceptions import DuplicateDocumentException, FileValidationException
from app.models.document import Document, DocumentStatus, SecurityDecision
from app.models.user import User
from app.services.audit_service import AuditService

logger = logging.getLogger("securedoc.upload")
settings = get_settings()


class UploadService:
    """Manages file ingestion into quarantine storage and initiates async processing."""

    @classmethod
    async def save_upload_to_quarantine(
        cls,
        db: AsyncSession,
        upload_file: UploadFile,
        current_user: Optional[User] = None,
        domain: Optional[str] = None,
    ) -> Document:
        """Stream upload file to quarantine directory, compute SHA-256 on the fly, and persist Document record."""
        # Ensure quarantine directory exists
        quarantine_dir = Path(settings.QUARANTINE_DIR).resolve()
        quarantine_dir.mkdir(parents=True, exist_ok=True)

        doc_id = str(uuid.uuid4())
        safe_filename = Path(upload_file.filename or f"doc_{doc_id}.pdf").name
        destination_path = quarantine_dir / f"{doc_id}_{safe_filename}"

        sha256 = hashlib.sha256()
        total_size = 0

        # Stream file to quarantine while computing hash
        async with aiofiles.open(destination_path, "wb") as f_out:
            while chunk := await upload_file.read(65536):
                total_size += len(chunk)
                if total_size > settings.MAX_UPLOAD_SIZE_BYTES:
                    # Cleanup partially saved file
                    try:
                        os.remove(destination_path)
                    except OSError:
                        pass
                    raise FileValidationException(
                        f"File size exceeds limit of {settings.MAX_UPLOAD_SIZE_BYTES} bytes."
                    )
                sha256.update(chunk)
                await f_out.write(chunk)

        file_hash = sha256.hexdigest()

        # Check for duplicate SHA-256 in DB
        stmt = select(Document).where(Document.sha256_hash == file_hash)
        res = await db.execute(stmt)
        existing = res.scalar_one_or_none()

        if existing:
            # Cleanup duplicate file from quarantine
            try:
                os.remove(destination_path)
            except OSError:
                pass
            logger.info(
                "Document with SHA-256 %s already exists (ID: %s). Returning existing record and re-running telemetry.",
                file_hash,
                existing.id,
            )
            # Re-dispatch pipeline to allow real-time re-testing
            cls.dispatch_pipeline_task(existing.id)
            return existing

        # Detect initial MIME
        mime_type = upload_file.content_type or "application/octet-stream"

        # Create Document record
        doc = Document(
            id=doc_id,
            filename=safe_filename,
            storage_path=str(destination_path),
            mime_type=mime_type,
            file_size=total_size,
            sha256_hash=file_hash,
            page_count=0,
            status=DocumentStatus.UPLOADED,
            status_message="File quarantined and awaiting Door 1 scan",
            door1_decision=SecurityDecision.PENDING,
            door2_decision=SecurityDecision.PENDING,
            final_decision=SecurityDecision.PENDING,
            security_metadata={"domain": domain or "CORPORATE"},
            uploaded_by_id=current_user.id if current_user else None,
        )

        db.add(doc)
        await db.commit()
        await db.refresh(doc)

        # Create tamper-evident audit record
        await AuditService.log_action(
            db=db,
            action="DOCUMENT_UPLOAD",
            user_id=current_user.id if current_user else None,
            document_id=doc.id,
            details={
                "filename": safe_filename,
                "file_size": total_size,
                "sha256_hash": file_hash,
                "mime_type": mime_type,
                "quarantine_path": str(destination_path),
            },
        )

        # Trigger Celery pipeline task
        cls.dispatch_pipeline_task(doc.id)

        logger.info("Document %s uploaded and dispatched to pipeline.", doc.id)
        return doc

    @classmethod
    def dispatch_pipeline_task(cls, doc_id: str) -> None:
        """Enqueue pipeline task via Celery if enabled, or run immediate background thread."""
        if settings.CELERY_ENABLED:
            try:
                from app.workers.pipeline_worker import run_document_pipeline
                run_document_pipeline.delay(doc_id)
                logger.info("Celery task dispatched for doc_id=%s", doc_id)
                return
            except Exception as e:
                logger.info("Celery/Redis dispatch skipped (%s); using direct background runner.", str(e))

        # Direct background execution (instant, zero-latency, no Redis dependency)
        import threading
        from app.workers.pipeline_worker import async_execute_pipeline
        def _runner():
            import asyncio
            try:
                asyncio.run(async_execute_pipeline(doc_id))
            except Exception as ex:
                logger.error("Error in direct background pipeline for %s: %s", doc_id, str(ex))

        t = threading.Thread(target=_runner, daemon=True)
        t.start()
        logger.info("Direct background pipeline thread started for doc_id=%s", doc_id)

    @classmethod
    async def handle_chunk_upload(
        cls,
        upload_id: str,
        chunk_index: int,
        total_chunks: int,
        chunk_file: UploadFile,
    ) -> bool:
        """Store chunk file in temporary upload directory and return True when complete."""
        chunk_dir = Path(settings.QUARANTINE_DIR) / "chunks" / upload_id
        chunk_dir.mkdir(parents=True, exist_ok=True)

        chunk_path = chunk_dir / f"chunk_{chunk_index:05d}"
        async with aiofiles.open(chunk_path, "wb") as f_out:
            while data := await chunk_file.read(65536):
                await f_out.write(data)

        # Check if all chunks have been received
        existing_chunks = list(chunk_dir.glob("chunk_*"))
        return len(existing_chunks) == total_chunks

    @classmethod
    async def reassemble_chunks(
        cls,
        db: AsyncSession,
        upload_id: str,
        filename: str,
        total_chunks: int,
        current_user: Optional[User] = None,
    ) -> Document:
        """Reassemble uploaded chunk fragments into single quarantined document file."""
        chunk_dir = Path(settings.QUARANTINE_DIR) / "chunks" / upload_id
        doc_id = str(uuid.uuid4())
        safe_filename = Path(filename).name
        target_path = Path(settings.QUARANTINE_DIR).resolve() / f"{doc_id}_{safe_filename}"

        sha256 = hashlib.sha256()
        total_size = 0

        async with aiofiles.open(target_path, "wb") as f_out:
            for idx in range(total_chunks):
                part_path = chunk_dir / f"chunk_{idx:05d}"
                if not part_path.exists():
                    raise FileValidationException(f"Missing chunk index {idx}")

                async with aiofiles.open(part_path, "rb") as f_in:
                    while chunk := await f_in.read(65536):
                        total_size += len(chunk)
                        sha256.update(chunk)
                        await f_out.write(chunk)

        shutil.rmtree(chunk_dir, ignore_errors=True)
        file_hash = sha256.hexdigest()

        # Check duplicate
        stmt = select(Document).where(Document.sha256_hash == file_hash)
        res = await db.execute(stmt)
        if res.scalar_one_or_none():
            try:
                os.remove(target_path)
            except OSError:
                pass
            raise DuplicateDocumentException(sha256_hash=file_hash)

        doc = Document(
            id=doc_id,
            filename=safe_filename,
            storage_path=str(target_path),
            mime_type="application/pdf",
            file_size=total_size,
            sha256_hash=file_hash,
            page_count=0,
            status=DocumentStatus.UPLOADED,
            status_message="Reassembled chunks; queued for Door 1 scan",
            door1_decision=SecurityDecision.PENDING,
            door2_decision=SecurityDecision.PENDING,
            final_decision=SecurityDecision.PENDING,
            uploaded_by_id=current_user.id if current_user else None,
        )

        db.add(doc)
        await db.commit()
        await db.refresh(doc)

        await AuditService.log_action(
            db=db,
            action="DOCUMENT_CHUNKED_UPLOAD_COMPLETE",
            user_id=current_user.id if current_user else None,
            document_id=doc.id,
            details={"filename": safe_filename, "size": total_size, "hash": file_hash},
        )

        cls.dispatch_pipeline_task(doc.id)
        return doc
