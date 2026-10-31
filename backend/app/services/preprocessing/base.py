"""Base Preprocessor Interface and Standard Preprocessing Result Schema.
Every preprocessor returns:
doc_id, data_type, cleaned_content, chunks, metadata, and stats (before/after counts and processing time).
Catches errors and returns a failed or skipped status without crashing the pipeline.
"""

from abc import ABC, abstractmethod
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
import time
from typing import Any, Dict, List, Optional


@dataclass
class PreprocessingChunk:
    chunk_id: int
    text: str
    location: str  # e.g., "page: 1", "chunk: 2", "section: Executive Summary"
    char_count: int = 0
    token_count_est: int = 0

    def to_dict(self) -> Dict[str, Any]:
        return {
            "chunk_id": self.chunk_id,
            "text": self.text,
            "location": self.location,
            "char_count": self.char_count or len(self.text),
            "token_count_est": self.token_count_est or max(1, len(self.text) // 4),
        }


@dataclass
class PreprocessingResult:
    doc_id: str
    data_type: str  # text, pdf, word, tabular, image, json_xml, unsupported
    cleaned_content: str
    chunks: List[Dict[str, Any]] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)
    stats: Dict[str, Any] = field(default_factory=dict)
    status: str = "success"  # "success", "skipped", "failed"
    error_message: Optional[str] = None
    processing_time_ms: float = 0.0

    def to_dict(self) -> Dict[str, Any]:
        return {
            "doc_id": self.doc_id,
            "data_type": self.data_type,
            "cleaned_content": self.cleaned_content,
            "chunks": self.chunks,
            "metadata": self.metadata,
            "stats": self.stats,
            "status": self.status,
            "error_message": self.error_message,
            "processing_time_ms": self.processing_time_ms,
        }


class BasePreprocessor(ABC):
    """Abstract base class for all data-type specific preprocessors."""

    @abstractmethod
    def process(self, doc_id: str, file_path: str, filename: str) -> PreprocessingResult:
        """Execute preprocessor logic on the target file."""
        pass
