import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useDocument, useReprocessDocument } from '../hooks/useDocuments';
import { StatusBadge } from '../components/common/StatusBadge';
import { PipelineProgress } from '../components/documents/PipelineProgress';
import { SecurityResults } from '../components/documents/SecurityResults';
import { ExtractionDisplay } from '../components/documents/ExtractionDisplay';
import { MatchingResults } from '../components/documents/MatchingResults';
import { AuditTimeline } from '../components/audit/AuditTimeline';
import { ApprovalCard } from '../components/approval/ApprovalCard';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { useToast } from '../components/common/Toast';
import {
  ArrowLeft,
  RefreshCw,
  Hash,
  HardDrive,
  User,
  Calendar,
  ShieldCheck,
  CheckCircle2,
  Download,
} from 'lucide-react';
import { format } from 'date-fns';

export const DocumentDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { data: document, isLoading, error } = useDocument(id);
  const { mutate: reprocess, isPending: isReprocessing } = useReprocessDocument();
  const { addToast } = useToast();

  if (isLoading) {
    return (
      <div className="py-24">
        <LoadingSpinner text="Retrieving cryptographic record and pipeline state..." size="lg" />
      </div>
    );
  }

  if (error || !document) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center max-w-lg mx-auto">
        <ShieldCheck size={40} className="mx-auto text-rose-400 mb-3" />
        <h3 className="text-lg font-bold text-slate-100">Document Not Found</h3>
        <p className="text-xs text-slate-400 mt-1 mb-6">
          The requested document identifier <span className="font-mono text-slate-300">{id}</span> does not exist in the ledger.
        </p>
        <Link
          to="/documents"
          className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold rounded-lg"
        >
          <ArrowLeft size={14} />
          <span>Back to Documents</span>
        </Link>
      </div>
    );
  }

  const handleReprocess = () => {
    reprocess(document.id, {
      onSuccess: () => {
        addToast('success', 'Pipeline Re-triggered', `Re-evaluating document ${document.id} across 4 security doors.`);
      },
    });
  };

  return (
    <div className="space-y-8">
      {/* Back button & Action row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Link
          to="/documents"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft size={16} />
          <span>Back to Repository</span>
        </Link>

        <div className="flex items-center gap-3">
          <button
            onClick={handleReprocess}
            disabled={isReprocessing}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-medium border border-slate-700 rounded-xl transition-colors disabled:opacity-50"
          >
            <RefreshCw size={14} className={isReprocessing ? 'animate-spin' : ''} />
            <span>Reprocess Pipeline</span>
          </button>

          <button
            onClick={() => addToast('info', 'Download Initiated', 'Retrieving sandboxed sanitized artifact...')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-medium border border-slate-700 rounded-xl transition-colors"
          >
            <Download size={14} />
            <span>Download Artifact</span>
          </button>
        </div>
      </div>

      {/* Main Document Summary Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-xl font-bold tracking-tight text-white">{document.filename}</h1>
              <StatusBadge status={document.status} size="md" />
            </div>
            <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
              <Hash size={13} className="text-brand-400" />
              <span>{document.id}</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <span className="text-[10px] font-mono text-slate-400 uppercase block">Security Risk Score</span>
              <span
                className={`text-2xl font-mono font-bold ${
                  document.overallRiskScore > 70
                    ? 'text-rose-400'
                    : document.overallRiskScore > 30
                    ? 'text-amber-400'
                    : 'text-emerald-400'
                }`}
              >
                {document.overallRiskScore}/100
              </span>
            </div>
          </div>
        </div>

        {/* Metadata Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 text-xs font-mono text-slate-400">
          <div>
            <span className="flex items-center gap-1.5 text-slate-400 mb-1">
              <HardDrive size={13} /> Size & Format
            </span>
            <span className="text-slate-200 font-semibold">
              {(document.fileSize / 1024).toFixed(1)} KB ({document.mimeType})
            </span>
          </div>

          <div>
            <span className="flex items-center gap-1.5 text-slate-400 mb-1">
              <Calendar size={13} /> Ingestion Timestamp
            </span>
            <span className="text-slate-200 font-semibold">
              {format(new Date(document.uploadedAt), 'yyyy-MM-dd HH:mm:ss')}
            </span>
          </div>

          <div>
            <span className="flex items-center gap-1.5 text-slate-400 mb-1">
              <User size={13} /> Ingested By
            </span>
            <span className="text-slate-200 font-semibold truncate block" title={document.uploadedBy}>
              {document.uploadedBy}
            </span>
          </div>

          <div>
            <span className="flex items-center gap-1.5 text-slate-400 mb-1">
              <CheckCircle2 size={13} className="text-emerald-400" /> Audit Ledger
            </span>
            <span className="text-emerald-400 font-semibold">Immutable Hash OK</span>
          </div>
        </div>

        {/* SHA-256 Hash Display */}
        <div className="mt-4 p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-[11px] font-mono flex items-center justify-between gap-2 overflow-hidden">
          <span className="text-slate-400 shrink-0 uppercase text-[10px]">SHA-256 Digest:</span>
          <span className="text-brand-300 truncate font-semibold">{document.sha256}</span>
        </div>
      </div>

      {/* Visual Pipeline Progress */}
      <PipelineProgress steps={document.pipelineSteps} />

      {/* Security 4-Door Results */}
      <SecurityResults securityResults={document.securityResults} />

      {/* Extracted Invoice Data */}
      <ExtractionDisplay data={document.extractedData} />

      {/* Three-Way Matching Results */}
      <MatchingResults matching={document.matchingResults} />

      {/* Approval Decision Card (if pending or review needed) */}
      {document.approval && (
        <div className="space-y-3">
          <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2">
            <ShieldCheck size={18} className="text-brand-400" />
            <span>Human-in-the-Loop Approval Action</span>
          </h3>
          <ApprovalCard document={document} />
        </div>
      )}

      {/* Cryptographic SHA-256 Audit Trail */}
      <AuditTimeline entries={document.auditTrail} />
    </div>
  );
};
