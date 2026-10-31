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
                                                 ▼# 🛡️ SecureDoc Pipeline

### Zero-Trust Document Ingestion, Intelligent Invoice Validation & Financial Fraud Prevention

<p align="center">
  <strong>Secure Every Document. Verify Every Transaction. Trust Nothing by Default.</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Security-Zero--Trust-00C853?style=for-the-badge" />
  <img src="https://img.shields.io/badge/AI-Multimodal%20Extraction-4285F4?style=for-the-badge" />
  <img src="https://img.shields.io/badge/Backend-FastAPI-009688?style=for-the-badge" />
  <img src="https://img.shields.io/badge/Audit-SHA256-6C63FF?style=for-the-badge" />
</p>

---

## 🚀 Overview

**SecureDoc Pipeline** is an intelligent document security and financial validation platform that protects enterprise workflows from malicious document uploads, invoice manipulation, payment redirection fraud, and fraudulent financial transactions.

Traditional document processing systems focus primarily on extracting information. SecureDoc takes a different approach: **every document is treated as untrusted until it passes multiple independent security and business validation layers.**

Combining antivirus inspection, isolated sandbox processing, multimodal AI extraction, automated three-way matching, financial fraud detection, and cryptographic audit logging, SecureDoc creates a secure end-to-end document processing pipeline.

Whether an invoice arrives through a web dashboard, browser extension, or REST API, it must pass through the same security architecture before its financial information can be trusted.

### Why SecureDoc?

- **Zero-Trust Ingestion:** Never trust a file based on its extension, source, or declared MIME type.
- **Multi-Layer Malware Inspection:** Detect malicious payloads, disguised executables, embedded scripts, and suspicious PDF structures.
- **AI-Powered Extraction:** Convert unstructured invoices into structured financial data using multimodal document intelligence.
- **Automated Three-Way Matching:** Validate invoices against Purchase Orders and Goods Receipt Notes.
- **Payment Fraud Prevention:** Identify unauthorized vendor bank account changes and duplicate invoices.
- **Tamper-Evident Auditing:** Maintain a SHA-256-linked record of critical processing events.
- **Human-in-the-Loop Verification:** Escalate suspicious or mismatched transactions for manual review.

---

## 🏗️ System Architecture

SecureDoc follows a **Zero-Trust Multi-Door Architecture**, where documents must independently satisfy security, structural, extraction, and financial validation requirements.

```text
                  UNTRUSTED DOCUMENT SOURCES
             ┌────────────┬────────────┬────────────┐
             │ Dashboard  │  Browser   │  REST API  │
             │            │ Extension  │            │
             └────────────┴────────────┴────────────┘
                           │
                           ▼
                ┌──────────────────────┐
                │   FASTAPI GATEWAY    │
                │ Authentication      │
                │ Upload Validation   │
                │ Rate Limiting       │
                └──────────────────────┘
                           │
                           ▼
        ╔════════════════════════════════════════════╗
        ║          ZERO-TRUST SECURITY LAYER          ║
        ║                                            ║
        ║  DOOR 1 — FILE VALIDATION & ANTIVIRUS      ║
        ║  • Magic-byte verification                 ║
        ║  • MIME discrepancy detection              ║
        ║  • ClamAV malware scanning                 ║
        ║                                            ║
        ║  DOOR 2 — STRUCTURAL INSPECTION            ║
        ║  • PDF object analysis                     ║
        ║  • JavaScript and embedded-file detection  ║
        ║  • Suspicious stream identification        ║
        ║                                            ║
        ║  ISOLATED DOCUMENT PROCESSING              ║
        ║  • Sandboxed parsing                       ║
        ║  • Restricted execution                    ║
        ║  • Safe extraction                         ║
        ║                                            ║
        ║  DOOR 3 — AI EXTRACTION & VALIDATION       ║
        ║  • Multimodal document intelligence        ║
        ║  • Financial entity extraction             ║
        ║  • Schema and consistency validation       ║
        ║                                            ║
        ║  DOOR 4 — FINANCIAL SECURITY               ║
        ║  • PO vs Invoice vs GRN matching           ║
        ║  • Vendor bank account verification       ║
        ║  • Duplicate invoice detection             ║
        ╚════════════════════════════════════════════╝
                           │
                           ▼
                 ┌──────────────────────┐
                 │  DECISION ENGINE     │
                 │                      │
                 │  Risk Assessment     │
                 │  Policy Evaluation   │
                 │  Approval Routing    │
                 └──────────────────────┘
                      │           │
                ┌─────┘           └──────┐
                ▼                       ▼
        ┌───────────────┐       ┌────────────────┐
        │ AUTO APPROVAL │       │ MANUAL REVIEW  │
        │ Eligible Docs │       │ Flagged Docs   │
        └───────────────┘       └────────────────┘
                │                       │
                └───────────┬───────────┘
                            ▼
                ┌──────────────────────┐
                │ CRYPTOGRAPHIC AUDIT  │
                │ SHA-256 HASH CHAIN   │
                └──────────────────────┘
                            │
                            ▼
                 ┌──────────────────────┐
                 │ POSTGRESQL + REDIS   │
                 │ Persistent Storage   │
                 │ Background Workers   │
                 └──────────────────────┘
```

