"""PyMuPDF-based digital text extraction with layout preservation and metadata."""

import logging
from typing import Any, Dict, List
import fitz  # PyMuPDF

logger = logging.getLogger("securedoc.extractor")


class TextExtractor:
    """Extracts digital text layers, layout blocks, spans, and metadata from documents."""

    @classmethod
    def extract_text_and_layout(cls, file_path: str) -> Dict[str, Any]:
        """Extract layout-preserved text, page coordinates, and metadata from PDF."""
        result: Dict[str, Any] = {
            "metadata": {},
            "page_count": 0,
            "full_text": "",
            "pages": [],
        }

        try:
            doc = fitz.open(file_path)
            result["page_count"] = len(doc)
            result["metadata"] = {
                "title": doc.metadata.get("title", ""),
                "author": doc.metadata.get("author", ""),
                "subject": doc.metadata.get("subject", ""),
                "creator": doc.metadata.get("creator", ""),
                "producer": doc.metadata.get("producer", ""),
                "creation_date": doc.metadata.get("creationDate", ""),
                "mod_date": doc.metadata.get("modDate", ""),
                "format": doc.metadata.get("format", ""),
            }

            full_pages_text: List[str] = []

            for page_num in range(len(doc)):
                page = doc[page_num]
                page_text = page.get_text("text")
                full_pages_text.append(page_text)

                text_dict = page.get_text("dict")
                blocks = []

                for b in text_dict.get("blocks", []):
                    if b.get("type") == 0:  # text block
                        lines_data = []
                        for line in b.get("lines", []):
                            spans_data = []
                            for span in line.get("spans", []):
                                spans_data.append({
                                    "text": span.get("text", ""),
                                    "bbox": span.get("bbox", []),
                                    "font": span.get("font", ""),
                                    "size": span.get("size", 0.0),
                                    "color": span.get("color", 0),
                                    "flags": span.get("flags", 0),
                                })
                            lines_data.append({
                                "bbox": line.get("bbox", []),
                                "spans": spans_data,
                            })
                        blocks.append({
                            "bbox": b.get("bbox", []),
                            "lines": lines_data,
                        })

                result["pages"].append({
                    "page_number": page_num + 1,
                    "width": page.rect.width,
                    "height": page.rect.height,
                    "text": page_text,
                    "blocks": blocks,
                })

            result["full_text"] = "\n\n--- PAGE BREAK ---\n\n".join(full_pages_text)
            doc.close()

        except Exception as e:
            logger.error("Text extraction failed for %s: %s", file_path, str(e))
            raise

        return result
