import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../components/common/Toast';
import {
  Settings,
  User,
  Bell,
  Sliders,
  Shield,
  Save,
  Lock,
} from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { user, updateUser } = useAuth();
  const { addToast } = useToast();

  // Profile state
  const [name, setName] = useState(user?.name || 'Elena Rostova');
  const [department, setDepartment] = useState(user?.department || 'Information Security');

  // Notification state
  const [notifyOnQuarantine, setNotifyOnQuarantine] = useState(true);
  const [notifyOnMalware, setNotifyOnMalware] = useState(true);
  const [dailyDigest, setDailyDigest] = useState(false);

  // System settings state (Admin)
  const [maxFileSizeMb, setMaxFileSizeMb] = useState(20);
  const [matchTolerancePct, setMatchTolerancePct] = useState(1.0);
  const [clamavTimeoutMs, setClamavTimeoutMs] = useState(5000);
  const [extractionModel, setExtractionModel] = useState('gemini-1.5-pro');
  const [stpThreshold, setStpThreshold] = useState(95);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    updateUser({ name, department });
    addToast('success', 'Profile Updated', 'User profile preferences saved successfully.');
  };

  const handleSaveSystem = (e: React.FormEvent) => {
    e.preventDefault();
    addToast('success', 'Security Policy Updated', 'Pipeline gate parameters and thresholds updated in cluster.');
  };

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
          <Settings size={24} className="text-brand-400" />
          <span>System & Security Governance</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1 font-mono">
          Manage pipeline parameters, human-in-the-loop policies, and user notifications
        </p>
      </div>

      {/* User Profile Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
          <User size={18} className="text-brand-400" />
          <h2 className="text-sm font-semibold text-slate-100">Operator Profile</h2>
        </div>

        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-850 border border-slate-700 rounded-lg text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Department</label>
              <input
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full px-3 py-2 bg-slate-850 border border-slate-700 rounded-lg text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Email Address</label>
              <input
                type="email"
                disabled
                value={user?.email || 'security.lead@securedoc.internal'}
                className="w-full px-3 py-2 bg-slate-800/60 border border-slate-800 rounded-lg text-xs text-slate-400 cursor-not-allowed font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">System Role</label>
              <div className="flex items-center gap-2 px-3 py-2 bg-slate-800/60 border border-slate-800 rounded-lg text-xs text-slate-400 font-mono capitalize">
                <Lock size={13} className="text-brand-400" />
                <span>{user?.role || 'admin'} (Zero-Trust Master)</span>
              </div>
            </div>
          </div>

          <button
            type="submit"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold rounded-lg shadow-md transition-colors"
          >
            <Save size={14} />
            <span>Save Profile</span>
          </button>
        </form>
      </div>

      {/* Notification Preferences */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
          <Bell size={18} className="text-brand-400" />
          <h2 className="text-sm font-semibold text-slate-100">Security Notifications & Alerts</h2>
        </div>

        <div className="space-y-3">
          <label className="flex items-center justify-between p-3 rounded-lg bg-slate-850 border border-slate-800 cursor-pointer">
            <div>
              <span className="text-xs font-semibold text-slate-200 block">Instant Quarantine Alerts</span>
              <span className="text-[11px] text-slate-400">Trigger immediate webhooks when Door 4 detects bank account changes</span>
            </div>
            <input
              type="checkbox"
              checked={notifyOnQuarantine}
              onChange={(e) => setNotifyOnQuarantine(e.target.checked)}
              className="rounded border-slate-700 bg-slate-800 text-brand-600 focus:ring-brand-500/30"
            />
          </label>

          <label className="flex items-center justify-between p-3 rounded-lg bg-slate-850 border border-slate-800 cursor-pointer">
            <div>
              <span className="text-xs font-semibold text-slate-200 block">Door 1 Malware Interceptions</span>
              <span className="text-[11px] text-slate-400">Alert security operations center (SOC) when ClamAV traps infected payloads</span>
            </div>
            <input
              type="checkbox"
              checked={notifyOnMalware}
              onChange={(e) => setNotifyOnMalware(e.target.checked)}
              className="rounded border-slate-700 bg-slate-800 text-brand-600 focus:ring-brand-500/30"
            />
          </label>

          <label className="flex items-center justify-between p-3 rounded-lg bg-slate-850 border border-slate-800 cursor-pointer">
            <div>
              <span className="text-xs font-semibold text-slate-200 block">Daily Audit Digest</span>
              <span className="text-[11px] text-slate-400">Receive an automated cryptographic integrity report every 24 hours</span>
            </div>
            <input
              type="checkbox"
              checked={dailyDigest}
              onChange={(e) => setDailyDigest(e.target.checked)}
              className="rounded border-slate-700 bg-slate-800 text-brand-600 focus:ring-brand-500/30"
            />
          </label>
        </div>
      </div>

      {/* Pipeline Policy Thresholds (Admin Only) */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
          <Sliders size={18} className="text-brand-400" />
          <h2 className="text-sm font-semibold text-slate-100">Pipeline Gates & Enforcement Thresholds</h2>
        </div>

        <form onSubmit={handleSaveSystem} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Max Ingestion File Size (MB)
              </label>
              <input
                type="number"
                value={maxFileSizeMb}
                onChange={(e) => setMaxFileSizeMb(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-850 border border-slate-700 rounded-lg text-xs text-slate-100 font-mono focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                3-Way Match Max Variance (%)
              </label>
              <input
                type="number"
                step="0.1"
                value={matchTolerancePct}
                onChange={(e) => setMatchTolerancePct(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-850 border border-slate-700 rounded-lg text-xs text-slate-100 font-mono focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                ClamAV Daemon Timeout (ms)
              </label>
              <input
                type="number"
                value={clamavTimeoutMs}
                onChange={(e) => setClamavTimeoutMs(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-850 border border-slate-700 rounded-lg text-xs text-slate-100 font-mono focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Extraction Model (Door 3)
              </label>
              <select
                value={extractionModel}
                onChange={(e) => setExtractionModel(e.target.value)}
                className="w-full px-3 py-2 bg-slate-850 border border-slate-700 rounded-lg text-xs text-slate-100 font-mono focus:outline-none focus:ring-1 focus:ring-brand-500"
              >
                <option value="gemini-1.5-pro">Gemini 1.5 Pro (Multimodal Vision)</option>
                <option value="gemini-1.5-flash">Gemini 1.5 Flash (High Throughput)</option>
                <option value="tesseract-local">Local OCR Fallback (Tesseract)</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Straight-Through Auto-Approval Confidence Threshold ({stpThreshold}%)
              </label>
              <input
                type="range"
                min="80"
                max="100"
                value={stpThreshold}
                onChange={(e) => setStpThreshold(Number(e.target.value))}
                className="w-full accent-brand-500 cursor-pointer"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                Transactions scoring ≥ {stpThreshold}% match with clean Door 1-3 results bypass manual human approval.
              </span>
            </div>
          </div>

          <button
            type="submit"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold rounded-lg shadow-md transition-colors"
          >
            <Shield size={14} />
            <span>Update Pipeline Enforcement Policies</span>
          </button>
        </form>
      </div>
    </div>
  );
};
