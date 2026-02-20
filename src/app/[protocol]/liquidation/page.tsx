'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import FilterBar from '@/components/FilterBar';
import LiquidationsTable, { type LiquidationRow } from '@/components/tables/LiquidationsTable';
import DonutChart from '@/components/charts/DonutChart';
import SimpleBarChart from '@/components/charts/SimpleBarChart';

const FILTER_FIELDS = [
  { key: 'borrower', label: 'Borrower', type: 'text' as const, placeholder: '0x...' },
  { key: 'liquidator', label: 'Liquidator', type: 'text' as const, placeholder: '0x...' },
  { key: 'collateral', label: 'Collateral Asset', type: 'select' as const },
  { key: 'debt', label: 'Debt Asset', type: 'select' as const },
  { key: 'from', label: 'From Date', type: 'date' as const },
  { key: 'to', label: 'To Date', type: 'date' as const },
];

interface LiquidationStats {
  collateralDistribution: Array<{ asset: string; totalUsd: number }>;
  dailySeized: Array<{ date: string; totalUsd: number }>;
}

export default function LiquidationPage() {
  const { protocol } = useParams<{ protocol: string }>();
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [events, setEvents] = useState<LiquidationRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [stats, setStats] = useState<LiquidationStats>({
    collateralDistribution: [],
    dailySeized: [],
  });
  const [loading, setLoading] = useState(true);
  const limit = 25;

  const fetchData = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (filters.borrower) params.set('borrower', filters.borrower);
    if (filters.liquidator) params.set('liquidator', filters.liquidator);
    if (filters.collateral) params.set('collateral', filters.collateral);
    if (filters.debt) params.set('debt', filters.debt);
    if (filters.from) params.set('from', filters.from);
    if (filters.to) params.set('to', filters.to);

    Promise.all([
      fetch(`/api/${protocol}/liquidations?${params}`).then((r) => r.json()),
      fetch(`/api/${protocol}/liquidations/stats`).then((r) => r.json()),
    ])
      .then(([eventsData, statsData]) => {
        setEvents(eventsData.events ?? []);
        setTotal(eventsData.total ?? 0);
        setStats(statsData);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [protocol, page, filters]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  function handleFilterChange(key: string, value: string) {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  }

  const donutData = stats.collateralDistribution.map((d) => ({
    name: d.asset,
    value: d.totalUsd,
  }));

  const barData = stats.dailySeized.map((d) => ({
    date: d.date,
    value: d.totalUsd,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Liquidation Events</h1>
        <p className="text-sm text-zinc-400">
          Browse on-chain liquidation activity across markets
        </p>
      </div>

      <FilterBar filters={filters} onChange={handleFilterChange} fields={FILTER_FIELDS} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <DonutChart
          data={donutData}
          title="Collateral Seized Distribution (30d)"
        />
        <SimpleBarChart
          data={barData}
          title="Daily Collateral Seized (30d)"
          color="#EF4444"
        />
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center text-zinc-500">
          Loading liquidation events...
        </div>
      ) : (
        <LiquidationsTable
          data={events}
          total={total}
          page={page}
          limit={limit}
          onPageChange={setPage}
        />
      )}
    </div>
  );
}
