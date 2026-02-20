import { NextResponse } from 'next/server';
import { isValidProtocol } from '@/protocols/registry';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * GET /api/[protocol]/liquidations/stats
 * Returns 30d collateral distribution + daily collateral seized for charts.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ protocol: string }> }
) {
  const { protocol: slug } = await params;

  if (!isValidProtocol(slug)) {
    return NextResponse.json({ error: `Unknown protocol: ${slug}` }, { status: 404 });
  }

  const db = getDb();
  if (!db) {
    return NextResponse.json({
      collateralDistribution: [],
      dailySeized: [],
      message: 'No database configured',
    });
  }

  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const events = await db.liquidationEvent.findMany({
      where: { protocol: slug, timestamp: { gte: thirtyDaysAgo } },
      select: { collateralAsset: true, collateralUsd: true, timestamp: true },
    });

    const distMap = new Map<string, number>();
    for (const evt of events) {
      const current = distMap.get(evt.collateralAsset) ?? 0;
      distMap.set(evt.collateralAsset, current + evt.collateralUsd);
    }
    const collateralDistribution = Array.from(distMap.entries())
      .map(([asset, totalUsd]) => ({ asset, totalUsd }))
      .sort((a, b) => b.totalUsd - a.totalUsd);

    const dailyMap = new Map<string, number>();
    for (const evt of events) {
      const day = evt.timestamp.toISOString().split('T')[0];
      const current = dailyMap.get(day) ?? 0;
      dailyMap.set(day, current + evt.collateralUsd);
    }
    const dailySeized = Array.from(dailyMap.entries())
      .map(([date, totalUsd]) => ({ date, totalUsd }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return NextResponse.json({ collateralDistribution, dailySeized });
  } catch (error) {
    console.error(`/api/${slug}/liquidations/stats error:`, error);
    return NextResponse.json(
      { collateralDistribution: [], dailySeized: [], error: 'Query failed' },
      { status: 500 }
    );
  }
}
