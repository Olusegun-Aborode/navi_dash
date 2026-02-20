/**
 * Historical liquidation event backfill.
 *
 * Paginates through ALL LiquidationEvent events and inserts them into the DB.
 *
 * Usage: npx tsx scripts/backfill-liquidations.ts
 *
 * Requires: DATABASE_URL, ALCHEMY_SUI_RPC (optional)
 */

const RPC_URL = process.env.ALCHEMY_SUI_RPC ?? 'https://fullnode.mainnet.sui.io:443';

const NAVI_PACKAGE =
  '0x1e4a13a0494d5facdbe8473e74127b838c2d446ecec0ce262e2eddafa77259cb';
const LIQUIDATION_TYPE = `${NAVI_PACKAGE}::event::LiquidationEvent`;

const POOL_ID_TO_SYMBOL: Record<number, string> = {
  0: 'SUI', 1: 'USDC', 2: 'USDT', 3: 'WETH',
  4: 'CETUS', 5: 'vSUI', 6: 'NAVX', 7: 'haSUI',
};
const POOL_DECIMALS: Record<string, number> = {
  SUI: 9, USDC: 6, USDT: 6, WETH: 8, CETUS: 9, vSUI: 9, NAVX: 9, haSUI: 9,
};

let reqId = 0;
async function rpc(method: string, params: unknown[]) {
  reqId++;
  const res = await fetch(RPC_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: reqId, method, params }),
  });
  return res.json();
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL not set');
    process.exit(1);
  }

  // Dynamic import of Prisma
  const { PrismaClient } = await import('@prisma/client');
  const db = new PrismaClient();

  let cursor: { txDigest: string; eventSeq: string } | null = null;
  let total = 0;
  let hasMore = true;
  let page = 0;

  console.log('Backfilling liquidation events...');
  console.log(`RPC: ${RPC_URL}`);

  while (hasMore) {
    page++;
    const result = await rpc('suix_queryEvents', [
      { MoveEventType: LIQUIDATION_TYPE },
      cursor,
      50,
      false, // ascending — oldest first
    ]);

    const data = result.result;
    if (!data?.data?.length) break;

    const rows = [];

    for (const evt of data.data) {
      const p = evt.parsedJson;
      const collateralPoolId = Number(p.collateral_asset ?? 0);
      const debtPoolId = Number(p.debt_asset ?? 0);
      const collateralSymbol = POOL_ID_TO_SYMBOL[collateralPoolId] ?? 'UNKNOWN';
      const debtSymbol = POOL_ID_TO_SYMBOL[debtPoolId] ?? 'UNKNOWN';
      const collateralDec = POOL_DECIMALS[collateralSymbol] ?? 9;
      const debtDec = POOL_DECIMALS[debtSymbol] ?? 9;

      const collateralAmount = Number(p.collateral_amount ?? 0) / 10 ** collateralDec;
      const debtAmount = Number(p.debt_amount ?? 0) / 10 ** debtDec;
      const collateralPrice = Number(p.collateral_price ?? 0) / 1e18;
      const debtPrice = Number(p.debt_price ?? 0) / 1e18;

      rows.push({
        id: `${evt.id.txDigest}:${evt.id.eventSeq}`,
        txDigest: evt.id.txDigest,
        timestamp: new Date(Number(evt.timestampMs)),
        liquidator: String(p.sender ?? evt.sender),
        borrower: String(p.user ?? ''),
        collateralAsset: collateralSymbol,
        collateralAmount,
        collateralPrice,
        collateralUsd: collateralAmount * collateralPrice,
        debtAsset: debtSymbol,
        debtAmount,
        debtPrice,
        debtUsd: debtAmount * debtPrice,
        treasuryAmount: Number(p.treasury ?? 0) / 10 ** collateralDec,
      });
    }

    if (rows.length > 0) {
      await db.liquidationEvent.createMany({ data: rows, skipDuplicates: true });
      total += rows.length;
    }

    cursor = data.nextCursor;
    hasMore = data.hasNextPage;

    console.log(`Page ${page}: ${rows.length} events (total: ${total})`);

    // Rate limit: 200ms between pages
    await new Promise((r) => setTimeout(r, 200));
  }

  console.log(`\nDone! Total events indexed: ${total}`);
  await db.$disconnect();
}

main().catch(console.error);
