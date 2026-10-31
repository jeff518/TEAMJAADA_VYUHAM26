import React from 'react';
import { Link } from 'react-router-dom';
import { DocumentItem } from '../../types';
import { StatusBadge } from '../common/StatusBadge';
import { FileText, ArrowRight, ShieldCheck } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface DocumentCardProps {
  document: DocumentItem;
}

export const DocumentCard: React.FC<DocumentCardProps> = ({ document }) => {
  const timeAgo = formatDistanceToNow(new Date(document.uploadedAt), { addSuffix: true });

  let riskColor = 'text-emerald-400';
  if (document.overallRiskScore > 70) riskColor = 'text-rose-400';
  else if (document.overallRiskScore > 30) riskColor = 'text-amber-400';

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition-all duration-200 shadow-sm flex flex-col justify-between">
      <div>
        {/* Header row */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 shrink-0">
              <FileText size={18} />
            </div>
            <div className="min-w-0">
              <h4 className="text-sm font-semibold text-slate-100 truncate" title={document.filename}>
                {document.filename}
              </h4>
              <p className="text-[11px] font-mono text-slate-400">{document.id}</p>
            </div>
          </div>
          <StatusBadge status={document.status} size="sm" />
        </div>

        {/* Metadata pills */}
        <div className="grid grid-cols-2 gap-2 text-xs font-mono my-3 p-2.5 rounded-lg bg-slate-850 border border-slate-800">
          <div>
            <span className="text-slate-400 text-[10px] uppercase block">Risk Score</span>
            <span className={`font-bold ${riskColor}`}>{document.overallRiskScore}/100</span>
          </div>
          <div>
            <span className="text-slate-400 text-[10px] uppercase block">Amount</span>
            <span className="text-slate-200 font-bold">
              {document.extractedData?.totalAmount
                ? `$${document.extractedData.totalAmount.toLocaleString()}`
                : 'N/A'}
            </span>
          </div>
        </div>

        {/* Vendor & Details */}
        <div className="text-xs text-slate-400 space-y-1 mb-4">
          <p className="truncate">
            <span className="text-slate-400">Vendor:</span>{' '}
            <span className="text-slate-200 font-medium">{document.extractedData?.vendorName || 'Pending / Unidentified'}</span>
          </p>
          <p className="text-[11px] text-slate-400 font-mono">Uploaded {timeAgo}</p>
        </div>
      </div>

      {/* Action Footer */}
      <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-400">
          <ShieldCheck size={13} className="text-brand-400" />
          <span>4 Doors Inspected</span>
        </div>
        <Link
          to={`/documents/${document.id}`}
          className="inline-flex items-center gap-1 text-xs font-medium text-brand-400 hover:text-brand-300 transition-colors"
        >
          <span>View Pipeline</span>
          <ArrowRight size={13} />
        </Link>
      </div>
    </div>
  );
};
