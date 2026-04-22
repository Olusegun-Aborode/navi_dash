'use client';

import { ChevronDown, ChevronUp, ArrowUpDown, ExternalLink } from 'lucide-react';
import { formatUsd, truncateAddress, formatNumber, getAssetColor } from '@/lib/utils';
import { healthFactorColor, healthFactorLabel } from '@/lib/constants';
import InfoTooltip from '@/components/InfoTooltip';

export interface WalletRow {
  address: string;
  collateralUsd: number;
  borrowUsd: number;
  healthFactor: number;
  collateralAssets: string;
  borrowAssets: string;
}

export type WalletSortField = 'healthFactor' | 'collateralUsd' | 'borrowUsd';
export type SortDir = 'asc' | 'desc';

interface WalletsTableProps {
  data: WalletRow[];
  total: number;
  page: number;
  limit: number;
  onPageChange: (page: number) => void;
  sortBy: WalletSortField;
  sortDir: SortDir;
  onSortChange: (field: WalletSortField) => void;
}

function parseAssets(json: string): string[] {
  try {
    const parsed = JSON.parse(json);
    if (!Array.isArray(parsed)) return [];
    const symbols = parsed
      .map((entry) => {
        if (typeof entry === 'string') return entry;
        if (entry && typeof entry === 'object' && 'symbol' in entry)
          return String((entry as { symbol: unknown }).symbol);
        return null;
      })
      .filter((s): s is string => typeof s === 'string' && s.length > 0);
    return Array.from(new Set(symbols));
  } catch {
    return [];
  }
}

/**
 * Compact single-line positions display: collateral dots on the left, a →
 * separator, debt dots on the right. Hover shows the actual symbol list.
 * Rows stay the same height regardless of asset count because the dot
 * strip is capped; anything over MAX shows as `+N`.
 */
const MAX_DOTS = 4;

function PositionsCell({
  collateralJson,
  borrowJson,
}: {
  collateralJson: string;
  borrowJson: string;
}) {
  const c = parseAssets(collateralJson);
  const d = parseAssets(borrowJson);
  const tooltip =
    `Collateral: ${c.length ? c.join(', ') : '—'}\n` +
    `Debt: ${d.length ? d.join(', ') : '—'}`;

  return (
    <span
      title={tooltip}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        whiteSpace: 'nowrap',
      }}
    >
      <DotStrip symbols={c} />
      <span style={{ color: 'var(--fg-dim)', fontFamily: 'var(--font-mono)', fontSize: 11 }}>
        →
      </span>
      <DotStrip symbols={d} />
    </span>
  );
}

function DotStrip({ symbols }: { symbols: string[] }) {
  if (symbols.length === 0) {
    return <span style={{ color: 'var(--fg-dim)', fontSize: 11 }}>—</span>;
  }
  const shown = symbols.slice(0, MAX_DOTS);
  const rest = symbols.length - shown.length;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
      {shown.map((s) => (
        <span
          key={s}
          style={{
            display: 'inline-block',
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: getAssetColor(s),
          }}
        />
      ))}
      {rest > 0 && (
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            color: 'var(--fg-muted)',
            marginLeft: 2,
          }}
        >
          +{rest}
        </span>
      )}
    </span>
  );
}

/**
 * Header with built-in sort affordance. Active column shows its direction;
 * inactive columns show a dim up/down glyph so the sortability is obvious.
 */
function SortableHeader({
  field,
  label,
  tooltip,
  align,
  sortBy,
  sortDir,
  onSortChange,
}: {
  field: WalletSortField;
  label: string;
  tooltip?: string;
  align?: 'left' | 'right';
  sortBy: WalletSortField;
  sortDir: SortDir;
  onSortChange: (f: WalletSortField) => void;
}) {
  const active = sortBy === field;
  const icon = active ? (
    sortDir === 'asc' ? (
      <ChevronUp className="inline h-3 w-3" />
    ) : (
      <ChevronDown className="inline h-3 w-3" />
    )
  ) : (
    <ArrowUpDown className="inline h-3 w-3" style={{ opacity: 0.35 }} />
  );
  return (
    <th
      className={align === 'right' ? 'text-right' : ''}
      onClick={() => onSortChange(field)}
      style={{ cursor: 'pointer', userSelect: 'none' }}
    >
      {align === 'right' ? (
        <>
          {icon} {tooltip && <InfoTooltip text={tooltip} />} {label}
        </>
      ) : (
        <>
          {label} {tooltip && <InfoTooltip text={tooltip} />} {icon}
        </>
      )}
    </th>
  );
}

