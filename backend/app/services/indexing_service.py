"""Document Indexing Service.
Maintains persistent indexing records for all processed documents according to Stage 2 requirements:
doc_id, filename, file_type, size, upload_time, security_status, and index_status.
"""

import json
import logging
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

logger = logging.getLogger("securedoc.indexing")

INDEX_STORE_PATH = Path("a:/vy26/classified_storage/document_index.json")


class DocumentIndexer:
    """Manages document index catalog with persistence and thread safety."""

    @classmethod
    def _load_store(cls) -> Dict[str, Dict[str, Any]]:
        INDEX_STORE_PATH.parent.mkdir(parents=True, exist_ok=True)
        if not INDEX_STORE_PATH.exists():
            return {}
        try:
            with open(INDEX_STORE_PATH, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            logger.warning("Error reading index store (%s), resetting store: %s", INDEX_STORE_PATH, e)
            return {}

    @classmethod
    def _save_store(cls, data: Dict[str, Dict[str, Any]]) -> None:
        INDEX_STORE_PATH.parent.mkdir(parents=True, exist_ok=True)
        temp_path = INDEX_STORE_PATH.with_suffix(".tmp")
        try:
            with open(temp_path, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2, default=str)
            if os.path.exists(INDEX_STORE_PATH):
                os.remove(INDEX_STORE_PATH)
            os.rename(temp_path, INDEX_STORE_PATH)
        except Exception as e:
            logger.error("Failed to save index store: %s", e)
            if temp_path.exists():
                temp_path.unlink()

    @classmethod
    def index_document(
        cls,
        doc_id: str,
        filename: str,
        file_type: str,
        size: int,
        upload_time: Optional[str] = None,
        security_status: str = "passed",
        index_status: str = "indexed",
        metadata: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Record or update an index entry for a document."""
        store = cls._load_store()

        now_str = upload_time or datetime.now(timezone.utc).isoformat()
        clean_ext = Path(filename).suffix.lower().lstrip(".") or file_type.lower()

        record = {
            "doc_id": doc_id,
            "filename": filename,
            "file_type": clean_ext,
            "size": size,
            "upload_time": now_str,
            "security_status": security_status,
            "index_status": index_status,
            "indexed_at": datetime.now(timezone.utc).isoformat(),
            "metadata": metadata or {},
        }

        store[doc_id] = record
        cls._save_store(store)
        logger.info("Indexed document %s (%s, %s, %d bytes) -> %s", doc_id, filename, clean_ext, size, index_status)
        return record

    @classmethod
    def get_index_record(cls, doc_id: str) -> Optional[Dict[str, Any]]:
        """Retrieve index record for a specific document."""
        store = cls._load_store()
        return store.get(doc_id)

    @classmethod
    def list_index_records(cls, limit: int = 100) -> List[Dict[str, Any]]:
        """List all indexed documents ordered by upload time descending."""
        store = cls._load_store()
        records = list(store.values())
        records.sort(key=lambda r: r.get("upload_time", ""), reverse=True)
        return records[:limit]

    @classmethod
    def update_status(cls, doc_id: str, index_status: str, security_status: Optional[str] = None) -> Optional[Dict[str, Any]]:
        """Update indexing or security status of an existing record."""
        store = cls._load_store()
        if doc_id not in store:
            return None
        store[doc_id]["index_status"] = index_status
        if security_status:
            store[doc_id]["security_status"] = security_status
        store[doc_id]["updated_at"] = datetime.now(timezone.utc).isoformat()
        cls._save_store(store)
        return store[doc_id]

    @classmethod
    def clear_index(cls) -> None:
        """Clear all indexed records (for demo resets)."""
        cls._save_store({})
