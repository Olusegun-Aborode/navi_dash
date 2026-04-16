'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  TuiPanel,
  ChartWrapper,
  LoadingState,
  ErrorState,
} from '@datumlabs/dashboard-kit';
import StackedAreaChart from '@/components/charts/StackedAreaChart';
import InfoTooltip from '@/components/InfoTooltip';
import { formatUsd } from '@/lib/utils';

interface PoolData {
  symbol: string;
  totalSupplyUsd: number;
  totalBorrowsUsd: number;
}
interface PoolsResponse {
  pools: PoolData[];
  totals: { totalSupplyUsd: number; totalBorrowsUsd: number; tvl: number };
  protocolName?: string;
  symbols?: string[];
}
interface HistoryRow {
  symbol: string;
  date: string;
  closeTotalSupplyUsd: number;
  closeTotalBorrowsUsd: number;
  closeLiquidityUsd: number;
}

export default function OverviewPage() {
  const { protocol } = useParams<{ protocol: string }>();
  const [days, setDays] = useState(30);

  const poolsQuery = useQuery<PoolsResponse>({
    queryKey: ['pools', protocol],
    queryFn: () => fetch(`/api/${protocol}/pools`).then((r) => r.json()),
  });

  const historyQuery = useQuery<{ history: HistoryRow[] }>({
    queryKey: ['poolsHistory', protocol, days],
    queryFn: () =>
      fetch(`/api/${protocol}/pools/history?days=${days}`).then((r) => r.json()),
  });

  if (poolsQuery.isPending) return <LoadingState />;
  if (poolsQuery.isError)
    return <ErrorState message="Failed to load pools." onRetry={() => poolsQuery.refetch()} />;

  const pools = poolsQuery.data;
  const history = historyQuery.data?.history ?? [];
  const symbols = pools.symbols ?? pools.pools.map((p) => p.symbol);
  const t = pools.totals;
  const utilizationPct = t.totalSupplyUsd > 0 ? (t.totalBorrowsUsd / t.totalSupplyUsd) * 100 : 0;

  function buildChartData(valueKey: string) {
    const dateMap = new Map<string, Record<string, unknown>>();
    for (const row of history) {
      const dateStr = new Date(row.date).toISOString().split('T')[0];
      if (!dateMap.has(dateStr)) dateMap.set(dateStr, { date: dateStr });
      const entry = dateMap.get(dateStr)!;
      if (valueKey === 'supply') entry[`${row.symbol}_supply`] = row.closeTotalSupplyUsd;
      if (valueKey === 'borrows') entry[`${row.symbol}_borrows`] = row.closeTotalBorrowsUsd;
      if (valueKey === 'tvl') entry[`${row.symbol}_tvl`] = row.closeLiquidityUsd;
    }
    return Array.from(dateMap.values()).sort((a, b) =>
      String(a.date).localeCompare(String(b.date))
    );
  }

  return (
    <div className="space-y-4">
      <TuiPanel title="Protocol Overview" badge="LIVE" noPadding>
        <div className="grid grid-cols-2 lg:grid-cols-4">
          <MetricCardCell title="Total Supplied" value={formatUsd(t.totalSupplyUsd, true)} tooltip="Sum of all deposited assets across pools, in USD" />
          <MetricCardCell title="Total Borrowed" value={formatUsd(t.totalBorrowsUsd, true)} tooltip="Sum of all outstanding borrows across pools, in USD" />
          <MetricCardCell title="TVL" value={formatUsd(t.tvl, true)} tooltip="Total Value Locked = Total Supplied − Total Borrowed" />
          <MetricCardCell title="Utilization" value={`${utilizationPct.toFixed(2)}%`} last tooltip="Total Borrowed / Total Supplied as a percentage" />
        </div>
      </TuiPanel>

      <ChartWrapper title="Total Supply by Asset" badge={`${days}D`} timeRanges={[7, 30, 90]} selectedRange={days} onRangeChange={setDays}>
        <StackedAreaChart data={buildChartData('supply')} symbols={symbols} valueKey="supply" />
      </ChartWrapper>

      <ChartWrapper title="Total Borrows by Asset" badge={`${days}D`} timeRanges={[7, 30, 90]} selectedRange={days} onRangeChange={setDays}>
        <StackedAreaChart data={buildChartData('borrows')} symbols={symbols} valueKey="borrows" />
      </ChartWrapper>

      <ChartWrapper title="TVL by Asset" badge={`${days}D`} timeRanges={[7, 30, 90]} selectedRange={days} onRangeChange={setDays}>
        <StackedAreaChart data={buildChartData('tvl')} symbols={symbols} valueKey="tvl" />
      </ChartWrapper>
    </div>
  );
}

function MetricCardCell({ title, value, last, tooltip }: { title: string; value: string; last?: boolean; tooltip?: string }) {
  return (
    <div
      className={`p-4 lg:p-5 ${last ? '' : 'border-r'}`}
      style={{ borderColor: 'var(--border)' }}
    >
      <div className="counter-label flex items-center gap-1">
        {title}
        {tooltip && <InfoTooltip text={tooltip} />}
      </div>
      <div className="counter-value" style={{ color: 'var(--foreground)' }}>
        {value}
      </div>
    </div>
  );
}

