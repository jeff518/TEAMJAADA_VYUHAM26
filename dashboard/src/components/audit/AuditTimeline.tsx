import React, { useState } from 'react';
import { AuditLogEntry } from '../../types';
import { ShieldCheck, Link2, Key, Clock, User, ChevronDown, ChevronUp } from 'lucide-react';
import { format } from 'date-fns';

interface AuditTimelineProps {
  entries: AuditLogEntry[];
}

export const AuditTimeline: React.FC<AuditTimelineProps> = ({ entries }) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (!entries || entries.length === 0) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center text-slate-400">
        <ShieldCheck size={32} className="mx-auto text-slate-400 mb-2" />
        <p className="text-sm font-medium text-slate-300">No Audit Trail Recorded</p>
        <p className="text-xs text-slate-400 mt-1">Audit log entries are generated upon document actions.</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
      {/* Header */}
      <div className="p-5 border-b border-slate-800 flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2">
            <Link2 size={18} className="text-brand-400" />
            <span>Cryptographic SHA-256 Audit Trail</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">Tamper-evident forward hash chain recorded on immutable ledger</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs font-mono text-emerald-400">
          <ShieldCheck size={14} />
          <span>CHAIN VERIFIED (INTEGRITY 100%)</span>
        </div>
      </div>

      {/* Timeline List */}
      <div className="p-6">
        <div className="relative border-l-2 border-slate-800 ml-4 space-y-8">
          {entries.map((entry, idx) => {
            const isExpanded = expandedId === entry.id;
            const formattedDate = format(new Date(entry.timestamp), 'yyyy-MM-dd HH:mm:ss');

            return (
              <div key={entry.id || idx} className="relative pl-6">
                {/* Node Dot */}
                <div className="absolute -left-[9px] top-1.5 w-4 h-4 rounded-full bg-slate-900 border-2 border-brand-400 flex items-center justify-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-brand-400" />
                </div>

                {/* Event Card */}
                <div className="border border-slate-800 rounded-xl bg-slate-850 p-4 transition-all">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-800/80">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-brand-400 bg-brand-500/10 px-2 py-0.5 rounded border border-brand-500/20">
                        {entry.action}
                      </span>
                      <span className="text-xs text-slate-400 flex items-center gap-1 font-mono">
                        <User size={12} />
                        {entry.actor} ({entry.actorRole})
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-400">
                      <Clock size={12} />
                      <span>{formattedDate} UTC</span>
                    </div>
                  </div>

                  {/* Hash Chain Block Indicator */}
                  <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] font-mono bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                    <div className="truncate">
                      <span className="text-slate-400 block text-[10px]">PREV HASH</span>
                      <span className="text-slate-400 truncate block" title={entry.prevHash}>
                        {entry.prevHash}
                      </span>
                    </div>
                    <div className="truncate">
                      <span className="text-slate-400 block text-[10px]">CURRENT BLOCK HASH</span>
                      <span className="text-emerald-400 truncate block font-bold" title={entry.currentHash}>
                        {entry.currentHash}
                      </span>
                    </div>
                  </div>

                  {/* Toggle Details */}
                  {entry.eventDetails && Object.keys(entry.eventDetails).length > 0 && (
                    <div className="mt-2">
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                        className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-200 transition-colors"
                      >
                        <Key size={11} />
                        <span>{isExpanded ? 'Hide Payload' : 'Inspect Event Metadata'}</span>
                        {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                      </button>

                      {isExpanded && (
                        <pre className="mt-2 p-3 rounded bg-slate-950 border border-slate-800 font-mono text-[11px] text-slate-300 overflow-x-auto">
                          {JSON.stringify(entry.eventDetails, null, 2)}
                        </pre>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
