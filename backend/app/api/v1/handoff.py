"""Stage 5 Hand-Off API Router.
Receives, persists, and provides access to processed document results.
Enforces that the demo website only receives and displays what the extension/pipeline sends.
"""

import logging
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, File, Form, HTTPException, UploadFile, status
from pydantic import BaseModel

from app.services.handoff_service import HandoffService
from app.services.pipeline_orchestrator import PipelineOrchestrator

logger = logging.getLogger("securedoc.api.handoff")
router = APIRouter(prefix="/handoff", tags=["Document Pipeline Hand-Off"])


class HandoffPayloadModel(BaseModel):
    doc_id: str
    filename: str
    security: Dict[str, Any]
    index: Dict[str, Any]
    preprocessing: Dict[str, Any]
    extracted_fields: Dict[str, Any]
    validation_results: List[Dict[str, Any]]
    inconsistencies: List[Dict[str, Any]]
    workflow_decision: Dict[str, Any]
    timings: Dict[str, Any]


@router.post("", response_model=Dict[str, Any], status_code=status.HTTP_201_CREATED)
async def receive_handoff(payload: Dict[str, Any]):
    """Receive and persist a single document result object from the extension."""
    try:
        saved = HandoffService.record_handoff(payload)
        return {"status": "success", "message": "Document hand-off stored successfully", "doc_id": saved.get("doc_id")}
    except Exception as e:
        logger.error("Failed to store handoff: %s", e)
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/process-file", response_model=Dict[str, Any])
async def process_and_handoff(
    file: UploadFile = File(...),
    doc_id: Optional[str] = Form(None),
):
    """
    Trigger full 5-stage pipeline for a document uploaded via the extension.
    Stages: Security Gate -> Indexing -> Preprocessing -> AI Agent -> Hand-off.
    """
    import uuid
    from pathlib import Path
    import shutil

    assigned_id = doc_id or str(uuid.uuid4())
    quarantine_dir = Path("a:/vy26/backend/quarantine")
    quarantine_dir.mkdir(parents=True, exist_ok=True)
    stored_path = quarantine_dir / f"{assigned_id}_{file.filename}"

    with open(stored_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    # Run the full pipeline
    result = await PipelineOrchestrator.process_document(
        doc_id=assigned_id,
        file_path=str(stored_path),
        filename=file.filename,
    )

    return result


@router.get("/documents", response_model=Dict[str, Any])
async def list_handoff_documents():
    """Retrieve all handed off documents for the demo website. Returns empty state if none sent."""
    docs = HandoffService.get_all_handoffs()
    summary = HandoffService.get_summary_stats()
    return {
        "count": len(docs),
        "items": docs,
        "summary": summary,
        "is_empty": len(docs) == 0,
    }


@router.get("/documents/{doc_id}", response_model=Dict[str, Any])
async def get_handoff_document(doc_id: str):
    """Retrieve full detail for a single document."""
    doc = HandoffService.get_handoff(doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document hand-off not found")
    return doc


@router.get("/summary", response_model=Dict[str, Any])
async def get_summary_stats():
    """Summary counters: total, blocked, auto-approved, needs review, escalated, avg processing time."""
    return HandoffService.get_summary_stats()


@router.delete("/clear", response_model=Dict[str, Any])
async def clear_handoff_store():
    """Reset the hand-off store for fresh testing."""
    HandoffService.clear_store()
    return {"status": "success", "message": "Handoff store cleared successfully"}
