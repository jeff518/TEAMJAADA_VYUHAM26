"""Preprocessor Registry mapping file extensions and data types to concrete preprocessors."""

import logging
from pathlib import Path
from typing import Dict, Optional

from app.services.preprocessing.base import BasePreprocessor
from app.services.preprocessing.fallback_preprocessor import FallbackPreprocessor
from app.services.preprocessing.image_preprocessor import ImagePreprocessor
from app.services.preprocessing.json_xml_preprocessor import JsonXmlPreprocessor
from app.services.preprocessing.pdf_preprocessor import PdfPreprocessor
from app.services.preprocessing.tabular_preprocessor import TabularPreprocessor
from app.services.preprocessing.text_preprocessor import TextPreprocessor
from app.services.preprocessing.word_preprocessor import WordPreprocessor

logger = logging.getLogger("securedoc.preprocessing.registry")


class PreprocessorRegistry:
    """Factory registry returning the appropriate preprocessor instance."""

    _preprocessors: Dict[str, BasePreprocessor] = {}

    @classmethod
    def _init_registry(cls) -> None:
        if cls._preprocessors:
            return

        text_prep = TextPreprocessor()
        pdf_prep = PdfPreprocessor()
        word_prep = WordPreprocessor()
        tabular_prep = TabularPreprocessor()
        image_prep = ImagePreprocessor()
        json_xml_prep = JsonXmlPreprocessor()

        # Text extensions
        for ext in (".txt", ".md", ".log", ".rtf", ".text"):
            cls._preprocessors[ext] = text_prep

        # PDF extensions
        for ext in (".pdf",):
            cls._preprocessors[ext] = pdf_prep

        # Word extensions
        for ext in (".docx", ".doc"):
            cls._preprocessors[ext] = word_prep

        # Tabular extensions
        for ext in (".csv", ".tsv", ".xlsx", ".xls"):
            cls._preprocessors[ext] = tabular_prep

        # Image extensions
        for ext in (".png", ".jpg", ".jpeg", ".webp", ".bmp", ".tiff", ".tif"):
            cls._preprocessors[ext] = image_prep

        # JSON / XML extensions
        for ext in (".json", ".xml", ".xhtml"):
            cls._preprocessors[ext] = json_xml_prep

    @classmethod
    def get_preprocessor(cls, filename_or_ext: str) -> BasePreprocessor:
        """Retrieve preprocessor for a given file name or extension. Defaults to FallbackPreprocessor."""
        cls._init_registry()
        ext = filename_or_ext.lower().strip()
        if not ext.startswith("."):
            ext_suffix = Path(filename_or_ext).suffix.lower()
            ext = ext_suffix if ext_suffix else f".{ext}"

        return cls._preprocessors.get(ext, FallbackPreprocessor())
