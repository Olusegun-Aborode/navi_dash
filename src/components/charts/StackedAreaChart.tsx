'use client';

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
import { POOL_CONFIGS } from '@/lib/constants';
import { formatUsd, formatDate } from '@/lib/utils';

interface StackedAreaChartProps {
  data: Array<Record<string, unknown>>;
  symbols: string[];
  title: string;
  valueKey: string;
}

export default function StackedAreaChart({
  data,
  symbols,
  title,
  valueKey,
}: StackedAreaChartProps) {
  if (data.length === 0) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
        <h3 className="mb-4 text-sm font-medium text-zinc-400">{title}</h3>
        <div className="flex h-64 items-center justify-center text-zinc-600">
          No data yet — run cron jobs to collect snapshots
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
      <h3 className="mb-4 text-sm font-medium text-zinc-400">{title}</h3>
      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
          <XAxis
            dataKey="date"
            tickFormatter={(v) => formatDate(v)}
            tick={{ fill: '#71717a', fontSize: 11 }}
            axisLine={{ stroke: '#27272a' }}
          />
          <YAxis
            tickFormatter={(v) => formatUsd(v, true)}
            tick={{ fill: '#71717a', fontSize: 11 }}
            axisLine={{ stroke: '#27272a' }}
            width={70}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#18181b',
              border: '1px solid #27272a',
              borderRadius: 8,
              fontSize: 12,
            }}
            labelFormatter={(v) => formatDate(String(v))}
            formatter={(value: number | undefined) => [formatUsd(value ?? 0, true), '']}
          />
          <Legend
            wrapperStyle={{ fontSize: 11, color: '#a1a1aa' }}
          />
          {symbols.map((symbol) => (
            <Area
              key={symbol}
              type="monotone"
              dataKey={`${symbol}_${valueKey}`}
              stackId="1"
              stroke={POOL_CONFIGS[symbol]?.color ?? '#666'}
              fill={POOL_CONFIGS[symbol]?.color ?? '#666'}
              fillOpacity={0.3}
              name={symbol}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
