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
        <table className="data-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Borrower</th>
              <th>Liquidator</th>
              <th className="text-right">Collateral</th>
              <th className="text-right">Collateral USD</th>
              <th className="text-right">Debt Repaid</th>
              <th className="text-right">Debt USD</th>
              <th>Tx</th>
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center" style={{ color: 'var(--text-muted)' }}>
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
                  <td className="text-right">
                    {formatNumber(row.collateralAmount)} {row.collateralAsset}
                  </td>
                  <td className="text-right">{formatUsd(row.collateralUsd, true)}</td>
                  <td className="text-right">
                    {formatNumber(row.debtAmount)} {row.debtAsset}
                  </td>
                  <td className="text-right">{formatUsd(row.debtUsd, true)}</td>
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
