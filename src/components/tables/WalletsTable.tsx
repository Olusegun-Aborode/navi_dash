'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { ChevronDown, ChevronRight } from 'lucide-react';
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

interface WalletsTableProps {
  data: WalletRow[];
  total: number;
  page: number;
  limit: number;
  onPageChange: (page: number) => void;
}

interface WalletDetail {
  address: string;
  healthFactor: number;
  collateralUsd: number;
  borrowUsd: number;
  perAsset: Array<{ symbol: string; supplyUsd: number; borrowUsd: number }>;
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

function AssetChips({ json }: { json: string }) {
  const symbols = parseAssets(json);
  if (symbols.length === 0) return <span style={{ color: 'var(--fg-muted)' }}>—</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {symbols.map((a) => (
        <span
          key={a}
          className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px]"
          style={{
            background: 'var(--bg-2)',
            border: '1px solid var(--border)',
            color: 'var(--fg)',
          }}
        >
          <span className="token-dot" style={{ backgroundColor: getAssetColor(a), margin: 0 }} />
          {a}
        </span>
      ))}
    </div>
  );
}

export default function WalletsTable({
  data,
  total,
  page,
  limit,
  onPageChange,
}: WalletsTableProps) {
  const params = useParams<{ protocol: string }>();
  const protocol = params?.protocol ?? 'navi';
  const [expanded, setExpanded] = useState<string | null>(null);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  function toggle(address: string) {
    setExpanded((cur) => (cur === address ? null : address));
  }

  return (
    <>
      <div className="overflow-x-auto">
        {/* Fixed layout + explicit widths so columns don't jump around when
            addresses / asset chips vary in length. Expanded breakdown rows
            use colSpan={6}, which spans cols 2-7 — their combined width is
            still exactly 97% thanks to the layout mode. */}
        <table className="data-table" style={{ tableLayout: 'fixed', minWidth: 1000 }}>
          <colgroup>
            <col style={{ width: '3%' }} />  {/* expand chevron */}
            <col style={{ width: '14%' }} /> {/* Wallet */}
            <col style={{ width: '13%' }} /> {/* Collateral USD */}
            <col style={{ width: '18%' }} /> {/* Collateral assets */}
            <col style={{ width: '13%' }} /> {/* Borrows USD */}
            <col style={{ width: '18%' }} /> {/* Borrow assets */}
            <col style={{ width: '21%' }} /> {/* Health Factor */}
          </colgroup>
          <thead>
            <tr>
              <th aria-label="expand" />
              <th>Wallet</th>
              <th className="text-right">Collateral</th>
              <th>Assets</th>
              <th className="text-right">Borrows</th>
              <th>Assets</th>
              <th className="text-right">
                Health Factor{' '}
                <InfoTooltip text="Weighted collateral / total borrows — below 1.0 = liquidatable" />
              </th>
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
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
                const isOpen = expanded === row.address;
                return (
                  <WalletGroup
                    key={row.address}
                    row={row}
                    hfColor={hfColor}
                    hfLabel={hfLabel}
                    isOpen={isOpen}
                    onToggle={() => toggle(row.address)}
                    protocol={protocol}
                  />
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

function WalletGroup({
  row,
  hfColor,
  hfLabel,
  isOpen,
  onToggle,
  protocol,
}: {
  row: WalletRow;
  hfColor: string;
  hfLabel: string;
  isOpen: boolean;
  onToggle: () => void;
  protocol: string;
}) {
  return (
    <>
      <tr onClick={onToggle} style={{ cursor: 'pointer' }} aria-expanded={isOpen}>
        <td style={{ color: 'var(--fg-muted)' }}>
          {isOpen ? (
            <ChevronDown className="h-3 w-3" />
          ) : (
            <ChevronRight className="h-3 w-3" />
          )}
        </td>
        <td className="text-xs">{truncateAddress(row.address)}</td>
        <td className="text-right">{formatUsd(row.collateralUsd, true)}</td>
        <td>
          <AssetChips json={row.collateralAssets} />
        </td>
        <td className="text-right">{formatUsd(row.borrowUsd, true)}</td>
        <td>
          <AssetChips json={row.borrowAssets} />
        </td>
        <td className="text-right">
          <span
            className="inline-flex items-center gap-1.5 rounded px-2 py-0.5 text-[10px] uppercase tracking-[0.05em]"
            style={{ color: hfColor, background: `${hfColor}15`, border: `1px solid ${hfColor}40` }}
          >
            <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: hfColor }} />
            {row.healthFactor >= 100 ? '99+' : formatNumber(row.healthFactor, 2)}
            <span className="opacity-70">{hfLabel}</span>
          </span>
        </td>
      </tr>
      {isOpen && (
        <tr style={{ background: 'var(--surface-2)' }}>
          <td />
          <td colSpan={6} style={{ padding: '14px 14px 18px' }}>
            <WalletBreakdown
              address={row.address}
              protocol={protocol}
              collateralUsd={row.collateralUsd}
              borrowUsd={row.borrowUsd}
            />
          </td>
        </tr>
      )}
    </>
  );
}

/**
 * Fetched lazily on row expand. While the on-chain call is in flight we
 * render a loading placeholder; on error we surface it so the user isn't
 * staring at an empty panel.
 */
function WalletBreakdown({
  address,
  protocol,
  collateralUsd,
  borrowUsd,
}: {
  address: string;
  protocol: string;
  collateralUsd: number;
  borrowUsd: number;
}) {
  const { data, isPending, isError } = useQuery<WalletDetail>({
    queryKey: ['walletDetail', protocol, address],
    queryFn: () => fetch(`/api/${protocol}/wallets/${address}`).then((r) => r.json()),
    staleTime: 60 * 1000,
  });

  if (isPending) {
    return (
      <div style={{ fontSize: 11, color: 'var(--fg-muted)', fontFamily: 'var(--font-mono)' }}>
        Loading on-chain breakdown…
      </div>
    );
  }

  if (isError || !data || !Array.isArray(data.perAsset)) {
    return (
      <div style={{ fontSize: 11, color: 'var(--red)', fontFamily: 'var(--font-mono)' }}>
        [ERR] Failed to read wallet state from chain.
      </div>
    );
  }

  const perAsset = data.perAsset ?? [];
  const collateralRows = perAsset
    .filter((a) => a.supplyUsd > 0)
    .sort((a, b) => b.supplyUsd - a.supplyUsd);
  const borrowRows = perAsset
    .filter((a) => a.borrowUsd > 0)
    .sort((a, b) => b.borrowUsd - a.borrowUsd);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
      <BreakdownColumn
        title="Collateral"
        total={data.collateralUsd || collateralUsd}
        rows={collateralRows.map((r) => ({ symbol: r.symbol, usd: r.supplyUsd }))}
      />
      <BreakdownColumn
        title="Borrows"
        total={data.borrowUsd || borrowUsd}
        rows={borrowRows.map((r) => ({ symbol: r.symbol, usd: r.borrowUsd }))}
      />
    </div>
  );
}

