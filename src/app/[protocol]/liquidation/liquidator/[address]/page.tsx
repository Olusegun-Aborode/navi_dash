'use client';

import { useState, use } from 'react';
import Link from 'next/link';
import { ArrowLeft, Copy, ExternalLink } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import {
  TuiPanel,
  ChartWrapper,
  LoadingState,
  ErrorState,
} from '@datumlabs/dashboard-kit';
import SimpleBarChart from '@/components/charts/SimpleBarChart';
import LiquidationsTable, { type LiquidationRow } from '@/components/tables/LiquidationsTable';
import InfoTooltip from '@/components/InfoTooltip';
import {
  formatUsd,
  formatNumber,
  formatPercent,
  formatDateFull,
  truncateAddress,
} from '@/lib/utils';

interface Summary {
  count: number;
  totalCollateralUsd: number;
  totalDebtUsd: number;
  treasuryUsd: number;
  grossProfit: number;
  totalGasUsd: number;
  netProfit: number;
  avgProfit: number;
  firstSeen: string;
  lastSeen: string;
}
interface GasEfficiency {
  totalGasUsd: number;
  avgGasUsdPerLiquidation: number;
  gasToProfitRatio: number | null;
  coverage: number;
}
interface DailyRow {
  date: string;
  count: number;
  grossProfit: number;
  gasUsd: number;
}
interface AssetRow {
  asset: string;
  count: number;
  totalUsd: number;
}
interface BorrowerRow {
  borrower: string;
  count: number;
  totalCollateralUsd: number;
  totalDebtUsd: number;
}
interface ProfileResponse {
  summary: Summary;
  gasEfficiency: GasEfficiency;
  daily: DailyRow[];
  assets: { collateralSeized: AssetRow[]; debtRepaid: AssetRow[] };
  topBorrowers: BorrowerRow[];
  events: LiquidationRow[];
  total: number;
  page: number;
  limit: number;
}

