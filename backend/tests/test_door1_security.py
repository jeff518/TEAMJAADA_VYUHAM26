"""Unit tests for Door 1 file security checks."""

import os
import tempfile
import fitz  # PyMuPDF
import pytest
from app.models.document import SecurityDecision
from app.services.security.door1_file_security import Door1FileSecurity


def test_door1_empty_file_blocked():
    with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as f:
        path = f.name

    try:
        res = Door1FileSecurity.inspect(path)
        assert res.decision == SecurityDecision.BLOCK
        assert any("empty" in r.lower() for r in res.reasons)
    finally:
        if os.path.exists(path):
            os.remove(path)


def test_door1_clean_pdf_allowed():
    with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as f:
        path = f.name

    doc = fitz.open()
    page = doc.new_page(width=612, height=792)
    page.insert_text((50, 50), "Standard Clean Commercial Invoice", fontsize=12)
    doc.save(path)
    doc.close()

    try:
        res = Door1FileSecurity.inspect(path)
        assert res.decision == SecurityDecision.ALLOW
        assert res.mime_type == "application/pdf"
        assert res.page_count == 1
        assert res.sha256_hash != ""
    finally:
        if os.path.exists(path):
            os.remove(path)


def test_door1_prohibited_extension_blocked():
    with tempfile.NamedTemporaryFile(suffix=".exe", delete=False) as f:
        f.write(b"MZ\x90\x00\x03\x00\x00\x00")
        path = f.name

    try:
        res = Door1FileSecurity.inspect(path)
        assert res.decision == SecurityDecision.BLOCK
    finally:
        if os.path.exists(path):
            os.remove(path)
