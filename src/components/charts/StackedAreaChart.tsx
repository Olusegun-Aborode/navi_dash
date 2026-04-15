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
import { formatUsd, formatDate, getAssetColor } from '@/lib/utils';

interface TooltipEntry {
  name?: string;
  value?: number;
  color?: string;
}
interface CompactTooltipProps {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string | number;
}

interface StackedAreaChartProps {
  data: Array<Record<string, unknown>>;
  symbols: string[];
  valueKey: string;
}

const TOP_N = 10;

function CompactTooltip({ active, payload, label }: CompactTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  // Hide zero/undefined entries, sort descending, cap to TOP_N.
  const rows = payload
    .filter((p) => typeof p.value === 'number' && p.value > 0)
    .sort((a, b) => (b.value ?? 0) - (a.value ?? 0));
  const visible = rows.slice(0, TOP_N);
  const rest = rows.length - visible.length;
  const total = rows.reduce((s, p) => s + (p.value ?? 0), 0);

  return (
    <div
      style={{
        background: 'var(--card)',
        border: '1px solid var(--border-bright)',
        borderRadius: 4,
        padding: '8px 10px',
        fontSize: 11,
        minWidth: 180,
        boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
      }}
    >
      <div
        style={{
          fontSize: 10,
          color: 'var(--text-muted)',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          marginBottom: 6,
          borderBottom: '1px solid var(--border)',
          paddingBottom: 4,
        }}
      >
        {formatDate(String(label))}
      </div>
      {visible.map((p) => (
        <div key={p.name} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, lineHeight: 1.5 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span
              style={{
                display: 'inline-block',
                width: 6,
                height: 6,
                borderRadius: 1,
                background: p.color,
              }}
            />
            <span style={{ color: 'var(--foreground)' }}>{p.name}</span>
          </span>
          <span style={{ color: 'var(--foreground)', fontVariantNumeric: 'tabular-nums' }}>
            {formatUsd(p.value ?? 0, true)}
          </span>
        </div>
      ))}
      {rest > 0 && (
        <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4, fontStyle: 'italic' }}>
          +{rest} more…
        </div>
      )}
      <div
        style={{
          borderTop: '1px solid var(--border)',
          marginTop: 6,
          paddingTop: 6,
          display: 'flex',
          justifyContent: 'space-between',
          fontWeight: 600,
          color: 'var(--accent-orange)',
        }}
      >
        <span>TOTAL</span>
        <span style={{ fontVariantNumeric: 'tabular-nums' }}>{formatUsd(total, true)}</span>
      </div>
    </div>
  );
}

export default function StackedAreaChart({
  data,
  symbols,
  valueKey,
}: StackedAreaChartProps) {
  if (data.length === 0) {
    return (
      <div
        className="flex h-full items-center justify-center text-xs"
        style={{ color: 'var(--text-muted)' }}
      >
        No data yet — run cron jobs to collect snapshots
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 8, right: 12, bottom: 8, left: 12 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(15,17,21,0.06)" />
        <XAxis
          dataKey="date"
          tickFormatter={(v) => formatDate(v)}
          tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
          axisLine={{ stroke: 'rgba(15,17,21,0.08)' }}
        />
        <YAxis
          tickFormatter={(v) => formatUsd(v, true)}
          tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
          axisLine={{ stroke: 'rgba(15,17,21,0.08)' }}
          width={70}
        />
        <Tooltip content={<CompactTooltip />} />
        <Legend wrapperStyle={{ fontSize: 10, color: 'var(--text-muted)' }} />
        {symbols.map((symbol) => (
          <Area
            key={symbol}
            type="monotone"
            dataKey={`${symbol}_${valueKey}`}
            stackId="1"
            stroke={getAssetColor(symbol)}
            fill={getAssetColor(symbol)}
            fillOpacity={0.3}
            name={symbol}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
}
