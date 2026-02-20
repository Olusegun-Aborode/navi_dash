'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import KpiCard from '@/components/KpiCard';
import TimeFilter from '@/components/TimeFilter';
import StackedAreaChart from '@/components/charts/StackedAreaChart';
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
  const [pools, setPools] = useState<PoolsResponse | null>(null);
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch(`/api/${protocol}/pools`).then((r) => r.json()),
      fetch(`/api/${protocol}/pools/history?days=${days}`).then((r) => r.json()),
    ])
      .then(([poolsData, historyData]) => {
        setPools(poolsData);
        setHistory(historyData.history ?? []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [protocol, days]);

  // Get symbols from the API response
  const symbols = pools?.symbols ?? pools?.pools?.map((p) => p.symbol) ?? [];

  function buildChartData(valueKey: string) {
    const dateMap = new Map<string, Record<string, unknown>>();
    for (const row of history) {
      const dateStr = new Date(row.date).toISOString().split('T')[0];
      if (!dateMap.has(dateStr)) {
        dateMap.set(dateStr, { date: dateStr });
      }
      const entry = dateMap.get(dateStr)!;
      if (valueKey === 'supply') entry[`${row.symbol}_supply`] = row.closeTotalSupplyUsd;
      if (valueKey === 'borrows') entry[`${row.symbol}_borrows`] = row.closeTotalBorrowsUsd;
      if (valueKey === 'tvl') entry[`${row.symbol}_tvl`] = row.closeLiquidityUsd;
    }
    return Array.from(dateMap.values()).sort((a, b) =>
      String(a.date).localeCompare(String(b.date))
    );
  }

  const t = pools?.totals;
  const protocolName = pools?.protocolName ?? protocol.toUpperCase();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Protocol Overview</h1>
          <p className="text-sm text-zinc-400">{protocolName} — real-time analytics</p>
        </div>
        <TimeFilter value={days} onChange={setDays} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard
          title="Total Supplied"
          value={t ? formatUsd(t.totalSupplyUsd, true) : '—'}
          subtitle={loading ? 'Loading...' : undefined}
        />
        <KpiCard
          title="Total Borrowed"
          value={t ? formatUsd(t.totalBorrowsUsd, true) : '—'}
          subtitle={loading ? 'Loading...' : undefined}
        />
        <KpiCard
          title="Total Value Locked"
          value={t ? formatUsd(t.tvl, true) : '—'}
          subtitle={loading ? 'Loading...' : undefined}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-1">
        <StackedAreaChart
          data={buildChartData('supply')}
          symbols={symbols}
          title="Total Supply by Asset"
          valueKey="supply"
        />
        <StackedAreaChart
          data={buildChartData('borrows')}
          symbols={symbols}
          title="Total Borrows by Asset"
          valueKey="borrows"
        />
        <StackedAreaChart
          data={buildChartData('tvl')}
          symbols={symbols}
          title="TVL by Asset"
          valueKey="tvl"
        />
      </div>
    </div>
  );
}
