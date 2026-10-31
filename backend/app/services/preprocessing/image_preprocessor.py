"""Image Preprocessor.
Handles raster and scan images (.png, .jpg, .jpeg, .webp, .tiff).
Applies dimension resizing, grayscale normalization, contrast optimization,
runs Tesseract OCR, and chunks extracted text blocks.
"""

import logging
import re
import time
from pathlib import Path
from typing import Any, Dict, List
from PIL import Image, ImageEnhance, ImageOps
import pytesseract

from app.services.preprocessing.base import BasePreprocessor, PreprocessingChunk, PreprocessingResult

logger = logging.getLogger("securedoc.preprocessing.image")


class ImagePreprocessor(BasePreprocessor):
    """Preprocessor for image files applying computer vision prep and OCR."""

    def process(self, doc_id: str, file_path: str, filename: str) -> PreprocessingResult:
        start_time = time.time()
        try:
            with Image.open(file_path) as raw_img:
                raw_img.load()
                before_w, before_h = raw_img.size
                orig_format = raw_img.format or Path(filename).suffix.upper().lstrip(".")

                # 1. Resize if image exceeds max dimension (e.g. > 2000px) while maintaining aspect ratio
                max_dim = 2000
                img = raw_img.copy()
                if before_w > max_dim or before_h > max_dim:
                    img.thumbnail((max_dim, max_dim), Image.Resampling.LANCZOS)
                after_w, after_h = img.size

                # 2. Normalize (convert to Grayscale + Enhance Contrast)
                gray_img = ImageOps.grayscale(img)
                enhancer = ImageEnhance.Contrast(gray_img)
                normalized_img = enhancer.enhance(1.6)

                # 3. OCR Text Extraction
                ocr_text = pytesseract.image_to_string(normalized_img)
                cleaned_lines = [line.strip() for line in ocr_text.splitlines() if line.strip()]
                cleaned_content = "\n".join(cleaned_lines)

                # 4. Chunking (group lines by paragraphs/blocks)
                chunks: List[Dict[str, Any]] = []
                raw_blocks = re.split(r"\n\s*\n", cleaned_content)
                chunk_idx = 1
                for block in raw_blocks:
                    block_clean = block.strip()
                    if block_clean:
                        chunks.append(
                            PreprocessingChunk(
                                chunk_id=chunk_idx,
                                text=block_clean,
                                location=f"block: {chunk_idx}",
                                char_count=len(block_clean),
                            ).to_dict()
                        )
                        chunk_idx += 1

                if not chunks and cleaned_content:
                    chunks.append(
                        PreprocessingChunk(
                            chunk_id=1,
                            text=cleaned_content,
                            location="block: 1",
                            char_count=len(cleaned_content),
                        ).to_dict()
                    )

                duration_ms = (time.time() - start_time) * 1000

                return PreprocessingResult(
                    doc_id=doc_id,
                    data_type="image",
                    cleaned_content=cleaned_content,
                    chunks=chunks,
                    metadata={
                        "filename": filename,
                        "format": orig_format,
                        "original_dimensions": f"{before_w}x{before_h}",
                        "normalized_dimensions": f"{after_w}x{after_h}",
                        "ocr_engine": "tesseract",
                    },
                    stats={
                        "before_dimensions": [before_w, before_h],
                        "after_dimensions": [after_w, after_h],
                        "ocr_chars_count": len(cleaned_content),
                        "chunks_count": len(chunks),
                    },
                    status="success",
                    processing_time_ms=round(duration_ms, 2),
                )

        except Exception as e:
            logger.error("Image preprocessing failed for %s: %s", doc_id, e, exc_info=True)
            duration_ms = (time.time() - start_time) * 1000
            return PreprocessingResult(
                doc_id=doc_id,
                data_type="image",
                cleaned_content="",
                status="failed",
                error_message=f"Image preprocessing error: {str(e)}",
                processing_time_ms=round(duration_ms, 2),
            )
