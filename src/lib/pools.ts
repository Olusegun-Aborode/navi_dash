import BigNumber from 'bignumber.js';
import { RATE_SCALE, POOL_CONFIGS, type PoolConfig } from './constants';

/**
 * Convert NAVI raw rate (1e27-scaled integer) to APY percentage.
 * Formula: APY = ((rate / 1e27 + 1)^365 - 1) * 100
 */
export function rateToApy(rawRate: string): number {
  const rate = new BigNumber(rawRate).dividedBy(RATE_SCALE);
  const apy = rate.plus(1).pow(365).minus(1).multipliedBy(100);
  return parseFloat(apy.toFixed(4));
}

/** Calculate utilization: borrows / (supply) * 100 */
export function calcUtilization(totalSupply: number, totalBorrows: number): number {
  if (totalSupply === 0) return 0;
  return (totalBorrows / totalSupply) * 100;
}

/**
 * Convert raw token amount to human-readable using the asset's decimals.
 */
export function rawToHuman(rawAmount: string | number, symbol: string): number {
  const config = POOL_CONFIGS[symbol];
  if (!config) return 0;
  return new BigNumber(rawAmount).dividedBy(new BigNumber(10).pow(config.decimals)).toNumber();
}

/**
 * Calculate the interest rate curve for display.
 * Returns array of { utilization, borrowRate, supplyRate } points.
 */
export function calcInterestRateCurve(params: {
  baseRate: number;
  multiplier: number;
  jumpMultiplier: number;
  kink: number;
  reserveFactor: number;
}): Array<{ utilization: number; borrowRate: number; supplyRate: number }> {
  const { baseRate, multiplier, jumpMultiplier, kink, reserveFactor } = params;
  const points: Array<{ utilization: number; borrowRate: number; supplyRate: number }> = [];

  for (let u = 0; u <= 100; u += 1) {
    const util = u / 100;
    let borrowRate: number;

    if (util <= kink) {
      borrowRate = baseRate + (kink > 0 ? (util / kink) * multiplier : 0);
    } else {
      borrowRate =
        baseRate + multiplier + ((util - kink) / (1 - kink)) * jumpMultiplier;
    }

    const supplyRate = borrowRate * util * (1 - reserveFactor);

    points.push({
      utilization: u,
      borrowRate: borrowRate * 100,
      supplyRate: supplyRate * 100,
    });
  }

  return points;
}

/** Get pool config by symbol, with fallback */
export function getPoolConfig(symbol: string): PoolConfig | null {
  return POOL_CONFIGS[symbol] ?? null;
}

/** Get all pool symbols */
export function getAllSymbols(): string[] {
  return Object.keys(POOL_CONFIGS);
}
