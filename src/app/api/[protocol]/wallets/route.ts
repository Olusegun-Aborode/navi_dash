import { NextResponse } from 'next/server';
import { isValidProtocol } from '@/protocols/registry';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * GET /api/[protocol]/wallets?page=1&limit=25&search=0x...&minHf=0&collateral=SUI&borrow=USDC
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ protocol: string }> }
) {
  const { protocol: slug } = await params;

  if (!isValidProtocol(slug)) {
    return NextResponse.json({ error: `Unknown protocol: ${slug}` }, { status: 404 });
  }

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, Number(searchParams.get('page') ?? 1));
  const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit') ?? 25)));
  const search = searchParams.get('search') ?? '';
  const minHf = Number(searchParams.get('minHf') ?? 0);
  const maxHf = Number(searchParams.get('maxHf') ?? 9999);
  const collateral = searchParams.get('collateral') ?? '';
  const borrow = searchParams.get('borrow') ?? '';

  const db = getDb();
  if (!db) {
    return NextResponse.json({ wallets: [], total: 0, page, limit, message: 'No database configured' });
  }

  try {
    const where: Record<string, unknown> = {
      protocol: slug,
      healthFactor: { gte: minHf, lte: maxHf },
      borrowUsd: { gt: 0 },
    };

    if (search) where.address = { contains: search };
    if (collateral) where.collateralAssets = { contains: collateral };
    if (borrow) where.borrowAssets = { contains: borrow };

    const [wallets, total] = await Promise.all([
      db.walletPosition.findMany({
        where,
        orderBy: { healthFactor: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.walletPosition.count({ where }),
    ]);

    return NextResponse.json({ wallets, total, page, limit });
  } catch (error) {
    console.error(`/api/${slug}/wallets error:`, error);
    return NextResponse.json(
      { wallets: [], total: 0, page, limit, error: 'Query failed' },
      { status: 500 }
    );
  }
}
