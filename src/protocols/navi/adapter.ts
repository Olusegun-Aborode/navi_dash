/**
 * NAVI Protocol adapter.
 *
 * Wraps the existing sdk.ts logic and implements the ProtocolAdapter interface.
 * Uses the official NAVI open API (https://open-api.naviprotocol.io/api/navi/pools).
 */

import type { ProtocolAdapter, NormalizedPool } from '../types';
import { fetchAllPools, fetchSinglePool } from '@/lib/sdk';

const naviAdapter: ProtocolAdapter = {
  async fetchPools(): Promise<NormalizedPool[]> {
    const pools = await fetchAllPools();
    return pools.map(toNormalized);
  },

  async fetchPool(symbol: string): Promise<NormalizedPool | null> {
    const pool = await fetchSinglePool(symbol);
    return pool ? toNormalized(pool) : null;
  },

  // Liquidation and wallet discovery are handled by cron jobs
  // that use NAVI-specific event types (see cron routes).
  // The adapter interface supports these but they're not needed
  // for real-time API responses — the DB stores the indexed data.
};

export default naviAdapter;

// ─── Helper ─────────────────────────────────────────────────────────────────

function toNormalized(pool: Awaited<ReturnType<typeof fetchAllPools>>[number]): NormalizedPool {
  return {
    symbol: pool.symbol,
    poolId: pool.poolId,
    coinType: pool.coinType,
    decimals: pool.decimals,
    totalSupply: pool.totalSupply,
    totalSupplyUsd: pool.totalSupplyUsd,
    totalBorrows: pool.totalBorrows,
    totalBorrowsUsd: pool.totalBorrowsUsd,
    availableLiquidity: pool.availableLiquidity,
    availableLiquidityUsd: pool.availableLiquidityUsd,
    supplyApy: pool.supplyApy,
    borrowApy: pool.borrowApy,
    boostedSupplyApy: pool.boostedSupplyApy,
    boostedBorrowApy: pool.boostedBorrowApy,
    utilization: pool.utilization,
    ltv: pool.ltv,
    liquidationThreshold: pool.liquidationThreshold,
    supplyCapCeiling: pool.supplyCapCeiling,
    borrowCapCeiling: pool.borrowCapCeiling,
    optimalUtilization: pool.optimalUtilization,
    price: pool.price,
  };
}
