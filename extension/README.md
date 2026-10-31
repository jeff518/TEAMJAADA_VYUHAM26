# SecureDoc Pipeline - Chrome Extension (Manifest V3)

Enterprise-grade Chrome Extension for the SecureDoc continuous document security scanning, extraction, validation, and human-in-the-loop approval workflow.

---

## 🚀 Features

- **Manifest V3 Architecture**:
  - Background Service Worker (`service-worker.js`) with persistent message routing, alarm-based document polling, badge notification management, and download monitoring.
  - Side Panel API (`chrome.sidePanel`) providing the primary workspace for analysts.
  - Action Popup (`popup.html`) for quick intake, server status, and recent metrics.
  - Options Page (`options.html`) for configuring backend endpoints, auto-interception preferences, and credential management.
  - Content Script with **Shadow DOM CSS Isolation** to prevent styling interference on host pages.

- **Intelligent Intake & Interception**:
  - **Browser Downloads**: Intercepts PDF, DOCX, XLSX, CSV, TIFF, and images as they download in Chrome.
  - **Drag & Drop Overlay**: Full-screen dropzone overlay when dragging document files into any webpage.
  - **Email Attachment Interception**: Injects 1-click "Scan with SecureDoc" triggers for Gmail, Outlook, Yahoo Mail, and standard webmail attachments.
  - **Floating Action Button (FAB)**: Non-intrusive, draggable floating scanner button available on any website.

- **8-Stage Real-Time Pipeline Tracker**:
  1. **Door 1**: Intake & Format Check (Magic bytes, format validation, SHA-256 fingerprint)
  2. **Sandbox**: Dynamic Analysis (Behavioral scanning, shellcode detonation)
  3. **Door 2**: Deep Content Analysis (Embedded scripts, CDR sanitization, steganography audit)
  4. **Extraction**: OCR & NER (Invoice #, PO #, Vendor, Buyer, Line Items, Amounts)
  5. **Validation**: Math & Rules (Tally check, tax rate verification)
  6. **Matching**: 3-Way Match (Purchase Orders & Receiving Slips reconciliation)
  7. **Fraud Check**: Anomaly Detection (Bank account changes, duplicate invoice check)
  8. **Approval Ready**: Human-in-the-loop decision gate

- **Analyst Workflow & Approvals**:
  - Interactive approval dashboard with side-by-side discrepancy review.
  - Actions: **Approve**, **Reject**, or **Request Verification** with reviewer remarks.
  - Real-time cryptographic audit trail inspection (SHA-256 chained hashes).

---

## 🛠️ Project Structure

```text
a:\vy26\extension\
├── manifest.json              # Chrome Manifest V3 configuration
├── package.json               # Dependencies and build scripts
├── tsconfig.json              # TypeScript strict compiler config
├── webpack.config.js          # Webpack 5 multi-entry bundler
├── tailwind.config.js         # Tailwind CSS design system config
├── postcss.config.js          # PostCSS processor
├── generate-icons.js          # Pure Node.js PNG icon generator
├── assets/
│   └── icons/                 # Extension icons (SVG, 16px, 48px, 128px)
└── src/
    ├── background/
    │   └── service-worker.ts  # Background event listener & badge manager
    ├── content/
    │   └── content-script.ts  # Webpage interception & Shadow DOM FAB
    ├── popup/
    │   ├── popup.html         # Quick intake & status popup
    │   ├── popup.ts           # Popup logic & auth
    │   └── popup.css          # Scoped styling
    ├── sidepanel/
    │   ├── sidepanel.html     # Analyst workspace (Upload, Docs, Approvals, Settings)
    │   ├── sidepanel.ts       # Side panel logic & live pipeline tracker
    │   └── sidepanel.css      # Custom styling & step connectors
    ├── options/
    │   ├── options.html       # Server connection & preference settings
    │   ├── options.ts         # Options logic & cache reset
    │   └── options.css        # Settings layout styles
    ├── shared/
    │   ├── api-client.ts      # Shared HTTP client with JWT & auto-refresh
    │   ├── auth.ts            # chrome.storage token manager & JWT decoder
    │   ├── constants.ts       # API endpoints, pipeline metadata, status colors
    │   └── types.ts           # Comprehensive TypeScript interfaces
    └── styles/
        └── tailwind.css       # Tailwind base styles and UI components
```

---

## 📦 Build Instructions

1. Install dependencies:
   ```bash
   cd a:\vy26\extension
   npm install
   ```

2. Build extension:
   ```bash
   npm run build
   ```

3. Development mode (watch):
   ```bash
   npm run dev
   ```

4. Load into Chrome:
   - Navigate to `chrome://extensions/`
   - Enable **Developer mode** (toggle in top-right)
   - Click **Load unpacked**
   - Select `a:\vy26\extension\dist` directory
