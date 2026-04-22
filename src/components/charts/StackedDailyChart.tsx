'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { formatDate, formatUsd, getAssetColor } from '@/lib/utils';

interface StackedDailyChartProps {
  /**
   * Flat rows like `{ date: '2026-04-21', vSUI: 120, USDC: 45 }`. Keys
   * other than `date` are asset symbols whose values are stacked on the
   * same bar.
   */
  data: Array<Record<string, string | number>>;
  /** Stacking order. First entry is drawn at the bottom of each bar. */
  assets: string[];
}

interface TooltipPayloadEntry {
  name?: string;
  value?: number;
  color?: string;
}

function StackedTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
  label?: string | number;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const rows = payload
    .filter((p) => typeof p.value === 'number' && p.value > 0)
    .sort((a, b) => (b.value ?? 0) - (a.value ?? 0));
  const total = rows.reduce((s, p) => s + (p.value ?? 0), 0);
  if (rows.length === 0) return null;
  return (
    <div
      style={{
        background: 'var(--fg)',
        color: 'var(--bg)',
        borderRadius: 4,
        padding: '8px 10px',
        fontFamily: 'var(--font-mono)',
        fontSize: 11,
        minWidth: 160,
      }}
    >
      <div style={{ opacity: 0.7, marginBottom: 6 }}>{formatDate(String(label))}</div>
      {rows.map((p) => (
        <div
          key={p.name}
          style={{ display: 'flex', justifyContent: 'space-between', gap: 12, lineHeight: 1.5 }}
        >
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
            {p.name}
          </span>
          <span style={{ fontVariantNumeric: 'tabular-nums' }}>
            {formatUsd(p.value ?? 0, true)}
          </span>
        </div>
      ))}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginTop: 6,
          paddingTop: 6,
          borderTop: '1px solid rgba(255,255,255,0.15)',
          fontWeight: 600,
        }}
      >
        <span>TOTAL</span>
        <span style={{ fontVariantNumeric: 'tabular-nums' }}>{formatUsd(total, true)}</span>
      </div>
    </div>
  );
}

/**
 * StackedDailyChart — daily bars where each bar is split by the collateral
 * asset seized that day. Uses the same per-asset colors the donut uses so
 * the two charts read as a pair.
 */
export default function StackedDailyChart({ data, assets }: StackedDailyChartProps) {
  if (data.length === 0 || assets.length === 0) {
    return (
      <div
        className="flex h-full items-center justify-center text-xs"
        style={{ color: 'var(--fg-muted)' }}
      >
        No data available
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 8, right: 12, bottom: 8, left: 12 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis
          dataKey="date"
          tickFormatter={(v) => formatDate(String(v))}
          tick={{ fill: 'var(--fg-muted)', fontSize: 10 }}
          axisLine={{ stroke: 'var(--border)' }}
          tickLine={false}
        />
        <YAxis
          tickFormatter={(v) => formatUsd(Number(v), true)}
          tick={{ fill: 'var(--fg-muted)', fontSize: 10 }}
          axisLine={{ stroke: 'var(--border)' }}
          tickLine={false}
          width={60}
        />
        <Tooltip content={<StackedTooltip />} cursor={{ fill: 'var(--hover)' }} />
        <Legend
          verticalAlign="top"
          height={24}
          iconType="square"
          iconSize={9}
          wrapperStyle={{ fontSize: 10, color: 'var(--fg-muted)' }}
        />
        {assets.map((asset, i) => (
          <Bar
            key={asset}
            dataKey={asset}
            stackId="s"
            fill={getAssetColor(asset)}
            radius={i === assets.length - 1 ? [2, 2, 0, 0] : [0, 0, 0, 0]}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
