"""Integration and end-to-end unit tests for DocuPilot AI (Vyuham) master architecture."""

import io
import pytest
from httpx import ASGITransport, AsyncClient
from app.main import app
from app.services.security.hash_service import HashService
from app.schemas.security_ai import SecurityAIResult, SecurityAIStatus


@pytest.mark.asyncio
async def test_hash_service_calculation(tmp_path):
    """Test chunked SHA-256 hash calculation."""
    test_file = tmp_path / "test_doc.txt"
    test_content = b"DocuPilot AI Zero-Trust File Content 2026"
    test_file.write_bytes(test_content)

    calculated = HashService.calculate_sha256(str(test_file))
    bytes_hash = HashService.calculate_bytes_sha256(test_content)

    assert len(calculated) == 64
    assert calculated == bytes_hash


@pytest.mark.asyncio
async def test_dashboard_stats_endpoint():
    """Test /dashboard/stats aggregate endpoint."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.get("/dashboard/stats")
        assert res.status_code == 200
        data = res.json()
        assert "total_documents" in data
        assert "threats_detected" in data
        assert "recent_activity" in data
        assert "duplicate_documents" in data


@pytest.mark.asyncio
async def test_audit_logs_chain_endpoint():
    """Test /audit-logs endpoint and verify cryptographic integrity flag."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.get("/audit-logs?limit=10")
        assert res.status_code == 200
        data = res.json()
        assert "items" in data
        assert "total" in data
        if data["items"]:
            # Every audit log should have verified hash chain
            assert data["items"][0]["hash_verified"] is True


@pytest.mark.asyncio
async def test_document_upload_and_duplicate_flow():
    """Test document upload, SHA-256 generation, and duplicate flag."""
    import uuid
    uid = str(uuid.uuid4())
    content = f"%PDF-1.4 Mock valid document content for testing duplicate detection {uid}".encode()
    file1 = {"file": ("invoice_test_1.pdf", io.BytesIO(content), "application/pdf")}

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # First upload
        res1 = await ac.post("/documents/upload", files=file1)
        assert res1.status_code == 201
        data1 = res1.json()
        assert data1["sha256_hash"] is not None
        assert data1["is_duplicate"] is False
        doc_id_1 = data1["id"]

        # Duplicate upload with identical content
        file2 = {"file": ("invoice_test_2.pdf", io.BytesIO(content), "application/pdf")}
        res2 = await ac.post("/documents/upload", files=file2)
        assert res2.status_code == 201
        data2 = res2.json()
        assert data2["is_duplicate"] is True
        assert data2["duplicate_of"] == doc_id_1


@pytest.mark.asyncio
async def test_integrity_check_endpoint():
    """Test /documents/{id}/integrity verification endpoint."""
    import uuid
    uid = str(uuid.uuid4())
    content = f"%PDF-1.4 Integrity verification target payload {uid}".encode()
    file = {"file": ("integrity_test.pdf", io.BytesIO(content), "application/pdf")}

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        upload_res = await ac.post("/documents/upload", files=file)
        assert upload_res.status_code == 201
        doc_id = upload_res.json()["id"]

        # Verify integrity
        integ_res = await ac.get(f"/documents/{doc_id}/integrity")
        assert integ_res.status_code == 200
        integ_data = integ_res.json()
        assert integ_data["verified"] is True
        assert integ_data["status"] == "VERIFIED"


@pytest.mark.asyncio
async def test_fail_closed_extraction_blocked():
    """Test strict fail-closed enforcement: extract endpoint must reject unverified/blocked documents with 403."""
    with open("A:/vy26/demo_test_files/03_Security_Threat_Prompt_Injection.pdf", "rb") as f:
        content = f.read()
    file = {"file": ("03_Security_Threat_Prompt_Injection.pdf", io.BytesIO(content), "application/pdf")}

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        upload_res = await ac.post("/documents/upload", files=file)
        doc_id = upload_res.json()["id"]

        # Run Gate 1 (passes structural)
        g1_res = await ac.post(f"/documents/{doc_id}/security-scan")
        assert g1_res.status_code == 200

        # Run Gate 2 (must detect injection and BLOCK)
        g2_res = await ac.post(f"/documents/{doc_id}/content-scan")
        assert g2_res.status_code == 200
        g2_data = g2_res.json()
        assert g2_data["status"] == "FAIL"
        assert g2_data["prompt_injection_detected"] is True

        # Now attempt to call Extraction AI on blocked document -> MUST BE REJECTED WITH 403
        extract_res = await ac.post(f"/documents/{doc_id}/extract")
        assert extract_res.status_code == 403
        assert "AI Extraction BLOCKED" in extract_res.json()["detail"]["error"]
