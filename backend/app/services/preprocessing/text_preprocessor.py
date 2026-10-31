"""Text Preprocessor for .txt, .md, .log files.
Normalizes encoding, cleans excess whitespace, strips trailing spaces, and chunks content.
"""

import logging
import re
import time
import unicodedata
from pathlib import Path
from typing import Any, Dict, List

from app.services.preprocessing.base import BasePreprocessor, PreprocessingChunk, PreprocessingResult

logger = logging.getLogger("securedoc.preprocessing.text")


class TextPreprocessor(BasePreprocessor):
    """Preprocessor for plain text, markdown, and unstructured textual documents."""

    def process(self, doc_id: str, file_path: str, filename: str) -> PreprocessingResult:
        start_time = time.time()
        try:
            p = Path(file_path)
            raw_bytes = p.read_bytes()
            before_chars = len(raw_bytes)
            before_lines = raw_bytes.count(b"\n") + 1

            # 1. Normalize Encoding
            text = ""
            for encoding in ("utf-8", "utf-8-sig", "latin-1", "cp1252", "ascii"):
                try:
                    text = raw_bytes.decode(encoding)
                    break
                except UnicodeDecodeError:
                    continue
            if not text:
                text = raw_bytes.decode("utf-8", errors="replace")

            # 2. Normalize Unicode (NFKC) & Clean whitespace
            text = unicodedata.normalize("NFKC", text)
            # Replace carriage returns with standard newlines
            text = text.replace("\r\n", "\n").replace("\r", "\n")
            # Collapse multiple spaces (excluding newlines)
            cleaned_lines = []
            for line in text.split("\n"):
                cleaned_line = re.sub(r"[ \t]+", " ", line).strip()
                cleaned_lines.append(cleaned_line)

            # Collapse 3+ consecutive blank lines to double blank lines
            cleaned_content = re.sub(r"\n{3,}", "\n\n", "\n".join(cleaned_lines)).strip()
            after_chars = len(cleaned_content)
            after_lines = len(cleaned_content.splitlines())

            # 3. Chunking (Paragraph-based with max size 1000 chars)
            raw_chunks = re.split(r"\n\s*\n", cleaned_content)
            chunks: List[Dict[str, Any]] = []
            current_buffer = ""
            chunk_idx = 1

            for paragraph in raw_chunks:
                paragraph = paragraph.strip()
                if not paragraph:
                    continue
                if len(current_buffer) + len(paragraph) + 2 > 1000 and current_buffer:
                    chunks.append(
                        PreprocessingChunk(
                            chunk_id=chunk_idx,
                            text=current_buffer.strip(),
                            location=f"chunk: {chunk_idx}",
                            char_count=len(current_buffer.strip()),
                        ).to_dict()
                    )
                    chunk_idx += 1
                    current_buffer = paragraph
                else:
                    current_buffer = f"{current_buffer}\n\n{paragraph}" if current_buffer else paragraph

            if current_buffer.strip():
                chunks.append(
                    PreprocessingChunk(
                        chunk_id=chunk_idx,
                        text=current_buffer.strip(),
                        location=f"chunk: {chunk_idx}",
                        char_count=len(current_buffer.strip()),
                    ).to_dict()
                )

            duration_ms = (time.time() - start_time) * 1000

            return PreprocessingResult(
                doc_id=doc_id,
                data_type="text",
                cleaned_content=cleaned_content,
                chunks=chunks,
                metadata={
                    "filename": filename,
                    "file_ext": Path(filename).suffix.lower(),
                    "encoding": "utf-8",
                    "paragraphs_count": len(raw_chunks),
                },
                stats={
                    "before_chars": before_chars,
                    "after_chars": after_chars,
                    "before_lines": before_lines,
                    "after_lines": after_lines,
                    "reduction_pct": round((1.0 - (after_chars / max(1, before_chars))) * 100, 2),
                    "chunks_count": len(chunks),
                },
                status="success",
                processing_time_ms=round(duration_ms, 2),
            )

        except Exception as e:
            logger.error("Text preprocessing failed for %s: %s", doc_id, e, exc_info=True)
            duration_ms = (time.time() - start_time) * 1000
            return PreprocessingResult(
                doc_id=doc_id,
                data_type="text",
                cleaned_content="",
                status="failed",
                error_message=f"Text preprocessing error: {str(e)}",
                processing_time_ms=round(duration_ms, 2),
            )
