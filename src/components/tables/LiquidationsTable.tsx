'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { formatUsd, formatNumber, formatDateFull, truncateAddress } from '@/lib/utils';

export interface LiquidationRow {
  id: string;
  txDigest: string;
  timestamp: string;
  liquidator: string;
  borrower: string;
  collateralAsset: string;
  collateralAmount: number;
  collateralUsd: number;
  debtAsset: string;
  debtAmount: number;
  debtUsd: number;
}

interface LiquidationsTableProps {
  data: LiquidationRow[];
  total: number;
  page: number;
  limit: number;
  onPageChange: (page: number) => void;
}

export default function LiquidationsTable({ data, total, page, limit, onPageChange }: LiquidationsTableProps) {
  const params = useParams<{ protocol: string }>();
  const protocol = params?.protocol ?? 'navi';
  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <>
      <div className="overflow-x-auto">
        {/* Size the table to its content (not to the panel) so addresses +
            small USD figures don't leave rivers of whitespace between
            columns. width:auto overrides the global .data-table { width:100% }
            and the pixel widths in <colgroup> become the source of truth. */}
        <table
          className="data-table"
          style={{ tableLayout: 'fixed', width: 'auto' }}
        >
          <colgroup>
            <col style={{ width: 130 }} /> {/* Date */}
            <col style={{ width: 150 }} /> {/* Borrower */}
            <col style={{ width: 170 }} /> {/* Liquidator (linked, slightly wider) */}
            <col style={{ width: 170 }} /> {/* Collateral Seized (USD + sub) */}
            <col style={{ width: 170 }} /> {/* Debt Repaid (USD + sub) */}
            <col style={{ width: 70 }} />  {/* Tx (VIEW) */}
          </colgroup>
          <thead>
            <tr>
              <th>Date</th>
              <th>Borrower</th>
              <th>Liquidator</th>
              <th className="text-right">Collateral Seized</th>
              <th className="text-right">Debt Repaid</th>
              <th>Tx</th>
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center" style={{ color: 'var(--text-muted)' }}>
                  No liquidation events indexed yet — run the liquidation indexer cron
                </td>
              </tr>
            ) : (
              data.map((row) => (
                <tr key={row.id}>
                  <td className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                    {formatDateFull(row.timestamp)}
                  </td>
                  <td className="text-xs">{truncateAddress(row.borrower)}</td>
                  <td className="text-xs">
                    <Link
                      href={`/${protocol}/liquidation/liquidator/${row.liquidator}`}
                      className="hover:underline"
                      style={{ color: 'var(--accent-orange)' }}
                    >
                      {truncateAddress(row.liquidator)}
                    </Link>
                  </td>
                  {/* Merge "amount" + "amount USD" into a single column so the
                      USD headline lines up across all rows (the token-suffix
                      variant broke alignment when symbols had different widths:
                      e.g. `123 vSUI` vs `4,567 USDC`). */}
                  <td className="text-right">
                    <div>{formatUsd(row.collateralUsd, true)}</div>
                    <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                      {formatNumber(row.collateralAmount)} {row.collateralAsset}
                    </div>
                  </td>
                  <td className="text-right">
                    <div>{formatUsd(row.debtUsd, true)}</div>
                    <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                      {formatNumber(row.debtAmount)} {row.debtAsset}
                    </div>
                  </td>
                  <td>
                    <a
                      href={`https://suiscan.xyz/mainnet/tx/${row.txDigest}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] uppercase tracking-[0.08em]"
                      style={{ color: 'var(--accent-orange)' }}
                    >
                      View
                    </a>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {total > 0 && (
        <div className="status-bar">
          <span className="status-bar-item">
            <span style={{ color: 'var(--accent-orange)' }}>&gt;</span>
            Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total}
          </span>
          <div className="flex gap-1">
            <button
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
              className="time-btn disabled:opacity-30"
            >
              Prev
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => onPageChange(page + 1)}
              className="time-btn disabled:opacity-30"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </>
  );
}