---

## 🔐 Core Features

### 1. Multi-Layer Document Security

Every uploaded document passes through independent security checks before processing.

| Security Check | Purpose |
|---|---|
| Magic Byte Validation | Detects files disguised using incorrect extensions |
| MIME Verification | Identifies discrepancies between declared and actual file types |
| ClamAV Integration | Scans documents for known malware signatures |
| PDF Structure Analysis | Identifies suspicious PDF objects and structures |
| JavaScript Detection | Detects embedded scripts and potentially dangerous actions |
| Embedded File Detection | Identifies attachments concealed inside documents |
| Sandbox Isolation | Restricts document parsing within an isolated environment |

### 2. Isolated Document Processing

Untrusted documents are processed inside a restricted environment.

The sandbox architecture is designed to:

- Prevent untrusted files from accessing application resources.
- Restrict network access during document parsing.
- Limit CPU, memory, and execution time.
- Use temporary storage for intermediate processing.
- Prevent unsafe document content from directly reaching trusted application components.

### 3. AI-Powered Financial Data Extraction

SecureDoc uses multimodal document intelligence to extract financial information from invoices, including scanned documents and complex layouts.

**Extracted information includes:**

- Invoice number and date.
- Vendor name and identification.
- Purchase Order reference.
- Item descriptions and quantities.
- Unit prices and tax information.
- Subtotal and total amount.
- Payment instructions.
- Bank account details and IBAN/SWIFT information.

Extracted data is converted into a structured schema before entering the financial validation stage.

**AI security controls:**

- Treat document contents as untrusted data, never as executable instructions.
- Separate system instructions from document content.
- Validate extracted values against predefined schemas.
- Check financial arithmetic and field consistency.
- Escalate uncertain or conflicting extraction results for review.

### 4. Automated Three-Way Matching

One of SecureDoc's primary financial validation capabilities is automated three-way matching.

It compares three independent business records:

| Document | What it verifies |
|---|---|
| Purchase Order (PO) | What the organization ordered |
| Goods Receipt Note (GRN) | What the organization actually received |
| Supplier Invoice | What the supplier is requesting payment for |

**Example:**

| Parameter | Purchase Order | GRN | Invoice |
|---|---:|---:|---:|
| Product | Laptop | Laptop | Laptop |
| Quantity | 10 | 10 | 10 |
| Unit Price | ₹50,000 | — | ₹50,000 |
| Total | ₹5,00,000 | 10 received | ₹5,00,000 |

<details>
<summary><strong>How the matching engine works</strong></summary>

