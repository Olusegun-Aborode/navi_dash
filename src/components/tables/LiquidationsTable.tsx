'use client';

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
  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800">
              <th className="px-4 py-3 text-left font-medium text-zinc-400">Date</th>
              <th className="px-4 py-3 text-left font-medium text-zinc-400">Borrower</th>
              <th className="px-4 py-3 text-left font-medium text-zinc-400">Liquidator</th>
              <th className="px-4 py-3 text-right font-medium text-zinc-400">Collateral</th>
              <th className="px-4 py-3 text-right font-medium text-zinc-400">Collateral USD</th>
              <th className="px-4 py-3 text-right font-medium text-zinc-400">Debt Repaid</th>
              <th className="px-4 py-3 text-right font-medium text-zinc-400">Debt USD</th>
              <th className="px-4 py-3 text-left font-medium text-zinc-400">Tx</th>
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-zinc-600">
                  No liquidation events indexed yet — run the liquidation indexer cron
                </td>
              </tr>
            ) : (
              data.map((row) => (
                <tr key={row.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors">
                  <td className="whitespace-nowrap px-4 py-3 text-zinc-400 text-xs">
                    {formatDateFull(row.timestamp)}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-zinc-300">
                    {truncateAddress(row.borrower)}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-zinc-300">
                    {truncateAddress(row.liquidator)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right text-zinc-300">
                    {formatNumber(row.collateralAmount)} {row.collateralAsset}
                  </td>
                  <td className="px-4 py-3 text-right text-zinc-300">
                    {formatUsd(row.collateralUsd, true)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right text-zinc-300">
                    {formatNumber(row.debtAmount)} {row.debtAsset}
                  </td>
                  <td className="px-4 py-3 text-right text-zinc-300">
                    {formatUsd(row.debtUsd, true)}
                  </td>
                  <td className="px-4 py-3">
                    <a
                      href={`https://suiscan.xyz/mainnet/tx/${row.txDigest}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:text-blue-300 text-xs"
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
        <div className="flex items-center justify-between border-t border-zinc-800 px-4 py-3">
          <span className="text-xs text-zinc-500">
            Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total}
          </span>
          <div className="flex gap-1">
            <button
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
              className="rounded px-3 py-1 text-xs text-zinc-400 hover:bg-zinc-800 disabled:opacity-30"
            >
              Prev
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => onPageChange(page + 1)}
              className="rounded px-3 py-1 text-xs text-zinc-400 hover:bg-zinc-800 disabled:opacity-30"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
