'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import KpiCard from '@/components/KpiCard';
import SimpleLineChart from '@/components/charts/SimpleLineChart';
import InterestRateCurve from '@/components/charts/InterestRateCurve';
import DonutChart from '@/components/charts/DonutChart';
import { formatUsd, formatPercent, formatNumber } from '@/lib/utils';

interface PoolDetail {
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
  ltv: number;
  liquidationThreshold: number;
  supplyCapCeiling: number;
  borrowCapCeiling: number;
  price: number;
}

interface RateModel {
  baseRate: number;
  multiplier: number;
  jumpMultiplier: number;
  kink: number;
  reserveFactor: number;
}

interface HistoryRow {
  date: string;
  avgSupplyApy: number;
  avgBorrowApy: number;
  avgUtilization: number;
}

interface PairData {
  collateralAsset: string;
  borrowAsset: string;
  totalCollateralUsd: number;
  totalBorrowUsd: number;
}

export default function MarketDetailPage({
  params,
}: {
  params: Promise<{ protocol: string; symbol: string }>;
}) {
  const { protocol, symbol } = use(params);
  const upperSymbol = symbol.toUpperCase();

  const [pool, setPool] = useState<PoolDetail | null>(null);
  const [rateModel, setRateModel] = useState<RateModel | null>(null);
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [pairs, setPairs] = useState<{ asCollateral: PairData[]; asBorrow: PairData[] }>({
    asCollateral: [],
    asBorrow: [],
  });
  const [assetColor, setAssetColor] = useState('#666');
  const [assetName, setAssetName] = useState(upperSymbol);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/${protocol}/pools/${upperSymbol}`)
      .then((r) => r.json())
      .then((data) => {
        setPool(data.pool);
        setRateModel(data.rateModel);
        setHistory(data.history ?? []);
        setPairs(data.pairs ?? { asCollateral: [], asBorrow: [] });
        if (data.assetColor) setAssetColor(data.assetColor);
        if (data.assetName) setAssetName(data.assetName);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [protocol, upperSymbol]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-zinc-500">
        Loading {upperSymbol} data...
      </div>
    );
  }

  const rateHistory = history.map((h) => ({
    date: h.date,
    supplyApy: h.avgSupplyApy,
    borrowApy: h.avgBorrowApy,
  }));

  const utilHistory = history.map((h) => ({
    date: h.date,
    utilization: h.avgUtilization,
  }));

  const borrowedAgainst = pairs.asCollateral.map((p) => ({
    name: p.borrowAsset,
    value: p.totalBorrowUsd,
  }));

  const collateralUsed = pairs.asBorrow.map((p) => ({
    name: p.collateralAsset,
    value: p.totalCollateralUsd,
  }));

  return (
    <div className="space-y-6">
      {/* Back link + title */}
      <div className="flex items-center gap-3">
        <Link
          href={`/${protocol}/markets`}
          className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-800 hover:text-white"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex items-center gap-3">
          <span
            className="inline-block h-4 w-4 rounded-full"
            style={{ backgroundColor: assetColor }}
          />
          <h1 className="text-2xl font-bold text-white">{upperSymbol}</h1>
          <span className="text-sm text-zinc-400">{assetName}</span>
        </div>
      </div>

      {/* Row 1: Overview cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <KpiCard title="Total Supply" value={pool ? formatUsd(pool.totalSupplyUsd, true) : '—'} subtitle={pool ? `${formatNumber(pool.totalSupply)} ${upperSymbol}` : undefined} />
        <KpiCard title="Total Borrows" value={pool ? formatUsd(pool.totalBorrowsUsd, true) : '—'} subtitle={pool ? `${formatNumber(pool.totalBorrows)} ${upperSymbol}` : undefined} />
        <KpiCard title="Supply APY" value={pool ? formatPercent(pool.supplyApy) : '—'} />
        <KpiCard title="Borrow APY" value={pool ? formatPercent(pool.borrowApy) : '—'} />
      </div>

      {/* Row 2: Rate model + Risk params */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {rateModel ? (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 space-y-3">
            <h3 className="text-sm font-medium text-zinc-400">Interest Rate Model</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <span className="text-zinc-500">Base Rate</span>
              <span className="text-right text-zinc-300">{formatPercent(rateModel.baseRate * 100)}</span>
              <span className="text-zinc-500">Multiplier</span>
              <span className="text-right text-zinc-300">{formatPercent(rateModel.multiplier * 100)}</span>
              <span className="text-zinc-500">Jump Multiplier</span>
              <span className="text-right text-zinc-300">{formatPercent(rateModel.jumpMultiplier * 100)}</span>
              <span className="text-zinc-500">Kink</span>
              <span className="text-right text-zinc-300">{formatPercent(rateModel.kink * 100)}</span>
              <span className="text-zinc-500">Reserve Factor</span>
              <span className="text-right text-zinc-300">{formatPercent(rateModel.reserveFactor * 100)}</span>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
            <h3 className="text-sm font-medium text-zinc-400">Interest Rate Model</h3>
            <p className="mt-4 text-sm text-zinc-600">Rate model params not yet indexed</p>
          </div>
        )}

        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 space-y-3">
          <h3 className="text-sm font-medium text-zinc-400">Risk Parameters</h3>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <span className="text-zinc-500">LTV</span>
            <span className="text-right text-zinc-300">{pool ? formatPercent(pool.ltv) : '—'}</span>
            <span className="text-zinc-500">Liquidation Threshold</span>
            <span className="text-right text-zinc-300">{pool ? formatPercent(pool.liquidationThreshold) : '—'}</span>
            <span className="text-zinc-500">Utilization</span>
            <span className="text-right text-zinc-300">{pool ? formatPercent(pool.utilization) : '—'}</span>
            <span className="text-zinc-500">Supply Cap</span>
            <span className="text-right text-zinc-300">{pool ? formatNumber(pool.supplyCapCeiling) : '—'}</span>
            <span className="text-zinc-500">Borrow Cap</span>
            <span className="text-right text-zinc-300">{pool ? formatNumber(pool.borrowCapCeiling) : '—'}</span>
            <span className="text-zinc-500">Price</span>
            <span className="text-right text-zinc-300">{pool ? formatUsd(pool.price) : '—'}</span>
          </div>
        </div>
      </div>

      {/* Row 3: Historical charts */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <SimpleLineChart
          data={rateHistory}
          lines={[
            { dataKey: 'supplyApy', color: '#22C55E', name: 'Supply APY' },
            { dataKey: 'borrowApy', color: '#EF4444', name: 'Borrow APY' },
          ]}
          title="Interest Rate History (90d)"
        />
        <SimpleLineChart
          data={utilHistory}
          lines={[{ dataKey: 'utilization', color: '#3B82F6', name: 'Utilization' }]}
          title="Utilization History (90d)"
        />
      </div>

      {/* Row 4: Interest Rate Curve */}
      {rateModel && (
        <InterestRateCurve
          baseRate={rateModel.baseRate}
          multiplier={rateModel.multiplier}
          jumpMultiplier={rateModel.jumpMultiplier}
          kink={rateModel.kink}
          reserveFactor={rateModel.reserveFactor}
          currentUtilization={pool?.utilization}
        />
      )}

      {/* Row 5: Cap utilization */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
          <h3 className="text-sm font-medium text-zinc-400">Supply Cap Utilization</h3>
          {pool && pool.supplyCapCeiling > 0 ? (
            <div className="mt-4">
              <div className="flex justify-between text-sm">
                <span className="text-zinc-500">Used</span>
                <span className="text-zinc-300">
                  {formatPercent((pool.totalSupply / pool.supplyCapCeiling) * 100)}
                </span>
              </div>
              <div className="mt-2 h-3 overflow-hidden rounded-full bg-zinc-800">
                <div
                  className="h-full rounded-full bg-green-500"
                  style={{ width: `${Math.min((pool.totalSupply / pool.supplyCapCeiling) * 100, 100)}%` }}
                />
              </div>
              <div className="mt-1 flex justify-between text-xs text-zinc-600">
                <span>{formatNumber(pool.totalSupply)} {upperSymbol}</span>
                <span>{formatNumber(pool.supplyCapCeiling)} {upperSymbol}</span>
              </div>
            </div>
          ) : (
            <p className="mt-4 text-sm text-zinc-600">No cap data</p>
          )}
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
          <h3 className="text-sm font-medium text-zinc-400">Borrow Cap Utilization</h3>
          {pool && pool.borrowCapCeiling > 0 ? (
            <div className="mt-4">
              <div className="flex justify-between text-sm">
                <span className="text-zinc-500">Used</span>
                <span className="text-zinc-300">
                  {formatPercent((pool.totalBorrows / pool.borrowCapCeiling) * 100)}
                </span>
              </div>
              <div className="mt-2 h-3 overflow-hidden rounded-full bg-zinc-800">
                <div
                  className="h-full rounded-full bg-red-500"
                  style={{ width: `${Math.min((pool.totalBorrows / pool.borrowCapCeiling) * 100, 100)}%` }}
                />
              </div>
              <div className="mt-1 flex justify-between text-xs text-zinc-600">
                <span>{formatNumber(pool.totalBorrows)} {upperSymbol}</span>
                <span>{formatNumber(pool.borrowCapCeiling)} {upperSymbol}</span>
              </div>
            </div>
          ) : (
            <p className="mt-4 text-sm text-zinc-600">No cap data</p>
          )}
        </div>
      </div>

      {/* Row 6: Donut charts */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <DonutChart
          data={borrowedAgainst}
          title={`Assets Borrowed Against ${upperSymbol} Collateral`}
        />
        <DonutChart
          data={collateralUsed}
          title={`Collateral Used to Borrow ${upperSymbol}`}
        />
      </div>
    </div>
  );
}
