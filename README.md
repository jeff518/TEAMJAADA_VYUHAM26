# 🛡️ SecureDoc Pipeline

> **Zero-Trust Document Ingestion, Antivirus Inspection & Automated Three-Way Invoice Processing Platform**

SecureDoc Pipeline is an enterprise-grade document processing and validation system designed with a **Zero-Trust Multi-Door Architecture**. It isolates untrusted uploads, scans for advanced malware and executable disguise techniques, extracts financial entities using multimodal vision models, verifies purchase orders via three-way matching, detects wire transfer fraud, and registers every state change in a tamper-evident SHA-256 cryptographic hash chain.

---

## 🏗️ Architecture Overview

```text
                                  [ Untrusted Ingestion Sources ]
                                 /               |               \
                        Web Dashboard    Chrome Extension     REST API
                                 \               |               /
                                  ▼              ▼              ▼
                       +---------------------------------------------------+
                       |         FastAPI Gateway & Ingestion Proxy         |
                       +---------------------------------------------------+
                                                 |
                                                 ▼
      +-------------------------------------------------------------------------------------+
      |                              ZERO-TRUST SECURITY GATES                              |
      |                                                                                     |
      |   [ DOOR 1: Antivirus & Format ] ──► [ SANDBOX QUARANTINE ] ──► [ DOOR 2: Script ]  |
      |   • Magic bytes signature check      • Ephemeral container      • PDF syntax checks |
      |   • MIME type discrepancy check        isolation execution      • Macro & JS scan   |
      |   • ClamAV malware daemon scan       • Strip malicious objects  • Obfuscated stream |
      |                                                                                     |
      |                                          │                                          |
      |                                          ▼                                          |
      |   [ DOOR 4: Matching & Fraud ]   ◄── [ DOOR 3: Post-Extract ] ◄── [ EXTRACTION ]    |
      |   • 3-Way Match: PO vs Invoice vs GRN • Prompt injection guard  • Gemini 1.5 Pro   |
      |   • Bank IBAN divergence detector    • Hallucination entropy     Multimodal Vision  |
      |   • Duplicate transaction guard      • Mandatory field schema   • Neural OCR engine |
      +-------------------------------------------------------------------------------------+
                                                 │
                                                 ▼
                       +---------------------------------------------------+
                       |             Policy & Approval Router              |
                       +---------------------------------------------------+
                                    /                     \
                      Clean & Matched (STP)         Quarantine / Mismatch
                                  │                               │
                                  ▼                               ▼
                         [ AUTO-APPROVAL ]             [ HUMAN-IN-THE-LOOP ]
                                  │                               │
                                  └───────────────┬───────────────┘
                                                  ▼
                       +---------------------------------------------------+
                       |     Immutable SHA-256 Cryptographic Hash Chain    |
                       +---------------------------------------------------+
                                                  │
                                                  ▼
                       +---------------------------------------------------+
                       |         PostgreSQL 16 & Redis Celery Queue        |
                       +---------------------------------------------------+
```

---

## ⚡ Quick Start

