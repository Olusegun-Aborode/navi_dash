'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import MarketsTable, { type MarketRow } from '@/components/tables/MarketsTable';

export default function MarketsPage() {
  const { protocol } = useParams<{ protocol: string }>();
  const [markets, setMarkets] = useState<MarketRow[]>([]);
  const [protocolName, setProtocolName] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/${protocol}/pools`)
      .then((r) => r.json())
      .then((data) => {
        setMarkets(data.pools ?? []);
        setProtocolName(data.protocolName ?? protocol.toUpperCase());
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [protocol]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Markets</h1>
        <p className="text-sm text-zinc-400">
          All {protocolName} lending pools — click any row to see detailed analytics
        </p>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center text-zinc-500">
          Loading pool data...
        </div>
      ) : (
        <MarketsTable data={markets} protocolSlug={protocol} />
      )}
    </div>
  );
}
