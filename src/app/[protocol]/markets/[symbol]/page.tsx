'use client';

import { use } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { TuiPanel, ChartWrapper, LoadingState, ErrorState } from '@datumlabs/dashboard-kit';
import SimpleLineChart from '@/components/charts/SimpleLineChart';
import InterestRateCurve from '@/components/charts/InterestRateCurve';
import DonutChart from '@/components/charts/DonutChart';
import InfoTooltip from '@/components/InfoTooltip';
import { formatUsd, formatPercent, formatNumber, getAssetColor } from '@/lib/utils';

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
interface DetailResponse {
  pool: PoolDetail | null;
  rateModel: RateModel | null;
  history: HistoryRow[];
  pairs: { asCollateral: PairData[]; asBorrow: PairData[] };
  assetColor?: string;
  assetName?: string;
}

export default function MarketDetailPage({
  params,
}: {
  params: Promise<{ protocol: string; symbol: string }>;
}) {
  const { protocol, symbol } = use(params);
  const upperSymbol = symbol.toUpperCase();

  const { data, isPending, isError, refetch } = useQuery<DetailResponse>({
    queryKey: ['poolDetail', protocol, upperSymbol],
    queryFn: () => fetch(`/api/${protocol}/pools/${upperSymbol}`).then((r) => r.json()),
  });

  if (isPending) return <LoadingState />;
  if (isError) return <ErrorState message={`Failed to load ${upperSymbol}.`} onRetry={() => refetch()} />;

  const { pool, rateModel, history, pairs } = data;
  const assetColor = data.assetColor ?? getAssetColor(upperSymbol);
  const assetName = data.assetName ?? upperSymbol;

  const rateHistory = history.map((h) => ({ date: h.date, supplyApy: h.avgSupplyApy, borrowApy: h.avgBorrowApy }));
  const utilHistory = history.map((h) => ({ date: h.date, utilization: h.avgUtilization }));
  const borrowedAgainst = pairs.asCollateral.map((p) => ({ name: p.borrowAsset, value: p.totalBorrowUsd }));
  const collateralUsed = pairs.asBorrow.map((p) => ({ name: p.collateralAsset, value: p.totalCollateralUsd }));

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Link
          href={`/${protocol}/markets`}
          className="rounded p-1.5 transition-colors"
          style={{ color: 'var(--text-muted)', border: '1px solid var(--border)' }}
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex items-center gap-2">
          <span className="token-dot" style={{ backgroundColor: assetColor, margin: 0 }} />
          <span className="text-[11px] font-bold uppercase tracking-[0.1em]" style={{ color: 'var(--accent-orange)' }}>
            {upperSymbol}
          </span>
          <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
            {assetName}
          </span>
        </div>
      </div>

      <TuiPanel title={`${upperSymbol} Overview`} badge="LIVE" noPadding>
        <div className="grid grid-cols-2 lg:grid-cols-4">
          <Cell title="Total Supply" value={pool ? formatUsd(pool.totalSupplyUsd, true) : '—'} sub={pool ? `${formatNumber(pool.totalSupply)} ${upperSymbol}` : undefined} />
          <Cell title="Total Borrows" value={pool ? formatUsd(pool.totalBorrowsUsd, true) : '—'} sub={pool ? `${formatNumber(pool.totalBorrows)} ${upperSymbol}` : undefined} />
          <Cell title="Supply APY" value={pool ? formatPercent(pool.supplyApy) : '—'} />
          <Cell title="Borrow APY" value={pool ? formatPercent(pool.borrowApy) : '—'} last />
        </div>
      </TuiPanel>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TuiPanel title="Interest Rate Model">
          {rateModel ? (
            <KvList
              rows={[
                ['Base Rate', formatPercent(rateModel.baseRate * 100)],
                ['Multiplier', formatPercent(rateModel.multiplier * 100)],
                ['Jump Multiplier', formatPercent(rateModel.jumpMultiplier * 100)],
                ['Kink', formatPercent(rateModel.kink * 100)],
                ['Reserve Factor', formatPercent(rateModel.reserveFactor * 100)],
              ]}
            />
          ) : (
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Rate model params not yet indexed</p>
          )}
        </TuiPanel>
        <TuiPanel title="Risk Parameters">
          <KvList
            rows={[
              ['LTV', pool ? formatPercent(pool.ltv * 100) : '—', 'Maximum borrow power per unit of collateral'],
              ['Liquidation Threshold', pool ? formatPercent(pool.liquidationThreshold * 100) : '—', 'Health factor drops below 1 when borrows exceed this ratio of collateral'],
              ['Utilization', pool ? formatPercent(pool.utilization) : '—'],
              ['Supply Cap', pool ? formatNumber(pool.supplyCapCeiling) : '—'],
              ['Borrow Cap', pool ? formatNumber(pool.borrowCapCeiling) : '—'],
              ['Price', pool ? formatUsd(pool.price) : '—'],
            ]}
          />
        </TuiPanel>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <ChartWrapper title="Interest Rate History" badge="90D">
          <SimpleLineChart
            data={rateHistory}
            lines={[
              { dataKey: 'supplyApy', color: 'var(--accent-green)', name: 'Supply APY' },
              { dataKey: 'borrowApy', color: 'var(--accent-red)', name: 'Borrow APY' },
            ]}
          />
        </ChartWrapper>
        <ChartWrapper title="Utilization History" badge="90D">
          <SimpleLineChart
            data={utilHistory}
            lines={[{ dataKey: 'utilization', color: 'var(--accent-blue)', name: 'Utilization' }]}
          />
        </ChartWrapper>
      </div>

      {rateModel && (
        <ChartWrapper title="Interest Rate Curve" badge="MODEL">
          <InterestRateCurve
            baseRate={rateModel.baseRate}
            multiplier={rateModel.multiplier}
            jumpMultiplier={rateModel.jumpMultiplier}
            kink={rateModel.kink}
            reserveFactor={rateModel.reserveFactor}
            currentUtilization={pool?.utilization}
          />
        </ChartWrapper>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <ChartWrapper title={`Borrowed Against ${upperSymbol}`} badge="ALL">
          <DonutChart data={borrowedAgainst} />
        </ChartWrapper>
        <ChartWrapper title={`Collateral for ${upperSymbol} Borrows`} badge="ALL">
          <DonutChart data={collateralUsed} />
        </ChartWrapper>
      </div>
    </div>
  );
}

function Cell({ title, value, sub, last }: { title: string; value: string; sub?: string; last?: boolean }) {
  return (
    <div
      className={`p-4 lg:p-5 ${last ? '' : 'border-r'}`}
      style={{ borderColor: 'var(--border)' }}
    >
      <div className="counter-label">{title}</div>
      <div className="counter-value" style={{ color: 'var(--foreground)' }}>{value}</div>
      {sub && (
        <div className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>{sub}</div>
      )}
    </div>
  );
}

function KvList({ rows }: { rows: Array<[string, string, string?]> }) {
  return (
    <div className="grid grid-cols-2 gap-y-2 text-xs">
      {rows.map(([k, v, tooltip]) => (
        <span key={k} className="contents">
          <span className="flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
            {k}
            {tooltip && <InfoTooltip text={tooltip} />}
          </span>
          <span className="text-right" style={{ color: 'var(--foreground)' }}>{v}</span>
        </span>
      ))}
    </div>
  );
}
