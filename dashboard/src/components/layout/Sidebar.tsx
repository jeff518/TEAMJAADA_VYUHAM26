import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  UploadCloud,
  FileText,
  ShieldAlert,
  Copy,
  Fingerprint,
  Layers,
  CheckSquare,
  History,
  Settings,
  ShieldCheck,
  Cpu,
  Lock,
} from 'lucide-react';
import { usePendingApprovals } from '../../hooks/useApproval';

export const Sidebar: React.FC = () => {
  const { data: pendingDocs } = usePendingApprovals();
  const pendingCount = pendingDocs?.length || 0;

  const navItems = [
    {
      to: '/',
      label: 'Dashboard',
      icon: LayoutDashboard,
      badge: null,
    },
    {
      to: '/upload',
      label: 'Document Upload',
      icon: UploadCloud,
      badge: null,
    },
    {
      to: '/documents',
      label: 'Document Management',
      icon: FileText,
      badge: null,
    },
    {
      to: '/security',
      label: 'Security Center',
      icon: ShieldAlert,
      badge: null,
    },
    {
      to: '/duplicates',
      label: 'Duplicate Detection',
      icon: Copy,
      badge: null,
    },
    {
      to: '/integrity',
      label: 'Integrity Verification',
      icon: Fingerprint,
      badge: null,
    },
    {
      to: '/extractions',
      label: 'AI Extraction Results',
      icon: Layers,
      badge: null,
    },
    {
      to: '/approvals',
      label: 'Approval Queue',
      icon: CheckSquare,
      badge: pendingCount > 0 ? pendingCount : null,
      badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    },
    {
      to: '/audit',
      label: 'Audit Logs',
      icon: History,
      badge: null,
    },
    {
      to: '/settings',
      label: 'Settings',
      icon: Settings,
      badge: null,
    },
  ];

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col shrink-0 min-h-screen">
      {/* Brand Header */}
      <div className="h-16 flex items-center gap-3 px-6 border-b border-slate-800 bg-slate-950/40">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-brand-500/20">
          <ShieldCheck size={20} />
        </div>
        <div>
          <h1 className="text-sm font-bold tracking-tight text-white flex items-center gap-1.5">
            SecureDoc <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-brand-500/20 text-brand-300 border border-brand-500/30">PRO</span>
          </h1>
          <p className="text-[10px] text-slate-400 font-mono tracking-wide">ZERO-TRUST PIPELINE</p>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-6 space-y-1.5 overflow-y-auto">
        <div className="px-3 mb-2 text-[11px] font-mono font-semibold uppercase tracking-wider text-slate-400">
          Core Navigation
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-brand-600 text-white shadow-md shadow-brand-600/30 font-semibold'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/70'
                }`
              }
            >
              <div className="flex items-center gap-3">
                <Icon size={17} />
                <span>{item.label}</span>
              </div>
              {item.badge !== null && (
                <span
                  className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded-full border ${item.badgeColor || 'bg-slate-800 text-slate-300 border-slate-700'}`}
                >
                  {item.badge}
                </span>
              )}
            </NavLink>
          );
        })}

        <div className="pt-6 px-3 mb-2 text-[11px] font-mono font-semibold uppercase tracking-wider text-slate-400">
          Security Doors
        </div>

        <div className="space-y-1 px-3 py-2 bg-slate-950/30 rounded-xl border border-slate-800/60 text-[11px] font-mono text-slate-400">
          <div className="flex items-center justify-between py-1">
            <span className="flex items-center gap-1.5">
              <Lock size={12} className="text-emerald-400" /> Door 1: Antivirus
            </span>
            <span className="text-emerald-400">ARMED</span>
          </div>
          <div className="flex items-center justify-between py-1">
            <span className="flex items-center gap-1.5">
              <Lock size={12} className="text-emerald-400" /> Door 2: Structural
            </span>
            <span className="text-emerald-400">ARMED</span>
          </div>
          <div className="flex items-center justify-between py-1">
            <span className="flex items-center gap-1.5">
              <Lock size={12} className="text-emerald-400" /> Door 3: Post-Extract
            </span>
            <span className="text-emerald-400">ARMED</span>
          </div>
          <div className="flex items-center justify-between py-1">
            <span className="flex items-center gap-1.5">
              <Lock size={12} className="text-emerald-400" /> Door 4: 3-Way Match
            </span>
            <span className="text-emerald-400">ARMED</span>
          </div>
        </div>
      </nav>

      {/* Footer Info */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/50">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Cpu size={14} className="text-brand-400" />
          <span className="font-mono text-[11px]">Celery & ClamAV Online</span>
        </div>
        <p className="text-[10px] text-slate-400 mt-1 font-mono">v1.4.0 — SHA-256 Chain OK</p>
      </div>
    </aside>
  );
};
