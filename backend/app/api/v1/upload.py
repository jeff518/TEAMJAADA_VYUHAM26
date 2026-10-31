"""Upload API endpoints for standard multipart and resumable chunked document ingestion."""

import os
import uuid
from typing import Any, Optional
from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.core.rate_limiter import limiter
from app.db.session import get_db
from app.dependencies import get_current_user
from app.models.document import Document
from app.models.user import User
from app.schemas.upload import (
    ChunkInitRequest,
    ChunkInitResponse,
    UploadResponse,
    UploadStatusResponse,
)
from app.services.upload_service import UploadService

router = APIRouter(prefix="/upload", tags=["Upload"])
settings = get_settings()

# In-memory tracking of active chunk sessions (upload_id -> metadata)
active_chunk_sessions = {}


@router.post("/file", response_model=UploadResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit(settings.RATE_LIMIT_UPLOAD)
async def upload_document(
    request: Request,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user),
) -> Any:
    """Upload a document directly to quarantine storage and enqueue the security processing pipeline."""
    if not file.filename:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No file selected")

    doc = await UploadService.save_upload_to_quarantine(
        db=db,
        upload_file=file,
        current_user=current_user,
    )

    return UploadResponse(
        document_id=doc.id,
        filename=doc.filename,
        file_size=doc.file_size,
        mime_type=doc.mime_type,
        sha256_hash=doc.sha256_hash,
        status=doc.status.value,
        message="Document securely quarantined and queued for Door 1 inspection.",
    )


@router.post("/chunk/init", response_model=ChunkInitResponse)
async def init_chunk_upload(
    chunk_meta: ChunkInitRequest,
    current_user: Optional[User] = Depends(get_current_user),
) -> Any:
    """Initialize a chunked upload session for large documents."""
    upload_id = str(uuid.uuid4())
    active_chunk_sessions[upload_id] = {
        "filename": chunk_meta.filename,
        "total_size": chunk_meta.total_size,
        "total_chunks": chunk_meta.total_chunks,
        "mime_type": chunk_meta.mime_type,
        "user_id": current_user.id if current_user else None,
    }

    return ChunkInitResponse(
        upload_id=upload_id,
        chunk_size=1024 * 1024,  # Recommended 1MB chunks
        total_chunks=chunk_meta.total_chunks,
    )


@router.post("/chunk/upload")
async def upload_chunk(
    upload_id: str = Form(...),
    chunk_index: int = Form(...),
    chunk: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user),
) -> Any:
    """Upload an individual chunk fragment."""
    session = active_chunk_sessions.get(upload_id)
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Chunk upload session '{upload_id}' not found or expired.",
        )

    is_complete = await UploadService.handle_chunk_upload(
        upload_id=upload_id,
        chunk_index=chunk_index,
        total_chunks=session["total_chunks"],
        chunk_file=chunk,
    )

    if is_complete:
        doc = await UploadService.reassemble_chunks(
            db=db,
            upload_id=upload_id,
            filename=session["filename"],
            total_chunks=session["total_chunks"],
            current_user=current_user,
        )
        active_chunk_sessions.pop(upload_id, None)
        return {
            "upload_id": upload_id,
            "status": "complete",
            "document_id": doc.id,
            "message": "All chunks received, reassembled, and dispatched to pipeline.",
        }

    return {
        "upload_id": upload_id,
        "chunk_index": chunk_index,
        "status": "received",
    }


@router.get("/status/{doc_id}", response_model=UploadStatusResponse)
async def get_upload_status(
    doc_id: str,
    db: AsyncSession = Depends(get_db),
) -> Any:
    """Check status of an uploaded document by document ID or upload session ID."""
    stmt = select(Document).where(Document.id == doc_id)
    res = await db.execute(stmt)
    doc = res.scalar_one_or_none()

    if doc:
        return UploadStatusResponse(
            upload_id=doc.id,
            chunks_received=1,
            total_chunks=1,
            is_complete=True,
            document_id=doc.id,
        )

    # Check if still in chunk upload session
    session = active_chunk_sessions.get(doc_id)
    if session:
        chunk_dir = settings.QUARANTINE_DIR / "chunks" / doc_id
        received = len(list(chunk_dir.glob("chunk_*"))) if chunk_dir.exists() else 0
        return UploadStatusResponse(
            upload_id=doc_id,
            chunks_received=received,
            total_chunks=session["total_chunks"],
            is_complete=False,
            document_id=None,
        )

    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Upload record not found")
