import React from 'react';
import { PipelineStep } from '../../types';
import { CheckCircle2, XCircle, Clock, AlertTriangle, Shield, Play } from 'lucide-react';

interface PipelineProgressProps {
  steps: PipelineStep[];
  currentStepId?: string;
}

export const PipelineProgress: React.FC<PipelineProgressProps> = ({ steps }) => {
  return (
    <div className="w-full bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm">
      <div className="flex items-center justify-between mb-6 pb-3 border-b border-slate-800">
        <div>
          <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
            <Shield size={16} className="text-brand-400" />
            <span>Zero-Trust Processing Pipeline Flow</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">Automated 7-step inspection and validation lifecycle</p>
        </div>
      </div>

      {/* Horizontal Step Timeline on Desktop / Vertical on Mobile */}
      <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
        {steps.map((step, idx) => {
          let badgeBorder = 'border-slate-800 bg-slate-850';
          let iconColor = 'text-slate-400';
          let StatusIcon = Clock;

          if (step.status === 'completed') {
            badgeBorder = 'border-emerald-500/30 bg-emerald-950/20';
            iconColor = 'text-emerald-400';
            StatusIcon = CheckCircle2;
          } else if (step.status === 'failed') {
            badgeBorder = 'border-rose-500/30 bg-rose-950/20';
            iconColor = 'text-rose-400';
            StatusIcon = XCircle;
          } else if (step.status === 'in_progress') {
            badgeBorder = 'border-brand-500/50 bg-brand-950/30 shadow-lg shadow-brand-500/10 animate-pulse';
            iconColor = 'text-brand-400';
            StatusIcon = Play;
          } else if (step.status === 'skipped') {
            badgeBorder = 'border-slate-800 bg-slate-900/50 opacity-50';
            iconColor = 'text-slate-400';
            StatusIcon = AlertTriangle;
          }

          return (
            <div
              key={step.id || idx}
              className={`relative flex flex-col p-3 rounded-xl border transition-all duration-200 ${badgeBorder}`}
            >
              {/* Step Index & Status Icon */}
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-[10px] font-bold text-slate-400 px-1.5 py-0.5 rounded bg-slate-800">
                  0{idx + 1}
                </span>
                <StatusIcon size={15} className={iconColor} />
              </div>

              {/* Step Title */}
              <h4 className="text-xs font-semibold text-slate-200 line-clamp-1 mb-1" title={step.name}>
                {step.name}
              </h4>

              {/* Step Description */}
              <p className="text-[11px] text-slate-400 leading-tight line-clamp-2 flex-1">
                {step.description}
              </p>

              {/* Duration Footer */}
              <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] font-mono text-slate-400">
                <span className="capitalize">{step.status.replace('_', ' ')}</span>
                {step.durationMs !== undefined && step.durationMs > 0 && (
                  <span>{step.durationMs}ms</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
