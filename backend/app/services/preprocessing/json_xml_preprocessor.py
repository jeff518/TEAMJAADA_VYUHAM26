"""JSON and XML Preprocessor.
Validates structural syntax, flattens hierarchical nested objects,
normalizes dictionary keys into lowercase snake_case, and chunks key-value sections.
"""

import json
import logging
import re
import time
import xml.etree.ElementTree as ET
from pathlib import Path
from typing import Any, Dict, List

from app.services.preprocessing.base import BasePreprocessor, PreprocessingChunk, PreprocessingResult

logger = logging.getLogger("securedoc.preprocessing.json_xml")


def to_snake_case(text: str) -> str:
    """Normalize text into lowercase snake_case."""
    s1 = re.sub(r"(.)([A-Z][a-z]+)", r"\1_\2", text)
    s2 = re.sub(r"([a-z0-9])([A-Z])", r"\1_\2", s1).lower()
    return re.sub(r"[^a-z0-9_]+", "_", s2).strip("_")


def flatten_dict(d: Any, parent_key: str = "", sep: str = ".") -> Dict[str, Any]:
    """Recursively flatten nested dictionary or list."""
    items: List[tuple] = []
    if isinstance(d, dict):
        for k, v in d.items():
            new_key = f"{parent_key}{sep}{to_snake_case(str(k))}" if parent_key else to_snake_case(str(k))
            if isinstance(v, (dict, list)):
                items.extend(flatten_dict(v, new_key, sep=sep).items())
            else:
                items.append((new_key, v))
    elif isinstance(d, list):
        for idx, item in enumerate(d):
            new_key = f"{parent_key}[{idx}]"
            if isinstance(item, (dict, list)):
                items.extend(flatten_dict(item, new_key, sep=sep).items())
            else:
                items.append((new_key, item))
    else:
        items.append((parent_key, d))
    return dict(items)


class JsonXmlPreprocessor(BasePreprocessor):
    """Preprocessor for structured JSON and XML payloads."""

    def process(self, doc_id: str, file_path: str, filename: str) -> PreprocessingResult:
        start_time = time.time()
        try:
            p = Path(file_path)
            ext = p.suffix.lower()
            raw_text = p.read_text(encoding="utf-8")
            raw_chars_before = len(raw_text)

            flattened: Dict[str, Any] = {}

            if ext == ".json":
                # Validate JSON syntax
                parsed_json = json.loads(raw_text)
                before_keys = len(parsed_json) if isinstance(parsed_json, (dict, list)) else 1
                flattened = flatten_dict(parsed_json)
                after_keys = len(flattened)
                format_type = "JSON"

            elif ext in (".xml", ".xhtml"):
                # Validate XML syntax
                root = ET.fromstring(raw_text)
                format_type = "XML"

                def etree_to_dict(elem: ET.Element) -> Dict[str, Any]:
                    d: Dict[str, Any] = {}
                    for k, v in elem.attrib.items():
                        d[f"@{k}"] = v
                    children = list(elem)
                    if not children:
                        return elem.text.strip() if elem.text else ""
                    for child in children:
                        child_dict = etree_to_dict(child)
                        tag = to_snake_case(child.tag)
                        if tag in d:
                            if not isinstance(d[tag], list):
                                d[tag] = [d[tag]]
                            d[tag].append(child_dict)
                        else:
                            d[tag] = child_dict
                    return d

                tree_dict = {to_snake_case(root.tag): etree_to_dict(root)}
                before_keys = len(tree_dict)
                flattened = flatten_dict(tree_dict)
                after_keys = len(flattened)

            else:
                raise ValueError(f"Unsupported format: {ext}")

            # Generate Clean Representation & Chunks
            lines = [f"{k}: {v}" for k, v in flattened.items()]
            cleaned_content = "\n".join(lines)
            raw_chars_after = len(cleaned_content)

            # Chunk by groups of 20 fields
            chunks: List[Dict[str, Any]] = []
            chunk_size = 20
            total_chunks = max(1, (len(lines) + chunk_size - 1) // chunk_size)

            for i in range(total_chunks):
                chunk_lines = lines[i * chunk_size : (i + 1) * chunk_size]
                chunk_str = "\n".join(chunk_lines)
                start_f = i * chunk_size + 1
                end_f = min((i + 1) * chunk_size, len(lines))

                chunks.append(
                    PreprocessingChunk(
                        chunk_id=i + 1,
                        text=chunk_str,
                        location=f"fields: {start_f}-{end_f}",
                        char_count=len(chunk_str),
                    ).to_dict()
                )

            duration_ms = (time.time() - start_time) * 1000

            return PreprocessingResult(
                doc_id=doc_id,
                data_type="json_xml",
                cleaned_content=cleaned_content,
                chunks=chunks,
                metadata={
                    "filename": filename,
                    "format": format_type,
                    "normalized_keys_count": after_keys,
                },
                stats={
                    "before_chars": raw_chars_before,
                    "after_chars": raw_chars_after,
                    "before_keys": before_keys,
                    "after_keys": after_keys,
                    "chunks_count": len(chunks),
                },
                status="success",
                processing_time_ms=round(duration_ms, 2),
            )

        except Exception as e:
            logger.error("JSON/XML preprocessing failed for %s: %s", doc_id, e, exc_info=True)
            duration_ms = (time.time() - start_time) * 1000
            return PreprocessingResult(
                doc_id=doc_id,
                data_type="json_xml",
                cleaned_content="",
                status="failed",
                error_message=f"JSON/XML syntax or flattening error: {str(e)}",
                processing_time_ms=round(duration_ms, 2),
            )
