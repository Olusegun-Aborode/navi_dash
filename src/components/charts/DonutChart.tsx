'use client';

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { formatUsd, getAssetColor } from '@/lib/utils';

interface DonutChartProps {
  data: Array<{ name: string; value: number }>;
}

/**
 * DonutChart — donut + side legend, side-by-side.
 *
 * The old version relied on Recharts' built-in legend and had no permanent
 * labels, which meant users could only learn slice identity by hovering.
 * Here we render a custom legend with the asset name, USD value, and
 * percentage next to the chart so every slice is labelled at a glance.
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

  // Sort descending so the dominant slice sits at the top of the legend.
  const sorted = [...data].sort((a, b) => b.value - a.value);
  const total = sorted.reduce((s, d) => s + d.value, 0);

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
        alignItems: 'center',
        gap: 16,
        height: '100%',
      }}
    >
      <div style={{ position: 'relative', height: '100%', minHeight: 220 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={sorted}
              cx="50%"
              cy="50%"
              innerRadius="55%"
              outerRadius="85%"
              paddingAngle={2}
              dataKey="value"
              stroke="var(--surface)"
              strokeWidth={2}
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
              formatter={(value: number | undefined) => [formatUsd(value ?? 0, true), '']}
            />
          </PieChart>
        </ResponsiveContainer>
        {/* Centered total inside the donut hole. */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'grid',
            placeItems: 'center',
            pointerEvents: 'none',
          }}
        >
          <div style={{ textAlign: 'center' }}>
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 10,
                color: 'var(--fg-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
              }}
            >
              Total
            </div>
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 16,
                fontWeight: 600,
                color: 'var(--fg)',
              }}
            >
              {formatUsd(total, true)}
            </div>
          </div>
        </div>
      </div>

      <ul
        style={{
          margin: 0,
          padding: 0,
          listStyle: 'none',
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
          fontFamily: 'var(--font-mono)',
          fontSize: 11,
          maxHeight: '100%',
          overflowY: 'auto',
        }}
      >
        {sorted.map((d) => {
          const pct = total > 0 ? (d.value / total) * 100 : 0;
          return (
            <li
              key={d.name}
              style={{
                display: 'grid',
                gridTemplateColumns: '10px 1fr auto auto',
                alignItems: 'center',
                columnGap: 8,
              }}
            >
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 2,
                  background: getAssetColor(d.name),
                }}
              />
              <span style={{ color: 'var(--fg)' }}>{d.name}</span>
              <span style={{ color: 'var(--fg-muted)', fontVariantNumeric: 'tabular-nums' }}>
                {formatUsd(d.value, true)}
              </span>
              <span
                style={{
                  color: 'var(--fg-muted)',
                  fontVariantNumeric: 'tabular-nums',
                  minWidth: 42,
                  textAlign: 'right',
                }}
              >
                {pct.toFixed(1)}%
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