### Prerequisites
- [Docker](https://docs.docker.com/get-docker/) & [Docker Compose](https://docs.docker.com/compose/) (v2.20+)
- Node.js 20+ (for local frontend development)
- Python 3.11+ (for local backend development)

### Launch Cluster in 60 Seconds
```bash
# 1. Clone the repository
git clone https://github.com/securedoc/securedoc-pipeline.git
cd securedoc-pipeline

# 2. Copy the environment configuration
cp .env.example .env

# 3. Spin up all 6 microservices
docker compose up -d
```

### Access Services
| Component | URL | Description |
| :--- | :--- | :--- |
| **Web Dashboard** | `http://localhost:3000` | React + TypeScript + Tailwind UI |
| **Backend API** | `http://localhost:8000` | FastAPI Gateway |
| **Interactive Docs** | `http://localhost:8000/docs` | Swagger / OpenAPI Explorer |
| **ClamAV Engine** | `localhost:3310` | Antivirus Scanning Daemon |
| **PostgreSQL 16** | `localhost:5432` | Relational Storage & Master Ledger |
| **Redis 7** | `localhost:6379` | Celery Broker & Rate Limiting |

---

## 🧩 Browser Extension Installation

SecureDoc includes a zero-friction browser extension for Google Chrome and Chromium-based browsers:

1. Open your browser and navigate to `chrome://extensions/`.
2. Toggle **Developer mode** in the top-right corner.
3. Click **Load unpacked**.
4. Select the `extension/` directory from this repository.
5. Click the **SecureDoc Shield** icon in your toolbar, authenticate with your API token, and drag-and-drop any invoice on web pages directly into the zero-trust pipeline.

---

## 🔒 Security Architecture (The 4 Doors)

### 🚪 Door 1: Pre-Execution Format & Antivirus Gate
- **Magic Bytes Validation**: Inspects byte headers (e.g., verifying `%PDF-1.7` magic bytes) to prevent disguised executable payloads (`.exe`, `.dll`, `.bat`).
- **MIME Discrepancy Gate**: Detects spoofed MIME headers by running OS-level file heuristics.
- **ClamAV Signature Daemon**: Scans against real-time signature definitions for trojans, exploits (e.g., CVE-2023-38831), and malicious wrappers.

### 📦 Sandbox Quarantine Isolation
Files pass through an ephemeral, read-only container sandbox where dangerous properties are neutralized before semantic analysis.

### 🚪 Door 2: Structural & Content Inspection
- **PDF Grammar & Object Audit**: Scans the cross-reference (`xref`) table and trailer dictionary for malformed or recursive structures.
- **Macro & JavaScript Stripping**: Detects `/JavaScript`, `/Launch`, `/OpenAction`, and `/EmbeddedFiles` dictionaries.
- **Obfuscated Stream Analysis**: Flags non-standard filter chains designed to bypass antivirus memory inspection.

### 🚪 Door 3: Post-Extraction & AI Defense
- **Gemini 1.5 Pro Multimodal Vision**: Extracts unstructured financial tables, headers, line items, and payment instructions.
- **Prompt Injection Defense**: Defends against indirect prompt injection embedded in document white space or metadata designed to hijack the LLM.
- **Hallucination Entropy Gate**: Computes token confidence and enforces schema validation against enterprise finance rules.

### 🚪 Door 4: Business Logic, Matching & Anti-Fraud Gate
- **Three-Way Matching**: Cross-references Invoice line items and amounts against approved Purchase Orders (`PO`) and Warehouse Goods Receipt Notes (`GRN`).
- **Vendor Bank Redirection Protection**: Compares the invoiced IBAN/SWIFT against registered master records to prevent wire fraud.
- **Duplicate Detection**: Hashes document invariants to identify re-billed invoices across fiscal cycles.

### ⛓️ Tamper-Evident SHA-256 Hash Chain
Every event (upload, scan, extraction, decision, audit) creates a new block containing:
$$\text{Block Hash} = \text{SHA-256}(\text{EventID} + \text{Timestamp} + \text{PrevHash} + \text{Actor} + \text{Payload})$$
Any alteration to past logs breaks the hash link and triggers an immediate cryptographic integrity alarm on the dashboard.

---

## 🛠️ Development Setup

### Dashboard Frontend
```bash
cd dashboard

# Install dependencies
npm install

# Start Vite dev server with proxy to API
npm run dev

# Build production bundle
npm run build
```

### Backend API & Worker
```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Or `venv\Scripts\activate` on Windows

# Install dependencies
pip install -r requirements.txt

# Start FastAPI dev server
uvicorn app.main:app --reload --port 8000

# Start Celery worker
celery -A app.workers.celery_app worker -l info
```

---

## ⚙️ Configuration Reference

| Variable | Default | Purpose |
| :--- | :--- | :--- |
| `DATABASE_URL` | `postgresql+asyncpg://...` | Asynchronous PostgreSQL connection string |
| `REDIS_URL` | `redis://:password@localhost:6379/0` | Redis caching and rate limiting |
| `CELERY_BROKER_URL`| `redis://:password@localhost:6379/1` | Celery task queue broker |
| `CLAMAV_HOST` | `clamav` | Hostname of the ClamAV daemon container |
| `CLAMAV_PORT` | `3310` | Port for the ClamAV TCP socket |
| `GEMINI_API_KEY` | *(Set in `.env`)* | Google Gemini API key for multimodal vision |
| `JWT_SECRET` | *(Random 32-byte hex)* | Key for signing zero-trust authorization tokens |
| `MAX_FILE_SIZE_BYTES` | `20971520` (20 MB) | Maximum permitted single upload payload |
| `MATCH_VARIANCE_TOLERANCE_PERCENT` | `1.0` | Maximum acceptable variance for straight-through approval |
| `STP_AUTO_APPROVAL_THRESHOLD` | `95.0` | Score percentage required for auto-approval |

---

## ⌨️ Makefile Shortcuts

```bash
make help          # Show command palette
make build         # Build all Docker images
make up            # Start all services in daemon mode
make down          # Stop all containers
make logs          # Tail streaming logs across the cluster
make status        # Inspect container health
make migrate       # Apply database migrations
make clean         # Prune dangling containers and volumes
```

---

## 🤝 Contributing & Security Vulnerability Disclosure

1. Fork the repository and create your feature branch: `git checkout -b feature/zero-trust-enhancement`.
2. Commit your changes: `git commit -m 'feat: Add heuristic entropy scanner'`.
3. Push to the branch: `git push origin feature/zero-trust-enhancement`.
4. Open a Pull Request.

*To report a security vulnerability, please contact `security@securedoc.internal` with PGP-encrypted details.*
#   v y u h a  
 