import { NextResponse } from 'next/server';
import { getProtocol } from '@/protocols/registry';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * GET /api/[protocol]/pools/[symbol] — Single pool detail with history.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ protocol: string; symbol: string }> }
) {
  const { protocol: slug, symbol } = await params;
  const entry = getProtocol(slug);

  if (!entry) {
    return NextResponse.json({ error: `Unknown protocol: ${slug}` }, { status: 404 });
  }

  const upperSymbol = symbol.toUpperCase();

  try {
    const pool = await entry.adapter.fetchPool(upperSymbol);

    // Fetch rate model params and history from DB if available
    const db = getDb();
    let rateModel = null;
    let history: unknown[] = [];
    let pairs: unknown = {};

    // Find asset config for color/name
    const assetConfig = entry.config.assets.find(
      (a) => a.symbol.toUpperCase() === upperSymbol
    );

    if (db) {
      rateModel = await db.rateModelParams.findUnique({
        where: { protocol_symbol: { protocol: slug, symbol: upperSymbol } },
      });

      const since = new Date();
      since.setDate(since.getDate() - 90);
      history = await db.poolDaily.findMany({
        where: { protocol: slug, symbol: upperSymbol, date: { gte: since } },
        orderBy: { date: 'asc' },
      });

      // Get collateral/borrow pairs for this asset
      const collateralPairs = await db.collateralBorrowPair.findMany({
        where: { protocol: slug, collateralAsset: upperSymbol },
      });
      const borrowPairs = await db.collateralBorrowPair.findMany({
        where: { protocol: slug, borrowAsset: upperSymbol },
      });
      pairs = { asCollateral: collateralPairs, asBorrow: borrowPairs };
    }

    return NextResponse.json({
      pool: pool ?? null,
      rateModel,
      history,
      pairs,
      assetColor: assetConfig?.color ?? '#666',
      assetName: assetConfig?.name ?? upperSymbol,
    });
  } catch (error) {
    console.error(`/api/${slug}/pools/${upperSymbol} error:`, error);
    return NextResponse.json(
      { pool: null, error: 'Failed to fetch pool' },
      { status: 500 }
    );
  }
}
