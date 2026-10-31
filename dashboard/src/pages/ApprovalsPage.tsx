import React, { useState } from 'react';
import { usePendingApprovals } from '../hooks/useApproval';
import { ApprovalCard } from '../components/approval/ApprovalCard';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { EmptyState } from '../components/common/EmptyState';
import { CheckSquare, ShieldAlert, AlertTriangle, Filter, Search } from 'lucide-react';

export const ApprovalsPage: React.FC = () => {
  const { data: pendingDocs, isLoading, refetch } = usePendingApprovals();
  const [filterRisk, setFilterRisk] = useState<'ALL' | 'HIGH' | 'MEDIUM'>('ALL');
  const [search, setSearch] = useState('');

  const filtered = (pendingDocs || []).filter((doc) => {
    if (filterRisk === 'HIGH' && doc.overallRiskScore < 50) return false;
    if (filterRisk === 'MEDIUM' && (doc.overallRiskScore < 20 || doc.overallRiskScore >= 50)) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        doc.filename.toLowerCase().includes(q) ||
        doc.id.toLowerCase().includes(q) ||
        doc.extractedData?.vendorName.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const highRiskCount = (pendingDocs || []).filter((d) => d.overallRiskScore >= 50).length;
  const bankFlagCount = (pendingDocs || []).filter((d) => d.matchingResults?.vendorVerification?.bankDetailsMatch === false).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <CheckSquare size={24} className="text-brand-400" />
            <span>Human-in-the-Loop Approval Queue</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Documents quarantined or escalated for sign-off based on multi-door risk policies
          </p>
        </div>

        <button
          onClick={() => refetch()}
          className="px-3.5 py-2 text-xs font-mono font-medium text-slate-300 bg-slate-800 hover:bg-slate-750 border border-slate-700 rounded-xl transition-colors self-start sm:self-auto"
        >
          Refresh Queue
        </button>
      </div>

      {/* Metrics Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <span className="text-xs font-mono text-slate-400 uppercase">Total Awaiting Review</span>
          <div className="mt-1 text-2xl font-bold font-mono text-blue-400">
            {pendingDocs?.length || 0}
          </div>
          <span className="text-[11px] text-slate-400">Escalated by policy rules</span>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <span className="text-xs font-mono text-slate-400 uppercase">High Risk (&gt;50)</span>
          <div className="mt-1 text-2xl font-bold font-mono text-rose-400 flex items-center gap-2">
            <ShieldAlert size={20} />
            <span>{highRiskCount}</span>
          </div>
          <span className="text-[11px] text-slate-400">Requires executive sign-off</span>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <span className="text-xs font-mono text-slate-400 uppercase">Bank Mismatches</span>
          <div className="mt-1 text-2xl font-bold font-mono text-amber-400 flex items-center gap-2">
            <AlertTriangle size={20} />
            <span>{bankFlagCount}</span>
          </div>
          <span className="text-[11px] text-slate-400">IBAN divergence detected</span>
        </div>
      </div>

      {/* Filter toolbar */}
      <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search pending documents..."
            className="w-full pl-10 pr-4 py-2 bg-slate-850 border border-slate-700/80 rounded-xl text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <Filter size={15} className="text-slate-400 mr-1" />
          <button
            onClick={() => setFilterRisk('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-colors ${
              filterRisk === 'ALL'
                ? 'bg-brand-600 text-white'
                : 'bg-slate-850 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            All Pending ({pendingDocs?.length || 0})
          </button>
          <button
            onClick={() => setFilterRisk('HIGH')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-colors ${
              filterRisk === 'HIGH'
                ? 'bg-rose-600 text-white'
                : 'bg-slate-850 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            High Risk ({highRiskCount})
          </button>
        </div>
      </div>

      {/* Approvals Grid */}
      {isLoading ? (
        <div className="py-16">
          <LoadingSpinner text="Loading approval queue..." />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No Documents Pending Approval"
          description="All ingested documents have either passed straight-through automated policy checks or have already been decided."
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filtered.map((doc) => (
            <ApprovalCard key={doc.id} document={doc} />
          ))}
        </div>
      )}
    </div>
  );
};
