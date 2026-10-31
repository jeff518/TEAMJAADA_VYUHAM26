import React, { useState, useEffect } from 'react';
import {
  Fingerprint,
  ShieldCheck,
  Search,
  RefreshCw,
  FileCheck2,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Layers,
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface DocumentItem {
  id: string;
  filename: string;
  sha256_hash: string;
  file_size: number;
  status: string;
  created_at: string;
}

interface IntegrityVerificationResult {
  verified: boolean;
  document_id: string;
  filename?: string;
  expected_hash?: string;
  actual_hash?: string;
  sha256_hash?: string;
  status: 'VERIFIED' | 'TAMPERING_SUSPECTED' | 'FILE_MISSING' | 'NOT_FOUND';
  message: string;
}

export const IntegrityVerificationPage: React.FC = () => {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [verifyingDocId, setVerifyingDocId] = useState<string | null>(null);
  const [verificationResults, setVerificationResults] = useState<Record<string, IntegrityVerificationResult>>({});
  const [searchTerm, setSearchTerm] = useState('');

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const res = await fetch('/documents?size=100');
      const data = await res.json();
      setDocuments(data.items || []);
    } catch (e) {
      console.error('Failed to load documents:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const runIntegrityCheck = async (docId: string) => {
    setVerifyingDocId(docId);
    try {
      const res = await fetch(`/documents/${docId}/integrity`);
      const data: IntegrityVerificationResult = await res.json();
      setVerificationResults((prev) => ({
        ...prev,
        [docId]: data,
      }));
    } catch (e) {
      console.error('Integrity check failed:', e);
    } finally {
      setVerifyingDocId(null);
    }
  };

  const runAllIntegrityChecks = async () => {
    for (const doc of documents) {
      await runIntegrityCheck(doc.id);
    }
  };

  const filteredDocs = documents.filter(
    (d) =>
      d.filename.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.sha256_hash.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <Fingerprint className="text-brand-400" size={24} />
            Cryptographic Integrity & Tamper Verification
          </h1>
          <p className="text-xs text-slate-400 font-mono mt-1">
            Real-Time Disk Re-Hashing • Stored vs. Computed SHA-256 Fingerprint Comparison
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={runAllIntegrityChecks}
            disabled={verifyingDocId !== null || documents.length === 0}
            className="px-3.5 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-xs font-semibold text-white flex items-center gap-2 shadow-lg shadow-brand-600/30 transition disabled:opacity-50"
          >
            <ShieldCheck size={14} /> Verify All Ingested Files
          </button>
          <button
            onClick={fetchDocuments}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 flex items-center gap-2 transition"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>
      </div>

      {/* Info Notice Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-400 shrink-0">
          <Layers size={20} />
        </div>
        <div className="space-y-1 text-xs">
          <h3 className="font-semibold text-slate-200">Zero-Trust Quarantine Verification Protocol</h3>
          <p className="text-slate-400 leading-relaxed">
            Every document is fingerprinted via chunked SHA-256 upon initial ingestion. At any time, administrators can
            trigger on-disk verification to recompute the physical file's cryptographic hash from storage and compare it
            against the immutable database record, catching any unauthorized modification, bit-rot, or disk injection.
          </p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative max-w-md w-full">
          <Search className="absolute left-3 top-2.5 text-slate-500" size={14} />
          <input
            type="text"
            placeholder="Search documents by name or SHA-256..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-brand-500 font-mono"
          />
        </div>
        <div className="text-xs font-mono text-slate-400">
          Loaded Documents: <strong className="text-white">{documents.length}</strong>
        </div>
      </div>

      {/* Verification Registry Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-slate-800 bg-slate-950/40 flex items-center justify-between">
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400">
            Document Storage Fingerprint Ledger ({filteredDocs.length})
          </span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-500 text-xs font-mono">
            <RefreshCw className="animate-spin mx-auto mb-2 text-brand-400" size={20} />
            Loading integrity ledger...
          </div>
        ) : filteredDocs.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs font-mono">
            No documents found matching search criteria.
          </div>
        ) : (
          <div className="divide-y divide-slate-800">
            {filteredDocs.map((doc) => {
              const result = verificationResults[doc.id];
              const isVerifying = verifyingDocId === doc.id;

              return (
                <div key={doc.id} className="p-5 hover:bg-slate-800/40 transition space-y-3">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300">
                        <FileCheck2 size={18} />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-white flex items-center gap-2">
                          {doc.filename}
                          {result && (
                            <span
                              className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                                result.verified
                                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                                  : 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                              }`}
                            >
                              {result.status}
                            </span>
                          )}
                        </h4>
                        <p className="text-[11px] font-mono text-slate-400 mt-0.5">
                          ID: {doc.id} • Size: {(doc.file_size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => runIntegrityCheck(doc.id)}
                        disabled={isVerifying}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 flex items-center gap-1.5 transition disabled:opacity-50"
                      >
                        {isVerifying ? (
                          <>
                            <RefreshCw size={12} className="animate-spin text-brand-400" /> Computing SHA-256...
                          </>
                        ) : (
                          <>
                            <ShieldCheck size={13} className="text-emerald-400" /> Re-Verify On Disk
                          </>
                        )}
                      </button>
                      <Link
                        to={`/documents/${doc.id}`}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                        title="View Telemetry"
                      >
                        <ExternalLink size={14} />
                      </Link>
                    </div>
                  </div>

                  {/* Fingerprint Comparison Display */}
                  <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-xl space-y-2 text-xs font-mono">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <span className="text-[10px] text-slate-500 uppercase font-bold">Stored Original Hash</span>
                      <span className="text-slate-300 select-all truncate">{doc.sha256_hash}</span>
                    </div>

                    {result && (
                      <div className="pt-2 border-t border-slate-800/80 space-y-1">
                        <div className="flex items-center gap-2">
                          {result.verified ? (
                            <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
                          ) : (
                            <XCircle size={14} className="text-rose-400 shrink-0" />
                          )}
                          <span
                            className={
                              result.verified ? 'text-emerald-400 font-semibold' : 'text-rose-400 font-semibold'
                            }
                          >
                            {result.message}
                          </span>
                        </div>
                        {result.actual_hash && result.actual_hash !== doc.sha256_hash && (
                          <div className="text-[11px] text-rose-300 pt-1">
                            Discrepancy: Disk SHA-256 is <code className="select-all">{result.actual_hash}</code>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
