import React from 'react';
import { DocumentStatus } from '../../types';
import { CheckCircle2, AlertTriangle, ShieldAlert, Clock, RefreshCw } from 'lucide-react';

interface StatusBadgeProps {
  status: DocumentStatus | string;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  size = 'md',
  showIcon = true,
  className = '',
}) => {
  const normalized = (status || '').toUpperCase();

  let colorClasses = 'bg-slate-800 text-slate-300 border-slate-700';
  let IconComponent = Clock;
  let label = normalized;

  switch (normalized) {
    case 'ALLOW':
    case 'APPROVED':
    case 'PASSED':
      colorClasses = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      IconComponent = CheckCircle2;
      label = normalized === 'ALLOW' ? 'ALLOWED' : normalized;
      break;
    case 'QUARANTINE':
    case 'WARNING':
    case 'VERIFICATION_REQUESTED':
      colorClasses = 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      IconComponent = AlertTriangle;
      label = normalized === 'VERIFICATION_REQUESTED' ? 'VERIFICATION' : normalized;
      break;
    case 'BLOCK':
    case 'BLOCKED':
    case 'REJECTED':
    case 'FAILED':
      colorClasses = 'bg-rose-500/10 text-rose-400 border-rose-500/30';
      IconComponent = ShieldAlert;
      label = normalized === 'BLOCK' ? 'BLOCKED' : normalized;
      break;
    case 'PENDING':
    case 'QUEUED':
      colorClasses = 'bg-blue-500/10 text-blue-400 border-blue-500/30';
      IconComponent = Clock;
      break;
    case 'PROCESSING':
    case 'IN_PROGRESS':
      colorClasses = 'bg-purple-500/10 text-purple-400 border-purple-500/30 animate-pulse';
      IconComponent = RefreshCw;
      label = 'PROCESSING';
      break;
    default:
      colorClasses = 'bg-slate-800 text-slate-400 border-slate-700';
      IconComponent = Clock;
      break;
  }

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5',
    lg: 'text-sm px-3.5 py-1.5 gap-2',
  }[size];

  const iconSizes = {
    sm: 12,
    md: 14,
    lg: 16,
  }[size];

  return (
    <span
      className={`inline-flex items-center font-medium border rounded-full font-mono tracking-wide ${sizeClasses} ${colorClasses} ${className}`}
    >
      {showIcon && <IconComponent size={iconSizes} className={normalized === 'PROCESSING' ? 'animate-spin' : ''} />}
      <span>{label}</span>
    </span>
  );
};
