'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import FilterBar from '@/components/FilterBar';
import WalletsTable, { type WalletRow } from '@/components/tables/WalletsTable';

const FILTER_FIELDS = [
  { key: 'search', label: 'Wallet Address', type: 'text' as const, placeholder: '0x...' },
  { key: 'collateral', label: 'Collateral Asset', type: 'select' as const },
  { key: 'borrow', label: 'Borrow Asset', type: 'select' as const },
  { key: 'minHf', label: 'Min HF', type: 'text' as const, placeholder: '0' },
];

export default function WalletsPage() {
  const { protocol } = useParams<{ protocol: string }>();
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [wallets, setWallets] = useState<WalletRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const limit = 25;

  const fetchData = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (filters.search) params.set('search', filters.search);
    if (filters.collateral) params.set('collateral', filters.collateral);
    if (filters.borrow) params.set('borrow', filters.borrow);
    if (filters.minHf) params.set('minHf', filters.minHf);

    fetch(`/api/${protocol}/wallets?${params}`)
      .then((r) => r.json())
      .then((data) => {
        setWallets(data.wallets ?? []);
        setTotal(data.total ?? 0);
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Wallet Explorer</h1>
        <p className="text-sm text-zinc-400">
          Browse borrower positions and health factors
        </p>
      </div>

      <FilterBar filters={filters} onChange={handleFilterChange} fields={FILTER_FIELDS} />

      {loading ? (
        <div className="flex h-64 items-center justify-center text-zinc-500">
          Loading wallet data...
        </div>
      ) : (
        <WalletsTable
          data={wallets}
          total={total}
          page={page}
          limit={limit}
          onPageChange={setPage}
        />
      )}
    </div>
  );
}
