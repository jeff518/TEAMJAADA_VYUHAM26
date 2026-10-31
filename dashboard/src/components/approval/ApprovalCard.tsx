import React, { useState } from 'react';
import { DocumentItem } from '../../types';
import { StatusBadge } from '../common/StatusBadge';
import { useApprovalAction } from '../../hooks/useApproval';
import { useToast } from '../common/Toast';
import { Check, X, HelpCircle, FileText, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';

interface ApprovalCardProps {
  document: DocumentItem;
}

export const ApprovalCard: React.FC<ApprovalCardProps> = ({ document }) => {
  const [comment, setComment] = useState('');
  const [showCommentBox, setShowCommentBox] = useState(false);
  const [pendingAction, setPendingAction] = useState<'APPROVE' | 'REJECT' | 'REQUEST_VERIFICATION' | null>(null);

  const { mutate: performAction, isPending } = useApprovalAction();
  const { addToast } = useToast();

  const handleActionClick = (action: 'APPROVE' | 'REJECT' | 'REQUEST_VERIFICATION') => {
    setPendingAction(action);
    setShowCommentBox(true);
  };

  const handleConfirmAction = () => {
    if (!pendingAction) return;

    performAction(
      {
        documentId: document.id,
        action: pendingAction,
        comment: comment.trim() || undefined,
      },
      {
        onSuccess: () => {
          addToast(
            pendingAction === 'APPROVE' ? 'success' : pendingAction === 'REJECT' ? 'error' : 'warning',
            `Document ${pendingAction.toLowerCase()}d successfully`,
            `Document ${document.id} was processed.`
          );
          setShowCommentBox(false);
          setPendingAction(null);
          setComment('');
        },
        onError: () => {
          addToast('error', 'Action failed', 'Failed to submit approval decision. Please try again.');
        },
      }
    );
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm flex flex-col justify-between">
      <div>
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300">
              <FileText size={20} />
            </div>
            <div>
              <Link
                to={`/documents/${document.id}`}
                className="text-sm font-semibold text-slate-100 hover:text-brand-400 transition-colors"
              >
                {document.filename}
              </Link>
              <p className="text-xs font-mono text-slate-400">{document.id}</p>
            </div>
          </div>
          <StatusBadge status={document.status} size="sm" />
        </div>

        {/* Quarantine or Risk alert */}
        {document.overallRiskScore > 40 && (
          <div className="mb-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 flex items-start gap-2">
            <AlertTriangle size={15} className="text-amber-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold">Review Alert:</span> Risk score is{' '}
              <span className="font-mono font-bold text-amber-200">{document.overallRiskScore}/100</span>.
              {document.approval.policyTriggered && (
                <span className="block text-[11px] font-mono text-amber-400 mt-0.5">
                  Policy: {document.approval.policyTriggered}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Document Stats Breakdown */}
        <div className="grid grid-cols-2 gap-3 text-xs font-mono mb-4 p-3 bg-slate-850 rounded-xl border border-slate-800">
          <div>
            <span className="text-slate-400 text-[10px] uppercase">Vendor</span>
            <p className="text-slate-200 font-semibold truncate">{document.extractedData?.vendorName || 'Unspecified'}</p>
          </div>
          <div>
            <span className="text-slate-400 text-[10px] uppercase">Total Billed</span>
            <p className="text-emerald-400 font-bold">
              ${document.extractedData?.totalAmount ? document.extractedData.totalAmount.toLocaleString() : 'N/A'}
            </p>
          </div>
          <div>
            <span className="text-slate-400 text-[10px] uppercase">PO Number</span>
            <p className="text-slate-300">{document.extractedData?.poNumber || 'None Attached'}</p>
          </div>
          <div>
            <span className="text-slate-400 text-[10px] uppercase">3-Way Match</span>
            <p className="text-slate-300 font-semibold">
              {document.matchingResults?.overallScore !== undefined ? `${document.matchingResults.overallScore}%` : 'N/A'}
            </p>
          </div>
        </div>
      </div>

      {/* Decision Section */}
      <div className="pt-4 border-t border-slate-800 space-y-3">
        {showCommentBox ? (
          <div className="space-y-3 bg-slate-950 p-3 rounded-xl border border-slate-800">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-200">
                Confirm {pendingAction?.replace('_', ' ')}:
              </span>
              <button
                onClick={() => {
                  setShowCommentBox(false);
                  setPendingAction(null);
                }}
                className="text-slate-400 hover:text-slate-200 text-xs"
              >
                Cancel
              </button>
            </div>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Enter approval rationale or audit note (optional)..."
              rows={2}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
            <button
              onClick={handleConfirmAction}
              disabled={isPending}
              className={`w-full py-2 px-3 rounded-lg text-xs font-semibold text-white transition-colors disabled:opacity-50 ${
                pendingAction === 'APPROVE'
                  ? 'bg-emerald-600 hover:bg-emerald-500'
                  : pendingAction === 'REJECT'
                  ? 'bg-rose-600 hover:bg-rose-500'
                  : 'bg-amber-600 hover:bg-amber-500'
              }`}
            >
              {isPending ? 'Logging Decision...' : `Confirm ${pendingAction?.replace('_', ' ')}`}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => handleActionClick('APPROVE')}
              className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-medium transition-colors"
            >
              <Check size={14} />
              <span>Approve</span>
            </button>
            <button
              onClick={() => handleActionClick('REQUEST_VERIFICATION')}
              className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-medium transition-colors"
            >
              <HelpCircle size={14} />
              <span>Verify</span>
            </button>
            <button
              onClick={() => handleActionClick('REJECT')}
              className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-medium transition-colors"
            >
              <X size={14} />
              <span>Reject</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
