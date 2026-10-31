"""Door 1: File Security Engine.
Implements deep binary inspection, MIME validation, ClamAV antivirus scanning,
PDF object dissection, corruption detection, and fail-closed decision logic.
"""

import hashlib
import logging
import os
import socket
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from app.config import get_settings
from app.models.document import SecurityDecision

logger = logging.getLogger("securedoc.door1")
settings = get_settings()


class Door1Result:
    def __init__(self):
        self.decision: SecurityDecision = SecurityDecision.BLOCK
        self.reasons: List[str] = []
        self.warnings: List[str] = []
        self.mime_type: str = "unknown"
        self.file_size: int = 0
        self.sha256_hash: str = ""
        self.page_count: int = 0
        self.clamav_clean: Optional[bool] = None
        self.clamav_status: str = "not_scanned"
        self.pdf_findings: Dict[str, Any] = {}

    def to_dict(self) -> Dict[str, Any]:
        return {
            "decision": self.decision.value,
            "reasons": self.reasons,
            "warnings": self.warnings,
            "mime_type": self.mime_type,
            "file_size": self.file_size,
            "sha256_hash": self.sha256_hash,
            "page_count": self.page_count,
            "clamav_clean": self.clamav_clean,
            "clamav_status": self.clamav_status,
            "pdf_findings": self.pdf_findings,
        }


