"""Pipeline Orchestrator.
Coordinates the end-to-end flow:
STAGE 1: Security Gate (Door 1 Binary/PDF + Door 2 Security AI)
STAGE 2: Indexing (DocumentIndexer)
STAGE 3: Preprocessing by data type (PreprocessorRegistry)
STAGE 4: AI Agent (Extraction -> Validation -> Inconsistencies -> Workflow Automation)
STAGE 5: Hand-off to Demo Website (HandoffService)
Enforces:
- Stop on security failure and hand-off blocked result.
- Log every stage transition.
- Returns the exact single result object.
"""

from datetime import datetime, timezone
import logging
import os
from pathlib import Path
import time
from typing import Any, Dict, List, Optional

from app.models.document import SecurityDecision
from app.services.agent import (
    DocumentExtractionAgent,
    FieldValidationEngine,
    InconsistencyDetectionEngine,
    WorkflowAutomationEngine,
)
from app.services.handoff_service import HandoffService
from app.services.indexing_service import DocumentIndexer
from app.services.preprocessing import PreprocessorRegistry
from app.services.security.door1_file_security import Door1FileSecurity
from app.services.security.door2_security_ai import Door2SecurityAI

logger = logging.getLogger("securedoc.orchestrator")


class PipelineOrchestrator:
    """End-to-end orchestrator executing stages 1 through 5 and logging every stage transition."""

    @classmethod
    async def process_document(
        cls,
        doc_id: str,
        file_path: str,
        filename: str,
        upload_time: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Execute all stages in sequence and return the unified result object."""
        overall_start = time.time()
        timings: Dict[str, float] = {}
        now_iso = upload_time or datetime.now(timezone.utc).isoformat()
        file_size = os.path.getsize(file_path) if os.path.exists(file_path) else 0
        clean_ext = Path(filename).suffix.lower().lstrip(".")

        logger.info("[PIPELINE START] Document %s (%s, %d bytes)", doc_id, filename, file_size)

        # =========================================================================
        # STAGE 1: Security Gate (Door 1 File Integrity + Door 2 Security AI)
        # =========================================================================
        sec_start = time.time()
        logger.info("[STAGE 1: SECURITY GATE] Initiated for %s", doc_id)

        # Door 1 Inspection
        door1_res = Door1FileSecurity.inspect(file_path)
        is_door1_blocked = door1_res.decision == SecurityDecision.BLOCK
        is_door1_quarantine = door1_res.decision == SecurityDecision.QUARANTINE

        # Read quick text sample for Door 2 if text file or PDF
        sample_text = ""
        try:
            if clean_ext in ("txt", "md", "csv", "json", "xml"):
                sample_text = Path(file_path).read_text(encoding="utf-8", errors="ignore")[:8000]
            elif clean_ext == "pdf":
                import fitz
                with fitz.open(file_path) as pdf_doc:
                    for page in pdf_doc:
                        sample_text += page.get_text("text") or ""
                        if len(sample_text) > 8000:
                            break
        except Exception as e:
            logger.warning("Could not extract preliminary text for Door 2: %s", e)

        door2_res = await Door2SecurityAI.inspect(sample_text)
        is_door2_blocked = door2_res.decision == SecurityDecision.BLOCK
        is_door2_quarantine = door2_res.decision == SecurityDecision.QUARANTINE

        is_security_failed = is_door1_blocked or is_door2_blocked or is_door1_quarantine or is_door2_quarantine
        timings["security_ms"] = round((time.time() - sec_start) * 1000, 2)

        # Record Index entry for Stage 2
        index_status = "quarantined" if is_security_failed else "indexed"
        sec_status_str = "blocked" if is_security_failed else "passed"

        idx_start = time.time()
        index_record = DocumentIndexer.index_document(
            doc_id=doc_id,
            filename=filename,
            file_type=clean_ext,
            size=file_size,
            upload_time=now_iso,
            security_status=sec_status_str,
            index_status=index_status,
        )
        timings["index_ms"] = round((time.time() - idx_start) * 1000, 2)

        # If Security Gate fails, STOP pipeline here, build blocked result, and hand-off to website
        if is_security_failed:
            failure_reasons = []
            if is_door1_blocked or is_door1_quarantine:
                failure_reasons.extend(door1_res.reasons + door1_res.warnings)
            if is_door2_blocked or is_door2_quarantine:
                failure_reasons.extend(door2_res.threats_detected + door2_res.warnings)
            if not failure_reasons:
                failure_reasons.append("Security risk or adversarial payload detected")

            logger.warning("[STAGE 1 BLOCKED] Document %s failed security tests: %s", doc_id, failure_reasons)
            timings["total_ms"] = round((time.time() - overall_start) * 1000, 2)

            blocked_result = {
                "doc_id": doc_id,
                "filename": filename,
                "security": {
                    "status": "blocked",
                    "door1_decision": door1_res.decision.value,
                    "door2_decision": door2_res.decision.value,
                    "reasons": failure_reasons,
                    "risk_score": max(door2_res.risk_score, 100 if is_door1_blocked else 98),
                },
                "index": index_record,
                "preprocessing": {
                    "data_type": clean_ext,
                    "status": "skipped",
                    "chunks_count": 0,
                    "cleaned_content": "",
                    "stats": {"message": "Preprocessing halted by Security Gate 1 fail-closed protection"},
                },
                "extracted_fields": {
                    "document_type": "security_quarantine",
                    "document_summary": "Malicious payload or policy violation neutralized",
                    "fields": {},
                    "line_items": [],
                },
                "validation_results": [
                    {"rule": "security_gate_clearance", "status": "fail", "reason": f"Halted at Security Gate: {'; '.join(failure_reasons)}"}
                ],
                "inconsistencies": [
                    {
                        "id": f"INC-SEC-THREAT-{doc_id[:8]}",
                        "category": "security_threat",
                        "type": "adversarial_payload_or_exploit",
                        "severity": "high",
                        "explanation": f"Security violation detected: {'; '.join(failure_reasons)}",
                        "conflicting_values": {"threats": failure_reasons},
                    }
                ],
                "workflow_decision": {
                    "decision": "blocked",
                    "reason": f"Security Gate violation: {'; '.join(failure_reasons)}",
                    "next_action": "Isolate file into quarantine storage and alert Cyber SOC",
                    "routing_code": "WF-CYBER-CONTAINMENT",
                    "department": "Office of Information Security (OIS) / SOC",
                    "average_confidence": 0.0,
                    "confidence_met": False,
                },
                "timings": timings,
            }

            # Hand-off blocked result to website store
            HandoffService.record_handoff(blocked_result)
            return blocked_result

        logger.info("[STAGE 1 PASSED] Document %s cleared Security Gate.", doc_id)

        # =========================================================================
        # STAGE 3: Preprocessing by Data Type
        # =========================================================================
        prep_start = time.time()
        logger.info("[STAGE 3: PREPROCESSING] Selecting preprocessor for '%s'", clean_ext)
        preprocessor = PreprocessorRegistry.get_preprocessor(clean_ext)
        prep_result = preprocessor.process(doc_id=doc_id, file_path=file_path, filename=filename)
        timings["preprocess_ms"] = round((time.time() - prep_start) * 1000, 2)
        logger.info(
            "[STAGE 3 COMPLETE] Data type: %s, Chunks: %d, Time: %sms",
            prep_result.data_type,
            len(prep_result.chunks),
            timings["preprocess_ms"],
        )

        # =========================================================================
        # STAGE 4a: AI Extraction Agent
        # =========================================================================
        ext_start = time.time()
        logger.info("[STAGE 4a: AI EXTRACTION] Extracting entities for %s", doc_id)
        extracted_data = await DocumentExtractionAgent.extract(
            cleaned_content=prep_result.cleaned_content,
            chunks=prep_result.chunks,
            filename=filename,
            data_type=prep_result.data_type,
        )
        timings["extraction_ms"] = round((time.time() - ext_start) * 1000, 2)
        doc_type = extracted_data.get("document_type", "document")
        logger.info("[STAGE 4a COMPLETE] Detected type: %s in %sms", doc_type, timings["extraction_ms"])

        # =========================================================================
        # STAGE 4b: Field Validation Engine
        # =========================================================================
        val_start = time.time()
        logger.info("[STAGE 4b: VALIDATION] Validating rules for %s (%s)", doc_id, doc_type)
        validation_results = FieldValidationEngine.validate(extracted_data, doc_type)
        timings["validation_ms"] = round((time.time() - val_start) * 1000, 2)
        fails_count = sum(1 for v in validation_results if v.get("status") == "fail")
        warns_count = sum(1 for v in validation_results if v.get("status") == "warn")
        logger.info("[STAGE 4b COMPLETE] Validations: %d passed, %d warns, %d fails", len(validation_results) - (fails_count + warns_count), warns_count, fails_count)

        # =========================================================================
        # STAGE 4c: Inconsistency Detection Engine
        # =========================================================================
        inc_start = time.time()
        logger.info("[STAGE 4c: INCONSISTENCIES] Scanning intra and batch conflicts for %s", doc_id)
        existing_handoffs = HandoffService.get_all_handoffs()
        inconsistencies = InconsistencyDetectionEngine.detect_inconsistencies(
            doc_id=doc_id,
            current_doc_data=extracted_data,
            batch_history=existing_handoffs,
        )
        timings["inconsistency_ms"] = round((time.time() - inc_start) * 1000, 2)
        logger.info("[STAGE 4c COMPLETE] Inconsistencies detected: %d flags", len(inconsistencies))

        # =========================================================================
        # STAGE 4d: Workflow Automation Engine
        # =========================================================================
        wf_start = time.time()
        logger.info("[STAGE 4d: WORKFLOW] Evaluating routing rules for %s", doc_id)
        workflow_decision = WorkflowAutomationEngine.evaluate(
            doc_type=doc_type,
            security_status="passed",
            validation_results=validation_results,
            inconsistencies=inconsistencies,
            extracted_fields=extracted_data,
        )
        timings["workflow_ms"] = round((time.time() - wf_start) * 1000, 2)
        logger.info("[STAGE 4d COMPLETE] Decision: %s -> %s", workflow_decision.get("decision"), workflow_decision.get("next_action"))

        # Compute total pipeline duration
        timings["total_ms"] = round((time.time() - overall_start) * 1000, 2)

        # =========================================================================
        # STAGE 5: Hand-off to Demo Website
        # =========================================================================
        logger.info("[STAGE 5: HAND-OFF] Constructing unified payload for %s", doc_id)
        handoff_payload = {
            "doc_id": doc_id,
            "filename": filename,
            "security": {
                "status": "passed",
                "door1_decision": door1_res.decision.value,
                "door2_decision": door2_res.decision.value,
                "reasons": [],
                "risk_score": max(door2_res.risk_score, 0),
            },
            "index": index_record,
            "preprocessing": prep_result.to_dict(),
            "extracted_fields": extracted_data,
            "validation_results": validation_results,
            "inconsistencies": inconsistencies,
            "workflow_decision": workflow_decision,
            "timings": timings,
        }

        # Store in shared handoff repository
        HandoffService.record_handoff(handoff_payload)
        logger.info("[PIPELINE FINISHED] Document %s successfully processed and handed off in %sms", doc_id, timings["total_ms"])

        return handoff_payload
