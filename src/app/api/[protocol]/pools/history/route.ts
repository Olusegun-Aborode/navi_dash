import { NextResponse } from 'next/server';
import { isValidProtocol } from '@/protocols/registry';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * GET /api/[protocol]/pools/history?days=30&symbol=SUI
 * Returns daily aggregated pool history for a protocol.
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
  const days = Math.min(Number(searchParams.get('days') ?? 30), 365);
  const symbol = searchParams.get('symbol');

  const db = getDb();
  if (!db) {
    return NextResponse.json({ history: [], message: 'No database configured' });
  }

  try {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const where: Record<string, unknown> = { protocol: slug, date: { gte: since } };
    if (symbol) where.symbol = symbol;

    const history = await db.poolDaily.findMany({
      where,
      orderBy: { date: 'asc' },
    });

    return NextResponse.json({ history });
  } catch (error) {
    console.error(`/api/${slug}/pools/history error:`, error);
    return NextResponse.json({ history: [], error: 'Query failed' }, { status: 500 });
  }
}
