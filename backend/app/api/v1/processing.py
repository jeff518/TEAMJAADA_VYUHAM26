"""Pipeline processing and inspection API endpoints."""

import asyncio
from typing import Any
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import DocumentNotFoundException
from app.db.session import get_db
from app.dependencies import get_current_active_user
from app.models.document import Document, DocumentStatus
from app.models.user import User
from app.workers.pipeline_worker import async_execute_pipeline, run_document_pipeline

router = APIRouter(prefix="/processing", tags=["Processing Pipeline"])


@router.get("/{doc_id}/status")
async def get_processing_status(
    doc_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """Get the current pipeline execution stage and risk score for a document."""
    stmt = select(Document).where(Document.id == doc_id)
    res = await db.execute(stmt)
    doc = res.scalar_one_or_none()

    if not doc:
        raise DocumentNotFoundException(doc_id)

    return {
        "document_id": doc.id,
        "filename": doc.filename,
        "status": doc.status.value,
        "status_message": doc.status_message,
        "door1_decision": doc.door1_decision.value,
        "door2_decision": doc.door2_decision.value,
        "final_decision": doc.final_decision.value,
        "risk_score": doc.risk_score,
        "page_count": doc.page_count,
        "extracted_text": doc.extracted_text,
        "extracted_data": doc.extracted_data,
        "validation_results": doc.validation_results,
        "match_results": doc.match_results,
        "fraud_results": doc.fraud_results,
        "updated_at": doc.updated_at,
    }


@router.post("/{doc_id}/reprocess")
async def reprocess_document(
    doc_id: str,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """Manually re-trigger full pipeline processing for a document."""
    stmt = select(Document).where(Document.id == doc_id)
    res = await db.execute(stmt)
    doc = res.scalar_one_or_none()

    if not doc:
        raise DocumentNotFoundException(doc_id)

    # Reset status
    doc.status = DocumentStatus.UPLOADED
    doc.status_message = f"Reprocessing triggered by {current_user.username}"
    doc.risk_score = 0
    await db.commit()

    # Try Celery or fallback to FastAPI background task
    try:
        run_document_pipeline.delay(doc.id)
    except Exception:
        # Run in FastAPI background tasks if Celery/Redis is inactive
        background_tasks.add_task(async_execute_pipeline, doc.id)

    return {
        "document_id": doc.id,
        "status": "queued",
        "message": "Document re-queued for processing.",
    }


@router.get("/{doc_id}/results")
async def get_processing_results(
    doc_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """Retrieve full structured results including extraction, validation, matching, and fraud analytics."""
    stmt = select(Document).where(Document.id == doc_id)
    res = await db.execute(stmt)
    doc = res.scalar_one_or_none()

    if not doc:
        raise DocumentNotFoundException(doc_id)

    return {
        "document_id": doc.id,
        "filename": doc.filename,
        "status": doc.status.value,
        "final_decision": doc.final_decision.value,
        "risk_score": doc.risk_score,
        "extracted_data": doc.extracted_data,
        "validation_results": doc.validation_results,
        "match_results": doc.match_results,
        "fraud_results": doc.fraud_results,
        "security_metadata": doc.security_metadata,
    }
