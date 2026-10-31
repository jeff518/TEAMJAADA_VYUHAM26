import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { Activity } from 'lucide-react';

interface ActivityChartProps {
  data?: {
    date: string;
    processed: number;
    blocked: number;
    approved: number;
  }[];
}

export const ActivityChart: React.FC<ActivityChartProps> = ({ data = [] }) => {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm flex flex-col justify-between">
      <div className="flex items-center justify-between mb-6 pb-2 border-b border-slate-800">
        <div>
          <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
            <Activity size={16} className="text-brand-400" />
            <span>Document Ingestion & Pipeline Trends</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">Daily throughput, auto-approvals, and security threat interventions</p>
        </div>
      </div>

      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorProcessed" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#0c87eb" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#0c87eb" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="colorApproved" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="colorBlocked" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.5} />
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="date" stroke="#64748b" fontSize={11} tickLine={false} />
            <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#0f172a',
                borderColor: '#334155',
                borderRadius: '0.75rem',
                fontSize: '12px',
                color: '#f8fafc',
              }}
            />
            <Legend
              wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
              iconType="circle"
            />
            <Area
              type="monotone"
              dataKey="processed"
              name="Total Ingested"
              stroke="#0c87eb"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorProcessed)"
            />
            <Area
              type="monotone"
              dataKey="approved"
              name="Cleared / Approved"
              stroke="#10b981"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorApproved)"
            />
            <Area
              type="monotone"
              dataKey="blocked"
              name="Blocked Threats"
              stroke="#ef4444"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorBlocked)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
