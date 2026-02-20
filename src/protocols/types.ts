/**
 * Protocol-agnostic type definitions for the Datum Labs dashboard platform.
 *
 * Every protocol (NAVI, Suilend, Cetus, etc.) implements ProtocolAdapter
 * and declares a ProtocolConfig. The shared UI consumes NormalizedPool and
 * other normalized types — it never touches protocol-specific logic.
 */

// ─── Asset Configuration ────────────────────────────────────────────────────

export interface AssetConfig {
  symbol: string;
  name: string;
  color: string;
  decimals: number;
  coinType?: string;   // on-chain type (Sui, EVM address, etc.)
  poolId?: number;     // protocol-specific pool identifier
  logo?: string;       // URL or path to asset icon
}

// ─── Protocol Configuration ─────────────────────────────────────────────────

export interface ProtocolConfig {
  /** URL slug used in routes: /navi/overview, /suilend/overview */
  slug: string;

  /** Display name: "NAVI Protocol" */
  name: string;

  /** Short display name for nav: "NAVI" */
  shortName: string;

  /** Blockchain: "sui", "ethereum", "solana" */
  chain: string;

  /** Brand color for charts and UI accents */
  color: string;

  /** Logo URL or path */
  logo?: string;

  /** Block explorer base URL for transactions */
  explorerUrl: string;

  /** Protocol type determines which pages are available */
  type: 'lending' | 'dex' | 'perps';

  /** Known asset list (for chart colors, pool ID mappings, etc.) */
  assets: AssetConfig[];

  /** Which pages to show in the nav */
  pages: {
    overview: boolean;
    markets: boolean;
    wallets: boolean;       // typically lending-only
    liquidation: boolean;   // typically lending-only
    pools: boolean;         // typically DEX-only
  };

  /** Feature flags controlling what UI sections render */
  features: {
    hasHealthFactor: boolean;
    hasLiquidations: boolean;
    hasInterestRateModel: boolean;
    hasIncentives: boolean;
    hasCollateralBorrowPairs: boolean;
  };
}

// ─── Normalized Data Types ──────────────────────────────────────────────────

/** Normalized pool/market data consumed by all UI components */
export interface NormalizedPool {
  symbol: string;
  poolId?: number;
  coinType?: string;
  decimals: number;

  totalSupply: number;
  totalSupplyUsd: number;
  totalBorrows: number;
  totalBorrowsUsd: number;
  availableLiquidity: number;
  availableLiquidityUsd: number;

  supplyApy: number;
  borrowApy: number;
  boostedSupplyApy?: number;
  boostedBorrowApy?: number;

  utilization: number;
  ltv?: number;
  liquidationThreshold?: number;
  supplyCapCeiling?: number;
  borrowCapCeiling?: number;
  optimalUtilization?: number;

  price: number;
}

/** Normalized liquidation event */
export interface NormalizedLiquidation {
  id: string;
  txDigest: string;
  timestamp: Date;
  liquidator: string;
  borrower: string;
  collateralAsset: string;
  collateralAmount: number;
  collateralPrice: number;
  collateralUsd: number;
  debtAsset: string;
  debtAmount: number;
  debtPrice: number;
  debtUsd: number;
  treasuryAmount?: number;
}

/** Normalized wallet/position data */
export interface NormalizedPosition {
  address: string;
  collateralUsd: number;
  borrowUsd: number;
  healthFactor: number;
  collateralAssets: string[];
  borrowAssets: string[];
}

// ─── Protocol Adapter Interface ─────────────────────────────────────────────

/**
 * Every protocol implements this interface to fetch and normalize its data.
 * Optional methods are for features not all protocols support.
 */
export interface ProtocolAdapter {
  /** Fetch all pools/markets in normalized form */
  fetchPools(): Promise<NormalizedPool[]>;

  /** Fetch a single pool/market by symbol */
  fetchPool(symbol: string): Promise<NormalizedPool | null>;

  /**
   * Fetch recent liquidation events.
   * Only implemented by lending protocols with on-chain liquidations.
   */
  fetchLiquidations?(cursor?: string): Promise<NormalizedLiquidation[]>;

  /**
   * Fetch a single wallet's position.
   * Only implemented by lending protocols.
   */
  fetchWalletPosition?(address: string): Promise<NormalizedPosition | null>;

  /**
   * Discover active wallet addresses (from on-chain events).
   * Only implemented by lending protocols.
   */
  discoverWallets?(): Promise<string[]>;
}

// ─── Protocol Registry Entry ────────────────────────────────────────────────

export interface ProtocolEntry {
  config: ProtocolConfig;
  adapter: ProtocolAdapter;
}
