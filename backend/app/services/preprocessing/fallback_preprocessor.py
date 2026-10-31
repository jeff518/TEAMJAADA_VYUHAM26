"""Fallback Preprocessor for unsupported document types.
Safely marks the document as skipped with a descriptive reason without ever crashing the pipeline.
"""

import logging
import time
from pathlib import Path

from app.services.preprocessing.base import BasePreprocessor, PreprocessingResult

logger = logging.getLogger("securedoc.preprocessing.fallback")


class FallbackPreprocessor(BasePreprocessor):
    """Graceful fallback handler for unsupported or unknown binary file extensions."""

    def process(self, doc_id: str, file_path: str, filename: str) -> PreprocessingResult:
        start_time = time.time()
        ext = Path(filename).suffix.lower()

        logger.info("Unsupported document type '%s' for %s. Skipping preprocessing safely.", ext, doc_id)
        duration_ms = (time.time() - start_time) * 1000

        return PreprocessingResult(
            doc_id=doc_id,
            data_type="unsupported",
            cleaned_content="",
            chunks=[],
            metadata={
                "filename": filename,
                "file_ext": ext,
                "reason": f"File extension '{ext}' has no registered preprocessor",
            },
            stats={
                "before_chars": 0,
                "after_chars": 0,
                "chunks_count": 0,
            },
            status="skipped",
            error_message=f"Preprocessing skipped: unsupported document format '{ext}'",
            processing_time_ms=round(duration_ms, 2),
        )