export default function WalletsTable({
  data,
  total,
  page,
  limit,
  onPageChange,
  sortBy,
  sortDir,
  onSortChange,
}: WalletsTableProps) {
  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <>
      <div className="overflow-x-auto">
        {/* One row = one line. Every cell content is single-line so row
            heights stay uniform regardless of how many assets a wallet holds.
            6 columns sum to 100%; width:100% fills the panel. */}
        <table
          className="data-table"
          style={{ tableLayout: 'fixed', width: '100%', minWidth: 960 }}
        >
          <colgroup>
            <col style={{ width: '16%' }} /> {/* Wallet */}
            <col style={{ width: '17%' }} /> {/* Collateral */}
            <col style={{ width: '17%' }} /> {/* Debt */}
            <col style={{ width: '20%' }} /> {/* Health Factor */}
            <col style={{ width: '16%' }} /> {/* Positions */}
            <col style={{ width: '14%' }} /> {/* LTV */}
          </colgroup>
          <thead>
            <tr>
              <th>Wallet</th>
              <SortableHeader
                field="collateralUsd"
                label="Collateral"
                align="right"
                sortBy={sortBy}
                sortDir={sortDir}
                onSortChange={onSortChange}
              />
              <SortableHeader
                field="borrowUsd"
                label="Debt"
                align="right"
                sortBy={sortBy}
                sortDir={sortDir}
                onSortChange={onSortChange}
              />
              <SortableHeader
                field="healthFactor"
                label="Health Factor"
                tooltip="Weighted collateral / total borrows — below 1.0 = liquidatable"
                sortBy={sortBy}
                sortDir={sortDir}
                onSortChange={onSortChange}
              />
              <th>
                Positions{' '}
                <InfoTooltip text="Collateral assets → debt assets. Hover for full list." />
              </th>
              <th
                className="text-right"
                title="Loan-to-Value — raw borrows / collateral. A different view on leverage than HF (which weights by per-asset LTV caps)."
              >
                LTV
              </th>
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-12 text-center"
                  style={{ color: 'var(--fg-muted)' }}
                >
                  No wallet positions indexed yet — run the wallet indexer cron
                </td>
              </tr>
            ) : (
              data.map((row) => {
                const hfColor = healthFactorColor(row.healthFactor);
                const hfLabel = healthFactorLabel(row.healthFactor);
                const ltv =
                  row.collateralUsd > 0 ? (row.borrowUsd / row.collateralUsd) * 100 : null;
                // 2px left border in the HF band color turns the sortable
                // table into a heatmap — critical rows stay visible as you
                // scroll.
                const tint: React.CSSProperties = { borderLeft: `2px solid ${hfColor}` };
                return (
                  <tr key={row.address}>
                    <td className="text-xs" style={tint}>
                      <a
                        href={`https://suiscan.xyz/mainnet/account/${row.address}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          color: 'var(--fg)',
                        }}
                        title="Open in Suiscan"
                      >
                        {truncateAddress(row.address)}
                        <ExternalLink
                          size={10}
                          style={{ color: 'var(--fg-dim)' }}
                          aria-hidden
                        />
                      </a>
                    </td>
                    <td className="text-right">{formatUsd(row.collateralUsd, true)}</td>
                    <td className="text-right">{formatUsd(row.borrowUsd, true)}</td>
                    <td>
                      <span
                        className="inline-flex items-center gap-1.5 rounded px-2 py-0.5 text-[10px] uppercase tracking-[0.05em]"
                        style={{
                          color: hfColor,
                          background: `${hfColor}15`,
                          border: `1px solid ${hfColor}40`,
                        }}
                      >
                        <span
                          className="inline-block h-1.5 w-1.5 rounded-full"
                          style={{ background: hfColor }}
                        />
                        {row.healthFactor >= 100 ? '99+' : formatNumber(row.healthFactor, 2)}
                        <span className="opacity-70">{hfLabel}</span>
                      </span>
                    </td>
                    <td>
                      <PositionsCell
                        collateralJson={row.collateralAssets}
                        borrowJson={row.borrowAssets}
                      />
                    </td>
                    <td className="text-right">
                      <LtvCell ltv={ltv} />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {total > 0 && (
        <div className="status-bar">
          <span className="status-bar-item">
            <span style={{ color: 'var(--orange)' }}>&gt;</span>
            Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total}
          </span>
          <div className="flex gap-1">
            <button
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
              className="time-btn disabled:opacity-30"
              type="button"
            >
              Prev
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => onPageChange(page + 1)}
              className="time-btn disabled:opacity-30"
              type="button"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </>
  );
}

/**
 * LTV = borrows / collateral (raw, unweighted). Different from HF, which
 * applies per-asset LTV caps. Shown as percent + thin bar.
 */
function LtvCell({ ltv }: { ltv: number | null }) {
  if (ltv === null) {
    return <span style={{ color: 'var(--fg-muted)' }}>—</span>;
  }
  const barColor =
    ltv < 50 ? 'var(--green)' : ltv < 75 ? 'var(--yellow)' : 'var(--red)';
  const pct = Math.min(ltv, 100);
  return (
    <div
      style={{
        display: 'inline-flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        gap: 3,
        minWidth: 70,
      }}
    >
      <span style={{ fontVariantNumeric: 'tabular-nums' }}>{ltv.toFixed(1)}%</span>
      <div
        style={{
          width: 60,
          height: 3,
          background: 'var(--bg-2)',
          borderRadius: 2,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: '100%',
            background: barColor,
            transition: 'width 0.3s ease',
          }}
        />
      </div>
    </div>
  );
}
