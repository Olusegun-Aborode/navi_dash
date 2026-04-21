'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import Panel from '@/components/ui/Panel';
import PageHeader from '@/components/ui/PageHeader';
import Loading from '@/components/ui/Loading';
import ErrorMsg from '@/components/ui/ErrorMsg';
import FilterBar from '@/components/FilterBar';
import WalletsTable, { type WalletRow } from '@/components/tables/WalletsTable';

function buildFilterFields(symbols: string[]) {
  return [
    { key: 'search', label: 'Wallet Address', type: 'text' as const, placeholder: '0x...' },
    { key: 'collateral', label: 'Collateral Asset', type: 'select' as const, options: symbols },
    { key: 'borrow', label: 'Borrow Asset', type: 'select' as const, options: symbols },
    { key: 'minHf', label: 'Min HF', type: 'text' as const, placeholder: '0' },
  ];
}

interface WalletsResponse {
  wallets: WalletRow[];
  total: number;
}

export default function WalletsPage() {
  const { protocol } = useParams<{ protocol: string }>();
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [page, setPage] = useState(1);
  const limit = 25;

  const symbolsQuery = useQuery<{ symbols: string[] }>({
    queryKey: ['poolSymbols', protocol],
    queryFn: () => fetch(`/api/${protocol}/pools`).then((r) => r.json()),
  });

  const walletsQuery = useQuery<WalletsResponse>({
    queryKey: ['wallets', protocol, page, filters],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      for (const [k, v] of Object.entries(filters)) if (v) params.set(k, v);
      return fetch(`/api/${protocol}/wallets?${params}`).then((r) => r.json());
    },
  });

  function handleFilterChange(key: string, value: string) {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  }

  const symbols = symbolsQuery.data?.symbols ?? [];

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Wallet Explorer"
        subtitle="Live health-factor watchlist across tracked borrowers."
      />

      <Panel title="Filters" badge={`${symbols.length} ASSETS`} flush>
        <div style={{ padding: 'var(--panel-pad)' }}>
          <FilterBar
            filters={filters}
            onChange={handleFilterChange}
            fields={buildFilterFields(symbols)}
          />
        </div>
      </Panel>

      <Panel
        title="Borrowers"
        badge={walletsQuery.data ? `${walletsQuery.data.total} WALLETS` : undefined}
        flush
      >
        {walletsQuery.isPending ? (
          <Loading message="Loading wallets" />
        ) : walletsQuery.isError ? (
          <ErrorMsg message="Failed to load wallets." onRetry={() => walletsQuery.refetch()} />
        ) : (
          <WalletsTable
            data={walletsQuery.data.wallets ?? []}
            total={walletsQuery.data.total ?? 0}
            page={page}
            limit={limit}
            onPageChange={setPage}
          />
        )}
      </Panel>
    </div>
  );
}
