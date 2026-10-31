import React, { useState, useEffect } from 'react';
import {
  Copy,
  FileText,
  Search,
  RefreshCw,
  Fingerprint,
  ArrowRight,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface DocumentItem {
  id: string;
  filename: string;
  file_size: number;
  mime_type: string;
  sha256_hash: string;
  status: string;
  is_duplicate: boolean;
  duplicate_of: string | null;
  created_at: string;
}

export const DuplicateDetectionPage: React.FC = () => {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
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

  const duplicates = documents.filter((d) => d.is_duplicate);
  const filteredDuplicates = duplicates.filter(
    (d) =>
      d.filename.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.sha256_hash.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (d.duplicate_of && d.duplicate_of.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <Copy className="text-brand-400" size={24} />
            Duplicate Document Detection Registry
          </h1>
          <p className="text-xs text-slate-400 font-mono mt-1">
            Exact SHA-256 Fingerprint Matching • Non-Malware Content Collision Tracking
          </p>
        </div>
        <button
          onClick={fetchDocuments}
          className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 flex items-center gap-2 transition"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh Registry
        </button>
      </div>

      {/* Info Notice */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
          <AlertCircle size={20} />
        </div>
        <div className="space-y-1 text-xs">
          <h3 className="font-semibold text-slate-200">Cryptographic Identity Separation</h3>
          <p className="text-slate-400 leading-relaxed">
            Duplicate detection is an integrity check, not malware detection. When identical document fingerprints are
            uploaded, DocuPilot AI quarantines the replica, cross-references the original document, and preserves independent
            audit logging without raising false positive security alerts.
          </p>
        </div>
      </div>

      {/* Search and Stats Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative max-w-md w-full">
          <Search className="absolute left-3 top-2.5 text-slate-500" size={14} />
          <input
            type="text"
            placeholder="Search by filename, SHA-256, or parent ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-brand-500 font-mono"
          />
        </div>
        <div className="flex items-center gap-3 text-xs font-mono text-slate-400">
          <span>Total Duplicates: <strong className="text-amber-400">{duplicates.length}</strong></span>
          <span>•</span>
          <span>Unique Ingestions: <strong className="text-emerald-400">{documents.length - duplicates.length}</strong></span>
        </div>
      </div>

      {/* Duplicate Records Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-slate-800 bg-slate-950/40 flex items-center justify-between">
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400">
            Detected Duplicate Ingestions ({filteredDuplicates.length})
          </span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-500 text-xs font-mono">
            <RefreshCw className="animate-spin mx-auto mb-2 text-brand-400" size={20} />
            Scanning fingerprint index...
          </div>
        ) : filteredDuplicates.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs font-mono">
            No duplicate document uploads found matching your search.
          </div>
        ) : (
          <div className="divide-y divide-slate-800">
            {filteredDuplicates.map((item) => (
              <div key={item.id} className="p-5 hover:bg-slate-800/40 transition space-y-3">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                      <FileText size={18} />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white flex items-center gap-2">
                        {item.filename}
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          DUPLICATE
                        </span>
                      </h4>
                      <p className="text-[11px] font-mono text-slate-400 mt-0.5">
                        Uploaded: {new Date(item.created_at).toLocaleString()} • Size: {(item.file_size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Link
                      to={`/documents/${item.id}`}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 flex items-center gap-1.5 transition font-medium"
                    >
                      Inspect Duplicate <ExternalLink size={13} />
                    </Link>
                  </div>
                </div>

                {/* Fingerprint & Parent Comparison Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
                  {/* Matching SHA-256 */}
                  <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl flex items-center gap-2.5">
                    <Fingerprint size={16} className="text-brand-400 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] text-slate-500 block uppercase font-bold">Matching SHA-256 Hash</span>
                      <span className="text-slate-300 select-all truncate block">{item.sha256_hash}</span>
                    </div>
                  </div>

                  {/* Reference to Parent Document */}
                  <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl flex items-center justify-between gap-2.5">
                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] text-slate-500 block uppercase font-bold">Original Document Parent</span>
                      <span className="text-brand-400 font-bold select-all truncate block">{item.duplicate_of || 'Root Record'}</span>
                    </div>
                    {item.duplicate_of && (
                      <Link
                        to={`/documents/${item.duplicate_of}`}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition shrink-0"
                        title="View Original Document"
                      >
                        <ArrowRight size={14} />
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
