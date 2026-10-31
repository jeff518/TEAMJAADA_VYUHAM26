"""Async document processing pipeline orchestrating all security doors and extraction stages."""

import asyncio
import logging
from typing import Any, Dict, Optional
from sqlalchemy import select

from app.db.session import AsyncSessionLocal
from app.models.document import Document, DocumentStatus, SecurityDecision
from app.schemas.extraction import ExtractedInvoiceData
from app.services.audit_service import AuditService
from app.services.security.door1_file_security import Door1FileSecurity
from app.services.security.door2_security_ai import Door2SecurityAI
from app.services.security.door4_fraud_detection import Door4FraudDetection
from app.services.processing.sandbox_manager import SandboxManager
from app.services.processing.hidden_text_detector import HiddenTextDetector
from app.services.extraction.vlm_extractor import VLMExtractor
from app.services.extraction.deterministic_validator import DeterministicValidator
from app.services.extraction.three_way_matcher import ThreeWayMatcher
from app.workers.celery_app import celery_app

logger = logging.getLogger("securedoc.worker")


async def async_execute_pipeline(doc_id: str) -> Dict[str, Any]:
    """Execute full 7-stage security and extraction pipeline asynchronously."""
    async with AsyncSessionLocal() as db:
        stmt = select(Document).where(Document.id == doc_id)
        res = await db.execute(stmt)
        doc = res.scalar_one_or_none()

        if not doc:
            logger.error("Pipeline task aborted: Document %s not found in DB.", doc_id)
            return {"success": False, "error": f"Document {doc_id} not found"}

        logger.info("Starting pipeline execution for document %s (%s)", doc.id, doc.filename)

        try:
            # =========================================================================
            # STAGE 1: Door 1 File Security (MIME, Antivirus, PDF deep structure, limits)
            # =========================================================================
            doc.status = DocumentStatus.DOOR1_SCANNING
            doc.status_message = "Running Door 1 deep binary and structural inspection"
            await db.commit()

            door1_result = Door1FileSecurity.inspect(doc.storage_path)
            doc.door1_decision = door1_result.decision
            doc.mime_type = door1_result.mime_type
            doc.page_count = door1_result.page_count
            doc.file_size = door1_result.file_size
            doc.security_metadata = door1_result.to_dict()

            await AuditService.log_action(
                db=db,
                action="PIPELINE_DOOR1_SCAN",
                document_id=doc.id,
                details=door1_result.to_dict(),
            )

            if door1_result.decision == SecurityDecision.BLOCK:
                doc.status = DocumentStatus.DOOR1_BLOCKED
                doc.final_decision = SecurityDecision.BLOCK
                doc.status_message = f"Door 1 Violation: {'; '.join(door1_result.reasons)}"
                from app.services.classification_service import ClassificationService
                manifest = ClassificationService.classify_and_dispatch(
                    doc_id=doc.id, filename=doc.filename, source_path=doc.storage_path,
                    status=doc.status.value, door1_decision=doc.door1_decision.value,
                    door2_decision=doc.door2_decision.value, final_decision=doc.final_decision.value,
                    status_message=doc.status_message, risk_score=doc.risk_score
                )
                sec_meta = dict(doc.security_metadata or {})
                sec_meta["classification_dispatch"] = manifest
                doc.security_metadata = sec_meta
                from app.services.handoff_service import HandoffService
                from app.services.indexing_service import DocumentIndexer
                idx_rec = DocumentIndexer.index_document(
                    doc_id=doc.id, filename=doc.filename, file_type=doc.mime_type, size=doc.file_size,
                    upload_time=doc.created_at.isoformat() if hasattr(doc, 'created_at') and doc.created_at else None,
                    security_status="blocked", index_status="quarantined"
                )
                HandoffService.record_handoff({
                    "doc_id": doc.id, "filename": doc.filename,
                    "security": {"status": "blocked", "door1_decision": "BLOCK", "reasons": door1_result.reasons, "risk_score": 100},
                    "index": idx_rec, "preprocessing": {"status": "skipped", "data_type": doc.mime_type, "chunks_count": 0, "cleaned_content": ""},
                    "extracted_fields": {"document_type": "security_threat", "fields": {}},
                    "validation_results": [{"rule": "door1_file_security", "status": "fail", "reason": f"Door 1 violation: {'; '.join(door1_result.reasons)}"}],
                    "inconsistencies": [{"category": "security", "severity": "high", "explanation": f"Door 1 file exploit: {'; '.join(door1_result.reasons)}"}],
                    "workflow_decision": {"decision": "blocked", "reason": "Door 1 security violation", "next_action": "Quarantine document and alert Cyber SOC", "routing_code": "WF-CYBER-CONTAINMENT", "department": "Office of Information Security (OIS)"},
                    "timings": {"total_ms": 120.0}
                })
                logger.warning("Pipeline HALTED at Door 1 (BLOCKED) for %s", doc.id)
                return {"success": False, "halted_at": "door1", "decision": "BLOCK"}

            if door1_result.decision == SecurityDecision.QUARANTINE:
                doc.status = DocumentStatus.DOOR1_QUARANTINED
                doc.final_decision = SecurityDecision.QUARANTINE
                doc.status_message = f"Door 1 Suspicious: {'; '.join(door1_result.warnings)}"
                await db.commit()
                logger.warning("Pipeline HALTED at Door 1 (QUARANTINED) for %s", doc.id)
                return {"success": False, "halted_at": "door1", "decision": "QUARANTINE"}

            doc.status = DocumentStatus.DOOR1_PASSED
            doc.status_message = "Door 1 file security passed"
            await db.commit()

            # =========================================================================
            # STAGE 2: Sandboxed Processing & Hidden Text Inspection
            # =========================================================================
            doc.status = DocumentStatus.PROCESSING
            doc.status_message = "Processing document inside isolated sandbox"
            await db.commit()

            sandbox_data = SandboxManager.process_document(doc.storage_path)
            hidden_text_data = HiddenTextDetector.detect_hidden_text(doc.storage_path)

            extracted_text = sandbox_data.get("full_text", "")
            doc.extracted_text = extracted_text

            if sandbox_data.get("page_count"):
                doc.page_count = sandbox_data["page_count"]

            sec_meta = dict(doc.security_metadata or {})
            sec_meta["hidden_text_inspection"] = hidden_text_data
            sec_meta["sandbox_processing"] = {
                "success": sandbox_data.get("success", False),
                "ocr_used": sandbox_data.get("ocr_used", False),
                "errors": sandbox_data.get("errors", []),
            }
            doc.security_metadata = sec_meta

            # If critical invisible/off-canvas text was hidden inside PDF, add risk score
            if hidden_text_data.get("has_critical_findings"):
                doc.risk_score += 35
                doc.status_message = "Critical hidden text layers detected inside sandbox"

            doc.status = DocumentStatus.PROCESSED
            await db.commit()

            await AuditService.log_action(
                db=db,
                action="PIPELINE_SANDBOX_PROCESSED",
                document_id=doc.id,
                details={"ocr_used": sandbox_data.get("ocr_used", False), "hidden_text_findings": hidden_text_data.get("findings_count", 0)},
            )

            # =========================================================================
            # STAGE 3: Door 2 Security AI (Prompt Injection & Adversarial Text Inspection)
            # =========================================================================
            doc.status = DocumentStatus.DOOR2_SCANNING
            doc.status_message = "Running Door 2 AI prompt injection and jailbreak analysis"
            await db.commit()

            door2_result = await Door2SecurityAI.inspect(extracted_text)
            doc.door2_decision = door2_result.decision
            doc.risk_score = max(doc.risk_score, door2_result.risk_score)

            sec_meta = dict(doc.security_metadata or {})
            sec_meta["door2_security_ai"] = door2_result.to_dict()
            doc.security_metadata = sec_meta

            await AuditService.log_action(
                db=db,
                action="PIPELINE_DOOR2_SCAN",
                document_id=doc.id,
                details=door2_result.to_dict(),
            )

            if door2_result.decision == SecurityDecision.BLOCK:
                doc.status = DocumentStatus.DOOR2_BLOCKED
                doc.final_decision = SecurityDecision.BLOCK
                doc.status_message = f"Door 2 Violation: {'; '.join(door2_result.threats_detected)}"
                from app.services.classification_service import ClassificationService
                manifest = ClassificationService.classify_and_dispatch(
                    doc_id=doc.id, filename=doc.filename, source_path=doc.storage_path,
                    status=doc.status.value, door1_decision=doc.door1_decision.value,
                    door2_decision=doc.door2_decision.value, final_decision=doc.final_decision.value,
                    status_message=doc.status_message, risk_score=doc.risk_score
                )
                sec_meta = dict(doc.security_metadata or {})
                sec_meta["classification_dispatch"] = manifest
                doc.security_metadata = sec_meta
                from app.services.handoff_service import HandoffService
                from app.services.indexing_service import DocumentIndexer
                idx_rec = DocumentIndexer.index_document(
                    doc_id=doc.id, filename=doc.filename, file_type=doc.mime_type, size=doc.file_size,
                    upload_time=doc.created_at.isoformat() if hasattr(doc, 'created_at') and doc.created_at else None,
                    security_status="blocked", index_status="quarantined"
                )
                HandoffService.record_handoff({
                    "doc_id": doc.id, "filename": doc.filename,
                    "security": {"status": "blocked", "door2_decision": "BLOCK", "reasons": door2_result.threats_detected, "risk_score": 100},
                    "index": idx_rec, "preprocessing": {"status": "skipped", "data_type": doc.mime_type, "chunks_count": 0, "cleaned_content": ""},
                    "extracted_fields": {"document_type": "security_quarantine", "document_summary": "Malicious prompt injection neutralized", "fields": {}},
                    "validation_results": [{"rule": "door2_prompt_injection", "status": "fail", "reason": f"Door 2 violation: {'; '.join(door2_result.threats_detected)}"}],
                    "inconsistencies": [{"category": "security_threat", "severity": "high", "explanation": f"Adversarial Prompt Injection: {'; '.join(door2_result.threats_detected)}"}],
                    "workflow_decision": {"decision": "blocked", "reason": "Door 2 Prompt Injection / Exploit detected", "next_action": "Quarantine document and isolate host web form", "routing_code": "WF-CYBER-CONTAINMENT", "department": "Office of Information Security (OIS)"},
                    "timings": {"total_ms": 180.0}
                })
                logger.warning("Pipeline HALTED at Door 2 (BLOCKED) for %s", doc.id)
                return {"success": False, "halted_at": "door2", "decision": "BLOCK"}

            if door2_result.decision == SecurityDecision.QUARANTINE:
                doc.status = DocumentStatus.DOOR2_QUARANTINED
                doc.final_decision = SecurityDecision.QUARANTINE
                doc.status_message = f"Door 2 Suspicious: {'; '.join(door2_result.warnings)}"
                await db.commit()
                logger.warning("Pipeline HALTED at Door 2 (QUARANTINED) for %s", doc.id)
                return {"success": False, "halted_at": "door2", "decision": "QUARANTINE"}

            doc.status = DocumentStatus.DOOR2_PASSED
            doc.status_message = "Door 2 AI security passed"
            await db.commit()

            # =========================================================================
            # STAGE 4: Data Extraction (Gemini VLM / Regex Fallback)
            # =========================================================================
            doc.status = DocumentStatus.EXTRACTING
            doc.status_message = "Extracting structured financial entities via VLM"
            await db.commit()

            domain = (doc.security_metadata or {}).get("domain", "CORPORATE")
            invoice_dto: ExtractedInvoiceData = await VLMExtractor.extract(
                doc.storage_path, doc.extracted_text or "", domain=domain
            )
            doc.extracted_data = invoice_dto.model_dump()
            doc.status = DocumentStatus.EXTRACTED
            await db.commit()

            await AuditService.log_action(
                db=db,
                action="PIPELINE_DATA_EXTRACTED",
                document_id=doc.id,
                details={
                    "vendor": invoice_dto.vendor_name,
                    "invoice_number": invoice_dto.invoice_number,
                    "total_amount": invoice_dto.total_amount,
                },
            )

            # =========================================================================
            # STAGE 5: Deterministic Validation (Math, Dates, Line Items)
            # =========================================================================
            doc.status = DocumentStatus.VALIDATING
            doc.status_message = "Running deterministic mathematical and rule-based validation"
            await db.commit()

            validation_report = DeterministicValidator.validate(invoice_dto)
            doc.validation_results = validation_report.model_dump()

            if not validation_report.is_valid:
                doc.risk_score = min(100, doc.risk_score + (10 * validation_report.failed_checks))

            doc.status = DocumentStatus.VALIDATED
            await db.commit()

            await AuditService.log_action(
                db=db,
                action="PIPELINE_DATA_VALIDATED",
                document_id=doc.id,
                details={
                    "is_valid": validation_report.is_valid,
                    "failed_checks": validation_report.failed_checks,
                },
            )

            # =========================================================================
            # STAGE 6: Three-Way Matching (PO ↔ Receipt ↔ Invoice)
            # =========================================================================
            doc.status = DocumentStatus.MATCHING
            doc.status_message = "Performing three-way matching reconciliation"
            await db.commit()

            match_report = await ThreeWayMatcher.match(db, doc.id, invoice_dto)
            doc.match_results = match_report.model_dump()
            doc.status = DocumentStatus.MATCHED
            await db.commit()

            await AuditService.log_action(
                db=db,
                action="PIPELINE_THREE_WAY_MATCHED",
                document_id=doc.id,
                details={
                    "match_status": match_report.status.value,
                    "match_score": match_report.overall_score,
                    "discrepancies_count": len(match_report.discrepancies),
                },
            )

            # =========================================================================
            # STAGE 7: Fraud Detection (Door 4 - Benford, Z-Score, Duplicate, Velocity)
            # =========================================================================
            doc.status = DocumentStatus.FRAUD_CHECKING
            doc.status_message = "Running statistical fraud detection algorithms"
            await db.commit()

            fraud_result = await Door4FraudDetection.analyze(db, doc.extracted_data or {}, doc.id)
            doc.fraud_results = fraud_result.to_dict()
            doc.risk_score = min(100, max(doc.risk_score, fraud_result.risk_score))

            await AuditService.log_action(
                db=db,
                action="PIPELINE_FRAUD_ANALYZED",
                document_id=doc.id,
                details=fraud_result.to_dict(),
            )

            # Final disposition assessment
            if fraud_result.is_flagged or fraud_result.decision == "BLOCK":
                doc.status = DocumentStatus.FRAUD_FLAGGED
                doc.final_decision = SecurityDecision.BLOCK if fraud_result.decision == "BLOCK" else SecurityDecision.QUARANTINE
                doc.status_message = f"Fraud Alert: {'; '.join(fraud_result.reasons + fraud_result.warnings)}"
            else:
                doc.status = DocumentStatus.READY_FOR_APPROVAL
                doc.final_decision = SecurityDecision.ALLOW
                doc.status_message = "Pipeline successfully completed. Ready for reviewer approval."

            # Automatically classify, archive, and dispatch to destination folder
            from app.services.classification_service import ClassificationService
            manifest = ClassificationService.classify_and_dispatch(
                doc_id=doc.id,
                filename=doc.filename,
                source_path=doc.storage_path,
                status=doc.status.value,
                door1_decision=doc.door1_decision.value,
                door2_decision=doc.door2_decision.value,
                final_decision=doc.final_decision.value,
                vlm_data=doc.extracted_data or {},
                dte_validation=doc.validation_results or {},
                three_way_match=doc.match_results or {},
                status_message=doc.status_message,
                risk_score=doc.risk_score,
            )
            sec_meta = dict(doc.security_metadata or {})
            sec_meta["classification_dispatch"] = manifest
            doc.security_metadata = sec_meta

            # Record Stage 5 handoff
            from app.services.handoff_service import HandoffService
            from app.services.indexing_service import DocumentIndexer
            from app.services.agent import WorkflowAutomationEngine, InconsistencyDetectionEngine
            idx_rec = DocumentIndexer.index_document(
                doc_id=doc.id, filename=doc.filename, file_type=doc.mime_type, size=doc.file_size,
                upload_time=doc.created_at.isoformat() if hasattr(doc, 'created_at') and doc.created_at else None,
                security_status="passed", index_status="indexed"
            )
            ext_data = doc.extracted_data or {}
            val_results = doc.validation_results or []
            if isinstance(val_results, dict):
                val_results = val_results.get("checks", [])
            inconsistencies = InconsistencyDetectionEngine.detect_inconsistencies(doc.id, ext_data, HandoffService.get_all_handoffs())
            wf_decision = WorkflowAutomationEngine.evaluate(
                doc_type=ext_data.get("document_type", "invoice"),
                security_status="passed",
                validation_results=val_results,
                inconsistencies=inconsistencies,
                extracted_fields=ext_data
            )
            handoff_payload = {
                "doc_id": doc.id,
                "filename": doc.filename,
                "security": {"status": "passed", "risk_score": doc.risk_score, "reasons": []},
                "index": idx_rec,
                "preprocessing": {"data_type": doc.mime_type, "status": "success", "chunks_count": max(1, doc.page_count)},
                "extracted_fields": ext_data,
                "validation_results": val_results,
                "inconsistencies": inconsistencies,
                "workflow_decision": wf_decision,
                "timings": {"total_ms": 650.0}
            }
            HandoffService.record_handoff(handoff_payload)

            await db.commit()
            logger.info("Pipeline completed successfully for document %s with status=%s", doc.id, doc.status.value)
            return {"success": True, "status": doc.status.value, "final_decision": doc.final_decision.value}

        except Exception as e:
            # FAIL-CLOSED: Fail closed on any unhandled crash during pipeline execution
            logger.error("Pipeline crashed during processing for %s: %s", doc_id, str(e), exc_info=True)
            doc.status = DocumentStatus.FAILED
            doc.final_decision = SecurityDecision.BLOCK
            doc.status_message = f"Pipeline execution failed (fail-closed): {str(e)}"
            await db.commit()

            await AuditService.log_action(
                db=db,
                action="PIPELINE_FAILURE",
                document_id=doc.id,
                details={"error": str(e)},
            )
            return {"success": False, "error": str(e)}


@celery_app.task(name="run_document_pipeline", bind=True)
def run_document_pipeline(self, doc_id: str):
    """Celery task entrypoint running async pipeline synchronously inside worker."""
    logger.info("Celery task run_document_pipeline picked up for doc_id=%s", doc_id)
    return asyncio.run(async_execute_pipeline(doc_id))
