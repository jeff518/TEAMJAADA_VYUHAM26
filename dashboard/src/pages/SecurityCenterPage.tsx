import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  Cpu,
  AlertTriangle,
  Search,
  RefreshCw,
  FileText,
  CheckCircle2,
  XCircle,
  ExternalLink,
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface DocumentSummary {
  id: string;
  filename: string;
  door1_decision: string;
  door2_decision: string;
  final_decision: string;
  risk_score: number;
  status: string;
  sha256_hash: string;
  created_at: string;
}

export const SecurityCenterPage: React.FC = () => {
  const [documents, setDocuments] = useState<DocumentSummary[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<string>('');
  const [selectedReport, setSelectedReport] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [scanningGate, setScanningGate] = useState<'gate1' | 'gate2' | null>(null);
  const [search, setSearch] = useState('');

  const fetchDocuments = async () => {
    try {
      const res = await fetch('/documents?size=50');
      const data = await res.json();
      setDocuments(data.items || []);
      if (data.items && data.items.length > 0 && !selectedDocId) {
        setSelectedDocId(data.items[0].id);
      }
    } catch (e) {
      console.error('Failed to load documents:', e);
    }
  };

  const fetchReport = async (id: string) => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await fetch(`/documents/${id}/report`);
      const data = await res.json();
      setSelectedReport(data);
    } catch (e) {
      console.error('Failed to load report:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  useEffect(() => {
    if (selectedDocId) {
      fetchReport(selectedDocId);
    }
  }, [selectedDocId]);

  const handleRunGate1 = async () => {
    if (!selectedDocId) return;
    setScanningGate('gate1');
    try {
      await fetch(`/documents/${selectedDocId}/security-scan`, { method: 'POST' });
      await fetchReport(selectedDocId);
      await fetchDocuments();
    } catch (e) {
      console.error(e);
    } finally {
      setScanningGate(null);
    }
  };

  const handleRunGate2 = async () => {
    if (!selectedDocId) return;
    setScanningGate('gate2');
    try {
      await fetch(`/documents/${selectedDocId}/content-scan`, { method: 'POST' });
      await fetchReport(selectedDocId);
      await fetchDocuments();
    } catch (e) {
      console.error(e);
    } finally {
      setScanningGate(null);
    }
  };

  const filteredDocs = documents.filter(
    (d) =>
      d.filename.toLowerCase().includes(search.toLowerCase()) ||
      d.sha256_hash.toLowerCase().includes(search.toLowerCase())
  );

  const gate1 = selectedReport?.gate1_file_security;
  const gate2 = selectedReport?.gate2_content_security;
  const pdfFindings = gate1?.pdf_findings || {};

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <ShieldAlert className="text-brand-400" size={24} />
            Security Center & Multi-Door Telemetry
          </h1>
          <p className="text-xs text-slate-400 font-mono mt-1">
            Gate 1 (File Safety, ClamAV, PDF Structure) • Gate 2 (Security AI & Injection Defense)
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              fetchDocuments();
              if (selectedDocId) fetchReport(selectedDocId);
            }}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 flex items-center gap-2 transition"
          >
            <RefreshCw size={14} /> Refresh Telemetry
          </button>
        </div>
      </div>

      {/* Main Grid: Document Selector Sidebar + Detailed Security Center */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Document Target Selector */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 text-slate-500" size={14} />
              <input
                type="text"
                placeholder="Search target document..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-brand-500 font-mono"
              />
            </div>

            <div className="space-y-1.5 max-h-[620px] overflow-y-auto pr-1">
              {filteredDocs.map((doc) => {
                const isSelected = doc.id === selectedDocId;
                const isBlocked = doc.final_decision === 'BLOCK' || doc.door2_decision === 'BLOCK' || doc.door1_decision === 'BLOCK';
                return (
                  <button
                    key={doc.id}
                    onClick={() => setSelectedDocId(doc.id)}
                    className={`w-full text-left p-3 rounded-xl transition border ${
                      isSelected
                        ? 'bg-brand-600/15 border-brand-500/50 shadow-md'
                        : 'bg-slate-950/40 border-slate-800/80 hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs font-semibold text-slate-200 truncate flex-1">{doc.filename}</p>
                      <span
                        className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border shrink-0 ${
                          isBlocked
                            ? 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                            : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                        }`}
                      >
                        {isBlocked ? 'BLOCKED' : 'ALLOW'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mt-2">
                      <span>Score: {doc.risk_score}/100</span>
                      <span className="truncate max-w-[120px]">{doc.sha256_hash.substring(0, 12)}...</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Deep Security Gate Analysis */}
        <div className="lg:col-span-8 space-y-6">
          {loading ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-400">
              <RefreshCw className="animate-spin mx-auto mb-3 text-brand-400" size={24} />
              <p className="text-xs font-mono">Loading document security telemetry...</p>
            </div>
          ) : selectedReport ? (
            <>
              {/* Document Overview Banner */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
                  <div>
                    <h2 className="text-sm font-bold text-white flex items-center gap-2">
                      <FileText size={16} className="text-brand-400" />
                      {selectedReport.filename}
                    </h2>
                    <p className="text-[11px] font-mono text-slate-400 mt-0.5">
                      ID: {selectedReport.document_id} • Status: {selectedReport.summary?.status}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleRunGate1}
                      disabled={scanningGate !== null}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 flex items-center gap-1.5 transition disabled:opacity-50"
                    >
                      {scanningGate === 'gate1' ? <RefreshCw size={12} className="animate-spin" /> : <ShieldCheck size={12} />}
                      Re-scan Gate 1
                    </button>
                    <button
                      onClick={handleRunGate2}
                      disabled={scanningGate !== null}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 flex items-center gap-1.5 transition disabled:opacity-50"
                    >
                      {scanningGate === 'gate2' ? <RefreshCw size={12} className="animate-spin" /> : <Cpu size={12} />}
                      Re-scan Gate 2
                    </button>
                    <Link
                      to={`/documents/${selectedReport.document_id}`}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                      title="View Complete Telemetry"
                    >
                      <ExternalLink size={14} />
                    </Link>
                  </div>
                </div>

                {/* Overall Security Decision Stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 block">
                      Gate 1 Decision
                    </span>
                    <span
                      className={`text-xs font-mono font-bold mt-1 inline-block ${
                        gate1?.decision === 'ALLOW' ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {gate1?.decision || 'PENDING'}
                    </span>
                  </div>
                  <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 block">
                      Gate 2 Decision
                    </span>
                    <span
                      className={`text-xs font-mono font-bold mt-1 inline-block ${
                        gate2?.decision === 'ALLOW' ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {gate2?.decision || 'PENDING'}
                    </span>
                  </div>
                  <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 block">
                      Risk Score
                    </span>
                    <span className="text-xs font-mono font-bold mt-1 text-amber-400 inline-block">
                      {selectedReport.summary?.overall_risk_score}/100
                    </span>
                  </div>
                  <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 block">
                      SHA-256 Integrity
                    </span>
                    <span
                      className={`text-xs font-mono font-bold mt-1 inline-block ${
                        selectedReport.integrity_verification?.verified ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {selectedReport.integrity_verification?.verified ? 'VERIFIED' : 'UNVERIFIED'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Gate 1: File-Level Security Breakdown */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
                    <ShieldCheck size={16} className="text-brand-400" />
                    Security Gate 1: File Format, Antivirus & Structure
                  </h3>
                  <span
                    className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                      gate1?.passed
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                        : 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                    }`}
                  >
                    {gate1?.passed ? 'CLEAN / PASSED' : 'VIOLATION / BLOCKED'}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
                  {/* ClamAV Scanner */}
                  <div className="p-3.5 bg-slate-950/50 border border-slate-800 rounded-xl space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 font-semibold">ClamAV Antivirus Daemon</span>
                      <span
                        className={
                          gate1?.clamav_clean ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'
                        }
                      >
                        {gate1?.clamav_clean ? 'CLEAN' : 'FLAGGED'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400">{gate1?.clamav_status || 'Engine active'}</p>
                  </div>

                  {/* MIME & Header */}
                  <div className="p-3.5 bg-slate-950/50 border border-slate-800 rounded-xl space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 font-semibold">MIME Type & Header</span>
                      <span className="text-emerald-400 font-bold">{gate1?.mime_type}</span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      File Size: {((selectedReport.summary?.file_size || 0) / 1024).toFixed(1)} KB • Pages:{' '}
                      {selectedReport.summary?.page_count || 1}
                    </p>
                  </div>
                </div>

                {/* PDF Structural Anomalies Table */}
                <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-2">
                  <p className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-400">
                    PDF Structural Elements Inspected
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
                    <div className="flex items-center gap-2 text-slate-300">
                      {pdfFindings.has_javascript ? (
                        <XCircle size={14} className="text-rose-400" />
                      ) : (
                        <CheckCircle2 size={14} className="text-emerald-400" />
                      )}
                      <span>JavaScript: {pdfFindings.has_javascript ? 'YES (RISK)' : 'NO'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-300">
                      {pdfFindings.has_launch_actions ? (
                        <XCircle size={14} className="text-rose-400" />
                      ) : (
                        <CheckCircle2 size={14} className="text-emerald-400" />
                      )}
                      <span>Launch Actions: {pdfFindings.has_launch_actions ? 'YES (RISK)' : 'NO'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-300">
                      {pdfFindings.has_embedded_files ? (
                        <XCircle size={14} className="text-rose-400" />
                      ) : (
                        <CheckCircle2 size={14} className="text-emerald-400" />
                      )}
                      <span>Embedded Files: {pdfFindings.has_embedded_files ? 'YES' : 'NO'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-300">
                      {pdfFindings.is_encrypted ? (
                        <AlertTriangle size={14} className="text-amber-400" />
                      ) : (
                        <CheckCircle2 size={14} className="text-emerald-400" />
                      )}
                      <span>Encrypted: {pdfFindings.is_encrypted ? 'YES' : 'NO'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Gate 2: Security AI & Prompt Injection Breakdown */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
                    <Cpu size={16} className="text-indigo-400" />
                    Security Gate 2: Security AI Prompt Injection & Adversarial Content
                  </h3>
                  <span
                    className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                      gate2?.passed
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                        : 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                    }`}
                  >
                    {gate2?.passed ? 'CLEAN / ALLOW' : 'INJECTION DETECTED'}
                  </span>
                </div>

                {/* Threat Indicators List */}
                {gate2?.threats_detected && gate2.threats_detected.length > 0 ? (
                  <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 space-y-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-rose-300">
                      <AlertTriangle size={16} /> Critical Adversarial Instructions Detected
                    </div>
                    <ul className="space-y-1 text-xs text-rose-400 font-mono list-disc list-inside">
                      {gate2.threats_detected.map((t: string, idx: number) => (
                        <li key={idx}>{t}</li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-2.5 text-xs text-emerald-300">
                    <CheckCircle2 size={16} className="shrink-0" />
                    <span>Zero prompt injection signatures, system overrides, or jailbreak commands detected.</span>
                  </div>
                )}

                {/* Sub-scanners Grid: Regex, Unicode, Base64 */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-mono">
                  <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl space-y-1">
                    <span className="text-slate-400 text-[10px] uppercase font-bold">Regex Pattern Matches</span>
                    <p className="text-slate-200">
                      {gate2?.pattern_matches?.length ? `${gate2.pattern_matches.length} triggers` : '0 triggers'}
                    </p>
                  </div>
                  <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl space-y-1">
                    <span className="text-slate-400 text-[10px] uppercase font-bold">Unicode Stealth Characters</span>
                    <p className="text-slate-200">
                      {gate2?.unicode_anomalies?.length ? `${gate2.unicode_anomalies.length} anomalies` : 'Clean'}
                    </p>
                  </div>
                  <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl space-y-1">
                    <span className="text-slate-400 text-[10px] uppercase font-bold">Base64 Encoded Payloads</span>
                    <p className="text-slate-200">
                      {gate2?.base64_payloads?.length ? `${gate2.base64_payloads.length} payloads` : 'None detected'}
                    </p>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-500 text-xs font-mono">
              Select a document from the left to view multi-door telemetry.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