function BreakdownColumn({
  title,
  total,
  rows,
}: {
  title: string;
  total: number;
  rows: Array<{ symbol: string; usd: number }>;
}) {
  return (
    <div>
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          marginBottom: 10,
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            color: 'var(--fg-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
          }}
        >
          {title}
        </span>
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 12,
            fontWeight: 600,
            color: 'var(--fg)',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {formatUsd(total, true)}
        </span>
      </div>

      {rows.length === 0 ? (
        <div
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            color: 'var(--fg-muted)',
          }}
        >
          No positions.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {rows.map((r) => {
            const pct = total > 0 ? (r.usd / total) * 100 : 0;
            return (
              <div key={r.symbol}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'baseline',
                    justifyContent: 'space-between',
                    fontSize: 11,
                    fontFamily: 'var(--font-mono)',
                    marginBottom: 3,
                  }}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <span
                      className="token-dot"
                      style={{ background: getAssetColor(r.symbol), margin: 0 }}
                    />
                    <span style={{ color: 'var(--fg)', fontWeight: 500 }}>{r.symbol}</span>
                  </span>
                  <span style={{ color: 'var(--fg-muted)', fontVariantNumeric: 'tabular-nums' }}>
                    {formatUsd(r.usd, true)}{' '}
                    <span style={{ color: 'var(--fg-dim)' }}>({pct.toFixed(1)}%)</span>
                  </span>
                </div>
                <div
                  style={{
                    height: 4,
                    borderRadius: 2,
                    background: 'var(--bg-2)',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      height: '100%',
                      width: `${Math.max(pct, 0.5)}%`,
                      background: getAssetColor(r.symbol),
                      transition: 'width 0.3s ease',
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
