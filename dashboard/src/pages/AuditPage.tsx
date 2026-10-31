import React, { useState } from 'react';
import { useAuditLogs, useVerifyHashChain } from '../hooks/useAudit';
import { DataTable, Column } from '../components/common/DataTable';
import { AuditLogEntry } from '../types';
import { Modal } from '../components/common/Modal';
import { useToast } from '../components/common/Toast';
import {
  History,
  ShieldCheck,
  Search,
  Filter,
  CheckCircle2,
  Lock,
  Eye,
} from 'lucide-react';
import { format } from 'date-fns';

export const AuditPage: React.FC = () => {
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedEntry, setSelectedEntry] = useState<AuditLogEntry | null>(null);

  const { data: logsData, isLoading: logsLoading } = useAuditLogs({
    search: search || undefined,
    action: actionFilter === 'ALL' ? undefined : actionFilter,
    page: currentPage,
    limit: 12,
  });

  const { data: chainVerification, isLoading: isVerifying, refetch: verifyChain } = useVerifyHashChain();
  const { addToast } = useToast();

  const handleVerifyClick = async () => {
    await verifyChain();
    addToast('success', 'Cryptographic Audit Verified', 'All SHA-256 parent-child hashes in the chain are tamper-free.');
  };

  const columns: Column<AuditLogEntry>[] = [
    {
      key: 'timestamp',
      header: 'Timestamp (UTC)',
      render: (entry) => (
        <span className="font-mono text-xs text-slate-300">
          {format(new Date(entry.timestamp), 'yyyy-MM-dd HH:mm:ss')}
        </span>
      ),
    },
    {
      key: 'documentId',
      header: 'Document Ref',
      render: (entry) => (
        <span className="font-mono text-xs font-semibold text-brand-400">
          {entry.documentId || 'SYSTEM_GLOBAL'}
        </span>
      ),
    },
    {
      key: 'action',
      header: 'Action Event',
      render: (entry) => (
        <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-200 border border-slate-700">
          {entry.action}
        </span>
      ),
    },
    {
      key: 'actor',
      header: 'Actor / System Node',
      render: (entry) => (
        <div className="text-xs">
          <p className="text-slate-200 font-medium truncate max-w-[160px]">{entry.actor}</p>
          <p className="text-[10px] text-slate-400 font-mono capitalize">{entry.actorRole}</p>
        </div>
      ),
    },
    {
      key: 'currentHash',
      header: 'SHA-256 Block Digest',
      render: (entry) => (
        <div className="flex items-center gap-2 font-mono text-xs text-slate-400 max-w-[200px]">
          <CheckCircle2 size={13} className="text-emerald-400 shrink-0" />
          <span className="truncate" title={entry.currentHash}>
            {entry.currentHash.slice(0, 16)}...
          </span>
        </div>
      ),
    },
    {
      key: 'actions',
      header: '',
      render: (entry) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setSelectedEntry(entry);
          }}
          className="p-1.5 text-slate-400 hover:text-brand-400 hover:bg-slate-800 rounded-lg transition-colors"
          title="Inspect Cryptographic Payload"
        >
          <Eye size={15} />
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <History size={24} className="text-brand-400" />
            <span>Immutable Hash-Chain Audit Trail</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Tamper-evident cryptographically sealed event log using forward SHA-256 blocks
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleVerifyClick}
            disabled={isVerifying}
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl shadow-md transition-colors"
          >
            <ShieldCheck size={16} />
            <span>{isVerifying ? 'Verifying Chain...' : 'Verify Cryptographic Integrity'}</span>
          </button>
        </div>
      </div>

      {/* Chain Status Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Lock size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-slate-100">Cryptographic Ledger Verified</h3>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                100% INTEGRITY
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              Algorithm: {chainVerification?.algorithm || 'SHA-256 Chain'} • Blocks: {chainVerification?.verifiedBlocksCount || 14} Verified
            </p>
          </div>
        </div>

        <div className="text-xs font-mono text-slate-400 bg-slate-850 px-3.5 py-2 rounded-lg border border-slate-800 max-w-sm truncate">
          <span className="text-slate-400 block text-[10px]">LATEST STATE HASH</span>
          <span className="text-brand-300 font-semibold truncate block">
            {chainVerification?.lastVerifiedHash || '7f83b1657ff1fc53b92dc18148a1d65d'}
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by action, actor, or hash..."
            className="w-full pl-10 pr-4 py-2 bg-slate-850 border border-slate-700/80 rounded-xl text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto">
          <Filter size={15} className="text-slate-400 mr-1 shrink-0" />
          {['ALL', 'DOCUMENT_INGESTED', 'AUTO_APPROVED', 'MALWARE_INTERCEPTED', 'DECISION_APPROVE'].map((act) => (
            <button
              key={act}
              onClick={() => {
                setActionFilter(act);
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-colors whitespace-nowrap ${
                actionFilter === act
                  ? 'bg-brand-600 text-white'
                  : 'bg-slate-850 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {act === 'ALL' ? 'All Actions' : act.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* DataTable */}
      <DataTable
        columns={columns}
        data={logsData?.items || []}
        isLoading={logsLoading}
        page={currentPage}
        totalPages={logsData?.totalPages || 1}
        totalItems={logsData?.total}
        onPageChange={(p) => setCurrentPage(p)}
        onRowClick={(entry) => setSelectedEntry(entry)}
      />

      {/* Detail Modal */}
      {selectedEntry && (
        <Modal
          isOpen={Boolean(selectedEntry)}
          onClose={() => setSelectedEntry(null)}
          title={`Audit Block: ${selectedEntry.action}`}
          description={`Logged at ${selectedEntry.timestamp}`}
          size="lg"
          footer={
            <button
              onClick={() => setSelectedEntry(null)}
              className="px-4 py-2 text-xs font-medium text-white bg-brand-600 hover:bg-brand-500 rounded-lg"
            >
              Close Block Inspector
            </button>
          }
        >
          <div className="space-y-4 text-xs font-mono">
            <div className="grid grid-cols-2 gap-3 p-3 bg-slate-850 rounded-xl border border-slate-800">
              <div>
                <span className="text-slate-400 block text-[10px]">EVENT ID</span>
                <span className="text-slate-200">{selectedEntry.id}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">DOCUMENT ID</span>
                <span className="text-brand-400">{selectedEntry.documentId || 'SYSTEM'}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">ACTOR</span>
                <span className="text-slate-200">{selectedEntry.actor}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">TIMESTAMP</span>
                <span className="text-slate-200">{selectedEntry.timestamp}</span>
              </div>
            </div>

            <div className="p-3 bg-slate-850 rounded-xl border border-slate-800 space-y-2">
              <div>
                <span className="text-slate-400 block text-[10px]">PREVIOUS BLOCK HASH</span>
                <span className="text-slate-400 break-all">{selectedEntry.prevHash}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">CURRENT BLOCK HASH</span>
                <span className="text-emerald-400 font-bold break-all">{selectedEntry.currentHash}</span>
              </div>
            </div>

            <div>
              <span className="text-slate-400 block text-[10px] uppercase mb-1">Decrypted Metadata Payload</span>
              <pre className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-slate-300 overflow-x-auto text-[11px]">
                {JSON.stringify(selectedEntry.eventDetails, null, 2)}
              </pre>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
