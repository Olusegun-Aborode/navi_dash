'use client';

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { formatUsd, getAssetColor } from '@/lib/utils';

interface DonutChartProps {
  data: Array<{ name: string; value: number }>;
}

/**
 * DonutChart — donut with labels on each slice.
 *
 * Each slice renders `{symbol} ${value}` outside the ring with a leader
 * line, so the asset + amount are visible at a glance without hovering.
 * Tiny slices (< 2%) are skipped to avoid label collisions; their values
 * still appear in the tooltip on hover.
 */
export default function DonutChart({ data }: DonutChartProps) {
  if (data.length === 0) {
    return (
      <div
        className="flex h-full items-center justify-center text-xs"
        style={{ color: 'var(--fg-muted)' }}
      >
        No data available
      </div>
    );
  }

  const sorted = [...data].sort((a, b) => b.value - a.value);
  const total = sorted.reduce((s, d) => s + d.value, 0);

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart margin={{ top: 12, right: 40, bottom: 12, left: 40 }}>
        <Pie
          data={sorted}
          cx="50%"
          cy="50%"
          innerRadius="45%"
          outerRadius="70%"
          paddingAngle={2}
          dataKey="value"
          stroke="var(--surface)"
          strokeWidth={2}
          label={(props) => renderSliceLabel(props, total)}
          labelLine={{ stroke: 'var(--fg-dim)', strokeWidth: 1 }}
          isAnimationActive={false}
        >
          {sorted.map((entry) => (
            <Cell key={entry.name} fill={getAssetColor(entry.name)} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            backgroundColor: 'var(--fg)',
            border: 'none',
            borderRadius: 4,
            fontSize: 11,
            color: 'var(--bg)',
            padding: '6px 10px',
          }}
          itemStyle={{ color: 'var(--bg)' }}
          formatter={(value, name) => {
            const v = typeof value === 'number' ? value : 0;
            const pct = total > 0 ? ((v / total) * 100).toFixed(1) : '0.0';
            return [`${formatUsd(v, true)} (${pct}%)`, name ?? ''];
          }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

interface SliceLabelProps {
  cx: number;
  cy: number;
  midAngle: number;
  outerRadius: number;
  name: string;
  value: number;
  fill?: string;
}

/**
 * Custom label renderer: {symbol} $value just outside the slice, anchored
 * left/right depending on the slice's side. Skips labels for slices < 2%
 * of the total to avoid overlapping text.
 */
function renderSliceLabel(
  raw: unknown,
  total: number,
): React.ReactElement | null {
  const p = raw as SliceLabelProps;
  if (total <= 0) return null;
  const pct = (p.value / total) * 100;
  if (pct < 2) return null; // hide tiny slices to avoid overlap

  const RAD = Math.PI / 180;
  const r = p.outerRadius + 14;
  const x = p.cx + r * Math.cos(-p.midAngle * RAD);
  const y = p.cy + r * Math.sin(-p.midAngle * RAD);
  const onRight = x > p.cx;

  return (
    <text
      x={x}
      y={y}
      fill="var(--fg)"
      fontSize={11}
      fontFamily="var(--font-mono)"
      textAnchor={onRight ? 'start' : 'end'}
      dominantBaseline="central"
    >
      <tspan fontWeight={600}>{p.name}</tspan>
      <tspan fill="var(--fg-muted)" dx={6}>
        {formatUsd(p.value, true)}
      </tspan>
    </text>
  );
}
