"""PDF Preprocessor.
Extracts text and metadata with PyMuPDF (fitz), applies OCR to scanned/image-only pages,
normalizes formatting, and chunks content per page.
"""

import io
import logging
import time
from pathlib import Path
from typing import Any, Dict, List
import fitz  # PyMuPDF
from PIL import Image
import pytesseract

from app.services.preprocessing.base import BasePreprocessor, PreprocessingChunk, PreprocessingResult

logger = logging.getLogger("securedoc.preprocessing.pdf")


class PdfPreprocessor(BasePreprocessor):
    """Preprocessor for PDF documents supporting selectable text and OCR fallback."""

    def process(self, doc_id: str, file_path: str, filename: str) -> PreprocessingResult:
        start_time = time.time()
        doc = None
        try:
            doc = fitz.open(file_path)
            page_count = len(doc)
            meta = doc.metadata or {}

            raw_chars_before = 0
            page_chunks: List[Dict[str, Any]] = []
            full_cleaned_pages: List[str] = []
            scanned_pages_count = 0

            for page_idx in range(page_count):
                page_num = page_idx + 1
                page = doc.load_page(page_idx)

                # Extract selectable text
                page_text = page.get_text("text") or ""
                raw_chars_before += len(page_text)

                # Determine if page is scanned/image-only (< 35 non-space characters)
                cleaned_page_text = page_text.strip()
                if len(cleaned_page_text) < 35:
                    # Attempt OCR on page pixmap
                    try:
                        pix = page.get_pixmap(dpi=150)
                        img_bytes = pix.tobytes("png")
                        img = Image.open(io.BytesIO(img_bytes))
                        ocr_text = pytesseract.image_to_string(img)
                        if len(ocr_text.strip()) > len(cleaned_page_text):
                            cleaned_page_text = ocr_text.strip()
                            scanned_pages_count += 1
                    except Exception as ocr_err:
                        logger.warning("OCR fallback failed on page %d of %s: %s", page_num, filename, ocr_err)

                # Clean whitespace inside page
                normalized_lines = [line.strip() for line in cleaned_page_text.splitlines() if line.strip()]
                page_cleaned = "\n".join(normalized_lines)

                if page_cleaned:
                    full_cleaned_pages.append(f"--- [Page {page_num}] ---\n{page_cleaned}")
                    page_chunks.append(
                        PreprocessingChunk(
                            chunk_id=page_num,
                            text=page_cleaned,
                            location=f"page: {page_num}",
                            char_count=len(page_cleaned),
                        ).to_dict()
                    )

            cleaned_content = "\n\n".join(full_cleaned_pages)
            raw_chars_after = len(cleaned_content)
            duration_ms = (time.time() - start_time) * 1000

            return PreprocessingResult(
                doc_id=doc_id,
                data_type="pdf",
                cleaned_content=cleaned_content,
                chunks=page_chunks,
                metadata={
                    "filename": filename,
                    "page_count": page_count,
                    "title": meta.get("title") or "",
                    "author": meta.get("author") or "",
                    "producer": meta.get("producer") or "",
                    "creation_date": meta.get("creationDate") or "",
                    "is_encrypted": doc.is_encrypted,
                    "scanned_pages_ocr": scanned_pages_count,
                },
                stats={
                    "before_chars": raw_chars_before,
                    "after_chars": raw_chars_after,
                    "page_count": page_count,
                    "chunks_count": len(page_chunks),
                    "scanned_pages": scanned_pages_count,
                },
                status="success",
                processing_time_ms=round(duration_ms, 2),
            )

        except Exception as e:
            logger.error("PDF preprocessing failed for %s: %s", doc_id, e, exc_info=True)
            duration_ms = (time.time() - start_time) * 1000
            return PreprocessingResult(
                doc_id=doc_id,
                data_type="pdf",
                cleaned_content="",
                status="failed",
                error_message=f"PDF preprocessing error: {str(e)}",
                processing_time_ms=round(duration_ms, 2),
            )
        finally:
            if doc:
                doc.close()