export default function LiquidatorProfilePage({
  params,
}: {
  params: Promise<{ protocol: string; address: string }>;
}) {
  const { protocol, address } = use(params);
  const [page, setPage] = useState(1);
  const limit = 25;

  const { data, isPending, isError, refetch } = useQuery<ProfileResponse>({
    queryKey: ['liquidatorProfile', protocol, address, page],
    queryFn: () =>
      fetch(
        `/api/${protocol}/liquidations/liquidator/${address}?page=${page}&limit=${limit}`
      ).then((r) => r.json()),
  });

  if (isPending) return <LoadingState />;
  if (isError || !data || !data.summary) {
    return <ErrorState message="Failed to load liquidator profile." onRetry={() => refetch()} />;
  }

  const { summary, gasEfficiency, daily, assets, topBorrowers, events, total } = data;

  const dailyChartData = daily.map((d) => ({
    date: typeof d.date === 'string' ? d.date : new Date(d.date).toISOString(),
    value: d.grossProfit,
  }));

  function copyAddress() {
    if (typeof navigator !== 'undefined') navigator.clipboard?.writeText(address);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href={`/${protocol}/liquidation/leaderboard`}
          className="rounded p-1.5 transition-colors"
          style={{ color: 'var(--text-muted)', border: '1px solid var(--border)' }}
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <span
          className="text-[11px] font-bold uppercase tracking-[0.1em]"
          style={{ color: 'var(--accent-orange)' }}
        >
          Liquidator
        </span>
        <span className="text-[11px]" style={{ color: 'var(--foreground)' }}>
          {truncateAddress(address, 8)}
        </span>
        <button
          onClick={copyAddress}
          className="rounded p-1 transition-colors"
          style={{ color: 'var(--text-muted)' }}
          title="Copy address"
        >
          <Copy className="h-3 w-3" />
        </button>
        <a
          href={`https://suiscan.xyz/mainnet/account/${address}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-[10px] uppercase tracking-[0.08em]"
          style={{ color: 'var(--accent-orange)' }}
        >
          Suiscan <ExternalLink className="h-3 w-3" />
        </a>
      </div>

      <TuiPanel title="Liquidator Summary" badge="NAVI" noPadding>
        <div className="grid grid-cols-2 lg:grid-cols-6">
          <Cell title="Liquidations" value={summary.count.toLocaleString()} />
          <Cell title="Gross Profit" value={formatUsd(summary.grossProfit, true)} />
          <Cell
            title="Net Profit"
            value={formatUsd(summary.netProfit, true)}
            valueColor={
              summary.netProfit >= 0 ? 'var(--accent-green)' : 'var(--accent-red)'
            }
          />
          <Cell title="Total Seized" value={formatUsd(summary.totalCollateralUsd, true)} />
          <Cell title="Total Repaid" value={formatUsd(summary.totalDebtUsd, true)} />
          <Cell title="Avg Profit" value={formatUsd(summary.avgProfit, true)} last />
        </div>
        <div
          className="grid grid-cols-2 border-t px-4 py-2 text-[10px] lg:grid-cols-4"
          style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}
        >
          <span>First Seen: {formatDateFull(summary.firstSeen)}</span>
          <span>Last Active: {formatDateFull(summary.lastSeen)}</span>
          <span>Treasury Paid: {formatUsd(summary.treasuryUsd, true)}</span>
          <span>Total Gas: {formatUsd(summary.totalGasUsd, true)}</span>
        </div>
      </TuiPanel>

      <ChartWrapper title="Daily Gross Profit" badge="ALL TIME">
        <SimpleBarChart data={dailyChartData} color="var(--accent-green)" />
      </ChartWrapper>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TuiPanel title="Collateral Seized by Asset" badge={`${assets.collateralSeized.length} ASSETS`} noPadding>
          <AssetTable rows={assets.collateralSeized} />
        </TuiPanel>
        <TuiPanel title="Debt Repaid by Asset" badge={`${assets.debtRepaid.length} ASSETS`} noPadding>
          <AssetTable rows={assets.debtRepaid} />
        </TuiPanel>
      </div>

      <TuiPanel title="Borrowers Targeted" badge={`TOP ${topBorrowers.length}`} noPadding>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Borrower</th>
                <th className="text-right">Liquidations</th>
                <th className="text-right">Total Seized</th>
                <th className="text-right">Total Repaid</th>
              </tr>
            </thead>
            <tbody>
              {topBorrowers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-12 text-center" style={{ color: 'var(--text-muted)' }}>
                    No borrower data
                  </td>
                </tr>
              ) : (
                topBorrowers.map((b) => (
                  <tr key={b.borrower}>
                    <td className="text-xs">{truncateAddress(b.borrower)}</td>
                    <td className="text-right">{b.count.toLocaleString()}</td>
                    <td className="text-right">{formatUsd(b.totalCollateralUsd, true)}</td>
                    <td className="text-right">{formatUsd(b.totalDebtUsd, true)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </TuiPanel>

      <TuiPanel title="Gas Efficiency" badge={`${(gasEfficiency.coverage * 100).toFixed(0)}% INDEXED`} noPadding>
        <div className="grid grid-cols-2 lg:grid-cols-4">
          <Cell title="Total Gas Spent" value={formatUsd(gasEfficiency.totalGasUsd, true)} />
          <Cell
            title="Avg Gas / Liquidation"
            value={formatUsd(gasEfficiency.avgGasUsdPerLiquidation)}
          />
          <Cell
            title="Gas / Profit Ratio"
            value={
              gasEfficiency.gasToProfitRatio == null
                ? '—'
                : formatPercent(gasEfficiency.gasToProfitRatio * 100)
            }
            tooltip="Total gas spent / gross profit — lower is more efficient"
          />
          <Cell title="Net Profit" value={formatUsd(summary.netProfit, true)} last />
        </div>
        {gasEfficiency.coverage < 1 && (
          <div
            className="border-t px-4 py-2 text-[10px]"
            style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}
          >
            {((1 - gasEfficiency.coverage) * 100).toFixed(0)}% of this liquidator&apos;s events
            are still being backfilled. Numbers will update as the gas backfill completes.
          </div>
        )}
      </TuiPanel>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TuiPanel title="Funding Source" badge="COMING SOON">
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Funding-source analysis traces inbound SUI / USDC / WETH transfers to a
            liquidator&apos;s address before their first liquidation. This requires a
            dedicated transfer indexer that we have not built yet.
          </p>
        </TuiPanel>
        <TuiPanel title="Cross-Protocol Activity" badge="COMING SOON">
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            We currently index NAVI only. Cross-protocol stats (Scallop, Suilend, etc.)
            require additional event indexers and are not yet wired into the dataset.
          </p>
        </TuiPanel>
      </div>

      <TuiPanel title="Event History" badge={`${total} EVENTS`} noPadding>
        <LiquidationsTable
          data={events}
          total={total}
          page={page}
          limit={limit}
          onPageChange={setPage}
        />
      </TuiPanel>
    </div>
  );
}

function Cell({
  title,
  value,
  sub,
  last,
  valueColor,
  tooltip,
}: {
  title: string;
  value: string;
  sub?: string;
  last?: boolean;
  valueColor?: string;
  tooltip?: string;
}) {
  return (
    <div
      className={`p-4 lg:p-5 ${last ? '' : 'border-r'}`}
      style={{ borderColor: 'var(--border)' }}
    >
      <div className="counter-label flex items-center gap-1">
        {title}
        {tooltip && <InfoTooltip text={tooltip} />}
      </div>
      <div className="counter-value" style={{ color: valueColor ?? 'var(--foreground)' }}>
        {value}
      </div>
      {sub && (
        <div className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>
          {sub}
        </div>
      )}
    </div>
  );
}

function AssetTable({ rows }: { rows: AssetRow[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="data-table">
        <thead>
          <tr>
            <th>Asset</th>
            <th className="text-right">Count</th>
            <th className="text-right">Total USD</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={3} className="px-4 py-8 text-center" style={{ color: 'var(--text-muted)' }}>
                No data
              </td>
            </tr>
          ) : (
            rows.map((r) => (
              <tr key={r.asset}>
                <td className="text-xs">{r.asset}</td>
                <td className="text-right">{formatNumber(r.count, 0)}</td>
                <td className="text-right">{formatUsd(r.totalUsd, true)}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
