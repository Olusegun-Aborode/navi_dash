import { NextResponse } from 'next/server';
import { CRON_SECRET } from '@/lib/constants';
import { isValidProtocol } from '@/protocols/registry';
import { NAVI_EVENT_TYPES, NAVI_POOL_ID_TO_SYMBOL, NAVI_ASSET_MAP } from '@/protocols/navi/config';
import { queryEvents } from '@/lib/rpc';
import { getDb } from '@/lib/db';
import BigNumber from 'bignumber.js';

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
    let cursor: { txDigest: string; eventSeq: string } | null = null;
    let totalIndexed = 0;
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

        const p = evt.parsedJson;
        const collateralPoolId = Number(p.collateral_asset ?? p.reserve ?? 0);
        const debtPoolId = Number(p.debt_asset ?? 0);
        const collateralSymbol = NAVI_POOL_ID_TO_SYMBOL[collateralPoolId] ?? 'UNKNOWN';
        const debtSymbol = NAVI_POOL_ID_TO_SYMBOL[debtPoolId] ?? 'UNKNOWN';

        const collateralDecimals = NAVI_ASSET_MAP[collateralSymbol]?.decimals ?? 9;
        const debtDecimals = NAVI_ASSET_MAP[debtSymbol]?.decimals ?? 9;

        const collateralAmount = new BigNumber(String(p.collateral_amount ?? 0))
          .dividedBy(new BigNumber(10).pow(collateralDecimals))
          .toNumber();
        const debtAmount = new BigNumber(String(p.debt_amount ?? 0))
          .dividedBy(new BigNumber(10).pow(debtDecimals))
          .toNumber();

        const collateralPrice = new BigNumber(String(p.collateral_price ?? 0))
          .dividedBy(1e18)
          .toNumber();
        const debtPrice = new BigNumber(String(p.debt_price ?? 0))
          .dividedBy(1e18)
          .toNumber();

        const treasuryAmount = new BigNumber(String(p.treasury ?? 0))
          .dividedBy(new BigNumber(10).pow(collateralDecimals))
          .toNumber();

        rows.push({
          id: eventId,
          protocol: slug,
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
          treasuryAmount,
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
