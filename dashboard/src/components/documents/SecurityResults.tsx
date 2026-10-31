import React, { useState } from 'react';
import { SecurityResults as SecurityResultsType, SecurityCheckItem } from '../../types';
import { StatusBadge } from '../common/StatusBadge';
import {
  ShieldAlert,
  ShieldCheck,
  FileCode,
  Sparkles,
  DollarSign,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';

interface SecurityResultsProps {
  securityResults: SecurityResultsType;
}

export const SecurityResults: React.FC<SecurityResultsProps> = ({ securityResults }) => {
  const [activeTab, setActiveTab] = useState<'door1' | 'door2' | 'door3' | 'door4'>('door1');
  const [expandedCheck, setExpandedCheck] = useState<string | null>(null);

  const doors = [
    {
      id: 'door1' as const,
      name: 'Door 1: Antivirus & Format',
      subtitle: 'Magic Bytes & ClamAV Engine',
      icon: ShieldAlert,
      result: securityResults.door1,
    },
    {
      id: 'door2' as const,
      name: 'Door 2: Structural & Script',
      subtitle: 'PDF Traversal & Macro Scan',
      icon: FileCode,
      result: securityResults.door2,
    },
    {
      id: 'door3' as const,
      name: 'Door 3: Post-Extraction',
      subtitle: 'Prompt Injection & Hallucination Guard',
      icon: Sparkles,
      result: securityResults.door3,
    },
    {
      id: 'door4' as const,
      name: 'Door 4: Business & Matching',
      subtitle: '3-Way PO Match & Bank Anomaly',
      icon: DollarSign,
      result: securityResults.door4,
    },
  ];

  const currentDoor = doors.find((d) => d.id === activeTab)!;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
      {/* Header with Door Tabs */}
      <div className="p-5 border-b border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2">
            <ShieldCheck size={18} className="text-brand-400" />
            <span>Multi-Door Security Inspection Results</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">Zero-trust cryptographic isolation and threat analysis</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-mono">Overall Security Status:</span>
          <StatusBadge status={securityResults.overallStatus} size="sm" />
        </div>
      </div>

      {/* Tabs */}
      <div className="grid grid-cols-2 md:grid-cols-4 border-b border-slate-800 bg-slate-950/40">
        {doors.map((door) => {
          const Icon = door.icon;
          const isActive = activeTab === door.id;
          return (
            <button
              key={door.id}
              onClick={() => setActiveTab(door.id)}
              className={`flex flex-col text-left p-4 border-r border-slate-800/80 transition-all ${
                isActive
                  ? 'bg-slate-900 border-b-2 border-b-brand-500'
                  : 'hover:bg-slate-850/50 opacity-70 hover:opacity-100'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <Icon size={16} className={isActive ? 'text-brand-400' : 'text-slate-400'} />
                <StatusBadge status={door.result.status} size="sm" showIcon={false} />
              </div>
              <span className="text-xs font-semibold text-slate-200">{door.name}</span>
              <span className="text-[11px] text-slate-400 mt-0.5 truncate">{door.subtitle}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="p-6 space-y-6">
        {/* Door 1 Specific Details */}
        {activeTab === 'door1' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-slate-850 border border-slate-800">
              <span className="text-xs font-mono text-slate-400 uppercase">ClamAV Malware Engine</span>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-100">
                  {securityResults.door1.clamavScan.clean ? 'CLEAN (0 Threats)' : 'THREAT DETECTED'}
                </span>
                <span className="text-xs font-mono text-slate-400">
                  {securityResults.door1.clamavScan.scanDurationMs}ms
                </span>
              </div>
              {securityResults.door1.clamavScan.signature && (
                <p className="text-xs text-rose-400 font-mono mt-1">
                  Signature: {securityResults.door1.clamavScan.signature}
                </p>
              )}
            </div>

            <div className="p-4 rounded-xl bg-slate-850 border border-slate-800">
              <span className="text-xs font-mono text-slate-400 uppercase">Magic Bytes & MIME</span>
              <div className="mt-2 text-sm font-semibold text-slate-100 flex items-center justify-between">
                <span>{securityResults.door1.mimeValidation.detectedMime}</span>
                <span className="text-xs font-mono text-emerald-400">
                  {securityResults.door1.mimeValidation.magicBytesValid ? 'MATCH' : 'MISMATCH'}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono mt-1">
                Claimed: {securityResults.door1.mimeValidation.claimedMime}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-850 border border-slate-800">
              <span className="text-xs font-mono text-slate-400 uppercase">Quarantine Policy</span>
              <div className="mt-2 text-sm font-semibold text-slate-100">
                {securityResults.door1.quarantineReason ? 'Quarantine Active' : 'Pass-Through Cleared'}
              </div>
              <p className="text-xs text-slate-400 mt-1 truncate">
                {securityResults.door1.quarantineReason || 'No quarantine flags raised'}
              </p>
            </div>
          </div>
        )}

        {/* Door 2 Specific Details */}
        {activeTab === 'door2' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-slate-850 border border-slate-800">
              <span className="text-xs font-mono text-slate-400 uppercase">Script & Macro Guard</span>
              <div className="mt-2 text-sm font-semibold text-slate-100">
                {securityResults.door2.scriptMacroCheck.hasJavascript || securityResults.door2.scriptMacroCheck.hasMacros
                  ? 'Active Executable Content'
                  : 'Zero Executable Scripts'}
              </div>
              <div className="text-xs text-slate-400 font-mono mt-1 space-y-0.5">
                <div>JS: {securityResults.door2.scriptMacroCheck.hasJavascript ? 'YES' : 'NONE'}</div>
                <div>Macros: {securityResults.door2.scriptMacroCheck.hasMacros ? 'YES' : 'NONE'}</div>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-850 border border-slate-800">
              <span className="text-xs font-mono text-slate-400 uppercase">PDF Structure & Obfuscation</span>
              <div className="mt-2 text-sm font-semibold text-slate-100">
                {securityResults.door2.pdfAnalysis.suspiciousObjectsCount === 0 ? 'Normal Object Graph' : 'Suspicious Objects'}
              </div>
              <div className="text-xs text-slate-400 font-mono mt-1">
                Suspicious: {securityResults.door2.pdfAnalysis.suspiciousObjectsCount} | Pages: {securityResults.door2.pdfAnalysis.pageCount}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-850 border border-slate-800">
              <span className="text-xs font-mono text-slate-400 uppercase">OpenActions Check</span>
              <div className="mt-2 text-sm font-semibold text-slate-100">
                {securityResults.door2.pdfAnalysis.openActionsDetected ? 'AUTO-TRIGGER FOUND' : 'No Auto-Exec Triggers'}
              </div>
              <p className="text-xs text-slate-400 mt-1">Prevents arbitrary payload execution on viewer open</p>
            </div>
          </div>
        )}

        {/* Door 3 Specific Details */}
        {activeTab === 'door3' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-slate-850 border border-slate-800">
              <span className="text-xs font-mono text-slate-400 uppercase">Prompt Injection Defense</span>
              <div className="mt-2 text-sm font-semibold text-slate-100">
                {securityResults.door3.promptInjectionDetected ? 'INJECTION PATTERN DETECTED' : 'Zero Adversarial Prompts'}
              </div>
              <p className="text-xs text-slate-400 mt-1">Scans extracted text for LLM jailbreak attempts</p>
            </div>

            <div className="p-4 rounded-xl bg-slate-850 border border-slate-800">
              <span className="text-xs font-mono text-slate-400 uppercase">Extraction Confidence</span>
              <div className="mt-2 text-sm font-semibold text-emerald-400 font-mono">
                {securityResults.door3.ocrConfidence}% Confidence
              </div>
              <p className="text-xs text-slate-400 mt-1 font-mono">Model: {securityResults.door3.extractionModel}</p>
            </div>

            <div className="p-4 rounded-xl bg-slate-850 border border-slate-800">
              <span className="text-xs font-mono text-slate-400 uppercase">Hallucination Entropy</span>
              <div className="mt-2 text-sm font-semibold text-slate-100 font-mono">
                {securityResults.door3.hallucinationScore} (Threshold &lt; 0.15)
              </div>
              <p className="text-xs text-slate-400 mt-1">Cryptographic token entropy verification</p>
            </div>
          </div>
        )}

        {/* Door 4 Specific Details */}
        {activeTab === 'door4' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-slate-850 border border-slate-800">
              <span className="text-xs font-mono text-slate-400 uppercase">3-Way Match Score</span>
              <div className="mt-2 text-sm font-semibold text-brand-400 font-mono">
                {securityResults.door4.threeWayMatchScore}% Match
              </div>
              <p className="text-xs text-slate-400 mt-1">PO vs Invoice vs Warehouse Goods Receipt</p>
            </div>

            <div className="p-4 rounded-xl bg-slate-850 border border-slate-800">
              <span className="text-xs font-mono text-slate-400 uppercase">Bank Account Master Check</span>
              <div className="mt-2 text-sm font-semibold text-slate-100">
                {securityResults.door4.vendorBankAnomaly ? (
                  <span className="text-rose-400 flex items-center gap-1">
                    <AlertCircle size={14} /> IBAN Divergence Detected
                  </span>
                ) : (
                  <span className="text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 size={14} /> Master Record Verified
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-1">Defends against invoice redirection fraud</p>
            </div>

            <div className="p-4 rounded-xl bg-slate-850 border border-slate-800">
              <span className="text-xs font-mono text-slate-400 uppercase">Duplicate Invoice Guard</span>
              <div className="mt-2 text-sm font-semibold text-slate-100">
                {securityResults.door4.duplicateDetected ? 'DUPLICATE SUBMISSION' : 'Unique Transaction'}
              </div>
              <p className="text-xs text-slate-400 mt-1">Cross-vendor historical ledger check</p>
            </div>
          </div>
        )}

        {/* Detailed Check List */}
        <div>
          <h4 className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-400 mb-3">
            Executed Security Checks ({currentDoor.result.checks.length})
          </h4>

          {currentDoor.result.checks.length === 0 ? (
            <p className="text-xs text-slate-400 italic">No additional security sub-checks recorded for this gate.</p>
          ) : (
            <div className="space-y-2">
              {currentDoor.result.checks.map((check: SecurityCheckItem) => {
                const isExpanded = expandedCheck === check.id;
                return (
                  <div
                    key={check.id}
                    className="border border-slate-800 rounded-xl bg-slate-850/60 overflow-hidden"
                  >
                    <div
                      onClick={() => setExpandedCheck(isExpanded ? null : check.id)}
                      className="p-3.5 flex items-center justify-between cursor-pointer hover:bg-slate-800/40 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <StatusBadge status={check.status} size="sm" />
                        <span className="text-xs font-medium text-slate-200">{check.name}</span>
                        {check.severity && (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20">
                            {check.severity}
                          </span>
                        )}
                      </div>
                      <div className="text-slate-400">
                        {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                      </div>
                    </div>
                    {isExpanded && (
                      <div className="px-4 pb-3.5 pt-1 text-xs text-slate-400 border-t border-slate-800/60 bg-slate-900/40 font-mono">
                        {check.details}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
