'use client';

import { useState } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { formatUsd, formatNumber, formatPercent } from '@/lib/utils';
import { ChevronUp, ChevronDown } from 'lucide-react';

export interface MarketRow {
  symbol: string;
  totalSupply: number;
  totalSupplyUsd: number;
  totalBorrows: number;
  totalBorrowsUsd: number;
  availableLiquidity: number;
  availableLiquidityUsd: number;
  supplyApy: number;
  borrowApy: number;
  utilization: number;
}

type SortKey = keyof MarketRow;

interface MarketsTableProps {
  data: MarketRow[];
  protocolSlug?: string;
}

export default function MarketsTable({ data, protocolSlug }: MarketsTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('totalSupplyUsd');
  const [sortAsc, setSortAsc] = useState(false);

  const sorted = [...data].sort((a, b) => {
    const aVal = a[sortKey];
    const bVal = b[sortKey];
    if (typeof aVal === 'number' && typeof bVal === 'number') {
      return sortAsc ? aVal - bVal : bVal - aVal;
    }
    return String(aVal).localeCompare(String(bVal)) * (sortAsc ? 1 : -1);
  });

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(false);
    }
  }

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return null;
    return sortAsc ? <ChevronUp className="inline h-3 w-3" /> : <ChevronDown className="inline h-3 w-3" />;
  };

  const columns: Array<{ key: SortKey; label: string; align?: string }> = [
    { key: 'symbol', label: 'Market' },
    { key: 'totalSupplyUsd', label: 'Total Supply', align: 'right' },
    { key: 'totalBorrowsUsd', label: 'Total Borrows', align: 'right' },
    { key: 'availableLiquidityUsd', label: 'Liquidity', align: 'right' },
    { key: 'supplyApy', label: 'Supply APY', align: 'right' },
    { key: 'borrowApy', label: 'Borrow APY', align: 'right' },
    { key: 'utilization', label: 'Utilization', align: 'right' },
  ];

  return (
    <div className="overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-900/50">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-800">
            {columns.map((col) => (
              <th
                key={col.key}
                className={cn(
                  'cursor-pointer px-4 py-3 font-medium text-zinc-400 hover:text-white transition-colors',
                  col.align === 'right' ? 'text-right' : 'text-left'
                )}
                onClick={() => handleSort(col.key)}
              >
                {col.label} <SortIcon col={col.key} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-12 text-center text-zinc-600">
                No pool data available — connect RPC to fetch live data
              </td>
            </tr>
          ) : (
            sorted.map((row) => (
              <tr
                key={row.symbol}
                className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors"
              >
                <td className="px-4 py-3">
                  <Link href={protocolSlug ? `/${protocolSlug}/markets/${row.symbol}` : `/markets/${row.symbol}`} className="flex items-center gap-2 text-white hover:text-blue-400">
                    <span
                      className="inline-block h-3 w-3 rounded-full"
                      style={{ backgroundColor: '#666' }}
                    />
                    <span className="font-medium">{row.symbol}</span>
                  </Link>
                </td>
                <td className="px-4 py-3 text-right text-zinc-300">
                  <div>{formatUsd(row.totalSupplyUsd, true)}</div>
                  <div className="text-xs text-zinc-500">{formatNumber(row.totalSupply)} {row.symbol}</div>
                </td>
                <td className="px-4 py-3 text-right text-zinc-300">
                  <div>{formatUsd(row.totalBorrowsUsd, true)}</div>
                  <div className="text-xs text-zinc-500">{formatNumber(row.totalBorrows)} {row.symbol}</div>
                </td>
                <td className="px-4 py-3 text-right text-zinc-300">
                  <div>{formatUsd(row.availableLiquidityUsd, true)}</div>
                  <div className="text-xs text-zinc-500">{formatNumber(row.availableLiquidity)} {row.symbol}</div>
                </td>
                <td className="px-4 py-3 text-right text-green-400 font-medium">
                  {formatPercent(row.supplyApy)}
                </td>
                <td className="px-4 py-3 text-right text-red-400 font-medium">
                  {formatPercent(row.borrowApy)}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <div className="h-2 w-16 overflow-hidden rounded-full bg-zinc-800">
                      <div
                        className="h-full rounded-full bg-blue-500"
                        style={{ width: `${Math.min(row.utilization, 100)}%` }}
                      />
                    </div>
                    <span className="text-zinc-300">{formatPercent(row.utilization)}</span>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
