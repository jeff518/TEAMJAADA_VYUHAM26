"""Sandbox entrypoint script.
Runs isolated document extraction and hidden text detection inside an unprivileged sandbox container.
"""

import argparse
import json
import logging
import os
import sys
import traceback
from typing import Any, Dict, List

logging.basicConfig(
    level=logging.INFO,
    format="[%(asctime)s] %(levelname)s in sandbox: %(message)s",
)
logger = logging.getLogger("sandbox")


def extract_document(input_path: str, output_dir: str) -> Dict[str, Any]:
    """Execute text extraction, metadata extraction, hidden text inspection, and OCR."""
    import fitz  # PyMuPDF

    result: Dict[str, Any] = {
        "success": False,
        "filename": os.path.basename(input_path),
        "page_count": 0,
        "metadata": {},
        "pages": [],
        "hidden_text_findings": [],
        "ocr_used": False,
        "full_text": "",
        "errors": [],
    }

    if not os.path.exists(input_path):
        result["errors"].append(f"Input file not found: {input_path}")
        return result

    try:
        doc = fitz.open(input_path)
    except Exception as e:
        result["errors"].append(f"Failed to open document: {str(e)}")
        return result

    try:
        result["page_count"] = len(doc)
        result["metadata"] = {
            "title": doc.metadata.get("title") or "",
            "author": doc.metadata.get("author") or "",
            "subject": doc.metadata.get("subject") or "",
            "creator": doc.metadata.get("creator") or "",
            "producer": doc.metadata.get("producer") or "",
            "creation_date": doc.metadata.get("creationDate") or "",
            "mod_date": doc.metadata.get("modDate") or "",
            "format": doc.metadata.get("format") or "",
            "encryption": doc.is_encrypted,
        }

        full_text_parts: List[str] = []
        hidden_findings: List[Dict[str, Any]] = []
        total_digital_chars = 0

        for page_idx in range(len(doc)):
            page = doc[page_idx]
            rect = page.rect
            page_w, page_h = rect.width, rect.height

            # 1. Digital text extraction with blocks
            text_dict = page.get_text("dict")
            page_text = page.get_text("text")
            full_text_parts.append(page_text)
            total_digital_chars += len(page_text.strip())

            blocks_data = []
            for block in text_dict.get("blocks", []):
                if block.get("type") == 0:  # text block
                    for line in block.get("lines", []):
                        for span in line.get("spans", []):
                            span_text = span.get("text", "").strip()
                            if not span_text:
                                continue

                            font_size = span.get("size", 10.0)
                            color_int = span.get("color", 0)
                            bbox = span.get("bbox", [0, 0, 0, 0])

                            # Detect tiny text (< 3pt)
                            if font_size < 3.0:
                                hidden_findings.append({
                                    "page": page_idx + 1,
                                    "type": "tiny_text",
                                    "text": span_text,
                                    "font_size": font_size,
                                    "bbox": bbox,
                                    "severity": "high",
                                })

                            # Detect white or near-white text (color 16777215 is 0xFFFFFF)
                            if color_int in (16777215, 0xFFFFFF):
                                hidden_findings.append({
                                    "page": page_idx + 1,
                                    "type": "white_on_white_text",
                                    "text": span_text,
                                    "font_size": font_size,
                                    "bbox": bbox,
                                    "severity": "critical",
                                })

                            # Detect text placed outside visible page area
                            x0, y0, x1, y1 = bbox
                            if x1 < 0 or y1 < 0 or x0 > page_w or y0 > page_h:
                                hidden_findings.append({
                                    "page": page_idx + 1,
                                    "type": "off_page_text",
                                    "text": span_text,
                                    "bbox": bbox,
                                    "severity": "critical",
                                })

                            blocks_data.append({
                                "text": span_text,
                                "bbox": bbox,
                                "font_size": font_size,
                                "font": span.get("font", ""),
                                "flags": span.get("flags", 0),
                            })

            result["pages"].append({
                "page_number": page_idx + 1,
                "width": page_w,
                "height": page_h,
                "char_count": len(page_text),
                "text": page_text,
                "spans_count": len(blocks_data),
            })

        result["hidden_text_findings"] = hidden_findings

        # If document has very low digital text density (< 50 chars per page), trigger OCR
        avg_chars_per_page = total_digital_chars / max(1, len(doc))
        if avg_chars_per_page < 50:
            logger.info("Low digital text detected (avg %.1f chars/page). Attempting OCR...", avg_chars_per_page)
            try:
                ocr_results = run_ocr_fallback(doc)
                result["ocr_used"] = True
                result["ocr_results"] = ocr_results
                # Merge OCR text into full text if digital text was empty
                if total_digital_chars < 20:
                    full_text_parts = [p.get("text", "") for p in ocr_results]
            except Exception as ocr_err:
                logger.warning("OCR processing skipped/failed: %s", str(ocr_err))
                result["errors"].append(f"OCR note: {str(ocr_err)}")

        result["full_text"] = "\n\n--- PAGE BREAK ---\n\n".join(full_text_parts)
        result["success"] = True

    except Exception as e:
        logger.error("Error processing document in sandbox: %s", str(e))
        result["errors"].append(f"Processing error: {str(e)}")
        result["errors"].append(traceback.format_exc())
    finally:
        doc.close()

    return result


def run_ocr_fallback(doc: Any) -> List[Dict[str, Any]]:
    """Runs PaddleOCR on rasterized pages when digital text is insufficient."""
    pages_ocr = []
    try:
        from paddleocr import PaddleOCR
        ocr = PaddleOCR(use_angle_cls=True, lang="en", show_log=False)
    except Exception as e:
        logger.info("PaddleOCR not available in environment: %s", str(e))
        return []

    import numpy as np
    from PIL import Image
    import io

    for page_idx in range(len(doc)):
        page = doc[page_idx]
        pix = page.get_pixmap(dpi=200)
        img_bytes = pix.tobytes("png")
        img = Image.open(io.BytesIO(img_bytes)).convert("RGB")
        img_np = np.array(img)

        ocr_res = ocr.ocr(img_np, cls=True)
        page_lines = []
        if ocr_res and ocr_res[0]:
            for line in ocr_res[0]:
                box = line[0]
                text, conf = line[1]
                page_lines.append({
                    "text": text,
                    "confidence": float(conf),
                    "box": box,
                })

        extracted_text = "\n".join([item["text"] for item in page_lines])
        pages_ocr.append({
            "page_number": page_idx + 1,
            "text": extracted_text,
            "line_count": len(page_lines),
            "lines": page_lines,
        })

    return pages_ocr


def main():
    parser = argparse.ArgumentParser(description="Sandbox document processing")
    parser.add_argument("--input", required=True, help="Input document path")
    parser.add_argument("--output", required=True, help="Output JSON path")
    args = parser.parse_args()

    os.makedirs(os.path.dirname(os.path.abspath(args.output)), exist_ok=True)
    res = extract_document(args.input, os.path.dirname(args.output))

    with open(args.output, "w", encoding="utf-8") as f:
        json.dump(res, f, ensure_ascii=False, indent=2)

    logger.info("Sandbox processing completed. Success: %s", res["success"])
    if not res["success"]:
        sys.exit(1)


if __name__ == "__main__":
    main()
