import React from 'react';
import { DashboardStats } from '../../types';
import { FileText, Clock, ShieldAlert, CheckCircle2, Zap } from 'lucide-react';

interface StatsCardsProps {
  stats?: DashboardStats;
  isLoading?: boolean;
}

export const StatsCards: React.FC<StatsCardsProps> = ({ stats, isLoading }) => {
  const cards = [
    {
      title: 'Total Ingested',
      value: stats?.totalDocuments ?? 0,
      icon: FileText,
      color: 'from-blue-600 to-indigo-600',
      textColor: 'text-blue-400',
      subtext: '+12% from last week',
    },
    {
      title: 'Pending Review / Gate',
      value: stats?.pendingApproval ?? 0,
      icon: Clock,
      color: 'from-amber-600 to-orange-600',
      textColor: 'text-amber-400',
      subtext: 'Requires human-in-the-loop',
    },
    {
      title: 'Blocked Threats',
      value: stats?.blockedDocuments ?? 0,
      icon: ShieldAlert,
      color: 'from-rose-600 to-red-600',
      textColor: 'text-rose-400',
      subtext: 'Malware & high-risk blocks',
    },
    {
      title: 'Processed Today',
      value: stats?.processedToday ?? 0,
      icon: CheckCircle2,
      color: 'from-emerald-600 to-teal-600',
      textColor: 'text-emerald-400',
      subtext: 'Passed zero-trust pipeline',
    },
    {
      title: 'Avg Latency',
      value: `${stats?.averageProcessingTimeMs ?? 1840}ms`,
      icon: Zap,
      color: 'from-purple-600 to-indigo-600',
      textColor: 'text-purple-400',
      subtext: 'End-to-end 7-step inspection',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <div
            key={idx}
            className="bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition-all shadow-sm flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400">{card.title}</span>
              <div
                className={`w-8 h-8 rounded-lg bg-gradient-to-tr ${card.color} flex items-center justify-center text-white shadow-md`}
              >
                <Icon size={16} />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-bold font-mono text-slate-100 tracking-tight">
                {isLoading ? (
                  <div className="h-8 w-16 bg-slate-800 animate-pulse rounded" />
                ) : (
                  card.value
                )}
              </div>
              <p className="text-[11px] text-slate-400 mt-1 font-sans">{card.subtext}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
};
