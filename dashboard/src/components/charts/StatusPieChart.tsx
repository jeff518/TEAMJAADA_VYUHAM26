import React from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { PieChart as PieIcon } from 'lucide-react';
import { DocumentStatus } from '../../types';

interface StatusPieChartProps {
  data?: {
    status: DocumentStatus;
    count: number;
    percentage: number;
  }[];
}

const STATUS_COLORS: Record<string, string> = {
  ALLOW: '#10b981',
  QUARANTINE: '#f59e0b',
  BLOCK: '#ef4444',
  PENDING: '#3b82f6',
  PROCESSING: '#8b5cf6',
};

export const StatusPieChart: React.FC<StatusPieChartProps> = ({ data = [] }) => {
  const chartData = data.map((item) => ({
    name: item.status,
    value: item.count,
    percentage: item.percentage,
  }));

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm flex flex-col justify-between">
      <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-800">
        <div>
          <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
            <PieIcon size={16} className="text-brand-400" />
            <span>Policy Status Distribution</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">Pipeline disposition ratio</p>
        </div>
      </div>

      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              innerRadius={65}
              outerRadius={95}
              paddingAngle={5}
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={STATUS_COLORS[entry.name] || '#94a3b8'}
                  stroke="#0f172a"
                  strokeWidth={2}
                />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: '#0f172a',
                borderColor: '#334155',
                borderRadius: '0.75rem',
                fontSize: '12px',
                color: '#f8fafc',
              }}
              formatter={(value: any, name: any) => [`${value} Documents`, `${name}`]}
            />
            <Legend
              verticalAlign="bottom"
              height={36}
              iconType="circle"
              wrapperStyle={{ fontSize: '11px', color: '#94a3b8' }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
