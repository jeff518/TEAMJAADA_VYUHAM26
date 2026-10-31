# SecureDoc Pipeline - Backend

Production-quality FastAPI backend for the SecureDoc document security and invoice processing pipeline.

## System Architecture

The pipeline enforces a multi-door, defense-in-depth architecture where every security boundary operates on a **fail-closed** policy:

1. **Door 1 (File Security Engine)**:
   - MIME type validation via magic bytes (`python-magic`)
   - File size & page count thresholds
   - ClamAV antivirus scanning (UNIX/TCP clamd socket with graceful development fallback)
   - SHA-256 deduplication
   - Deep structural PyMuPDF inspection for embedded JavaScript (`/JavaScript`, `/JS`), launch actions (`/Launch`), embedded attachments, form actions, and parser corruption.

2. **Isolated Sandbox Processing**:
   - Docker container execution with `--network none`, memory/CPU caps, temp storage, and unprivileged user.
   - Fallback local subprocess sandboxing in development.
   - Text layout extraction, OCR rendering (`PaddleOCR`), and microscopic/white-on-white/off-canvas hidden text detection.

3. **Door 2 (Security AI Engine)**:
   - Regex detection for prompt injection patterns ("ignore previous instructions", "system prompt", "you are now", base64 payloads, adversarial Unicode marks).
   - Multimodal Gemini AI semantic analysis for covert jailbreaks and social engineering.

4. **Data Extraction & Deterministic Validation**:
   - Multimodal extraction via Google Gemini VLM (`google-genai` SDK) with robust regex fallback.
   - Deterministic verification of dates, tax calculations, line item arithmetic ($qty \times price = amount$), and grand totals.

5. **Three-Way Matching**:
   - Automated reconciliation between Purchase Orders (PO), Goods Receipts, and Invoices.
   - Configurable tolerances for amounts, quantities, and dates with fuzzy vendor matching.

6. **Door 4 (Fraud Detection Engine)**:
   - Benford's Law distribution analysis on leading digits of amounts ($\chi^2$ test).
   - Duplicate vendor/invoice checks.
   - Historical vendor velocity monitoring.
   - Z-score amount anomaly detection ($Z > 3$).
   - Round-number bias detection.

7. **Tamper-Evident Cryptographic Audit Trail**:
   - Each audit entry is chained with SHA-256: `hash = SHA-256(previous_hash + action + timestamp + user_id + details)`.
   - On-demand chain integrity verification detects any database modifications.

---

## Directory Structure

```
backend/
├── app/
│   ├── api/
│   │   └── v1/
│   │       ├── auth.py         # Authentication (JWT, bcrypt, roles)
│   │       ├── upload.py       # Standard and chunked file quarantine upload
│   │       ├── documents.py    # Document management, search, and download
│   │       ├── processing.py   # Pipeline status, reprocess, and results
│   │       ├── approval.py     # Approve, reject, and verify workflow
│   │       ├── audit.py        # Audit trail and chain verification
│   │       ├── dashboard.py    # Analytics metrics and activity feeds
│   │       └── router.py       # Aggregate router
│   ├── core/
│   │   ├── exceptions.py       # Custom exception classes and handlers
│   │   ├── rate_limiter.py     # slowapi rate limiting per IP/user
│   │   └── security.py         # JWT tokens, password hashing, origin checks
│   ├── db/
│   │   └── session.py          # SQLAlchemy 2.0 async session factory
│   ├── models/                 # SQLAlchemy 2.0 models (User, Document, AuditLog, Approval, Matching)
│   ├── schemas/                # Pydantic v2 schemas
│   ├── services/
│   │   ├── security/           # Door 1, Door 2, Door 4 fraud engines
│   │   ├── processing/         # Sandbox, text extractor, OCR, hidden text detector
│   │   ├── extraction/         # VLM extractor, deterministic validator, 3-way matcher
│   │   ├── upload_service.py   # File ingestion and quarantine
│   │   ├── approval_service.py # Workflow transitions
│   │   └── audit_service.py    # Cryptographic hash chain service
│   ├── workers/
│   │   ├── celery_app.py       # Celery configuration
│   │   └── pipeline_worker.py  # 7-stage orchestrator
│   ├── config.py               # Pydantic BaseSettings
│   ├── dependencies.py         # FastAPI dependency injection
│   └── main.py                 # FastAPI application entrypoint
├── alembic/                    # Database migrations
├── sandbox/                    # Sandbox Dockerfile and entrypoint
├── tests/                      # Unit and integration tests
├── Dockerfile                  # Multi-stage production container
└── requirements.txt            # Python dependencies
```

---

## Quickstart

### 1. Install Dependencies
```bash
pip install -r requirements.txt
```

### 2. Environment Configuration
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

### 3. Run Development Server
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```
Interactive API docs are available at `http://localhost:8000/docs`.

### 4. Run Celery Worker (Optional)
```bash
celery -A app.workers.celery_app worker --loglevel=info
```

### 5. Run Tests
```bash
pytest
```