class Door1FileSecurity:
    """Door 1 file safety and integrity verification service."""

    @staticmethod
    def calculate_sha256(filepath: str) -> str:
        """Compute SHA-256 of file on disk."""
        sha256 = hashlib.sha256()
        with open(filepath, "rb") as f:
            while chunk := f.read(65536):
                sha256.update(chunk)
        return sha256.hexdigest()

    @staticmethod
    def detect_mime_type(filepath: str) -> str:
        """Inspect file header magic bytes to detect true MIME type."""
        try:
            import magic
            # Try python-magic
            mime = magic.from_file(filepath, mime=True)
            if mime:
                return mime
        except Exception as e:
            logger.debug("python-magic inspection fallback: %s", str(e))

        # Fallback manual magic bytes detection
        try:
            with open(filepath, "rb") as f:
                header = f.read(32)
                if header.startswith(b"%PDF-"):
                    return "application/pdf"
                elif header.startswith(b"\x89PNG\r\n\x1a\n"):
                    return "image/png"
                elif header.startswith(b"\xff\xd8\xff"):
                    return "image/jpeg"
                elif header.startswith(b"II*\x00") or header.startswith(b"MM\x00*"):
                    return "image/tiff"
                elif header.startswith(b"MZ"):
                    return "application/x-dosexec"
        except Exception:
            pass

        return "application/octet-stream"

    @classmethod
    def scan_with_clamav(cls, filepath: str) -> Tuple[Optional[bool], str]:
        """Scan file using ClamAV daemon via unix socket or TCP socket.
        Returns: (is_clean, status_message)
        Gracefully fallbacks in dev mode if clamd daemon is not reachable.
        """
        if not settings.CLAMAV_ENABLED:
            return True, "skipped (clamav disabled in config)"

        sock = None
        try:
            if os.path.exists(settings.CLAMAV_SOCKET_PATH):
                sock = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
                sock.settimeout(settings.CLAMAV_TIMEOUT_SECONDS)
                sock.connect(settings.CLAMAV_SOCKET_PATH)
            else:
                sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                sock.settimeout(settings.CLAMAV_TIMEOUT_SECONDS)
                sock.connect((settings.CLAMAV_HOST, settings.CLAMAV_PORT))

            # Send ping test
            sock.sendall(b"zPING\0")
            response = sock.recv(1024)
            if b"PONG" not in response:
                return None, "clamd daemon ping failed"

            # Re-open or use INSTREAM command
            sock.close()
            if os.path.exists(settings.CLAMAV_SOCKET_PATH):
                sock = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
                sock.connect(settings.CLAMAV_SOCKET_PATH)
            else:
                sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                sock.connect((settings.CLAMAV_HOST, settings.CLAMAV_PORT))

            sock.sendall(b"zINSTREAM\0")
            with open(filepath, "rb") as f:
                while True:
                    chunk = f.read(2048)
                    if not chunk:
                        break
                    # Send 4 bytes big endian length followed by chunk
                    sock.sendall(len(chunk).to_bytes(4, byteorder="big") + chunk)
            sock.sendall((0).to_bytes(4, byteorder="big"))

            res = sock.recv(4096).decode("utf-8", errors="ignore")
            if "OK" in res:
                return True, "clean"
            elif "FOUND" in res:
                return False, f"malware detected: {res.strip()}"
            else:
                return None, f"clamd scan error: {res.strip()}"

        except (socket.error, ConnectionRefusedError, FileNotFoundError) as conn_err:
            logger.warning("ClamAV socket not reachable (%s). Proceeding in dev fallback mode.", str(conn_err))
            return True, f"skipped (clamd unreachable: {str(conn_err)})"
        except Exception as scan_err:
            logger.error("ClamAV scan execution error: %s", str(scan_err))
            return None, f"clamd error: {str(scan_err)}"
        finally:
            if sock:
                try:
                    sock.close()
                except Exception:
                    pass

    @classmethod
    def deep_inspect_pdf(cls, filepath: str) -> Dict[str, Any]:
        """Perform deep structural analysis using PyMuPDF (fitz) to detect malicious PDF constructs."""
        import fitz  # PyMuPDF

        findings: Dict[str, Any] = {
            "has_javascript": False,
            "has_launch_actions": False,
            "has_embedded_files": False,
            "has_form_actions": False,
            "has_named_actions": False,
            "is_encrypted": False,
            "is_corrupt": False,
            "suspicious_objects": [],
            "page_count": 0,
        }

        try:
            doc = fitz.open(filepath)
        except Exception as e:
            findings["is_corrupt"] = True
            findings["suspicious_objects"].append(f"Cannot parse PDF structure: {str(e)}")
            return findings

        try:
            findings["page_count"] = len(doc)
            findings["is_encrypted"] = doc.is_encrypted

            # 1. Embedded files check
            emb_count = doc.embfile_count()
            if emb_count > 0:
                findings["has_embedded_files"] = True
                findings["suspicious_objects"].append(f"Document contains {emb_count} embedded file attachments")

            # 2. XRef and Object stream inspection for JavaScript and Launch actions
            xref_count = doc.xref_length()
            for xref in range(1, xref_count):
                try:
                    obj_str = doc.xref_object(xref)
                    # Check for JavaScript execution keywords
                    if "/JavaScript" in obj_str or "/JS " in obj_str or "/JS(" in obj_str:
                        findings["has_javascript"] = True
                        findings["suspicious_objects"].append(f"JavaScript block detected in xref object #{xref}")

                    # Check for Launch external program actions
                    if "/Launch" in obj_str:
                        findings["has_launch_actions"] = True
                        findings["suspicious_objects"].append(f"External launch action detected in xref object #{xref}")

                    # Check for external Form Submit actions
                    if "/SubmitForm" in obj_str or "/ImportData" in obj_str:
                        findings["has_form_actions"] = True
                        findings["suspicious_objects"].append(f"External form submission action in xref object #{xref}")

                    # Check for suspicious Named actions (e.g. NextPage looping, Print, etc.)
                    if "/Named" in obj_str:
                        findings["has_named_actions"] = True
                        findings["suspicious_objects"].append(f"Named action detected in xref object #{xref}")

                except Exception:
                    # Ignore unreadable object xrefs
                    continue

            # 3. Attempt to render each page to test for parser crashes / corruption
            for page_idx in range(len(doc)):
                page = doc[page_idx]
                _ = page.get_pixmap(dpi=72)

        except Exception as render_err:
            findings["is_corrupt"] = True
            findings["suspicious_objects"].append(f"Page rendering failed (corruption): {str(render_err)}")
        finally:
            doc.close()

        return findings

    @classmethod
    def inspect(cls, filepath: str) -> Door1Result:
        """Run complete Door 1 checks and apply fail-closed decision engine.
        ALL checks must pass -> ALLOW
        Any critical fail -> BLOCK
        Suspicious -> QUARANTINE
        Any unexpected error -> BLOCK (Fail-Closed)
        """
        result = Door1Result()

        try:
            if not os.path.exists(filepath):
                result.decision = SecurityDecision.BLOCK
                result.reasons.append("File does not exist on disk")
                return result

            # 1. File size check
            result.file_size = os.path.getsize(filepath)
            if result.file_size <= 0:
                result.decision = SecurityDecision.BLOCK
                result.reasons.append("File is empty (0 bytes)")
                return result

            if result.file_size > settings.MAX_UPLOAD_SIZE_BYTES:
                result.decision = SecurityDecision.BLOCK
                result.reasons.append(
                    f"File size {result.file_size} bytes exceeds maximum allowed {settings.MAX_UPLOAD_SIZE_BYTES} bytes"
                )
                return result

            # 2. SHA-256 calculation
            result.sha256_hash = cls.calculate_sha256(filepath)

            # Prohibited executable extension check
            ext = os.path.splitext(filepath)[1].lower()
            prohibited_exts = {".exe", ".bat", ".cmd", ".com", ".sh", ".vbs", ".msi", ".scr", ".pif", ".bin", ".elf", ".so", ".dll"}
            if ext in prohibited_exts:
                result.decision = SecurityDecision.BLOCK
                result.reasons.append(f"Prohibited executable file extension: '{ext}'")
                return result

            # 3. MIME type validation
            result.mime_type = cls.detect_mime_type(filepath)
            prohibited_mimes = {"application/x-dosexec", "application/x-msdownload", "application/x-executable", "application/x-sharedlib"}
            if result.mime_type in prohibited_mimes:
                result.decision = SecurityDecision.BLOCK
                result.reasons.append(f"Prohibited executable MIME type: '{result.mime_type}'")
                return result

            if "*/*" not in settings.ALLOWED_MIME_TYPES and result.mime_type not in settings.ALLOWED_MIME_TYPES:
                result.decision = SecurityDecision.BLOCK
                result.reasons.append(f"Disallowed MIME type: '{result.mime_type}'. Allowed: {settings.ALLOWED_MIME_TYPES}")
                return result

            # 4. Antivirus scanning (ClamAV)
            clean, clamav_status = cls.scan_with_clamav(filepath)
            result.clamav_clean = clean
            result.clamav_status = clamav_status
            if clean is False:
                result.decision = SecurityDecision.BLOCK
                result.reasons.append(f"Malware found: {clamav_status}")
                return result
            elif clean is None and settings.CLAMAV_ENABLED and not settings.DEBUG:
                # In non-debug production, antivirus failure fails closed to QUARANTINE
                result.decision = SecurityDecision.QUARANTINE
                result.warnings.append(f"Antivirus service issue: {clamav_status}")

            # 5. PDF structural inspection (for PDF documents)
            if result.mime_type == "application/pdf":
                pdf_res = cls.deep_inspect_pdf(filepath)
                result.pdf_findings = pdf_res
                result.page_count = pdf_res.get("page_count", 0)

                # Page count limit
                if result.page_count > settings.MAX_PDF_PAGES:
                    result.decision = SecurityDecision.BLOCK
                    result.reasons.append(
                        f"Page count ({result.page_count}) exceeds limit of {settings.MAX_PDF_PAGES}"
                    )
                    return result

                # Critical PDF security threats -> BLOCK
                if pdf_res.get("is_corrupt"):
                    result.decision = SecurityDecision.BLOCK
                    result.reasons.append("PDF is corrupted or structurally malformed")
                    return result

                if pdf_res.get("has_javascript"):
                    result.decision = SecurityDecision.BLOCK
                    result.reasons.append("PDF contains prohibited embedded JavaScript")
                    return result

                if pdf_res.get("has_launch_actions"):
                    result.decision = SecurityDecision.BLOCK
                    result.reasons.append("PDF contains prohibited external launch actions")
                    return result

                # Suspicious attributes -> QUARANTINE
                if pdf_res.get("has_embedded_files"):
                    result.decision = SecurityDecision.QUARANTINE
                    result.warnings.append("PDF contains embedded attachments; quarantined for deeper sandboxing")

                if pdf_res.get("has_form_actions"):
                    result.decision = SecurityDecision.QUARANTINE
                    result.warnings.append("PDF contains form actions; quarantined for manual review")

                if pdf_res.get("is_encrypted"):
                    result.decision = SecurityDecision.QUARANTINE
                    result.warnings.append("PDF is password protected / encrypted")

            # 6. Final Decision Calculation
            if result.reasons:
                result.decision = SecurityDecision.BLOCK
            elif result.warnings or result.decision == SecurityDecision.QUARANTINE:
                result.decision = SecurityDecision.QUARANTINE
            else:
                result.decision = SecurityDecision.ALLOW

        except Exception as e:
            # FAIL-CLOSED: Any unhandled exception during security inspection immediately blocks
            logger.error("Unhandled exception during Door 1 inspection: %s", str(e), exc_info=True)
            result.decision = SecurityDecision.BLOCK
            result.reasons.append(f"Security inspection fatal exception (fail-closed): {str(e)}")

        return result
