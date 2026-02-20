/**
 * NAVI Protocol data layer.
 *
 * Uses the official NAVI open API (https://open-api.naviprotocol.io/api/navi/pools)
 * — the same data source used by the NAVI SDK's getPoolInfo() function.
 *
 * The official SDK (src/libs/PoolInfo/index.ts) calls this API and then applies:
 *   - totalSupply / 1e9  (NOT per-asset decimals)
 *   - totalBorrow / 1e9
 *   - rates / 1e27  (Ray math)
 *   - ltv / 1e27
 *   - caps / 1e27
 *   - Multiply supply/borrow by their respective indexes to get real balances
 *
 * This file replicates that exact logic so our numbers match the official dashboard.
 */

import BigNumber from 'bignumber.js';

const NAVI_POOLS_API = 'https://open-api.naviprotocol.io/api/navi/pools';

// ─── Types for the NAVI Open API response ───────────────────────────────────

interface NaviApiPool {
  id: number;
  token: {
    symbol: string;
    coinType: string;
    decimal: number;
  };
  oracle: {
    price: number;
  };
  totalSupply: string;
  totalBorrow: string;
  currentSupplyIndex: string;
  currentBorrowIndex: string;
  currentSupplyRate: string;
  currentBorrowRate: string;
  supplyCapCeiling: string;
  borrowCapCeiling: string;
  ltv: string;
  liquidationFactor: {
    threshold: number;
  };
  borrowRateFactors: {
    fields: {
      optimalUtilization: string;
      base_rate?: string;
      multiplier?: string;
      jump_rate_multiplier?: string;
    };
  };
  supplyIncentiveApyInfo: {
    boostedApr: number;
  };
  borrowIncentiveApyInfo: {
    boostedApr: number;
  };
}

interface NaviApiResponse {
  code: number;
  data: NaviApiPool[];
}

// ─── Our normalized pool type (consumed by API routes + frontend) ───────────

export interface NaviPoolData {
  symbol: string;
  poolId: number;
  coinType: string;
  decimals: number;
  totalSupply: number;       // human-readable token amount (with index applied)
  totalSupplyUsd: number;
  totalBorrows: number;      // human-readable token amount (with index applied)
  totalBorrowsUsd: number;
  availableLiquidity: number;
  availableLiquidityUsd: number;
  supplyApy: number;         // percentage
  borrowApy: number;         // percentage
  boostedSupplyApy: number;  // percentage (incentive APY)
  boostedBorrowApy: number;  // percentage (incentive APY)
  utilization: number;       // percentage
  ltv: number;               // decimal (e.g. 0.75 = 75%)
  liquidationThreshold: number; // decimal
  supplyCapCeiling: number;
  borrowCapCeiling: number;
  optimalUtilization: number; // decimal
  price: number;
}

// ─── Scaling helpers (matching official SDK logic) ──────────────────────────

const RAY = new BigNumber(1e27);
const SUPPLY_BORROW_SCALE = new BigNumber(1e9);

function toFloat(value: string, divisor: BigNumber): number {
  return new BigNumber(value).dividedBy(divisor).toNumber();
}

/**
 * Convert a per-second rate (scaled by 1e27) to APY percentage.
 * The SDK returns `currentSupplyRate / 1e27` as a decimal rate, then
 * multiplies by 100 for display. For a more accurate APY we compound daily.
 */
function rateToApyPercent(rawRate: string): number {
  const dailyRate = new BigNumber(rawRate).dividedBy(RAY);
  // Compound daily for 365 days
  const apy = dailyRate.plus(1).pow(365).minus(1).multipliedBy(100);
  return parseFloat(apy.toFixed(4));
}

// ─── Main fetch functions ───────────────────────────────────────────────────

/**
 * Fetch all NAVI pool data from the official open API.
 * This is the same endpoint the NAVI SDK calls internally.
 */
export async function fetchAllPools(): Promise<NaviPoolData[]> {
  try {
    const res = await fetch(NAVI_POOLS_API, {
      next: { revalidate: 60 }, // cache 60s in Next.js
    });

    if (!res.ok) {
      console.error(`NAVI API returned ${res.status}`);
      return [];
    }

    const json: NaviApiResponse = await res.json();

    if (json.code !== 0 || !Array.isArray(json.data)) {
      console.error('NAVI API unexpected response:', json.code);
      return [];
    }

    return json.data.map((pool) => {
      const symbol = pool.token.symbol;
      const price = pool.oracle.price;
      const decimals = pool.token.decimal;

      // Match official SDK: divide raw amounts by 1e9, then multiply by index
      const rawSupply = toFloat(pool.totalSupply, SUPPLY_BORROW_SCALE);
      const supplyIndex = toFloat(pool.currentSupplyIndex, RAY);
      const totalSupply = rawSupply * supplyIndex;

      const rawBorrow = toFloat(pool.totalBorrow, SUPPLY_BORROW_SCALE);
      const borrowIndex = toFloat(pool.currentBorrowIndex, RAY);
      const totalBorrows = rawBorrow * borrowIndex;

      const availableLiquidity = totalSupply - totalBorrows;

      // Rates
      const supplyApy = rateToApyPercent(pool.currentSupplyRate);
      const borrowApy = rateToApyPercent(pool.currentBorrowRate);

      // Caps & risk params (scaled by 1e27)
      const supplyCapCeiling = toFloat(pool.supplyCapCeiling, RAY);
      const borrowCapCeiling = toFloat(pool.borrowCapCeiling, RAY);
      const ltv = toFloat(pool.ltv, RAY);
      const optimalUtilization = toFloat(
        pool.borrowRateFactors?.fields?.optimalUtilization ?? '0',
        RAY
      );

      // Utilization
      const utilization = totalSupply > 0
        ? (totalBorrows / totalSupply) * 100
        : 0;

      return {
        symbol,
        poolId: pool.id,
        coinType: pool.token.coinType,
        decimals,
        totalSupply,
        totalSupplyUsd: totalSupply * price,
        totalBorrows,
        totalBorrowsUsd: totalBorrows * price,
        availableLiquidity,
        availableLiquidityUsd: availableLiquidity * price,
        supplyApy,
        borrowApy,
        boostedSupplyApy: pool.supplyIncentiveApyInfo?.boostedApr ?? 0,
        boostedBorrowApy: pool.borrowIncentiveApyInfo?.boostedApr ?? 0,
        utilization,
        ltv,
        liquidationThreshold: pool.liquidationFactor?.threshold ?? 0,
        supplyCapCeiling,
        borrowCapCeiling,
        optimalUtilization,
        price,
      };
    });
  } catch (error) {
    console.error('fetchAllPools error:', error);
    return [];
  }
}

/**
 * Fetch a single pool by symbol.
 */
export async function fetchSinglePool(
  symbol: string
): Promise<NaviPoolData | null> {
  const all = await fetchAllPools();
  return all.find((p) => p.symbol.toUpperCase() === symbol.toUpperCase()) ?? null;
}
