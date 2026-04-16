'use client';

import { formatUsd, truncateAddress, formatNumber, getAssetColor } from '@/lib/utils';
import { healthFactorColor, healthFactorLabel } from '@/lib/constants';
import InfoTooltip from '@/components/InfoTooltip';

export interface WalletRow {
  address: string;
  collateralUsd: number;
  borrowUsd: number;
  healthFactor: number;
  collateralAssets: string;
  borrowAssets: string;
}

interface WalletsTableProps {
  data: WalletRow[];
  total: number;
  page: number;
  limit: number;
  onPageChange: (page: number) => void;
}

function parseAssets(json: string): string[] {
  try {
    const parsed = JSON.parse(json);
    if (!Array.isArray(parsed)) return [];
    const symbols = parsed
      .map((entry) => {
        if (typeof entry === 'string') return entry;
        if (entry && typeof entry === 'object' && 'symbol' in entry)
          return String((entry as { symbol: unknown }).symbol);
        return null;
      })
      .filter((s): s is string => typeof s === 'string' && s.length > 0);
    // NAVI ships duplicate symbols (e.g. bridged + native WBTC). Dedupe so
    // React keys remain unique in the chip list.
    return Array.from(new Set(symbols));
  } catch {
    return [];
  }
}

function AssetChips({ json }: { json: string }) {
  const symbols = parseAssets(json);
  if (symbols.length === 0) return <span style={{ color: 'var(--text-muted)' }}>—</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {symbols.map((a) => (
        <span
          key={a}
          className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px]"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid var(--border)',
            color: 'var(--foreground)',
          }}
        >
          <span className="token-dot" style={{ backgroundColor: getAssetColor(a), margin: 0 }} />
          {a}
        </span>
      ))}
    </div>
  );
}

export default function WalletsTable({ data, total, page, limit, onPageChange }: WalletsTableProps) {
  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <>
      <div className="overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th>Wallet</th>
              <th className="text-right">Collateral</th>
              <th>Assets</th>
              <th className="text-right">Borrows</th>
              <th>Assets</th>
              <th className="text-right">Health Factor <InfoTooltip text="Weighted collateral / total borrows — below 1.0 = liquidatable" /></th>
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center" style={{ color: 'var(--text-muted)' }}>
                  No wallet positions indexed yet — run the wallet indexer cron
                </td>
              </tr>
            ) : (
              data.map((row) => {
                const hfColor = healthFactorColor(row.healthFactor);
                const hfLabel = healthFactorLabel(row.healthFactor);
                return (
                  <tr key={row.address}>
                    <td className="text-xs">{truncateAddress(row.address)}</td>
                    <td className="text-right">{formatUsd(row.collateralUsd, true)}</td>
                    <td>
                      <AssetChips json={row.collateralAssets} />
                    </td>
                    <td className="text-right">{formatUsd(row.borrowUsd, true)}</td>
                    <td>
                      <AssetChips json={row.borrowAssets} />
                    </td>
                    <td className="text-right">
                      <span
                        className="inline-flex items-center gap-1.5 rounded px-2 py-0.5 text-[10px] uppercase tracking-[0.05em]"
                        style={{ color: hfColor, background: `${hfColor}15`, border: `1px solid ${hfColor}40` }}
                      >
                        <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: hfColor }} />
                        {row.healthFactor >= 100 ? '99+' : formatNumber(row.healthFactor, 2)}
                        <span className="opacity-70">{hfLabel}</span>
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {total > 0 && (
        <div className="status-bar">
          <span className="status-bar-item">
            <span style={{ color: 'var(--accent-orange)' }}>&gt;</span>
            Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total}
          </span>
          <div className="flex gap-1">
            <button
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
              className="time-btn disabled:opacity-30"
            >
              Prev
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => onPageChange(page + 1)}
              className="time-btn disabled:opacity-30"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </>
  );
}
