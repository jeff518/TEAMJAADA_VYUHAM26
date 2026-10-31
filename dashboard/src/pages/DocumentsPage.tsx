import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDocuments, useUploadDocument } from '../hooks/useDocuments';
import { DataTable, Column } from '../components/common/DataTable';
import { StatusBadge } from '../components/common/StatusBadge';
import { DocumentItem } from '../types';
import { Modal } from '../components/common/Modal';
import { useToast } from '../components/common/Toast';
import { Search, Filter, Upload, FileText, ArrowRight, ShieldCheck } from 'lucide-react';
import { format } from 'date-fns';

export const DocumentsPage: React.FC = () => {
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const navigate = useNavigate();
  const { addToast } = useToast();

  const { data, isLoading } = useDocuments({
    status: statusFilter === 'ALL' ? undefined : statusFilter,
    search: searchQuery || undefined,
    page: currentPage,
    limit: 10,
  });

  const { mutate: uploadDoc, isPending: isUploading } = useUploadDocument();

  const handleUploadSubmit = () => {
    if (!selectedFile) return;

    uploadDoc(selectedFile, {
      onSuccess: (newDoc) => {
        addToast('success', 'Document Ingested', `File ${newDoc.filename} added to pipeline.`);
        setIsUploadOpen(false);
        setSelectedFile(null);
      },
    });
  };

  const columns: Column<DocumentItem>[] = [
    {
      key: 'filename',
      header: 'Document & Identifier',
      render: (doc) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 shrink-0">
            <FileText size={16} />
          </div>
          <div>
            <span className="font-semibold text-slate-100 block">{doc.filename}</span>
            <span className="text-[11px] font-mono text-slate-400">{doc.id}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'uploadedAt',
      header: 'Ingested',
      render: (doc) => (
        <div className="font-mono text-xs text-slate-300">
          <div>{format(new Date(doc.uploadedAt), 'yyyy-MM-dd')}</div>
          <div className="text-[10px] text-slate-400">{format(new Date(doc.uploadedAt), 'HH:mm:ss')} UTC</div>
        </div>
      ),
    },
    {
      key: 'vendor',
      header: 'Vendor Master',
      render: (doc) => (
        <span className="text-xs font-medium text-slate-300">
          {doc.extractedData?.vendorName || <span className="text-slate-400 italic">Unidentified</span>}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Security Verdict',
      render: (doc) => <StatusBadge status={doc.status} size="sm" />,
    },
    {
      key: 'riskScore',
      header: 'Risk Score',
      render: (doc) => {
        let color = 'text-emerald-400';
        if (doc.overallRiskScore > 70) color = 'text-rose-400';
        else if (doc.overallRiskScore > 30) color = 'text-amber-400';
        return (
          <span className={`font-mono font-bold text-xs ${color}`}>
            {doc.overallRiskScore}/100
          </span>
        );
      },
    },
    {
      key: 'totalAmount',
      header: 'Amount (USD)',
      render: (doc) => (
        <span className="font-mono text-xs font-semibold text-slate-200">
          {doc.extractedData?.totalAmount
            ? `$${doc.extractedData.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
            : '—'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      render: (doc) => (
        <div className="flex justify-end">
          <button
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/documents/${doc.id}`);
            }}
            className="p-1.5 text-slate-400 hover:text-brand-400 hover:bg-slate-800 rounded-lg transition-colors"
            title="Inspect Pipeline Details"
          >
            <ArrowRight size={16} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <ShieldCheck size={24} className="text-brand-400" />
            <span>Document Repository & Pipeline Registry</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Complete cryptographic audit trail and multi-door verification records
          </p>
        </div>

        <button
          onClick={() => setIsUploadOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold rounded-xl shadow-md transition-all self-start sm:self-auto"
        >
          <Upload size={15} />
          <span>Ingest New Document</span>
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl flex flex-col md:flex-row gap-4 justify-between items-center">
        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search by ID, filename, or vendor..."
            className="w-full pl-10 pr-4 py-2 bg-slate-850 border border-slate-700/80 rounded-xl text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>

        {/* Status Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          <Filter size={15} className="text-slate-400 mr-1 shrink-0" />
          {['ALL', 'ALLOW', 'QUARANTINE', 'BLOCK', 'PENDING'].map((status) => (
            <button
              key={status}
              onClick={() => {
                setStatusFilter(status);
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-colors whitespace-nowrap ${
                statusFilter === status
                  ? 'bg-brand-600 text-white font-semibold'
                  : 'bg-slate-850 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Documents Table */}
      <DataTable
        columns={columns}
        data={data?.items || []}
        isLoading={isLoading}
        page={currentPage}
        totalPages={data?.totalPages || 1}
        totalItems={data?.total}
        onPageChange={(p) => setCurrentPage(p)}
        onRowClick={(doc) => navigate(`/documents/${doc.id}`)}
      />

      {/* Upload Modal */}
      <Modal
        isOpen={isUploadOpen}
        onClose={() => {
          setIsUploadOpen(false);
          setSelectedFile(null);
        }}
        title="Upload File to SecureDoc Pipeline"
        description="Select a document for zero-trust multi-door inspection."
        footer={
          <>
            <button
              onClick={() => {
                setIsUploadOpen(false);
                setSelectedFile(null);
              }}
              className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              onClick={handleUploadSubmit}
              disabled={!selectedFile || isUploading}
              className="px-4 py-2 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-md"
            >
              {isUploading ? 'Ingesting...' : 'Ingest Document'}
            </button>
          </>
        }
      >
        <div className="p-6 border-2 border-dashed border-slate-700 bg-slate-850 rounded-xl text-center">
          <input
            type="file"
            onChange={(e) => e.target.files && setSelectedFile(e.target.files[0])}
            className="text-xs text-slate-300"
          />
          {selectedFile && (
            <p className="mt-2 text-xs font-mono text-emerald-400">
              Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
            </p>
          )}
        </div>
      </Modal>
    </div>
  );
};
