"""Hidden and invisible text detection engine.
Detects microscopic text, white-on-white camouflaged text, and off-canvas coordinates.
"""

import logging
from typing import Any, Dict, List
import fitz  # PyMuPDF

logger = logging.getLogger("securedoc.hidden_text")


class HiddenTextDetector:
    """Inspects text elements across PDF pages to flag covert adversarial text layers."""

    @classmethod
    def detect_hidden_text(cls, pdf_path: str) -> Dict[str, Any]:
        """Scan all text spans in PDF to find hidden, micro, white-on-white, or off-page text."""
        findings: List[Dict[str, Any]] = []
        total_spans_inspected = 0

        try:
            doc = fitz.open(pdf_path)
            for page_idx in range(len(doc)):
                page = doc[page_idx]
                page_rect = page.rect
                page_w = page_rect.width
                page_h = page_rect.height

                text_dict = page.get_text("dict")
                for block in text_dict.get("blocks", []):
                    if block.get("type") != 0:
                        continue
                    for line in block.get("lines", []):
                        for span in line.get("spans", []):
                            total_spans_inspected += 1
                            text = span.get("text", "").strip()
                            if not text:
                                continue

                            font_size = span.get("size", 10.0)
                            color_int = span.get("color", 0)
                            bbox = span.get("bbox", [0, 0, 0, 0])
                            flags = span.get("flags", 0)
                            x0, y0, x1, y1 = bbox

                            # 1. Microscopic text (< 3pt font size)
                            if font_size < 3.0:
                                findings.append({
                                    "page": page_idx + 1,
                                    "category": "microscopic_text",
                                    "text": text,
                                    "font_size": font_size,
                                    "bbox": bbox,
                                    "severity": "high",
                                    "description": f"Microscopic font size ({font_size:.2f}pt) detected",
                                })

                            # 2. White-on-white / Camouflage text (RGB #FFFFFF == 16777215)
                            if color_int in (16777215, 0xFFFFFF):
                                findings.append({
                                    "page": page_idx + 1,
                                    "category": "white_on_white",
                                    "text": text,
                                    "color": hex(color_int),
                                    "bbox": bbox,
                                    "severity": "critical",
                                    "description": "White-colored text on default white canvas (invisible layer)",
                                })

                            # 3. Off-page canvas text (placed outside page bounding box)
                            if x1 < -5 or y1 < -5 or x0 > (page_w + 5) or y0 > (page_h + 5):
                                findings.append({
                                    "page": page_idx + 1,
                                    "category": "off_canvas_text",
                                    "text": text,
                                    "bbox": bbox,
                                    "page_dimensions": [page_w, page_h],
                                    "severity": "critical",
                                    "description": f"Text rendered outside printable page boundary ({x0:.1f}, {y0:.1f})",
                                })

                            # 4. Zero-width or zero-height collapsed bounding box
                            if abs(x1 - x0) < 0.1 or abs(y1 - y0) < 0.1:
                                findings.append({
                                    "page": page_idx + 1,
                                    "category": "collapsed_box",
                                    "text": text,
                                    "bbox": bbox,
                                    "severity": "medium",
                                    "description": "Text rendered within collapsed zero-area bounding box",
                                })

            doc.close()

        except Exception as e:
            logger.error("Hidden text detection error: %s", str(e))
            return {
                "success": False,
                "error": str(e),
                "has_hidden_text": True,  # Fail-closed
                "findings": [{
                    "category": "inspection_error",
                    "severity": "critical",
                    "description": f"Hidden text inspection failure: {str(e)}",
                }],
            }

        has_critical = any(f["severity"] == "critical" for f in findings)
        has_high = any(f["severity"] == "high" for f in findings)

        return {
            "success": True,
            "total_spans_inspected": total_spans_inspected,
            "hidden_text_found": len(findings) > 0,
            "has_critical_findings": has_critical,
            "has_high_findings": has_high,
            "findings_count": len(findings),
            "findings": findings,
        }
