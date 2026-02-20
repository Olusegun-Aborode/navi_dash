'use client';

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { POOL_CONFIGS } from '@/lib/constants';
import { formatUsd } from '@/lib/utils';

interface DonutChartProps {
  data: Array<{ name: string; value: number }>;
  title: string;
}

const FALLBACK_COLORS = ['#4DA2FF', '#2775CA', '#26A17B', '#627EEA', '#2E67F8', '#9945FF', '#FF6B35', '#00D4AA'];

export default function DonutChart({ data, title }: DonutChartProps) {
  if (data.length === 0) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
        <h3 className="mb-4 text-sm font-medium text-zinc-400">{title}</h3>
        <div className="flex h-48 items-center justify-center text-zinc-600">
          No data available
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
      <h3 className="mb-4 text-sm font-medium text-zinc-400">{title}</h3>
      <ResponsiveContainer width="100%" height={250}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={90}
            paddingAngle={2}
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell
                key={entry.name}
                fill={POOL_CONFIGS[entry.name]?.color ?? FALLBACK_COLORS[index % FALLBACK_COLORS.length]}
              />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: '#18181b',
              border: '1px solid #27272a',
              borderRadius: 8,
              fontSize: 12,
            }}
            formatter={(value: number | undefined) => [formatUsd(value ?? 0, true), '']}
          />
          <Legend
            wrapperStyle={{ fontSize: 11, color: '#a1a1aa' }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
