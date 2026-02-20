'use client';

import { cn, formatUsd, truncateAddress, formatNumber } from '@/lib/utils';
import { healthFactorColor, healthFactorLabel } from '@/lib/constants';

export interface WalletRow {
  address: string;
  collateralUsd: number;
  borrowUsd: number;
  healthFactor: number;
  collateralAssets: string; // JSON array
  borrowAssets: string;     // JSON array
}

interface WalletsTableProps {
  data: WalletRow[];
  total: number;
  page: number;
  limit: number;
  onPageChange: (page: number) => void;
}

export default function WalletsTable({ data, total, page, limit, onPageChange }: WalletsTableProps) {
  const totalPages = Math.max(1, Math.ceil(total / limit));

  function parseAssets(json: string): string[] {
    try {
      return JSON.parse(json);
    } catch {
      return [];
    }
  }

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800">
              <th className="px-4 py-3 text-left font-medium text-zinc-400">Wallet</th>
              <th className="px-4 py-3 text-right font-medium text-zinc-400">Collateral</th>
              <th className="px-4 py-3 text-left font-medium text-zinc-400">Assets</th>
              <th className="px-4 py-3 text-right font-medium text-zinc-400">Borrows</th>
              <th className="px-4 py-3 text-left font-medium text-zinc-400">Assets</th>
              <th className="px-4 py-3 text-right font-medium text-zinc-400">Health Factor</th>
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-zinc-600">
                  No wallet positions indexed yet — run the wallet indexer cron
                </td>
              </tr>
            ) : (
              data.map((row) => {
                const hfColor = healthFactorColor(row.healthFactor);
                const hfLabel = healthFactorLabel(row.healthFactor);
                return (
                  <tr key={row.address} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-zinc-300">
                      {truncateAddress(row.address)}
                    </td>
                    <td className="px-4 py-3 text-right text-zinc-300">
                      {formatUsd(row.collateralUsd, true)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {parseAssets(row.collateralAssets).map((a) => (
                          <span key={a} className="rounded bg-zinc-800 px-1.5 py-0.5 text-xs text-zinc-300">
                            {a}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right text-zinc-300">
                      {formatUsd(row.borrowUsd, true)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {parseAssets(row.borrowAssets).map((a) => (
                          <span key={a} className="rounded bg-zinc-800 px-1.5 py-0.5 text-xs text-zinc-300">
                            {a}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span
                        className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium"
                        style={{ color: hfColor, backgroundColor: `${hfColor}15` }}
                      >
                        <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: hfColor }} />
                        {row.healthFactor >= 100 ? '99+' : formatNumber(row.healthFactor, 2)}
                        <span className="opacity-60">{hfLabel}</span>
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
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