1. Retrieve the approved Purchase Order.
2. Retrieve the corresponding Goods Receipt Note.
3. Extract invoice line items and financial information.
4. Compare product identifiers, quantities, unit prices, taxes, and totals.
5. Calculate discrepancies using configurable business tolerances.
6. Generate a matching result with supporting evidence.
7. Route the invoice according to the configured approval policy.

**Possible outcomes:**

- MATCHED — All required checks pass.
- PARTIAL MATCH — Acceptable discrepancies require policy evaluation.
- MISMATCH — Significant differences are detected.
- MISSING RECORD — Required PO or GRN information is unavailable.

A missing document must never be treated as a successful match.

</details>

### 5. Vendor Bank Redirection Protection

Protects organizations against invoice payment redirection and Business Email Compromise (BEC) attacks.

The system compares payment instructions extracted from an invoice against verified vendor master records.

**Detection capabilities:**

- Unexpected bank account changes.
- IBAN/SWIFT discrepancies.
- Unregistered payment destinations.
- Vendor identity inconsistencies.
- Changes to payment instructions between invoices.

Suspicious changes trigger manual verification rather than automatic payment approval.

### 6. Duplicate Invoice Detection

Identifies potentially duplicated financial claims using multiple document attributes.

Detection signals include:

- Invoice number.
- Vendor identity.
- Invoice date.
- Invoice amount.
- Purchase Order reference.
- Document fingerprint and normalized financial attributes.

The system can identify both exact duplicates and potential duplicate submissions with modified filenames or formatting.

### 7. Risk-Based Approval Engine

SecureDoc combines security results and financial validation results to determine the appropriate processing route.

| Processing Result | Recommended Action |
|---|---|
| Malware detected | Block and quarantine |
| Suspicious document structure | Quarantine for inspection |
| Extraction uncertainty | Manual verification |
| PO/GRN mismatch | Finance review |
| Bank account discrepancy | Payment security review |
| Duplicate invoice | Block duplicate processing |
| All required checks passed | Eligible for policy-based approval |

Automatic approval is subject to configured business rules and must never override a security failure.

### 8. Tamper-Evident SHA-256 Audit Trail

Every significant processing event is recorded in a cryptographically linked audit chain.

Each audit record includes:

- Event ID.
- Timestamp.
- Actor or service identity.
- Event type.
- Event payload or payload digest.
- Previous record hash.
- Current record hash.

**Hash calculation:**

\[
H_n = SHA256(H_{n-1} \Vert EventData_n)
\]

This creates a sequential integrity relationship between audit records.

Any modification to an earlier record causes subsequent hash verification to fail.

> The hash chain provides tamper evidence. For stronger protection against privileged administrators, production deployments should additionally use signed checkpoints and independently stored audit records.

---

## 🔄 End-to-End Processing Workflow

```text
DOCUMENT UPLOAD
      │
      ▼
AUTHENTICATION & ACCESS CONTROL
      │
      ▼
FILE TYPE & SIZE VALIDATION
      │
      ▼
ANTIVIRUS SCANNING
      │
      ├── MALICIOUS ──► QUARANTINE
      │
      ▼
STRUCTURAL DOCUMENT INSPECTION
      │
      ├── SUSPICIOUS ──► QUARANTINE
      │
      ▼
ISOLATED DOCUMENT PARSING
      │
      ▼
AI-BASED DATA EXTRACTION
      │
      ▼
EXTRACTION VALIDATION
      │
      ▼
THREE-WAY MATCHING
      │
      ▼
VENDOR & DUPLICATE FRAUD CHECKS
      │
      ▼
RISK & POLICY EVALUATION
      │
      ├── ELIGIBLE ──► APPROVAL WORKFLOW
      │
      └── FLAGGED ───► HUMAN REVIEW
      │
      ▼
CRYPTOGRAPHIC AUDIT LOGGING
      │
      ▼
FINAL PROCESSING STATUS
```

---

## 🛠️ Technology Stack

