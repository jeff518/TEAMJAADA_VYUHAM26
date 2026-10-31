"""OCR engine using PaddleOCR and PyMuPDF rendering for scanned documents and images."""

import io
import logging
import os
from typing import Any, Dict, List, Optional
import fitz  # PyMuPDF
import numpy as np
from PIL import Image

logger = logging.getLogger("securedoc.ocr")


class OCREngine:
    """Provides high-accuracy OCR extraction with character/box confidence metrics."""

    _ocr_instance = None

    @classmethod
    def get_ocr(cls):
        """Lazy singleton loader for PaddleOCR model to avoid excessive memory re-initialization."""
        if cls._ocr_instance is None:
            try:
                from paddleocr import PaddleOCR
                cls._ocr_instance = PaddleOCR(use_angle_cls=True, lang="en", show_log=False)
            except Exception as e:
                logger.warning("PaddleOCR initialization warning: %s", str(e))
                cls._ocr_instance = None
        return cls._ocr_instance

    @classmethod
    def pdf_to_page_images(cls, pdf_path: str, dpi: int = 200) -> List[Image.Image]:
        """Convert each PDF page into a high-resolution PIL Image."""
        images = []
        doc = fitz.open(pdf_path)
        try:
            for page_idx in range(len(doc)):
                page = doc[page_idx]
                pix = page.get_pixmap(dpi=dpi)
                img = Image.open(io.BytesIO(pix.tobytes("png"))).convert("RGB")
                images.append(img)
        finally:
            doc.close()
        return images

    @classmethod
    def process_image(cls, image: Image.Image) -> Dict[str, Any]:
        """Run OCR on a PIL Image and extract structured lines, bounding boxes, and confidence."""
        ocr = cls.get_ocr()
        if ocr is None:
            return {"text": "", "lines": [], "confidence": 0.0, "ocr_available": False}

        img_np = np.array(image)
        ocr_result = ocr.ocr(img_np, cls=True)

        lines: List[Dict[str, Any]] = []
        total_conf = 0.0

        if ocr_result and ocr_result[0]:
            for line in ocr_result[0]:
                box = line[0]
                text, conf = line[1]
                lines.append({
                    "text": text,
                    "confidence": float(conf),
                    "box": box,
                })
                total_conf += float(conf)

        avg_conf = (total_conf / len(lines)) if lines else 0.0
        full_text = "\n".join([item["text"] for item in lines])

        return {
            "text": full_text,
            "lines": lines,
            "line_count": len(lines),
            "confidence": round(avg_conf, 3),
            "ocr_available": True,
        }

    @classmethod
    def process_file(cls, file_path: str) -> Dict[str, Any]:
        """Extract OCR text from PDF document or direct image file."""
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"File not found: {file_path}")

        ext = os.path.splitext(file_path)[1].lower()
        pages_result: List[Dict[str, Any]] = []

        if ext == ".pdf":
            images = cls.pdf_to_page_images(file_path)
            for idx, img in enumerate(images):
                res = cls.process_image(img)
                res["page_number"] = idx + 1
                pages_result.append(res)
        else:
            img = Image.open(file_path).convert("RGB")
            res = cls.process_image(img)
            res["page_number"] = 1
            pages_result.append(res)

        full_text = "\n\n--- PAGE BREAK ---\n\n".join([p["text"] for p in pages_result])
        avg_conf = sum([p["confidence"] for p in pages_result]) / max(1, len(pages_result))

        return {
            "full_text": full_text,
            "page_count": len(pages_result),
            "pages": pages_result,
            "overall_confidence": round(avg_conf, 3),
        }
