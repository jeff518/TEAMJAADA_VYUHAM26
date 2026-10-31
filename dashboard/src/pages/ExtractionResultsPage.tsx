import React, { useState, useEffect } from 'react';
import {
  Layers,
  Search,
  RefreshCw,
  FileText,
  Calendar,
  Building,
  Code,
  Table as TableIcon,
  ExternalLink,
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface DocumentItem {
  id: string;
  filename: string;
  door1_decision: string;
  door2_decision: string;
  final_decision: string;
  status: string;
  created_at: string;
}

export const ExtractionResultsPage: React.FC = () => {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<string>('');
  const [selectedReport, setSelectedReport] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'visual' | 'json'>('visual');
  const [searchTerm, setSearchTerm] = useState('');

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

  const filteredDocs = documents.filter((d) =>
    d.filename.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const entities = selectedReport?.extraction_results?.entities || {};
  const mathValidation = selectedReport?.extraction_results?.mathematical_validation || {};
  const lineItems: any[] = entities.line_items || [];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <Layers className="text-brand-400" size={24} />
            AI Extraction & Mathematical Validation Explorer
          </h1>
          <p className="text-xs text-slate-400 font-mono mt-1">
            Multimodal VLM Field Extraction • Line-Item Financial Arithmetic • Chronology Verification
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-1 flex items-center">
            <button
              onClick={() => setViewMode('visual')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition ${
                viewMode === 'visual'
                  ? 'bg-brand-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <TableIcon size={13} /> Visual Entity View
            </button>
            <button
              onClick={() => setViewMode('json')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition ${
                viewMode === 'json'
                  ? 'bg-brand-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Code size={13} /> Raw JSON Payload
            </button>
          </div>
          <button
            onClick={() => {
              fetchDocuments();
              if (selectedDocId) fetchReport(selectedDocId);
            }}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
            title="Refresh"
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* Main Grid: Document List + Extraction Details */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Target Document Selection */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 text-slate-500" size={14} />
              <input
                type="text"
                placeholder="Search extracted documents..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-brand-500 font-mono"
              />
            </div>

            <div className="space-y-1.5 max-h-[620px] overflow-y-auto pr-1">
              {filteredDocs.map((doc) => {
                const isSelected = doc.id === selectedDocId;
                const isExtracted = ['extracted', 'validated', 'matched', 'approved'].includes(doc.status.toLowerCase());
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
                          isExtracted
                            ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                            : 'bg-slate-800 text-slate-400 border-slate-700'
                        }`}
                      >
                        {doc.status.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-[10px] font-mono text-slate-400 mt-1.5">
                      Decision: {doc.final_decision} • {new Date(doc.created_at).toLocaleDateString()}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Visual Extracted Entities or JSON */}
        <div className="lg:col-span-8 space-y-6">
          {loading ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-400">
              <RefreshCw className="animate-spin mx-auto mb-3 text-brand-400" size={24} />
              <p className="text-xs font-mono">Loading extracted entities and math validation...</p>
            </div>
          ) : selectedReport ? (
            <>
              {/* Document Banner */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
                  <div>
                    <h2 className="text-sm font-bold text-white flex items-center gap-2">
                      <FileText size={16} className="text-brand-400" />
                      {selectedReport.filename}
                    </h2>
                    <p className="text-[11px] font-mono text-slate-400 mt-0.5">
                      Document ID: {selectedReport.document_id} • Status: {selectedReport.summary?.status}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link
                      to={`/documents/${selectedReport.document_id}`}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 flex items-center gap-1.5 transition"
                    >
                      Full Dossier <ExternalLink size={13} />
                    </Link>
                  </div>
                </div>

                {/* Key Financial Badges */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 block">
                      Total Amount
                    </span>
                    <span className="text-sm font-mono font-bold text-emerald-400 mt-1 inline-block">
                      ${entities.total_amount ? Number(entities.total_amount).toFixed(2) : '0.00'}{' '}
                      <span className="text-[10px] text-slate-400">{entities.currency || 'USD'}</span>
                    </span>
                  </div>

                  <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 block">
                      Invoice / Voucher #
                    </span>
                    <span className="text-xs font-mono font-bold text-slate-200 mt-1 inline-block select-all">
                      {entities.invoice_number || 'N/A'}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 block">
                      Math Validation
                    </span>
                    <span
                      className={`text-xs font-mono font-bold mt-1 inline-block ${
                        mathValidation.is_valid !== false ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {mathValidation.is_valid !== false ? 'VERIFIED' : 'DISCREPANCY'}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 block">
                      VLM Confidence
                    </span>
                    <span className="text-xs font-mono font-bold text-cyan-400 mt-1 inline-block">
                      {((entities.confidence_score || 0.95) * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
              </div>

              {viewMode === 'visual' ? (
                <>
                  {/* Entity Breakdown Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Vendor / Issuer */}
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-2.5">
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
                        <Building size={16} className="text-brand-400" />
                        <span>Vendor / Institution Details</span>
                      </div>
                      <div className="space-y-1.5 text-xs font-mono text-slate-300">
                        <div className="flex justify-between py-1 border-b border-slate-800/60">
                          <span className="text-slate-500">Name</span>
                          <span className="font-semibold text-slate-200">{entities.vendor_name || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-slate-800/60">
                          <span className="text-slate-500">Address</span>
                          <span className="text-slate-300 truncate max-w-[220px]">
                            {entities.vendor_address || 'N/A'}
                          </span>
                        </div>
                        <div className="flex justify-between py-1">
                          <span className="text-slate-500">Tax ID / TIN</span>
                          <span className="text-slate-300 select-all">{entities.vendor_tax_id || 'N/A'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Customer & Chronology */}
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-2.5">
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
                        <Calendar size={16} className="text-brand-400" />
                        <span>Customer & Billing Chronology</span>
                      </div>
                      <div className="space-y-1.5 text-xs font-mono text-slate-300">
                        <div className="flex justify-between py-1 border-b border-slate-800/60">
                          <span className="text-slate-500">Customer / Student</span>
                          <span className="font-semibold text-slate-200">{entities.customer_name || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-slate-800/60">
                          <span className="text-slate-500">Invoice Date</span>
                          <span className="text-slate-200">{entities.invoice_date || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between py-1">
                          <span className="text-slate-500">Due Date / Terms</span>
                          <span className="text-slate-200">{entities.due_date || entities.payment_terms || 'N/A'}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Line Items Table */}
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                    <div className="p-4 border-b border-slate-800 bg-slate-950/40 flex items-center justify-between">
                      <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                        <TableIcon size={14} className="text-brand-400" />
                        Extracted Line Items ({lineItems.length})
                      </span>
                    </div>

                    {lineItems.length === 0 ? (
                      <div className="p-8 text-center text-slate-500 text-xs font-mono">
                        No individual line items parsed from this document.
                      </div>
                    ) : (
                      <table className="w-full text-left text-xs font-mono">
                        <thead className="bg-slate-950/70 border-b border-slate-800 text-[10px] text-slate-400 uppercase">
                          <tr>
                            <th className="p-3.5">Description</th>
                            <th className="p-3.5 text-right">Qty</th>
                            <th className="p-3.5 text-right">Unit Price</th>
                            <th className="p-3.5 text-right">Amount</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800 text-slate-300">
                          {lineItems.map((item, idx) => (
                            <tr key={idx} className="hover:bg-slate-800/30">
                              <td className="p-3.5 font-medium text-slate-200">{item.description}</td>
                              <td className="p-3.5 text-right text-slate-400">{item.quantity}</td>
                              <td className="p-3.5 text-right text-slate-400">
                                ${item.unit_price ? Number(item.unit_price).toFixed(2) : '0.00'}
                              </td>
                              <td className="p-3.5 text-right font-bold text-slate-100">
                                ${item.amount ? Number(item.amount).toFixed(2) : '0.00'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </>
              ) : (
                /* Raw JSON View */
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl">
                  <pre className="p-4 bg-slate-950 rounded-xl text-xs font-mono text-emerald-400 overflow-x-auto max-h-[500px]">
                    {JSON.stringify(entities, null, 2)}
                  </pre>
                </div>
              )}
            </>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-500 text-xs font-mono">
              Select a document from the left to inspect extraction outputs.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
