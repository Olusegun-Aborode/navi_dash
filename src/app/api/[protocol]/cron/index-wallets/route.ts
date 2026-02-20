import { NextResponse } from 'next/server';
import { CRON_SECRET } from '@/lib/constants';
import { isValidProtocol } from '@/protocols/registry';
import { NAVI_EVENT_TYPES } from '@/protocols/navi/config';
import { queryEvents } from '@/lib/rpc';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * Wallet indexer cron.
 * Discovers borrower addresses and refreshes positions by priority.
 * Currently only NAVI event discovery is implemented.
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

  // Currently only NAVI wallet discovery is implemented
  if (slug !== 'navi') {
    return NextResponse.json({ message: `Wallet indexing not yet implemented for ${slug}` });
  }

  try {
    // Step 1: Discover new addresses from recent events
    const newAddresses = new Set<string>();
    for (const eventType of [NAVI_EVENT_TYPES.BORROW, NAVI_EVENT_TYPES.DEPOSIT]) {
      try {
        const page = await queryEvents(eventType, null, 50, 'descending');
        for (const evt of page.data) {
          const addr = String(evt.parsedJson.sender ?? evt.sender);
          if (addr) newAddresses.add(addr);
        }
      } catch {
        // skip if event type query fails
      }
    }

    let discovered = 0;
    for (const address of newAddresses) {
      try {
        await db.walletPosition.upsert({
          where: { protocol_address: { protocol: slug, address } },
          create: {
            protocol: slug,
            address,
            collateralUsd: 0,
            borrowUsd: 0,
            healthFactor: 999,
            collateralAssets: '[]',
            borrowAssets: '[]',
            refreshPriority: 3,
          },
          update: {},
        });
        discovered++;
      } catch {
        // skip duplicates
      }
    }

    // Step 2: Refresh stale wallets by priority
    const priorityThresholds = [
      { priority: 0, staleMinutes: 2 },
      { priority: 1, staleMinutes: 5 },
      { priority: 2, staleMinutes: 15 },
      { priority: 3, staleMinutes: 60 },
    ];

    let refreshed = 0;

    for (const { priority, staleMinutes } of priorityThresholds) {
      if (refreshed >= 50) break;

      const staleThreshold = new Date(Date.now() - staleMinutes * 60 * 1000);
      const staleWallets = await db.walletPosition.findMany({
        where: {
          protocol: slug,
          refreshPriority: priority,
          lastUpdated: { lt: staleThreshold },
        },
        orderBy: { lastUpdated: 'asc' },
        take: 50 - refreshed,
      });

      for (const wallet of staleWallets) {
        try {
          // TODO: Call protocol-specific getLendingState per address
          await db.walletPosition.update({
            where: { id: wallet.id },
            data: { lastUpdated: new Date() },
          });
          refreshed++;
        } catch {
          // skip individual wallet errors
        }
      }
    }

    return NextResponse.json({
      success: true,
      protocol: slug,
      discovered,
      refreshed,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error(`index-wallets[${slug}] error:`, error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
