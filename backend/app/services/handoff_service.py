"""Stage 5: Hand-off Service.
Stores and serves single result objects per document:
{ doc_id, filename, security, index, preprocessing, extracted_fields, validation_results, inconsistencies, workflow_decision, timings }
Handles local JSON store persistence, summary metrics, and retrieval.
"""

from datetime import datetime, timezone
import json
import logging
import os
from pathlib import Path
from typing import Any, Dict, List, Optional

logger = logging.getLogger("securedoc.handoff")

HANDOFF_STORE_PATH = Path("a:/vy26/classified_storage/handoff_store.json")


class HandoffService:
    """Manages handoff store, summary counters, and document retrieval."""

    @classmethod
    def _load_store(cls) -> Dict[str, Dict[str, Any]]:
        HANDOFF_STORE_PATH.parent.mkdir(parents=True, exist_ok=True)
        if not HANDOFF_STORE_PATH.exists():
            return {}
        try:
            with open(HANDOFF_STORE_PATH, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            logger.warning("Error reading handoff store: %s", e)
            return {}

    @classmethod
    def _save_store(cls, data: Dict[str, Dict[str, Any]]) -> None:
        HANDOFF_STORE_PATH.parent.mkdir(parents=True, exist_ok=True)
        temp_path = HANDOFF_STORE_PATH.with_suffix(".tmp")
        try:
            with open(temp_path, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2, default=str)
            if os.path.exists(HANDOFF_STORE_PATH):
                os.remove(HANDOFF_STORE_PATH)
            os.rename(temp_path, HANDOFF_STORE_PATH)
        except Exception as e:
            logger.error("Failed to write handoff store: %s", e)
            if temp_path.exists():
                temp_path.unlink()

    @classmethod
    def record_handoff(cls, payload: Dict[str, Any]) -> Dict[str, Any]:
        """Record a single document result object sent from the extension or pipeline."""
        doc_id = payload.get("doc_id")
        if not doc_id:
            raise ValueError("Payload missing required 'doc_id'")

        store = cls._load_store()
        payload["handed_off_at"] = datetime.now(timezone.utc).isoformat()
        store[doc_id] = payload
        cls._save_store(store)
        logger.info("Recorded hand-off for document %s (%s)", doc_id, payload.get("filename"))
        return payload

    @classmethod
    def get_all_handoffs(cls) -> List[Dict[str, Any]]:
        """Return all handed off document results, ordered newest first."""
        store = cls._load_store()
        docs = list(store.values())
        docs.sort(key=lambda d: d.get("handed_off_at", ""), reverse=True)
        return docs

    @classmethod
    def get_handoff(cls, doc_id: str) -> Optional[Dict[str, Any]]:
        """Retrieve a specific document result by ID."""
        store = cls._load_store()
        return store.get(doc_id)

    @classmethod
    def get_summary_stats(cls) -> Dict[str, Any]:
        """Compute summary counters: total, blocked, auto-approved, needs review, escalated, and avg processing time."""
        store = cls._load_store()
        docs = list(store.values())

        total = len(docs)
        blocked = 0
        auto_approved = 0
        needs_review = 0
        escalated = 0
        total_time_ms = 0.0

        for d in docs:
            # Check workflow decision or security status
            decision = (d.get("workflow_decision", {}).get("decision") or "").lower()
            sec_status = (d.get("security", {}).get("status") or "").lower()

            if sec_status == "blocked" or decision == "blocked":
                blocked += 1
            elif decision == "auto_approved":
                auto_approved += 1
            elif decision == "escalate" or decision == "escalated":
                escalated += 1
            else:
                needs_review += 1

            timings = d.get("timings", {})
            total_time_ms += float(timings.get("total_ms", 0.0))

        avg_time_ms = round(total_time_ms / max(1, total), 2)

        return {
            "total_documents": total,
            "blocked": blocked,
            "auto_approved": auto_approved,
            "needs_review": needs_review,
            "escalated": escalated,
            "avg_processing_time_ms": avg_time_ms,
        }

    @classmethod
    def clear_store(cls) -> None:
        """Clear all hand-off results (for fresh demo testing)."""
        cls._save_store({})