| Layer | Technology |
|---|---|
| Frontend | React, TypeScript, Tailwind CSS |
| Backend | Python, FastAPI |
| AI & Document Intelligence | Google Gemini Multimodal API |
| Antivirus | ClamAV |
| Database | PostgreSQL 16 |
| Background Processing | Celery |
| Message Broker / Cache | Redis 7 |
| Security | JWT, SHA-256, Zero-Trust Architecture |
| Browser Integration | Chrome Extension |
| Containerization | Docker & Docker Compose |

---

## 📂 Project Structure

```text
securedoc-pipeline/
│
├── dashboard/
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── vite.config.ts
│
├── backend/
│   ├── app/
│   │   ├── api/
│   │   ├── core/
│   │   ├── security/
│   │   ├── ingestion/
│   │   ├── antivirus/
│   │   ├── sandbox/
│   │   ├── extraction/
│   │   ├── matching/
│   │   ├── fraud/
│   │   ├── audit/
│   │   ├── workers/
│   │   └── main.py
│   │
│   ├── requirements.txt
│   └── Dockerfile
│
├── extension/
│   ├── manifest.json
│   ├── popup/
│   └── background/
│
├── database/
│   └── migrations/
│
├── tests/
│
├── docker-compose.yml
├── .env.example
├── Makefile
└── README.md
```

*The structure above describes the proposed organization; adjust it to match the actual repository.*

---

## ⚡ Getting Started

### Prerequisites

Ensure the following tools are installed:

- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- [Docker Compose](https://docs.docker.com/compose/)
- [Node.js 20+](https://nodejs.org/)
- [Python 3.11+](https://www.python.org/)
- Git

### 1. Clone the Repository

```bash
git clone https://github.com/securedoc/securedoc-pipeline.git

cd securedoc-pipeline
```

### 2. Configure Environment Variables

```bash
cp .env.example .env
```

Configure the required credentials and service settings in `.env`.

```env
DATABASE_URL=postgresql+asyncpg://user:password@postgres:5432/securedoc

REDIS_URL=redis://redis:6379/0

CELERY_BROKER_URL=redis://redis:6379/1

CLAMAV_HOST=clamav
CLAMAV_PORT=3310

GEMINI_API_KEY=your_api_key

JWT_SECRET=your_secure_random_secret

MAX_FILE_SIZE_BYTES=20971520

MATCH_VARIANCE_TOLERANCE_PERCENT=1.0

STP_AUTO_APPROVAL_THRESHOLD=95.0
```

**Important:** Replace placeholder credentials with secure values. Never commit `.env` files or API keys to version control.

### 3. Launch the Application

```bash
docker compose up -d --build
```

### 4. Verify Running Services

```bash
docker compose ps
```

### 5. Access the Application

| Service | Local URL |
|---|---|
| Web Dashboard | http://localhost:3000 |
| Backend API | http://localhost:8000 |
| API Documentation | http://localhost:8000/docs |
| ClamAV | localhost:3310 |
| PostgreSQL | localhost:5432 |
| Redis | localhost:6379 |

---

## 🌐 Browser Extension Setup

SecureDoc provides a Chrome extension for submitting documents directly from browser workflows.

1. Open `chrome://extensions/`.
2. Enable Developer Mode.
3. Select **Load unpacked**.
4. Choose the project's `extension/` directory.
5. Open the SecureDoc Shield extension.
6. Authenticate using an appropriately scoped API token.
7. Submit supported documents for security inspection.

The extension communicates with the backend ingestion gateway, ensuring that uploaded documents follow the same security pipeline.

---

## 💻 Local Development

### Backend

```bash
cd backend

python -m venv venv
```

Activate the environment:

**Windows:**

```bash
venv\Scripts\activate
```

**Linux / macOS:**

```bash
source venv/bin/activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Start the API:

```bash
uvicorn app.main:app --reload --port 8000
```

Start the Celery worker:

```bash
celery -A app.workers.celery_app worker -l info
```

### Frontend

```bash
cd dashboard

npm install

npm run dev
```

Build for production:

```bash
npm run build
```

---

## ⚙️ Configuration Reference

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis connection |
| `CELERY_BROKER_URL` | Celery task broker |
| `CLAMAV_HOST` | Antivirus service hostname |
| `CLAMAV_PORT` | Antivirus daemon port |
| `GEMINI_API_KEY` | Multimodal extraction API credentials |
| `JWT_SECRET` | Authentication token signing secret |
| `MAX_FILE_SIZE_BYTES` | Maximum upload size |
| `MATCH_VARIANCE_TOLERANCE_PERCENT` | Configurable financial matching tolerance |
| `STP_AUTO_APPROVAL_THRESHOLD` | Configured approval eligibility threshold |

---

## 🧪 Testing & Validation

SecureDoc should be validated against both security threats and financial processing edge cases.

Suggested test categories:

**Document Security**
- Valid PDF uploads.
- Executable files disguised as PDFs.
- MIME type mismatches.
- EICAR antivirus test files.
- PDFs containing embedded JavaScript.
- Malformed and corrupted documents.

**Financial Validation**
- Perfect PO, GRN, and invoice matches.
- Quantity discrepancies.
- Price discrepancies.
- Tax calculation errors.
- Missing PO or GRN records.
- Duplicate invoice submissions.

**Fraud Detection**
- Unauthorized bank account changes.
- Modified payment instructions.
- Vendor identity inconsistencies.
- Repeated invoice numbers.
- Potential duplicate transactions.

**Audit Integrity**
- Sequential hash verification.
- Modified historical event detection.
- Missing audit event detection.
- Invalid actor or timestamp records.

---

## 🛡️ Security Principles

SecureDoc is designed around the following principles:

1. **Never Trust Input:** All incoming documents are untrusted by default.
2. **Defense in Depth:** Multiple independent security gates protect the processing pipeline.
3. **Least Privilege:** Each service receives only the permissions it requires.
4. **Isolation by Design:** Untrusted documents are processed in restricted environments.
5. **Validate Before Acting:** AI-generated information must pass deterministic validation.
6. **Human Oversight:** High-risk financial decisions require authorized review.
7. **Audit Everything:** Important processing events must be traceable.
8. **Fail Securely:** Security failures must never silently result in approval.

---

## 🚀 Future Roadmap

| Feature | Planned Enhancement |
|---|---|
| Advanced AI Security | Improved prompt injection and adversarial document detection |
| Intelligent Fraud Detection | Vendor behavior and transaction anomaly analysis |
| Advanced OCR | Improved extraction from multilingual and low-quality documents |
| Enterprise Integration | ERP and accounting system integration |
| Risk Intelligence | Explainable transaction risk scoring |
| Compliance | Configurable financial audit and retention policies |
| Advanced Audit | Digital signatures and independently anchored audit checkpoints |
| Scalability | Distributed processing and horizontally scalable workers |

---

## 🤝 Contributing

Contributions, suggestions, and security improvements are welcome.

1. Fork the repository.
2. Create a feature branch.

```bash
git checkout -b feature/your-feature-name
```

3. Commit your changes.

```bash
git commit -m "feat: add your feature"
```

4. Push the branch.

```bash
git push origin feature/your-feature-name
```

5. Open a Pull Request describing your changes.

---

## ⚠️ Responsible Security Disclosure

If you discover a security vulnerability, please report it privately to the repository maintainers.

Do not publicly disclose exploitable vulnerabilities before maintainers have had an opportunity to investigate and address them.

---

## 📜 License

Specify the project's license before distributing or deploying SecureDoc Pipeline. See the `LICENSE` file for applicable terms.

---

<p align="center">
  <strong>🛡️ SecureDoc Pipeline</strong>
  <br/>
  <em>From Untrusted Documents to Verified Financial Transactions.</em>
  <br/><br/>
  Built for a more secure, intelligent, and transparent financial ecosystem.
</p>
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
#   v y u h a 
 
 
