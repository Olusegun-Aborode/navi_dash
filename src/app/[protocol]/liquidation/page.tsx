'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Trophy } from 'lucide-react';
import { TuiPanel, ChartWrapper, LoadingState, ErrorState } from '@datumlabs/dashboard-kit';
import FilterBar from '@/components/FilterBar';
import LiquidationsTable, { type LiquidationRow } from '@/components/tables/LiquidationsTable';
import DonutChart from '@/components/charts/DonutChart';
import SimpleBarChart from '@/components/charts/SimpleBarChart';

function buildFilterFields(symbols: string[]) {
  return [
    { key: 'borrower', label: 'Borrower', type: 'text' as const, placeholder: '0x...' },
    { key: 'liquidator', label: 'Liquidator', type: 'text' as const, placeholder: '0x...' },
    { key: 'collateral', label: 'Collateral Asset', type: 'select' as const, options: symbols },
    { key: 'debt', label: 'Debt Asset', type: 'select' as const, options: symbols },
    { key: 'from', label: 'From Date', type: 'date' as const },
    { key: 'to', label: 'To Date', type: 'date' as const },
  ];
}

interface LiquidationStats {
  collateralDistribution: Array<{ asset: string; totalUsd: number }>;
  dailySeized: Array<{ date: string; totalUsd: number }>;
}
interface EventsResponse {
  events: LiquidationRow[];
  total: number;
}

export default function LiquidationPage() {
  const { protocol } = useParams<{ protocol: string }>();
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [page, setPage] = useState(1);
  const limit = 25;

  const symbolsQuery = useQuery<{ symbols: string[] }>({
    queryKey: ['poolSymbols', protocol],
    queryFn: () => fetch(`/api/${protocol}/pools`).then((r) => r.json()),
  });

  const eventsQuery = useQuery<EventsResponse>({
    queryKey: ['liquidations', protocol, page, filters],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      for (const [k, v] of Object.entries(filters)) if (v) params.set(k, v);
      return fetch(`/api/${protocol}/liquidations?${params}`).then((r) => r.json());
    },
  });

  const statsQuery = useQuery<LiquidationStats>({
    queryKey: ['liquidationStats', protocol],
    queryFn: () => fetch(`/api/${protocol}/liquidations/stats`).then((r) => r.json()),
  });

  function handleFilterChange(key: string, value: string) {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  }

  const symbols = symbolsQuery.data?.symbols ?? [];
  const donutData = (statsQuery.data?.collateralDistribution ?? []).map((d) => ({
    name: d.asset,
    value: d.totalUsd,
  }));
  const barData = (statsQuery.data?.dailySeized ?? []).map((d) => ({
    date: d.date,
    value: d.totalUsd,
  }));

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Link
          href={`/${protocol}/liquidation/leaderboard`}
          className="time-btn flex items-center gap-1.5"
        >
          <Trophy className="h-3 w-3" />
          Liquidator Leaderboard
        </Link>
      </div>

      <TuiPanel title="Filters" badge={`${symbols.length} ASSETS`} noPadding>
        <FilterBar filters={filters} onChange={handleFilterChange} fields={buildFilterFields(symbols)} />
      </TuiPanel>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <ChartWrapper title="Collateral Seized Distribution" badge="30D">
          <DonutChart data={donutData} />
        </ChartWrapper>
        <ChartWrapper title="Daily Collateral Seized" badge="30D">
          <SimpleBarChart data={barData} color="var(--accent-red)" />
        </ChartWrapper>
      </div>

      <TuiPanel
        title="Liquidation Events"
        badge={eventsQuery.data ? `${eventsQuery.data.total} TOTAL` : undefined}
        noPadding
      >
        {eventsQuery.isPending ? (
          <LoadingState />
        ) : eventsQuery.isError ? (
          <ErrorState message="Failed to load events." onRetry={() => eventsQuery.refetch()} />
        ) : (
          <LiquidationsTable
            data={eventsQuery.data.events ?? []}
            total={eventsQuery.data.total ?? 0}
            page={page}
            limit={limit}
            onPageChange={setPage}
          />
        )}
      </TuiPanel>
    </div>
  );
}
