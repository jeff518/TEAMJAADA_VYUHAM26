import React, { useState } from 'react';
import { useDashboardStats } from '../hooks/useDashboard';
import { useDocuments, useUploadDocument } from '../hooks/useDocuments';
import { StatsCards } from '../components/charts/StatsCards';
import { ActivityChart } from '../components/charts/ActivityChart';
import { StatusPieChart } from '../components/charts/StatusPieChart';
import { DocumentCard } from '../components/documents/DocumentCard';
import { Modal } from '../components/common/Modal';
import { useToast } from '../components/common/Toast';
import { Upload, FileUp, Shield, ArrowRight, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';

export const DashboardPage: React.FC = () => {
  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useDashboardStats();
  const { data: recentDocs, isLoading: docsLoading } = useDocuments({ limit: 4 });
  const { mutate: uploadDoc, isPending: isUploading } = useUploadDocument();
  const { addToast } = useToast();

  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUploadSubmit = () => {
    if (!selectedFile) return;

    uploadDoc(selectedFile, {
      onSuccess: (newDoc) => {
        addToast('success', 'Document Ingested', `File ${newDoc.filename} is now running through 4-Door gates.`);
        setIsUploadModalOpen(false);
        setSelectedFile(null);
      },
      onError: () => {
        addToast('error', 'Upload failed', 'Failed to process document through pipeline.');
      },
    });
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <span>Pipeline Intelligence Hub</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1 font-mono">
            Zero-Trust Pre-Execution • ClamAV Sandbox • Gemini 1.5 Extraction • 3-Way Match
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => refetchStats()}
            className="p-2.5 text-slate-400 hover:text-white bg-slate-900 border border-slate-800 rounded-xl hover:border-slate-700 transition-colors"
            title="Refresh statistics"
          >
            <RefreshCw size={16} />
          </button>

          <button
            onClick={() => setIsUploadModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-brand-600/30 transition-all duration-150"
          >
            <Upload size={16} />
            <span>Upload Document</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <StatsCards stats={stats} isLoading={statsLoading} />

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <ActivityChart data={stats?.activityTrends} />
        </div>
        <div>
          <StatusPieChart data={stats?.statusBreakdown} />
        </div>
      </div>

      {/* Recent Ingested Documents Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-100 flex items-center gap-2">
              <Shield size={18} className="text-brand-400" />
              <span>Recent Pipeline Ingestions</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">Live feed of documents passing multi-door security inspection</p>
          </div>
          <Link
            to="/documents"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-brand-400 hover:text-brand-300 transition-colors"
          >
            <span>View All Documents</span>
            <ArrowRight size={14} />
          </Link>
        </div>

        {docsLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-44 bg-slate-900/60 rounded-xl animate-pulse border border-slate-800" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {recentDocs?.items.map((doc) => (
              <DocumentCard key={doc.id} document={doc} />
            ))}
          </div>
        )}
      </div>

      {/* Upload Modal */}
      <Modal
        isOpen={isUploadModalOpen}
        onClose={() => {
          setIsUploadModalOpen(false);
          setSelectedFile(null);
        }}
        title="Ingest Document into Security Pipeline"
        description="File will undergo Door 1 pre-execution format checks, ClamAV scanning, and sandbox isolation."
        footer={
          <>
            <button
              onClick={() => {
                setIsUploadModalOpen(false);
                setSelectedFile(null);
              }}
              className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleUploadSubmit}
              disabled={!selectedFile || isUploading}
              className="px-4 py-2 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-md transition-colors"
            >
              {isUploading ? 'Executing Security Gates...' : 'Start Pipeline Ingestion'}
            </button>
          </>
        }
      >
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${
            dragActive
              ? 'border-brand-500 bg-brand-500/10'
              : 'border-slate-700 bg-slate-850 hover:border-slate-600'
          }`}
        >
          <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400 mx-auto mb-3">
            <FileUp size={24} className="text-brand-400" />
          </div>
          {selectedFile ? (
            <div>
              <p className="text-sm font-semibold text-slate-200">{selectedFile.name}</p>
              <p className="text-xs text-slate-400 font-mono mt-1">
                {(selectedFile.size / 1024).toFixed(1)} KB • {selectedFile.type || 'Binary Document'}
              </p>
              <button
                type="button"
                onClick={() => setSelectedFile(null)}
                className="mt-3 text-xs text-rose-400 hover:underline"
              >
                Choose a different file
              </button>
            </div>
          ) : (
            <div>
              <p className="text-sm font-medium text-slate-200">
                Drag and drop your PDF or invoice document here
              </p>
              <p className="text-xs text-slate-400 mt-1 mb-4">Supported: PDF, TIFF, PNG up to 20MB</p>
              <label className="inline-flex items-center px-4 py-2 bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-medium rounded-lg cursor-pointer border border-slate-700 transition-colors">
                <span>Browse Files</span>
                <input
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg,.tiff"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};
