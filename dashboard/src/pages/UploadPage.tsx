import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  FileCheck2,
  AlertTriangle,
  ShieldCheck,
  Fingerprint,
  Cpu,
  Layers,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface UploadResult {
  id: string;
  filename: string;
  file_size: number;
  mime_type: string;
  sha256_hash: string;
  status: string;
  is_duplicate: boolean;
  duplicate_of: string | null;
  message: string;
}

interface ScanGate1Result {
  passed: boolean;
  decision: string;
  reasons: string[];
  warnings: string[];
  clamav_clean: boolean | null;
  clamav_status: string;
  pdf_findings: Record<string, any>;
}

interface ScanGate2Result {
  status: 'PASS' | 'FAIL' | 'SUSPICIOUS';
  risk_level: string;
  prompt_injection_detected: boolean;
  suspicious_instructions_detected: boolean;
  confidential_data_risk: boolean;
  findings: string[];
  reason: string;
  risk_score: number;
}

export const UploadPage: React.FC = () => {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [domain, setDomain] = useState('CORPORATE');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Live security gate states for the uploaded document
  const [gate1Running, setGate1Running] = useState(false);
  const [gate1Result, setGate1Result] = useState<ScanGate1Result | null>(null);
  const [gate2Running, setGate2Running] = useState(false);
  const [gate2Result, setGate2Result] = useState<ScanGate2Result | null>(null);
  const [extractRunning, setExtractRunning] = useState(false);
  const [extractResult, setExtractResult] = useState<any | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const validateAndSetFile = (file: File) => {
    setErrorMessage(null);
    setUploadResult(null);
    setGate1Result(null);
    setGate2Result(null);
    setExtractResult(null);

    const allowed = ['.pdf', '.jpg', '.jpeg', '.png'];
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!allowed.includes(ext)) {
      setErrorMessage(`Unsupported file format '${ext}'. Please upload PDF, JPG, or PNG.`);
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setErrorMessage(`File exceeds 10 MB maximum upload limit (${(file.size / (1024 * 1024)).toFixed(2)} MB).`);
      return;
    }

    setSelectedFile(file);
  };

  const executeUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setUploadProgress(20);
    setErrorMessage(null);

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('domain', domain);

    try {
      const progressTimer = setInterval(() => {
        setUploadProgress((prev) => (prev < 90 ? prev + 15 : prev));
      }, 100);

      const res = await fetch('/documents/upload', {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressTimer);
      setUploadProgress(100);

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ detail: 'Upload failed' }));
        throw new Error(errData.detail || `Upload failed with HTTP ${res.status}`);
      }

      const data: UploadResult = await res.json();
      setUploadResult(data);

      // Automatically trigger Gate 1 File Security scan on upload completion
      runGate1(data.id);
    } catch (err: any) {
      setErrorMessage(err.message || 'File upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const runGate1 = async (docId: string) => {
    setGate1Running(true);
    try {
      const res = await fetch(`/documents/${docId}/security-scan`, { method: 'POST' });
      if (!res.ok) throw new Error('Gate 1 security scan failed');
      const data = await res.json();
      setGate1Result(data);
      if (data.passed) {
        // Automatically trigger Gate 2 if Gate 1 passed
        runGate2(docId);
      }
    } catch (e: any) {
      console.error(e);
    } finally {
      setGate1Running(false);
    }
  };

  const runGate2 = async (docId: string) => {
    setGate2Running(true);
    try {
      const res = await fetch(`/documents/${docId}/content-scan`, { method: 'POST' });
      if (!res.ok) throw new Error('Gate 2 content scan failed');
      const data: ScanGate2Result = await res.json();
      setGate2Result(data);
      if (data.status === 'PASS') {
        // Automatically trigger Extraction AI if both gates passed
        runExtract(docId);
      }
    } catch (e: any) {
      console.error(e);
    } finally {
      setGate2Running(false);
    }
  };

  const runExtract = async (docId: string) => {
    setExtractRunning(true);
    try {
      const res = await fetch(`/documents/${docId}/extract`, { method: 'POST' });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail?.error || 'Extraction failed');
      }
      const data = await res.json();
      setExtractResult(data);
    } catch (e: any) {
      console.error(e);
    } finally {
      setExtractRunning(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
          <UploadCloud className="text-brand-400" size={24} />
          Document Ingestion & Quarantine Gateway
        </h1>
        <p className="text-xs text-slate-400 font-mono mt-1">
          Multi-Door Zero-Trust Security Pipeline • Max 10 MB • PDF / JPG / PNG
        </p>
      </div>

      {/* Main Upload Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">Taxonomy Domain Adaptation</label>
            <p className="text-[11px] text-slate-400">Customizes prompt tuning & classification models</p>
          </div>
          <select
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-brand-500 font-mono"
          >
            <option value="CORPORATE">Corporate & Commercial Invoicing</option>
            <option value="EDUCATION">Academic & University Bursar</option>
            <option value="HEALTHCARE">Healthcare & Medical Billing</option>
            <option value="RETAIL">Retail Procurement & POS</option>
          </select>
        </div>

        {/* Drag and Drop Box */}
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-200 ${
            dragActive
              ? 'border-brand-500 bg-brand-500/10'
              : 'border-slate-700 hover:border-slate-500 bg-slate-950/40 hover:bg-slate-950/70'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={handleChange}
            className="hidden"
          />

          <div className="w-16 h-16 mx-auto rounded-2xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-400 mb-3 shadow-lg">
            <UploadCloud size={32} />
          </div>

          <h3 className="text-sm font-semibold text-slate-200">
            {selectedFile ? selectedFile.name : 'Drag and drop document here, or browse'}
          </h3>
          <p className="text-xs text-slate-400 mt-1 font-mono">
            {selectedFile
              ? `${(selectedFile.size / 1024).toFixed(1)} KB • Ready for quarantine ingestion`
              : 'Supports PDF, JPG, and PNG files up to 10 MB'}
          </p>
        </div>

        {/* Action Button */}
        {selectedFile && !uploadResult && (
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              onClick={() => setSelectedFile(null)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
            >
              Cancel
            </button>
            <button
              onClick={executeUpload}
              disabled={isUploading}
              className="px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold flex items-center gap-2 shadow-lg shadow-brand-600/30 transition disabled:opacity-50"
            >
              {isUploading ? (
                <>
                  <RefreshCw size={14} className="animate-spin" /> Ingesting to Quarantine...
                </>
              ) : (
                <>
                  <ShieldCheck size={14} /> Ingest & Execute Security Gates
                </>
              )}
            </button>
          </div>
        )}

        {/* Upload Progress Bar */}
        {isUploading && (
          <div className="space-y-1.5 pt-2">
            <div className="flex justify-between text-xs font-mono text-slate-400">
              <span>Streaming into isolated quarantine vault...</span>
              <span>{uploadProgress}%</span>
            </div>
            <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-brand-500 transition-all duration-200 rounded-full"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Error Alert */}
        {errorMessage && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-3 text-rose-300 text-xs">
            <AlertTriangle size={18} className="shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Upload Validation Rejected</p>
              <p className="mt-0.5 text-rose-400">{errorMessage}</p>
            </div>
          </div>
        )}
      </div>

      {/* Upload Outcome & Security Pipeline Progress */}
      {uploadResult && (
        <div className="space-y-6">
          {/* Fingerprint & Duplicate Alert Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <FileCheck2 size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">{uploadResult.filename}</h3>
                  <p className="text-[11px] font-mono text-slate-400">Document ID: {uploadResult.id}</p>
                </div>
              </div>
              <Link
                to={`/documents/${uploadResult.id}`}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 flex items-center gap-1.5 transition font-medium"
              >
                Inspect Telemetry <ArrowRight size={14} />
              </Link>
            </div>

            {/* SHA-256 Fingerprint */}
            <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-xl flex items-center gap-3">
              <Fingerprint size={20} className="text-brand-400 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-[10px] uppercase font-mono font-bold tracking-wider text-slate-400">
                  Cryptographic SHA-256 Fingerprint
                </p>
                <p className="text-xs font-mono text-slate-200 truncate select-all">{uploadResult.sha256_hash}</p>
              </div>
            </div>

            {/* Duplicate Document Alert */}
            {uploadResult.is_duplicate && (
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3 text-amber-300 text-xs">
                <AlertTriangle size={18} className="shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold">Duplicate Document Content Detected</p>
                  <p className="text-amber-400">
                    An identical file fingerprint has been processed previously. Original document reference ID:{' '}
                    <span className="font-mono font-semibold select-all">{uploadResult.duplicate_of}</span>.
                  </p>
                  <Link
                    to="/duplicates"
                    className="inline-flex items-center gap-1 text-amber-300 hover:underline text-[11px] font-semibold pt-1"
                  >
                    View in Duplicate Registry <ArrowRight size={12} />
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Multi-Door Security Gates Status Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Gate 1 Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <ShieldCheck size={14} className="text-brand-400" /> Security Gate 1
                </span>
                {gate1Running ? (
                  <RefreshCw size={14} className="animate-spin text-brand-400" />
                ) : gate1Result ? (
                  gate1Result.passed ? (
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      PASSED
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30">
                      BLOCKED
                    </span>
                  )
                ) : (
                  <span className="text-[10px] font-mono text-slate-400">PENDING</span>
                )}
              </div>
              <h4 className="text-xs font-semibold text-slate-200">File & Structural Safety</h4>
              <p className="text-[11px] text-slate-400">
                {gate1Result
                  ? gate1Result.passed
                    ? 'ClamAV antivirus clean, verified magic bytes, and PDF structural sanity.'
                    : `Gate 1 Block: ${gate1Result.reasons.join(', ')}`
                  : 'Validates file headers, executes ClamAV scanner, and detects hidden macros.'}
              </p>
            </div>

            {/* Gate 2 Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Cpu size={14} className="text-indigo-400" /> Security Gate 2
                </span>
                {gate2Running ? (
                  <RefreshCw size={14} className="animate-spin text-indigo-400" />
                ) : gate2Result ? (
                  gate2Result.status === 'PASS' ? (
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      PASS
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30">
                      {gate2Result.status}
                    </span>
                  )
                ) : (
                  <span className="text-[10px] font-mono text-slate-400">WAITING GATE 1</span>
                )}
              </div>
              <h4 className="text-xs font-semibold text-slate-200">Security AI Inspection</h4>
              <p className="text-[11px] text-slate-400">
                {gate2Result
                  ? gate2Result.reason
                  : 'Analyzes OCR text for prompt injection, jailbreaks, and system override instructions.'}
              </p>
            </div>

            {/* Gate 3 / Extraction AI Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Layers size={14} className="text-cyan-400" /> Extraction AI
                </span>
                {extractRunning ? (
                  <RefreshCw size={14} className="animate-spin text-cyan-400" />
                ) : extractResult ? (
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    EXTRACTED
                  </span>
                ) : (
                  <span className="text-[10px] font-mono text-slate-400">AWAITING GATES</span>
                )}
              </div>
              <h4 className="text-xs font-semibold text-slate-200">Structured VLM Entities</h4>
              <p className="text-[11px] text-slate-400">
                {extractResult
                  ? `Vendor: ${extractResult.extracted_data?.vendor_name || 'N/A'} • Total: $${extractResult.extracted_data?.total_amount || '0.00'}`
                  : 'Strictly blocked unless Gate 1 and Gate 2 both yield clean ALLOW status.'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
