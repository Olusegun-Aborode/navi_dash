import { NextResponse } from 'next/server';
import { CRON_SECRET } from '@/lib/constants';
import { getProtocol } from '@/protocols/registry';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ protocol: string }> }
) {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { protocol: slug } = await params;
  const entry = getProtocol(slug);

  if (!entry) {
    return NextResponse.json({ error: `Unknown protocol: ${slug}` }, { status: 404 });
  }

  const db = getDb();
  if (!db) {
    return NextResponse.json({ error: 'No database configured' }, { status: 503 });
  }

  try {
    const pools = await entry.adapter.fetchPools();

    if (pools.length === 0) {
      return NextResponse.json({ warning: 'No pool data returned' });
    }

    const snapshots = pools.map((pool) => ({
      protocol: slug,
      symbol: pool.symbol,
      totalSupply: pool.totalSupply,
      totalSupplyUsd: pool.totalSupplyUsd,
      totalBorrows: pool.totalBorrows,
      totalBorrowsUsd: pool.totalBorrowsUsd,
      availableLiquidity: pool.availableLiquidity,
      availableLiquidityUsd: pool.availableLiquidityUsd,
      supplyApy: pool.supplyApy,
      borrowApy: pool.borrowApy,
      utilization: pool.utilization,
      price: pool.price,
    }));

    await db.poolSnapshot.createMany({ data: snapshots });

    return NextResponse.json({
      success: true,
      protocol: slug,
      poolsCollected: pools.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error(`collect-pools[${slug}] error:`, error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
