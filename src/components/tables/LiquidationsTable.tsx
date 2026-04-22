'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ChevronDown } from 'lucide-react';
import { formatUsd, formatNumber, formatDateFull, truncateAddress, getAssetColor } from '@/lib/utils';

export interface LiquidationRow {
  id: string;
  protocol: string;
  txDigest: string;
  timestamp: string;
  liquidator: string;
  borrower: string;
  collateralAsset: string;
  collateralAmount: number;
  collateralPrice: number;
  collateralUsd: number;
  debtAsset: string;
  debtAmount: number;
  debtPrice: number;
  debtUsd: number;
  treasuryAmount: number;
}

interface LiquidationsTableProps {
  data: LiquidationRow[];
  total: number;
  page: number;
  limit: number;
  onPageChange: (page: number) => void;
}

/**
 * Gross liquidator profit — matches the Methodology page formula exactly:
 *   collateralUsd − debtUsd − (treasuryAmount × collateralPrice)
 *
 * Net profit (gross − gas) is intentionally not shown here; it lives on
 * the liquidator profile drill-down because gas coverage is still being
 * backfilled and would read as misleadingly low for older rows.
 */
function grossProfit(row: LiquidationRow): number {
  const treasuryUsd = row.treasuryAmount * row.collateralPrice;
  return row.collateralUsd - row.debtUsd - treasuryUsd;
}

export default function LiquidationsTable({
  data,
  total,
  page,
  limit,
  onPageChange,
}: LiquidationsTableProps) {
  const params = useParams<{ protocol: string }>();
  const protocol = params?.protocol ?? 'navi';
  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <>
      <div className="overflow-x-auto">
        {/* Table sized to content (width:auto overrides .data-table { width:100% }).
            9 columns — explicit pixel widths keep them honest. Total ≈ 1080px;
            on narrower screens the outer .overflow-x-auto scrolls horizontally. */}
        <table className="data-table" style={{ tableLayout: 'fixed', width: 'auto' }}>
          <colgroup>
            <col style={{ width: 110 }} /> {/* Time */}
            <col style={{ width: 70 }} />  {/* Protocol */}
            <col style={{ width: 140 }} /> {/* Pair */}
            <col style={{ width: 150 }} /> {/* Collateral */}
            <col style={{ width: 150 }} /> {/* Debt */}
            <col style={{ width: 130 }} /> {/* Profit */}
            <col style={{ width: 140 }} /> {/* Liquidator */}
            <col style={{ width: 140 }} /> {/* Borrower */}
            <col style={{ width: 60 }} />  {/* Tx */}
          </colgroup>
          <thead>
            <tr>
              <th>
                Time <ChevronDown className="inline h-3 w-3" />
              </th>
              <th>Protocol</th>
              <th>Pair</th>
              <th className="text-right">Collateral</th>
              <th className="text-right">Debt</th>
              <th className="text-right">Profit</th>
              <th>Liquidator</th>
              <th>Borrower</th>
              <th>Tx</th>
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr>
                <td
                  colSpan={9}
                  className="px-4 py-12 text-center"
                  style={{ color: 'var(--fg-muted)' }}
                >
                  No liquidation events indexed yet — run the liquidation indexer cron
                </td>
              </tr>
            ) : (
              data.map((row) => {
                const profit = grossProfit(row);
                const profitColor =
                  profit > 0
                    ? 'var(--green)'
                    : profit < 0
                    ? 'var(--red)'
                    : 'var(--fg-muted)';
                return (
                  <tr key={row.id}>
                    <td className="text-[10px]" style={{ color: 'var(--fg-muted)' }}>
                      {formatDateFull(row.timestamp)}
                    </td>
                    <td>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '2px 6px',
                          borderRadius: 3,
                          border: '1px solid var(--border)',
                          fontFamily: 'var(--font-mono)',
                          fontSize: 10,
                          textTransform: 'uppercase',
                          letterSpacing: '0.08em',
                          color: 'var(--fg)',
                          background: 'var(--surface-2)',
                        }}
                      >
                        {row.protocol}
                      </span>
                    </td>
                    <td className="text-xs">
                      <span
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
                      >
                        <span
                          className="token-dot"
                          style={{ background: getAssetColor(row.collateralAsset), margin: 0 }}
                        />
                        <span style={{ color: 'var(--fg)' }}>{row.collateralAsset}</span>
                        <span style={{ color: 'var(--fg-dim)' }}>→</span>
                        <span
                          className="token-dot"
                          style={{ background: getAssetColor(row.debtAsset), margin: 0 }}
                        />
                        <span style={{ color: 'var(--fg)' }}>{row.debtAsset}</span>
                      </span>
                    </td>
                    <td className="text-right">
                      <div>{formatUsd(row.collateralUsd, true)}</div>
                      <div
                        className="text-[10px]"
                        style={{ color: 'var(--fg-muted)' }}
                      >
                        {formatNumber(row.collateralAmount)} {row.collateralAsset}
                      </div>
                    </td>
                    <td className="text-right">
                      <div>{formatUsd(row.debtUsd, true)}</div>
                      <div
                        className="text-[10px]"
                        style={{ color: 'var(--fg-muted)' }}
                      >
                        {formatNumber(row.debtAmount)} {row.debtAsset}
                      </div>
                    </td>
                    <td
                      className="text-right"
                      style={{ color: profitColor, fontWeight: 600 }}
                      title="Gross profit: collateralUsd − debtUsd − treasury fee"
                    >
                      {profit >= 0 ? '+' : ''}
                      {formatUsd(profit, true)}
                    </td>
                    <td className="text-xs">
                      <Link
                        href={`/${protocol}/liquidation/liquidator/${row.liquidator}`}
                        className="hover:underline"
                        style={{ color: 'var(--orange)' }}
                      >
                        {truncateAddress(row.liquidator)}
                      </Link>
                    </td>
                    <td className="text-xs">{truncateAddress(row.borrower)}</td>
                    <td>
                      <a
                        href={`https://suiscan.xyz/mainnet/tx/${row.txDigest}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] uppercase tracking-[0.08em]"
                        style={{ color: 'var(--orange)' }}
                      >
                        View
                      </a>
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
