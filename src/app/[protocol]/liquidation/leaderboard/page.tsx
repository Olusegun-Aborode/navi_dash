'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { TuiPanel, LoadingState, ErrorState } from '@datumlabs/dashboard-kit';
import InfoTooltip from '@/components/InfoTooltip';
import { formatUsd, formatDateFull, truncateAddress } from '@/lib/utils';

interface LeaderboardRow {
  liquidator: string;
  count: number;
  totalCollateralUsd: number;
  totalDebtUsd: number;
  treasuryUsd: number;
  grossProfit: number;
  totalGasUsd: number;
  netProfit: number;
  firstSeen: string;
  lastSeen: string;
}
interface LeaderboardResponse {
  leaderboard: LeaderboardRow[];
  total: number;
  page: number;
  limit: number;
}

export default function LiquidatorLeaderboardPage() {
  const { protocol } = useParams<{ protocol: string }>();
  const [page, setPage] = useState(1);
  const limit = 50;

  const { data, isPending, isError, refetch } = useQuery<LeaderboardResponse>({
    queryKey: ['liquidatorLeaderboard', protocol, page],
    queryFn: () =>
      fetch(`/api/${protocol}/liquidations/leaderboard?page=${page}&limit=${limit}`).then((r) =>
        r.json()
      ),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Link
          href={`/${protocol}/liquidation`}
          className="rounded p-1.5 transition-colors"
          style={{ color: 'var(--text-muted)', border: '1px solid var(--border)' }}
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <span
          className="text-[11px] font-bold uppercase tracking-[0.1em]"
          style={{ color: 'var(--accent-orange)' }}
        >
          Liquidator Leaderboard
        </span>
      </div>

      <TuiPanel
        title="Liquidator Leaderboard"
        badge={data ? `${data.total} LIQUIDATORS` : undefined}
        noPadding
      >
        {isPending ? (
          <LoadingState />
        ) : isError || !data ? (
          <ErrorState message="Failed to load leaderboard." onRetry={() => refetch()} />
        ) : (
          <LeaderboardTable
            protocol={protocol}
            rows={data.leaderboard}
            total={data.total}
            page={page}
            limit={limit}
            onPageChange={setPage}
          />
        )}
      </TuiPanel>
    </div>
  );
}

function LeaderboardTable({
  protocol,
  rows,
  total,
  page,
  limit,
  onPageChange,
}: {
  protocol: string;
  rows: LeaderboardRow[];
  total: number;
  page: number;
  limit: number;
  onPageChange: (p: number) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const startRank = (page - 1) * limit;

  return (
    <>
      <div className="overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Liquidator</th>
              <th className="text-right">Liquidations</th>
              <th className="text-right">Gross Profit <InfoTooltip text="collateralUsd − debtUsd − treasury fee, summed across all events" /></th>
              <th className="text-right">Net Profit <InfoTooltip text="Gross profit minus total gas spent in USD" /></th>
              <th className="text-right">Total Seized</th>
              <th className="text-right">Total Repaid</th>
              <th className="text-right">Treasury</th>
              <th className="text-right">Gas</th>
              <th>First Seen</th>
              <th>Last Active</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={11} className="px-4 py-12 text-center" style={{ color: 'var(--text-muted)' }}>
                  No liquidator data yet
                </td>
              </tr>
            ) : (
              rows.map((row, i) => (
                <tr key={row.liquidator}>
                  <td className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                    {startRank + i + 1}
                  </td>
                  <td className="text-xs">
                    <Link
                      href={`/${protocol}/liquidation/liquidator/${row.liquidator}`}
                      className="hover:underline"
                      style={{ color: 'var(--accent-orange)' }}
                    >
                      {truncateAddress(row.liquidator)}
                    </Link>
                  </td>
                  <td className="text-right">{row.count.toLocaleString()}</td>
                  <td className="text-right" style={{ color: 'var(--accent-green)' }}>
                    {formatUsd(row.grossProfit, true)}
                  </td>
                  <td
                    className="text-right"
                    style={{
                      color:
                        row.netProfit >= 0 ? 'var(--accent-green)' : 'var(--accent-red)',
                    }}
                  >
                    {formatUsd(row.netProfit, true)}
                  </td>
                  <td className="text-right">{formatUsd(row.totalCollateralUsd, true)}</td>
                  <td className="text-right">{formatUsd(row.totalDebtUsd, true)}</td>
                  <td className="text-right" style={{ color: 'var(--text-muted)' }}>
                    {formatUsd(row.treasuryUsd, true)}
                  </td>
                  <td className="text-right" style={{ color: 'var(--text-muted)' }}>
                    {row.totalGasUsd > 0 ? formatUsd(row.totalGasUsd, true) : '—'}
                  </td>
                  <td className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                    {formatDateFull(row.firstSeen)}
                  </td>
                  <td className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                    {formatDateFull(row.lastSeen)}
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
