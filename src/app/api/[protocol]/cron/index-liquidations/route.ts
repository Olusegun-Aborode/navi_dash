import { NextResponse } from 'next/server';
import { CRON_SECRET } from '@/lib/constants';
import { isValidProtocol } from '@/protocols/registry';
import { NAVI_EVENT_TYPES } from '@/protocols/navi/config';
import { getNaviPoolRegistry } from '@/protocols/navi/poolRegistry';
import { parseLiquidationEvent } from '@/protocols/navi/events';
import { queryEvents, rpc } from '@/lib/rpc';
import { getDb } from '@/lib/db';
import BigNumber from 'bignumber.js';

const MIST_PER_SUI = BigInt(1_000_000_000);

interface TxBlockEffects {
  effects?: {
    gasUsed?: {
      computationCost: string;
      storageCost: string;
      storageRebate: string;
    };
  };
}

async function fetchGasMist(digest: string): Promise<bigint | null> {
  try {
    const tx = await rpc<TxBlockEffects>('sui_getTransactionBlock', [
      digest,
      { showEffects: true },
    ]);
    const g = tx.effects?.gasUsed;
    if (!g) return null;
    return (
      BigInt(g.computationCost ?? '0') +
      BigInt(g.storageCost ?? '0') -
      BigInt(g.storageRebate ?? '0')
    );
  } catch {
    return null;
  }
}

let cachedSuiPrice: { price: number; at: number } | null = null;
async function getCurrentSuiPrice(): Promise<number> {
  if (cachedSuiPrice && Date.now() - cachedSuiPrice.at < 5 * 60 * 1000) {
    return cachedSuiPrice.price;
  }
  try {
    const res = await fetch('https://open-api.naviprotocol.io/api/navi/pools');
    const json = await res.json();
    const sui = json.data.find(
      (p: { token: { symbol: string } }) => p.token.symbol === 'SUI'
    );
    const price = Number(sui?.token?.price ?? 0) || 0;
    cachedSuiPrice = { price, at: Date.now() };
    return price;
  } catch {
    return 0;
  }
}

export const dynamic = 'force-dynamic';

/**
 * Index liquidation events for a protocol.
 * Currently only NAVI has on-chain liquidation event indexing.
 * Other protocols would implement their own event parsing here.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ protocol: string }> }
) {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { protocol: slug } = await params;

  if (!isValidProtocol(slug)) {
    return NextResponse.json({ error: `Unknown protocol: ${slug}` }, { status: 404 });
  }

  const db = getDb();
  if (!db) {
    return NextResponse.json({ error: 'No database configured' }, { status: 503 });
  }

  // Currently only NAVI event indexing is implemented
  if (slug !== 'navi') {
    return NextResponse.json({ message: `Liquidation indexing not yet implemented for ${slug}` });
  }

  try {
    const registry = await getNaviPoolRegistry();

    let cursor: { txDigest: string; eventSeq: string } | null = null;
    let totalIndexed = 0;
    let skippedUnknown = 0;
    let hasMore = true;

    const latest = await db.liquidationEvent.findFirst({
      where: { protocol: slug },
      orderBy: { timestamp: 'desc' },
      select: { id: true },
    });

    while (hasMore && totalIndexed < 200) {
      const page = await queryEvents(
        NAVI_EVENT_TYPES.LIQUIDATION,
        cursor,
        50,
        'descending'
      );

      const rows = [];

      for (const evt of page.data) {
        const eventId = `${evt.id.txDigest}:${evt.id.eventSeq}`;

        if (latest && eventId === latest.id) {
          hasMore = false;
          break;
        }

        let p;
        try {
          p = parseLiquidationEvent(evt.parsedJson);
        } catch (err) {
          console.warn(
            `[index-liquidations] skipping ${eventId}: ${err instanceof Error ? err.message : err}`
          );
          skippedUnknown++;
          continue;
        }

        const collateralPool = registry[p.collateral_asset];
        const debtPool = registry[p.debt_asset];

        if (!collateralPool || !debtPool) {
          console.warn(
            `[index-liquidations] skipping ${eventId}: unknown pool id(s) collateral=${p.collateral_asset} debt=${p.debt_asset}`
          );
          skippedUnknown++;
          continue;
        }

        // Amounts and prices are BOTH scaled by the asset's decimals.
        const cScale = new BigNumber(10).pow(collateralPool.decimals);
        const dScale = new BigNumber(10).pow(debtPool.decimals);

        const collateralAmount = new BigNumber(p.collateral_amount).dividedBy(cScale).toNumber();
        const debtAmount       = new BigNumber(p.debt_amount).dividedBy(dScale).toNumber();
        const collateralPrice  = new BigNumber(p.collateral_price).dividedBy(cScale).toNumber();
        const debtPrice        = new BigNumber(p.debt_price).dividedBy(dScale).toNumber();
        const treasuryAmount   = new BigNumber(p.treasury).dividedBy(cScale).toNumber();

        // Enrich with gas. Failures are non-fatal — the row still gets indexed
        // and the backfill script can fill the gap later.
        const gasMist = await fetchGasMist(evt.id.txDigest);
        let gasUsd: number | null = null;
        if (gasMist !== null) {
          const suiPrice = await getCurrentSuiPrice();
          gasUsd =
            suiPrice > 0
              ? (Number(gasMist) / Number(MIST_PER_SUI)) * suiPrice
              : 0;
        }

        rows.push({
          id: eventId,
          protocol: slug,
          txDigest: evt.id.txDigest,
          timestamp: new Date(Number(evt.timestampMs)),
          liquidator: p.sender,
          borrower: p.user,
          collateralAsset: collateralPool.symbol,
          collateralAmount,
          collateralPrice,
          collateralUsd: collateralAmount * collateralPrice,
          debtAsset: debtPool.symbol,
          debtAmount,
          debtPrice,
          debtUsd: debtAmount * debtPrice,
          treasuryAmount,
          gasUsedMist: gasMist,
          gasUsd,
        });
      }

      if (rows.length > 0) {
        await db.liquidationEvent.createMany({
          data: rows,
          skipDuplicates: true,
        });
        totalIndexed += rows.length;
      }

      cursor = page.nextCursor;
      if (!page.hasNextPage) hasMore = false;
    }

    return NextResponse.json({
      success: true,
      protocol: slug,
      indexed: totalIndexed,
      skippedUnknown,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error(`index-liquidations[${slug}] error:`, error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
